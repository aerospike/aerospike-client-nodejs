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

/* global describe, it, before */
/* eslint-disable no-unused-expressions */

// Local test only, not for CI: a JavaScript seed provider against the
// multi-node cluster of ip_map_cluster.ts, whose nodes advertise addresses the
// client can't reach. Skipped unless IPMAP_CLUSTER_SEED is set, e.g.
// IPMAP_CLUSTER_SEED=127.0.0.1:4000; the scale-out test also needs
// IPMAP_CLUSTER_SCRIPT (discoverydocs/test-cluster/cluster.sh).

import type { Client as Cli } from '../../lib/aerospike.js'
import * as Aerospike from '../../lib/aerospike.js'

import { expect } from 'chai'
import { execFileSync } from 'child_process'
import { advertisedPeers, addresses, waitFor } from './helpers.ts'

const seedEnv = process.env.IPMAP_CLUSTER_SEED
const script = process.env.IPMAP_CLUSTER_SCRIPT
const log = { level: Aerospike.log.OFF }

describe('JavaScript seed provider against a multi-node cluster', function () {
  this.timeout(120000)

  if (!seedEnv) {
    it.skip('set IPMAP_CLUSTER_SEED to run')
    return
  }

  const [seedHost, seedPortText] = seedEnv.split(':')
  const seedPort = Number(seedPortText)
  let ipMap: Record<string, string> = {}
  let nodeCount = 0

  before(async function () {
    const peers = await advertisedPeers(seedHost, seedPort)
    nodeCount = peers.length + 1
    // Every address of the cluster's /24, so a node added later is covered.
    const prefix = peers[0].host.split('.').slice(0, 3).join('.')
    ipMap = {}
    for (let i = 1; i < 255; i++) ipMap[`${prefix}.${i}`] = seedHost
  })

  function provider (calls: { n: number }): any {
    return {
      async refreshSeedCandidates () {
        calls.n++
        await new Promise(resolve => setTimeout(resolve, 10))
        return [{ addr: seedHost, port: seedPort }]
      },
      needsPeriodicRefresh: () => true
    }
  }

  it('finds every node and spreads commands when the provider is the only seed source', async function () {
    const calls = { n: 0 }
    const client: Cli = await Aerospike.connect({
      hosts: [], log, tenderInterval: 250, ipMap,
      discovery: { provider: provider(calls), refreshIntervalMs: 500 }
    })
    const keys = Array.from({ length: 300 }, (_, i) => new Aerospike.Key('test', 'demo', `js-provider-cluster/${i}`))
    try {
      expect(await waitFor(() => client.getNodes().length === nodeCount, 10000)).to.be.true
      for (const key of keys) await client.put(key, { i: 1 })
      const records = await client.batchRead(keys.map(key => ({ key, readAllBins: true })))
      expect(records.filter(record => record.status === Aerospike.status.OK)).to.have.lengthOf(keys.length)
      await new Promise(resolve => setTimeout(resolve, 1200))
      expect(calls.n).to.be.at.least(3)
    } finally {
      await client.batchRemove(keys).catch(() => {})
      client.close()
    }
  })

  describe('scale-out', function () {
    const node = 7
    const port = 4000 + (node - 1) * 100

    before(function () {
      if (!script) this.skip()
    })

    it('follows a node joining and leaving while commands run', async function () {
      const calls = { n: 0 }
      const client: Cli = await Aerospike.connect({
        hosts: [], log, tenderInterval: 250, ipMap,
        discovery: { provider: provider(calls), refreshIntervalMs: 500 }
      })
      let running = true
      let ops = 0
      const errors: string[] = []
      const load = (async () => {
        let i = 0
        while (running) {
          const key = new Aerospike.Key('test', 'demo', `js-provider-scale/${i++ % 100}`)
          try {
            await client.put(key, { i })
            await client.get(key)
            ops += 2
          } catch (err: any) {
            errors.push(err.message)
          }
        }
      })()
      try {
        expect(await waitFor(() => client.getNodes().length === nodeCount, 10000)).to.be.true
        execFileSync(script as string, ['add', String(node)])
        expect(await waitFor(() => client.getNodes().length === nodeCount + 1, 30000)).to.be.true
        expect(addresses(client)).to.include(`${seedHost}:${port}`)
        execFileSync(script as string, ['remove', String(node)])
        expect(await waitFor(() => client.getNodes().length === nodeCount, 30000)).to.be.true
      } finally {
        running = false
        await load
        try { execFileSync(script as string, ['remove', String(node)]) } catch (err) {}
        client.close()
      }
      expect(ops).to.be.above(200)
      // A node leaving can fail a command that was on its way to it; the
      // client must not stall or fail in bulk.
      expect(errors.length).to.be.below(Math.max(5, ops * 0.01))
    })
  })
})
