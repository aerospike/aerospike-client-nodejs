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

// Node.js's own L2 tests for the l2-proxy harness in aerospike-client-conformance
// (l2-proxy/README.md there, "A client's own tests"): the checks that need client
// internals. test/discovery/l2_run.sh runs this file as the manifest's L2_RUN,
// once per profile, in a container on the client network with the profile's
// values file as its environment and L2_PROFILE naming the profile. Outside that
// harness every test skips. Like the C client's l2_run:
//
//   idle-reset  F-1: idle pooled connections reset by the proxy give no failure
//               to the caller.
//   default     N-18: two peers port-mapped to one listener; neither becomes a
//               node. Also: a node that silently drops traffic times its
//               commands out without blocking the JavaScript event loop.
//   ee          N-6: every node is held over TLS through its TLS listener.
//   cn-only     The CN-only certificate is accepted only through the deprecated
//               fallback, which logs a warning (FR-45 rejects it in the next
//               major release).

/* eslint-env mocha */

import { expect } from 'chai'
import * as fs from 'fs'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import { monitorEventLoopDelay } from 'perf_hooks'
import * as Aerospike from '../../../lib/aerospike.js'
import { info } from '../helpers.ts'

const driver = require('../l5/driver.js')

const NAMESPACE = 'test'
const JOIN_MS = 30000
const SAMPLE_MS = 100
const KEYS = 100
const WARM_ROUNDS = 25
const WARM_CONCURRENCY = 8
const PROBE_MS = 5000
const COLLISION_MS = 15000
const COLLISION_WARNS = 3
const N18_KEYS = 300
const PARTITIONS = 4096

const env = process.env
const profile = env.L2_PROFILE
const endpoint = env.DISCOVERY_ENDPOINT_HOSTNAME ?? ''
const toxiproxy = env.TOXIPROXY_URL ?? ''

interface Listener { proxy: string, port: number, node?: string }

// DISCOVERY_PROXY_MAP: <listener>:<port>, comma separated, in node order; a
// TLS listener is <listener>-tls.
function listeners (tls: boolean): Listener[] {
  return (env.DISCOVERY_PROXY_MAP ?? '').split(',').filter(e => e !== '').map(entry => {
    const i = entry.lastIndexOf(':')
    return { proxy: entry.slice(0, i), port: Number(entry.slice(i + 1)) }
  }).filter(l => l.proxy.endsWith('-tls') === tls)
}

async function readNodes (list: Listener[]): Promise<void> {
  for (const l of list) l.node = (await info(endpoint, l.port, 'node')).trim()
}

function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- Toxiproxy, with every change undone at the end of each test ------------

const undo: Array<() => Promise<void>> = []

