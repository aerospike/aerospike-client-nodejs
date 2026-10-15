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

/* eslint-env mocha */

import * as Aerospike from '../lib/aerospike.js'
import type { Client as Cli, MetricsSnapshot } from '../lib/aerospike.js'
import { expect } from 'chai'
import * as os from 'os'
import * as helper from './test_helper.ts'

describe('Client#metricsSnapshot', function () {
  let client: Cli
  const reportDir = os.tmpdir()
  const key = new Aerospike.Key(helper.namespace, helper.set, 'metricsSnapshot')

  before(async function () {
    client = await Aerospike.connect(helper.config)
  })

  after(async function () {
    await client.close()
  })

  afterEach(async function () {
    await client.disableMetrics()
  })

  it('returns a snapshot while metrics are disabled', async function () {
    const snap: MetricsSnapshot = await client.metricsSnapshot()
    expect(snap.metricsEnabled).to.equal(false)
    expect(snap.nodes).to.not.be.empty
  })

  it('supports a callback', function (done) {
    client.metricsSnapshot((error?: any, snap?: MetricsSnapshot) => {
      expect(error).to.not.be.ok
      expect(snap!.nodes).to.not.be.empty
      done()
    })
  })

  it('reports the metrics policy', async function () {
    await client.enableMetrics({
      reportDir,
      operationalEnabled: true,
      usageEnabled: true,
      latencyUnit: Aerospike.policy.latencyUnit.MICROSECONDS,
      latencyColumns: 5,
      latencyShift: 2,
      labels: { app: 'test' }
    })
    await client.put(key, { i: 1 })

    const snap = await client.metricsSnapshot()
    expect(snap.metricsEnabled).to.equal(true)
    expect(snap.operationalMetricsEnabled).to.equal(true)
    expect(snap.usageMetricsEnabled).to.equal(true)
    expect(snap.latencyUnit).to.equal(Aerospike.policy.latencyUnit.MICROSECONDS)
    expect(snap.latencyColumns).to.equal(5)
    expect(snap.latencyShift).to.equal(2)
    expect(snap.labels).to.eql({ app: 'test' })
    const names = snap.nodes.flatMap(node => node.namespaces.map(ns => ns.name))
    expect(names).to.include(helper.namespace)
  })

  it('counts every data call as deferred or background', async function () {
    await client.enableMetrics({ reportDir, usageEnabled: true })
    await client.put(key, { i: 1 })
    const before = (await client.metricsSnapshot()).usage

    await client.get(key)
    await client.batchGet([key])
    await client.batchExists([key])
    await client.query(helper.namespace, helper.set).operate([Aerospike.operations.write('j', 1)])
    await client.infoAny('build')

    const after = (await client.metricsSnapshot()).usage
    expect(after.deferred - before.deferred).to.equal(3)
    expect(after.background - before.background).to.equal(1)
    expect(after.blocking).to.equal(0)
  })

  it('does not count usage when usage metrics are off', async function () {
    await client.enableMetrics({ reportDir })
    const before = (await client.metricsSnapshot()).usage
    await client.get(key).catch(() => {})
    await client.batchGet([key])
    const after = (await client.metricsSnapshot()).usage
    expect(after).to.eql(before)
  })

  it('rejects an invalid latencyUnit', async function () {
    try {
      await client.enableMetrics({ reportDir, latencyUnit: 7 as any })
      expect.fail('should have been rejected')
    } catch (error: any) {
      expect(error.code).to.equal(Aerospike.status.ERR_PARAM)
    }
  })

  it('rejects a non-boolean operationalEnabled', async function () {
    try {
      await client.enableMetrics({ reportDir, operationalEnabled: 'yes' as any })
      expect.fail('should have been rejected')
    } catch (error: any) {
      expect(error.code).to.equal(Aerospike.status.ERR_PARAM)
    }
  })
})
