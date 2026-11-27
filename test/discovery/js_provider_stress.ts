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

// Stress for JavaScript seed providers: many clients, fast connect/close
// cycles, close at random moments, a provider that misbehaves at random under
// command load, process exit mid-refresh and mid-connect, large results and
// memory over many refreshes. Tagged #slow (skipped by the pre-commit hook).

import type { Client as Cli, ConfigOptions } from '../../lib/aerospike.js'

import { expect } from 'chai'
import { spawnSync } from 'child_process'
import * as net from 'net'
import * as path from 'path'
import { monitorEventLoopDelay } from 'perf_hooks'
import * as Aerospike from '../../lib/aerospike.js'
import * as helper from '../test_helper.ts'

const log = { level: Aerospike.log.OFF }
const lib = path.resolve(__dirname, '../../lib/aerospike.js')

function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitUntil (check: () => boolean, ms: number): Promise<void> {
  const end = Date.now() + ms
  while (!check()) {
    if (Date.now() > end) throw new Error('condition not met in time')
    await sleep(20)
  }
}

// A fixed sequence, so a failure can be replayed.
function random (seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

describe('JavaScript seed provider stress #slow', function () {
  this.timeout(180000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null

  before(function () {
    if (!seed || !net.isIP(seed.addr)) this.skip()
  })

  function seedHost (): any {
    return { addr: seed.addr, port: seed.port }
  }

  function config (provider: any, discovery: any = {}, extra: any = {}): ConfigOptions {
    return Object.assign({}, helper.config, { hosts: [], log }, extra, {
      discovery: Object.assign({ provider, refreshTimeoutMs: 3000 }, discovery)
    })
  }

  it('survives 300 connect/close cycles with mixed providers, closing each once', async function () {
    const next = random(7)
    let closed = 0
    const cycles = 300
    for (let i = 0; i < cycles; i++) {
      const periodic = i % 2 === 0
      const delay = Math.floor(next() * 10)
      const provider = {
        refreshSeedCandidates: i % 3 === 0
          ? () => [seedHost()]
          : async () => { if (delay) await sleep(delay); return [seedHost()] },
        needsPeriodicRefresh: () => periodic,
        close: () => { closed++ }
      }
      const client: Cli = await Aerospike.connect(config(provider, { refreshIntervalMs: 1000 }))
      client.close()
    }
    await waitUntil(() => closed === cycles, 10000)
    expect(closed).to.equal(cycles)
  })

  it('handles close() at random moments during connect, 150 times', async function () {
    const next = random(11)
    let closed = 0
    const outcomes = { connected: 0, closedWhileConnecting: 0, other: [] as string[] }
    const iterations = 150
    for (let i = 0; i < iterations; i++) {
      const answerAfter = Math.floor(next() * 40)
      const closeAfter = Math.floor(next() * 60)
      const provider = {
        refreshSeedCandidates: async () => { await sleep(answerAfter); return [seedHost()] },
        needsPeriodicRefresh: () => i % 2 === 0,
        close: () => { closed++ }
      }
      const client = new Aerospike.Client(config(provider, { refreshIntervalMs: 1000 }))
      const connecting = client.connect().then(
        () => { outcomes.connected++ },
        (err: any) => {
          if (/Client closed while connecting/.test(err.message)) outcomes.closedWhileConnecting++
          else outcomes.other.push(err.message)
        })
      await sleep(closeAfter)
      client.close()
      await connecting
      // A connect that won the race is still open until closed again.
      client.close()
    }
    expect(outcomes.other).to.eql([])
    expect(outcomes.connected + outcomes.closedWhileConnecting).to.equal(iterations)
    await waitUntil(() => closed === iterations, 15000)
    expect(closed).to.equal(iterations)
  })

  it('keeps commands working and the event loop responsive while a provider misbehaves at random', async function () {
    const next = random(23)
    const behaviors = { ok: 0, slow: 0, sync: 0, throws: 0, rejects: 0, invalid: 0, empty: 0 }
    let calls = 0
    const provider = {
      refreshSeedCandidates: (ctx: any) => {
        calls++
        // The first call answers, so connect uses the provider's seed.
        const pick = ctx.tendIteration === 0 ? 0 : Math.floor(next() * 7)
        switch (pick) {
          case 0: behaviors.ok++; return Promise.resolve([seedHost()])
          case 1: behaviors.slow++; return sleep(400).then(() => [seedHost()])
          case 2: behaviors.sync++; return [seedHost(), seedHost()]
          case 3: behaviors.throws++; throw new Error('random throw')
          case 4: behaviors.rejects++; return Promise.reject(new Error('random reject'))
          case 5: behaviors.invalid++; return [{ addr: seed.addr, port: 99999 }]
          default: behaviors.empty++; return []
        }
      },
      needsPeriodicRefresh: () => true
    }
    // merge keeps the configured seed whatever the provider returns.
    const client: Cli = await Aerospike.connect(config(provider, { refreshIntervalMs: 250, mergePolicy: 'merge' }, { hosts: [seedHost()], tenderInterval: 250 }))
    const delay = monitorEventLoopDelay({ resolution: 10 })
    delay.enable()
    let ops = 0
    let failures = 0
    let running = true
    const workers = Array.from({ length: 8 }, async (_, w) => {
      let i = 0
      while (running) {
        const key = new Aerospike.Key(helper.namespace, helper.set, `js-provider-stress/${w}/${i++ % 50}`)
        try {
          await client.put(key, { w, i })
          await client.get(key)
          ops += 2
        } catch (err) {
          failures++
        }
      }
    })
    await sleep(8000)
    running = false
    await Promise.all(workers)
    delay.disable()
    client.close()
    expect(failures).to.equal(0)
    expect(ops).to.be.above(1000)
    expect(calls).to.be.at.least(20)
    expect(Object.values(behaviors).filter(n => n > 0).length).to.be.at.least(5)
    // A JavaScript provider must not stall the event loop.
    expect(delay.max / 1e6).to.be.below(250)
  })

  it('runs many first connects at once, on their own threads and on the JavaScript thread, 15 times', function () {
    // The C client sets its global Lua settings in the first connect without a
    // lock; connects on their own threads must not race on that.
    const script = `
      const Aerospike = require(${JSON.stringify(lib)})
      const seed = ${JSON.stringify(seedHost())}
      const ns = ${JSON.stringify(helper.namespace)}
      const set = ${JSON.stringify(helper.set)}
      ;(async () => {
        const provider = { refreshSeedCandidates: async () => [seed], needsPeriodicRefresh: () => false }
        const js = Array.from({ length: 10 }, () => Aerospike.connect({ hosts: [], log: { level: Aerospike.log.OFF }, discovery: { provider } }))
        const plain = Array.from({ length: 5 }, () => Aerospike.connect({ hosts: [seed], log: { level: Aerospike.log.OFF } }))
        const clients = await Promise.all([...js, ...plain])
        const key = new Aerospike.Key(ns, set, 'js-provider-lua/' + process.pid)
        await clients[0].put(key, { i: 1 })
        await Promise.all(clients.map(c => c.get(key)))
        await clients[0].remove(key)
        clients.forEach(c => c.close())
        Aerospike.releaseEventLoop()
        console.log('ok ' + clients.length)
      })().catch(err => { console.error(err); process.exit(1) })
    `
    for (let i = 0; i < 15; i++) {
      const result = spawnSync(process.execPath, ['-e', script], { timeout: 30000, encoding: 'utf8' })
      expect(result.signal, `run ${i}: ${result.stderr}`).to.be.null
      expect(result.status, `run ${i}: ${result.stderr}`).to.equal(0)
      expect(result.stdout.trim()).to.equal('ok 15')
    }
  })

  it('connects 25 clients at once that share one provider, and closes it once per client', async function () {
    let closed = 0
    let calls = 0
    const provider = {
      refreshSeedCandidates: async () => { calls++; await sleep(20); return [seedHost()] },
      needsPeriodicRefresh: () => true,
      close: () => { closed++ }
    }
    const clients: Cli[] = await Promise.all(Array.from({ length: 25 }, () =>
      Aerospike.connect(config(provider, { refreshIntervalMs: 500 }, { tenderInterval: 250 }))))
    await sleep(1200)
    for (const client of clients) {
      expect(client.getNodes().length).to.be.at.least(1)
      client.close()
    }
    await waitUntil(() => closed === 25, 10000)
    expect(calls).to.be.at.least(50)
  })

  it('exits cleanly when the process ends in the middle of a refresh', function () {
    const script = `
      const Aerospike = require(${JSON.stringify(lib)})
      const seed = ${JSON.stringify(seedHost())}
      let calls = 0
      const provider = {
        refreshSeedCandidates: () => ++calls === 1 ? [seed] : new Promise(() => {}),
        needsPeriodicRefresh: () => true
      }
      Aerospike.connect({ hosts: [], log: { level: Aerospike.log.OFF }, tenderInterval: 250,
        discovery: { provider, refreshIntervalMs: 250 } }).then(client => {
        setTimeout(() => { console.log('exiting, calls ' + calls); process.exit(0) }, 1000)
      })
    `
    const result = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8' })
    expect(result.signal, result.stderr).to.be.null
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout).to.match(/exiting, calls [2-9]/)
  })

  it('exits cleanly when the process ends in the middle of a connect', function () {
    const script = `
      const Aerospike = require(${JSON.stringify(lib)})
      const provider = { refreshSeedCandidates: () => new Promise(() => {}), needsPeriodicRefresh: () => false }
      Aerospike.connect({ hosts: [], log: { level: Aerospike.log.OFF }, discovery: { provider, refreshTimeoutMs: 5000 } }).catch(() => {})
      setTimeout(() => { console.log('exiting'); process.exit(0) }, 200)
    `
    const start = Date.now()
    const result = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8' })
    // Exits at once, not after refreshTimeoutMs (5 s): the waiting refresh is stopped.
    expect(Date.now() - start).to.be.below(3000)
    expect(result.signal, result.stderr).to.be.null
    expect(result.status, result.stderr).to.equal(0)
    expect(result.stdout).to.contain('exiting')
  })

  it('handles a result of 2000 hosts', async function () {
    const many = Array.from({ length: 2000 }, () => seedHost())
    const start = Date.now()
    const client: Cli = await Aerospike.connect(config({ refreshSeedCandidates: () => many, needsPeriodicRefresh: () => false }))
    expect(Date.now() - start).to.be.below(3000)
    expect(client.getNodes().length).to.be.at.least(1)
    client.close()
  })

  it('works with a slow synchronous provider', async function () {
    const provider = {
      refreshSeedCandidates: () => {
        const end = Date.now() + 150
        while (Date.now() < end) { /* busy */ }
        return [seedHost()]
      },
      needsPeriodicRefresh: () => false
    }
    const client: Cli = await Aerospike.connect(config(provider))
    client.close()
  })

  it('keeps memory flat over hundreds of refreshes', async function () {
    let calls = 0
    const provider = {
      refreshSeedCandidates: async () => { calls++; return [seedHost(), { addr: seed.addr, port: seed.port, tlsname: 'x'.repeat(200) }] },
      needsPeriodicRefresh: () => true
    }
    // 250 ms is the shortest tend interval the C client accepts.
    const client: Cli = await Aerospike.connect(config(provider, { refreshIntervalMs: 250 }, { tenderInterval: 250 }))
    await waitUntil(() => calls >= 20, 15000)
    if (global.gc) global.gc()
    const before = process.memoryUsage().rss
    await waitUntil(() => calls >= 260, 90000)
    if (global.gc) global.gc()
    const growth = (process.memoryUsage().rss - before) / (1024 * 1024)
    client.close()
    expect(growth).to.be.below(20)
  })
})
