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

// Local only, not run on CI: set AEROSPIKE_STRESS=1.

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import type { OrderKey, ModelRecord } from './helpers.ts';
import { loadModel, loadSet, removeLoadedSets, digests, referenceTopK, orderBy, seededRandom, skipUnlessTopKQueriesRun } from './helpers.ts';

const { INTEGER } = Aerospike.binDataType
const { DESC } = Aerospike.order
const { DEFAULT } = Aerospike.orderByFlags
const { status } = Aerospike

const byScore: OrderKey[] = [{ bin: 'score', type: INTEGER, direction: DESC, flags: DEFAULT }]
const hexDigests = (records: ModelRecord[]) => records.map(record => record.digest.toString('hex'))

// One Top-K query through results(), ranked by score.
function runQuery (set: string, k: number, policy: object | null = null) {
  const query = helper.client.query(helper.namespace, set)
  orderBy(byScore)(query)
  query.topK(k)
  return query.results(policy as any)
}

describe('Top-K under stress', function () {
  this.timeout(600000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  before(function () {
    if (process.env.AEROSPIKE_STRESS !== '1') this.skip()
  })
  skipUnlessTopKQueriesRun(this)

  let set: string
  let expected: string[]
  before(async function () {
    const random = seededRandom(77)
    const loaded = await loadModel(Array.from({ length: 50000 }, () => ({
      score: { type: INTEGER, value: Math.floor(random() * 100000) }
    })))
    set = loaded.set
    expected = hexDigests(referenceTopK(loaded.model, byScore, 100))
  })
  after(removeLoadedSets)

  it('runs 20 Top-K queries at once, each with the right answer', async function () {
    const results = await Promise.all(Array.from({ length: 20 }, () => runQuery(set, 100)))
    for (const [i, records] of results.entries()) {
      expect(digests(records), `query ${i}`).to.eql(expected)
    }
  })

  it('with 100 at once, past the server and client limits, each is right or refused, never wrong', async function () {
    // Top-K always runs as a long query: past the server's query-threads-limit it answers
    // FORBIDDEN (22); on a cluster each query holds a connection per node, so the client's
    // limit of 100 async connections per node can refuse it first (NO_MORE_CONNECTIONS, -7).
    const refusals = [status.ERR_FAIL_FORBIDDEN, status.ERR_NO_MORE_CONNECTIONS]
    const outcomes = await Promise.all(Array.from({ length: 100 }, () =>
      runQuery(set, 100).then(records => digests(records), error => error)))
    for (const [i, outcome] of outcomes.entries()) {
      if (Array.isArray(outcome)) {
        expect(outcome, `query ${i}`).to.eql(expected)
      } else {
        expect(refusals, `query ${i}: ${outcome.message}`).to.include(outcome.code)
      }
    }
    // The client still works afterwards.
    expect(digests(await runQuery(set, 100))).to.eql(expected)
  })

  it('runs 1,000 Top-K queries in a row without growing memory', async function () {
    for (let i = 0; i < 50; i++) await runQuery(set, 100) // warm up
    global.gc?.()
    const before = process.memoryUsage().rss

    for (let i = 0; i < 1000; i++) {
      const records = await runQuery(set, 100)
      if (i % 100 === 0) expect(digests(records), `query ${i}`).to.eql(expected)
    }

    global.gc?.()
    const grownMb = (process.memoryUsage().rss - before) / 1024 / 1024
    expect(grownMb, `memory grew by ${grownMb.toFixed(1)} MB over 1,000 queries`).to.be.below(50)
  })

  it('times out cleanly, never with a wrong or repeated answer, at total timeouts of 1, 2 and 5 ms (AN-03)', async function () {
    let timeouts = 0
    for (const totalTimeout of [1, 2, 5]) {
      for (let i = 0; i < 10; i++) {
        const label = `${totalTimeout} ms, attempt ${i}`
        try {
          expect(digests(await runQuery(set, 100, { totalTimeout, maxRetries: 2 })), label).to.eql(expected)
        } catch (error: any) {
          if (error.name === 'AssertionError') throw error
          expect(error.code, `${label}: ${error.message}`).to.equal(status.ERR_TIMEOUT)
          timeouts++
        }
      }
    }
    // The client still works afterwards.
    expect(digests(await runQuery(set, 100))).to.eql(expected)
    expect(timeouts, 'a total timeout of a few ms should time out at least once over 50,000 records').to.be.above(0)
  })

  it('refuses queries past the node\'s Top-K memory limit with code 22, never with a partial result (R69, AM-06)', async function () {
    // The limit is per node; on more nodes each holds only part of the data.
    if (helper.client.getNodes().length !== 1) this.skip()
    // 1,000 records of 100 KB: each query holds about 100 MB, so 20 at once pass the ~1 GiB limit.
    const big = await loadSet(Array.from({ length: 1000 }, (_, score) => ({ score, blob: Buffer.alloc(100 * 1024, score % 256) })))
    const top = Array.from({ length: 1000 }, (_, i) => 999 - i)
    const details = { errorDetailVerbosity: Aerospike.errorDetailVerbosity.MESSAGE, socketTimeout: 0, totalTimeout: 120000 }

    const outcomes = await Promise.all(Array.from({ length: 20 }, () => runQuery(big, 1000, details).then(records => records, error => error)))
    let refused = 0
    for (const outcome of outcomes) {
      if (outcome instanceof Error) {
        const error = outcome as any
        expect(error.code, error.message).to.equal(status.ERR_FAIL_FORBIDDEN)
        refused++
      } else {
        expect(outcome.map(r => r.bins.score), 'a partial result').to.eql(top)
      }
    }
    expect(refused, 'no query reached the memory limit').to.be.above(0)

    // The node recovers once the queries end.
    expect((await runQuery(big, 1000, details)).map(r => r.bins.score)).to.eql(top)
  })

  it('stops 20 Top-K streams at their first record, then answers exactly (AP-07)', async function () {
    const streams = Array.from({ length: 20 }, () => new Promise<number>((resolve, reject) => {
      const query = helper.client.query(helper.namespace, set)
      orderBy(byScore)(query)
      query.topK(100)
      let received = 0
      const stream = query.foreach()
      stream.on('data', () => {
        received++
        stream.abort()
      })
      stream.on('error', reject)
      stream.on('end', () => resolve(received))
    }))
    for (const received of await Promise.all(streams)) expect(received).to.be.within(1, 100)

    expect(digests(await runQuery(set, 100))).to.eql(expected)
  })
})
