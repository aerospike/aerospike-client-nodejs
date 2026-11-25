// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

/* global describe, it, before, after */

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { loadSet, removeLoadedSets, errorFrom, skipUnlessTopKQueriesRun } from './helpers.ts';

const { INTEGER } = Aerospike.binDataType
const { DESC } = Aerospike.order
const { status, exp } = Aerospike

// A node sends nothing until it has read the whole set, so a socket timeout of
// 1 ms ends before that. Two retries are allowed, so a retried query makes 3 attempts.
const POLICY = { socketTimeout: 1, totalTimeout: 5000, maxRetries: 2 }

// Every attempt runs one long query job on each node, and a node counts each job
// in exactly one of these statistics when it ends, however it ended.
const ENDED_JOB_STATS = ['complete', 'error', 'abort', 'timeout'].map(end => `pi_query_long_basic_${end}`)

async function endedJobs (): Promise<number> {
  const results = await helper.client.infoAll(`namespace/${helper.namespace}`)
  let total = 0
  for (const { info } of results as any[]) {
    for (const stat of ENDED_JOB_STATS) {
      total += Number(new RegExp(`(?:^|;|\\t)${stat}=(\\d+)`).exec(info)![1])
    }
  }
  return total
}

// The jobs that ended since jobsBefore. A node can end a job after the client has
// given up on it, so this waits until the count has stopped changing for a second.
async function jobsEndedSince (jobsBefore: number): Promise<number> {
  const deadline = Date.now() + 10000
  let jobs = await endedJobs() - jobsBefore
  let stableSince = Date.now()
  while (Date.now() < deadline && (jobs === 0 || Date.now() - stableSince < 1000)) {
    await new Promise(resolve => setTimeout(resolve, 100))
    const now = await endedJobs() - jobsBefore
    if (now !== jobs) {
      jobs = now
      stableSince = Date.now()
    }
  }
  return jobs
}

// An attempt runs at most one job on each node: none on a node whose request
// timed out before it was sent, which a 1 ms socket timeout can do.
async function expectOneAttempt (jobsBefore: number) {
  const nodes = helper.client.getNodes().length
  expect(await jobsEndedSince(jobsBefore), `jobs ended on ${nodes} node(s)`).to.be.within(1, nodes)
}

async function expectRetries (jobsBefore: number, attempts: number) {
  const nodes = helper.client.getNodes().length
  expect(await jobsEndedSince(jobsBefore), `jobs ended on ${nodes} node(s)`).to.be.within(nodes + 1, attempts * nodes)
}

function topKQuery (set: string) {
  const query = helper.client.query(helper.namespace, set)
  query.orderBy('score', INTEGER, DESC)
  query.topK(10)
  return query
}

// Sets query-max-run-time-ms on every node and returns the value it replaced.
async function setMaxRunTime (ms: number | string): Promise<string> {
  const config = await helper.client.infoAny(`get-config:context=namespace;id=${helper.namespace}`)
  const previous = /query-max-run-time-ms=(\d+)/.exec(config)![1]
  for (const node of helper.client.getNodes()) {
    await helper.client.infoNode(`set-config:context=namespace;id=${helper.namespace};query-max-run-time-ms=${ms}`, node)
  }
  return previous
}

describe('Top-K retries', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  skipUnlessTopKQueriesRun(this)

  let set: string
  before(async function () {
    set = await loadSet(Array.from({ length: 20000 }, (_, score) => ({ score })))
  })
  after(removeLoadedSets)

  it('does not retry a Top-K query that passes its socket timeout', async function () {
    const jobsBefore = await endedJobs()
    const error = await errorFrom(() => topKQuery(set).results(POLICY as any))
    expect(error?.code, error?.message).to.equal(status.ERR_TIMEOUT)
    await expectOneAttempt(jobsBefore)
  })

  it('still retries a query that is not Top-K when it passes its socket timeout', async function () {
    // No record matches, so a node has nothing to send until it has read the whole set.
    const filterExpression = exp.eq(exp.binInt('score'), exp.int(-1))
    const jobsBefore = await endedJobs()
    const error = await errorFrom(() => helper.client.query(helper.namespace, set).results({ ...POLICY, filterExpression } as any))
    expect(error?.code, error?.message).to.equal(status.ERR_TIMEOUT)
    await expectRetries(jobsBefore, POLICY.maxRetries + 1)
  })

  it('does not retry a Top-K query the server stops at query-max-run-time-ms', async function () {
    const previous = await setMaxRunTime(1)
    try {
      const jobsBefore = await endedJobs()
      const error = await errorFrom(() => topKQuery(set).results({ socketTimeout: 0, totalTimeout: 30000, maxRetries: 2 } as any))
      expect(error?.code, error?.message).to.equal(status.ERR_QUERY_TIMEOUT)
      await expectOneAttempt(jobsBefore)
    } finally {
      await setMaxRunTime(previous)
    }
  })
})