async function toxiproxyCall (method: string, route: string, body?: object): Promise<void> {
  const response = await fetch(`${toxiproxy}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  console.log(`L2-TOXIPROXY ${method} ${route} status=${response.status}`)
  if (!response.ok) throw new Error(`Toxiproxy ${method} ${route}: ${response.status} ${await response.text()}`)
}

async function addToxic (proxy: string, name: string, type: string, stream: string, toxicity: number, attributes: object): Promise<void> {
  undo.push(() => toxiproxyCall('DELETE', `/proxies/${proxy}/toxics/${name}`))
  await toxiproxyCall('POST', `/proxies/${proxy}/toxics`, { name, type, stream, toxicity, attributes })
}

async function setListener (proxy: string, enabled: boolean): Promise<void> {
  if (!enabled) undo.push(() => toxiproxyCall('POST', `/proxies/${proxy}`, { enabled: true }))
  await toxiproxyCall('POST', `/proxies/${proxy}`, { enabled })
}

async function cleanup (): Promise<void> {
  const errors: string[] = []
  while (undo.length > 0) {
    try {
      await (undo.pop() as () => Promise<void>)()
    } catch (err: any) {
      errors.push(err.message)
    }
  }
  if (errors.length > 0) throw new Error(`cleanup did not complete: ${errors.join('; ')}`)
}

// --- Client ------------------------------------------------------------------

// A new client log file, so a test can read the client's warnings. The C
// client logs through the default logging, not a client's own log setting, so
// this points the default logging at the new file.
function logFile (): { fd: number, read: () => string } {
  const file = path.join(os.tmpdir(), `l2-run-${process.pid}-${Date.now()}.log`)
  const fd = fs.openSync(file, 'w+')
  Aerospike.setDefaultLogging({ level: Aerospike.log.WARN, file: fd })
  return { fd, read: () => fs.readFileSync(file, 'utf8') }
}

// Seeded at the first listener, with a port-map from each node name to the
// listener at nodeListener[i].
function config (list: Listener[], nodeListener: number[], log: { fd: number }, tlsName?: string): any {
  const portMap: Record<string, string> = {}
  list.forEach((l, i) => { portMap[l.node as string] = `${endpoint}:${list[nodeListener[i]].port}` })
  const seed: any = { addr: endpoint, port: list[0].port }
  const cfg: any = {
    hosts: [seed],
    log: { level: Aerospike.log.WARN, file: log.fd },
    translation: { provider: 'port-map', portMap }
  }
  if (tlsName !== undefined) {
    seed.tlsname = tlsName
    cfg.tls = { enable: true, cafile: env.DISCOVERY_TLS_CA_FILE }
  }
  return cfg
}

async function waitNodes (client: any, names: string[], timeoutMs: number): Promise<string[]> {
  const deadline = Date.now() + timeoutMs
  let held: string[] = []
  while (Date.now() < deadline) {
    held = client.getNodes().map((n: any) => n.name).sort()
    if (JSON.stringify(held) === JSON.stringify([...names].sort())) return held
    await sleep(SAMPLE_MS)
  }
  return held
}

// The master node name of each partition, from the client's partition map.
function masters (client: any): Array<string | null> {
  const routing = client.as_client._routing(NAMESPACE)
  return routing?.masters ?? new Array(PARTITIONS).fill(null)
}

// count keys of set whose master is node, named <prefix>-<i>.
function keysOf (client: any, set: string, prefix: string, node: string, count: number): string[] {
  const owners = masters(client)
  const keys: string[] = []
  for (let i = 0; keys.length < count && i < count * 1000; i++) {
    const key = `${prefix}-${i}`
    if (owners[driver.partitionId(set, key)] === node) keys.push(key)
  }
  return keys
}

function asyncPools (client: any): Record<string, { inPool: number, opened: number, closed: number }> {
  const pools: Record<string, any> = {}
  for (const n of client.stats().nodes) pools[n.name] = n.asyncConnections
  return pools
}

// A connection through a listener held open after one info round trip, so
// Toxiproxy has linked it to the node. Resolves with how it ended once the
// listener is cycled: RST, FIN or an error.
async function probe (port: number): Promise<() => Promise<string>> {
  const socket = net.connect(port, endpoint)
  let ended: Promise<string> = new Promise(resolve => {
    socket.on('error', (err: any) => resolve(err.code === 'ECONNRESET' ? 'RST' : `ERROR ${err.code}`))
    socket.on('end', () => resolve('FIN'))
  })
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => {
      const body = Buffer.from('node\n')
      const header = Buffer.alloc(8)
      header.writeUInt8(2, 0)
      header.writeUInt8(1, 1)
      header.writeUIntBE(body.length, 2, 6)
      socket.write(Buffer.concat([header, body]))
    })
    socket.once('data', () => resolve())
    socket.once('error', reject)
  })
  ended = Promise.race([ended, sleep(PROBE_MS).then(() => 'TIMEOUT')])
  return async () => {
    const result = await ended
    socket.destroy()
    return result
  }
}

// --- Tests ---------------------------------------------------------------------

describe('L2 run', function () {
  this.timeout(180000)

  // Let the process exit once the tests are done: a client keeps Node's event
  // loop handle until it is released.
  after(function () {
    Aerospike.releaseEventLoop()
  })

  before(function () {
    if (profile === undefined) this.skip()
    console.log(`L2-RUN profile=${profile} subset=${env.DISCOVERY_SUBSET} client=nodejs`)
  })

  afterEach(async function () {
    await cleanup()
  })

  describe('idle-reset', function () {
    before(function () {
      if (profile !== 'idle-reset') this.skip()
    })

    it('F-1: idle pooled connections reset with RST give no failure to the caller', async function () {
      const list = listeners(false)
      await readNodes(list)
      // reset_peer at toxicity 0 adds no fault of its own, but makes a disabled
      // listener close its flows with RST rather than FIN (Java's and C's recipe).
      for (const l of list) await addToxic(l.proxy, 'f1-rst', 'reset_peer', 'upstream', 0, { timeout: 0 })

      const log = logFile()
      const client: any = await Aerospike.connect(config(list, list.map((_, i) => i), log))
      try {
        const names = list.map(l => l.node as string)
        expect(await waitNodes(client, names, JOIN_MS)).to.eql([...names].sort())
        expect(client.config.maxSocketIdle ?? 0).to.equal(0)

        let warmFailures = 0
        for (let round = 0; round < WARM_ROUNDS; round++) {
          const commands = []
          for (let i = 0; i < WARM_CONCURRENCY; i++) {
            const key = new Aerospike.Key(NAMESPACE, 'l2f', `fa-${(round * WARM_CONCURRENCY + i) % KEYS}`)
            commands.push(client.put(key, { v: round }).then(() => client.get(key)).catch(() => { warmFailures++ }))
          }
          await Promise.all(commands)
        }
        expect(warmFailures, 'warm-up failures').to.equal(0)
        // Each connection is back in its pool once its command completed.
        await sleep(200)

        const probes = await Promise.all(list.map(l => probe(l.port)))
        const idle = asyncPools(client)
        const pooled = names.reduce((sum, n) => sum + (idle[n]?.inPool ?? 0), 0)
        console.log(`L2-ASYNC-IDLE pooled=${pooled} ${JSON.stringify(idle)}`)
        for (const n of names) expect(idle[n]?.inPool ?? 0, `idle pooled connections on ${n}`).to.be.above(0)

        for (const l of list) {
          await setListener(l.proxy, false)
          await setListener(l.proxy, true)
        }
        const results = await Promise.all(probes.map(p => p()))
        list.forEach((l, i) => console.log(`L2-ASYNC-PROBE listener=${l.port} result=${results[i]}`))
        expect(results.every(r => r === 'RST'), `every idle flow reset with RST: ${results.join(',')}`).to.be.true

        const start = asyncPools(client)
        const failed: string[] = []
        const keys = Array.from({ length: KEYS }, (_, i) => new Aerospike.Key(NAMESPACE, 'l2f', `fa-${i}`))
        // Issued at once, so every idle pooled connection is checked out.
        await Promise.all(keys.map(key => client.put(key, { v: -1 }).catch((err: any) => failed.push(`put ${key.key}: ${err.code} ${err.message}`))))
        await Promise.all(keys.map(key => client.get(key).catch((err: any) => failed.push(`get ${key.key}: ${err.code} ${err.message}`))))
        await sleep(200)
        const end = asyncPools(client)

        let closed = 0
        const undetected: string[] = []
        for (const n of names) {
          const delta = (end[n]?.closed ?? 0) - (start[n]?.closed ?? 0)
          closed += delta
          console.log(`L2-ASYNC-NODE node=${n} pooled=${idle[n]?.inPool ?? 0} closedDelta=${delta}`)
          if (delta === 0) undetected.push(n)
        }
        console.log(`L2-ASYNC-RESULT commands=${2 * KEYS} failedToCaller=${failed.length} pooledReset=${pooled} closedDelta=${closed}`)
        for (const f of failed.slice(0, 20)) console.log(`L2-ASYNC-FAILED ${f}`)
        expect(failed, 'commands failed to the caller after idle RST').to.be.empty
        expect(undetected, 'nodes where no reset pooled connection was closed').to.be.empty
        expect(closed).to.be.at.least(pooled)
      } finally {
        client.close()
      }
    })
  })

  describe('default', function () {
    before(function () {
      if (profile !== 'default') this.skip()
    })

    it('N-18: two peers port-mapped to one listener, neither becomes a node', async function () {
      const list = listeners(false)
      expect(list, 'listeners in DISCOVERY_PROXY_MAP').to.have.lengthOf(3)
      await readNodes(list)
      const [seed, a, b] = list.map(l => l.node as string)
      const address = `${endpoint}:${list[1].port}`

      const log = logFile()
      const begin = Date.now()
      const client: any = await Aerospike.connect(config(list, [0, 1, 1], log))
      try {
        let samples = 0
        const bad: string[] = []
        let forward = 0
        let reverse = 0
        for (;;) {
          const held = client.getNodes().map((n: any) => n.name).sort().join(',')
          samples++
          if (held !== seed) bad.push(held)
          const text = log.read()
          forward = text.split(`translated nodes ${a} and ${b} to the same address ${address}`).length - 1
          reverse = text.split(`translated nodes ${b} and ${a} to the same address ${address}`).length - 1
          if ((forward >= COLLISION_WARNS && reverse >= COLLISION_WARNS) || Date.now() - begin >= COLLISION_MS) break
          await sleep(SAMPLE_MS)
        }
        const deadline = Date.now() + JOIN_MS
        while (!masters(client).includes(seed) && Date.now() < deadline) await sleep(SAMPLE_MS)
        const owned = masters(client).filter(m => m === seed).length
        const failures: string[] = []
        for (const name of keysOf(client, 'l2n18', 'n18', seed, N18_KEYS)) {
          const key = new Aerospike.Key(NAMESPACE, 'l2n18', name)
          try {
            await client.put(key, { v: name })
            await client.get(key)
          } catch (err: any) {
            failures.push(`${name}: ${err.code} ${err.message}`)
          }
        }
        console.log(`L2-N18-RESULT translator=port-map address=${address} colliding=${a},${b} forward=${forward} reverse=${reverse} elapsedMs=${Date.now() - begin} samples=${samples} badSamples=${bad.length} seedOwned=${owned} failures=${failures.length}`)
        expect(bad, `samples holding other nodes than ${seed}`).to.be.empty
        expect(forward, `collision warnings naming ${a} first`).to.be.at.least(COLLISION_WARNS)
        expect(reverse, `collision warnings naming ${b} first`).to.be.at.least(COLLISION_WARNS)
        expect(owned, `partitions mastered by ${seed}`).to.be.above(0)
        expect(failures, `keys mastered by ${seed}`).to.be.empty
      } finally {
        client.close()
      }
    })

    it('times out commands to a node that silently drops traffic without blocking the event loop', async function () {
      const list = listeners(false)
      await readNodes(list)
      const log = logFile()
      const client: any = await Aerospike.connect(Object.assign(config(list, list.map((_, i) => i), log), {
        policies: { read: { totalTimeout: 1000, socketTimeout: 1000, maxRetries: 0 }, write: { totalTimeout: 1000, socketTimeout: 1000, maxRetries: 0 } }
      }))
      try {
        const names = list.map(l => l.node as string)
        expect(await waitNodes(client, names, JOIN_MS)).to.eql([...names].sort())
        const victim = list[1]
        const keys = keysOf(client, 'l2drop', 'drop', victim.node as string, 20)
        expect(keys).to.have.lengthOf(20)

        // The node's listener holds data in both directions with no reply and no close.
        await addToxic(victim.proxy, 'drop-up', 'timeout', 'upstream', 1, { timeout: 0 })
        await addToxic(victim.proxy, 'drop-down', 'timeout', 'downstream', 1, { timeout: 0 })
        const delay = monitorEventLoopDelay({ resolution: 10 })
        delay.enable()
        const started = Date.now()
        const results = await Promise.all(keys.map(name => {
          const begin = Date.now()
          return client.put(new Aerospike.Key(NAMESPACE, 'l2drop', name), { v: 1 })
            .then(() => ({ ok: true, ms: Date.now() - begin, code: 0 }))
            .catch((err: any) => ({ ok: false, ms: Date.now() - begin, code: err.code }))
        }))
        delay.disable()
        const maxDelayMs = delay.max / 1e6
        const failed = results.filter(r => !r.ok)
        const slowest = Math.max(...results.map(r => r.ms))
        console.log(`L2-DROP-RESULT node=${victim.node} commands=${results.length} failed=${failed.length} slowestMs=${slowest} elapsedMs=${Date.now() - started} eventLoopMaxDelayMs=${maxDelayMs.toFixed(1)}`)
        expect(failed, 'commands to the silent node fail').to.have.lengthOf(results.length)
        expect(slowest, 'each fails within the timeout plus 500 ms').to.be.below(1500)
        expect(maxDelayMs, 'longest event loop delay, in ms').to.be.below(200)
      } finally {
        client.close()
      }
    })
  })

  describe('TLS (ee)', function () {
    before(function () {
      if (env.DISCOVERY_SUBSET !== 'ee' || (profile !== 'default' && profile !== 'cn-only')) this.skip()
      // A harness older than its TLS listeners on ee leaves the ports empty.
      if ((env.DISCOVERY_TLS_ENDPOINT_PORTS ?? '') === '') {
        console.log('L2-NOTE N-6: the topology has no TLS listeners (DISCOVERY_TLS_ENDPOINT_PORTS is empty)')
        this.skip()
      }
    })

    it('N-6: holds every node over TLS through its TLS listener', async function () {
      const clear = listeners(false)
      await readNodes(clear)
      const tls = listeners(true)
      expect(tls, 'TLS listeners').to.have.lengthOf(clear.length)
      tls.forEach((l, i) => { l.node = clear[i].node })
      const log = logFile()
      const client: any = await Aerospike.connect(config(tls, tls.map((_, i) => i), log, env.DISCOVERY_TLS_NAME))
      try {
        const names = tls.map(l => l.node as string)
        expect(await waitNodes(client, names, JOIN_MS)).to.eql([...names].sort())
        const ports = client.getNodes().map((n: any) => Number(n.address.split(':').pop()))
        const key = new Aerospike.Key(NAMESPACE, 'l2tls', 'n6')
        await client.put(key, { v: 1 })
        expect((await client.get(key)).bins.v).to.equal(1)
        const legacy = log.read().includes('only through the legacy name check')
        console.log(`L2-TLS-RESULT shape=${env.DISCOVERY_TLS_CERT_SHAPE} nodes=${names.length} ports=${ports.join(',')} legacyFallback=${legacy}`)
        if (env.DISCOVERY_TLS_CERT_SHAPE === 'cn-only') {
          // Accepted today only through the deprecated legacy check, which warns;
          // FR-45 rejects it in the next major release.
          expect(legacy, 'the CN-only certificate is accepted only with the deprecation warning').to.be.true
          console.log('L2-NOTE cn-only: accepted through the deprecated CN fallback; FR-45 rejects it in the next major release')
        } else {
          expect(legacy, 'a SAN certificate needs no legacy fallback').to.be.false
        }
      } finally {
        client.close()
      }
    })
  })
})
