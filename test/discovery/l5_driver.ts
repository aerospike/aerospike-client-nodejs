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

// Tests for the L5 driver (test/discovery/l5/driver.js), the program the
// pluggable discovery harnesses in aerospike-client-conformance run. The
// harnesses themselves (l2-proxy, l3-kind, l5-aws) are run outside this suite.

import { expect } from 'chai'
import { spawn } from 'child_process'
import * as net from 'net'
import * as path from 'path'
import * as Aerospike from '../../lib/aerospike.js'
import * as helper from '../test_helper.ts'
import { info } from './helpers.ts'

const driverPath = path.join(__dirname, 'l5', 'driver.js')
const driver = require('./l5/driver.js')

interface Run {
  code: number | null
  lines: any[]
  stdout: string
  stderr: string
}

// Runs the driver with the given flags, sending each command after its delay
// in milliseconds, and closing stdin after the last one.
async function runDriver (args: string[], script: Array<[number, string]> = [], timeoutMs = 60000): Promise<Run> {
  const child = spawn(process.execPath, [driverPath, ...args], { stdio: ['pipe', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  const exited = new Promise<number | null>(resolve => child.on('exit', code => resolve(code)))
  const killer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
  for (const [delayMs, line] of script) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    child.stdin.write(line + '\n')
  }
  child.stdin.end()
  const code = await exited
  clearTimeout(killer)
  const lines = stdout.split('\n').filter(l => l !== '').map(l => JSON.parse(l))
  return { code, lines, stdout, stderr }
}

describe('L5 driver #noserver', function () {
  const required = ['--seed', '127.0.0.1:3000', '--shape', 'port-map', '--tend-interval', '250',
    '--timeout', '1000', '--namespace', 'test', '--set', 'l5', '--port-map', 'A=h:1']

  describe('flags', function () {
    it('reads the required flags and applies the defaults', function () {
      const options = driver.parseArgs(required)
      expect(options.seed).to.eql({ host: '127.0.0.1', port: 3000 })
      expect(options).to.include({ shape: 'port-map', onMiss: 'strict', tendInterval: 250, timeout: 1000, namespace: 'test', set: 'l5', workers: 4, keys: 1000 })
      expect(options.portMap).to.eql({ A: 'h:1' })
      expect(options.user).to.be.undefined
      expect(options.tlsName).to.be.undefined
    })

    it('takes port-map keys as node names or advertised HOST:PORT, as given', function () {
      const options = driver.parseArgs([...required, '--port-map', 'BB9A=gw.example:31001,10.0.0.5:3000=gw.example:31002,BB9C=[::1]:3000'])
      expect(options.portMap).to.eql({ BB9A: 'gw.example:31001', '10.0.0.5:3000': 'gw.example:31002', BB9C: '[::1]:3000' })
    })

    it('reads an IPv6 seed and the optional flags', function () {
      const password = process.env.AEROSPIKE_ADMIN_PASSWORD
      process.env.AEROSPIKE_ADMIN_PASSWORD = 'secret'
      try {
        const args = ['--seed', '[::1]:4000', '--shape', 'pass-through', '--on-miss', 'pass-through', '--user', 'admin',
          '--tend-interval', '100', '--timeout', '500', '--namespace', 'n', '--set', 's', '--workers', '2', '--keys', '10',
          '--tls-name', 'tls1', '--tls-ca-file', '/ca.pem']
        expect(driver.parseArgs(args)).to.include({ shape: 'pass-through', onMiss: 'pass-through', user: 'admin', workers: 2, keys: 10, tlsName: 'tls1', tlsCaFile: '/ca.pem' })
        expect(driver.parseArgs(args).seed).to.eql({ host: '::1', port: 4000 })
      } finally {
        if (password === undefined) delete process.env.AEROSPIKE_ADMIN_PASSWORD
        else process.env.AEROSPIKE_ADMIN_PASSWORD = password
      }
    })

    const invalid: Array<[string, string[], RegExp]> = [
      ['an unknown flag', [...required, '--bogus', '1'], /unknown flag '--bogus'/],
      ['a flag without a value', [...required, '--workers'], /--workers needs a value/],
      ['a missing required flag', required.slice(2), /--seed is required/],
      ['an unknown shape', ['--seed', 'h:1', '--shape', 'nat', ...required.slice(4)], /--shape must be pass-through or port-map/],
      ['an unknown on-miss', [...required, '--on-miss', 'drop'], /--on-miss must be strict or pass-through/],
      ['a seed without a port', ['--seed', 'h', ...required.slice(2)], /--seed must be HOST:PORT/],
      ['a seed port of 0', ['--seed', 'h:0', ...required.slice(2)], /--seed must be HOST:PORT/],
      ['a timeout that is not a number', [...required.slice(0, 6), '--timeout', 'x', ...required.slice(8)], /--timeout must be a positive integer/],
      ['port-map with the pass-through shape', ['--seed', 'h:1', '--shape', 'pass-through', ...required.slice(4), '--port-map', 'A=h:1'], /--port-map is only valid with --shape port-map/],
      ['a port-map entry without a target', [...required, '--port-map', 'A'], /--port-map entry must be KEY=HOST:PORT/],
      ['a port-map target without a port', [...required, '--port-map', 'A=gw'], /--port-map target must be HOST:PORT/],
      ['the port-map shape without a port map', required.slice(0, 12), /--shape port-map needs --port-map/],
      ['a CA file without a TLS name', [...required, '--tls-ca-file', '/ca.pem'], /--tls-ca-file is only valid with --tls-name/]
    ]

    invalid.forEach(([name, args, message]) => {
      it(`rejects ${name}`, function () {
        expect(() => driver.parseArgs(args)).to.throw(driver.UsageError, message)
      })
    })

    it('rejects a user without a password in the environment', function () {
      const password = process.env.AEROSPIKE_ADMIN_PASSWORD
      delete process.env.AEROSPIKE_ADMIN_PASSWORD
      try {
        expect(() => driver.parseArgs([...required, '--user', 'admin']))
          .to.throw(driver.UsageError, /--user needs AEROSPIKE_ADMIN_PASSWORD/)
      } finally {
        if (password !== undefined) process.env.AEROSPIKE_ADMIN_PASSWORD = password
      }
    })
  })

  describe('client log lines', function () {
    it('keeps WARN and ERROR lines, with and without a space before the pid', function () {
      expect(driver.parseLogLine('Nov 16 2026 05:01:50 UTC: WARN (9017) [as_cluster.c:490] [as_cluster_seed_node] - Failed to connect to seed'))
        .to.eql({ level: 'WARN', message: 'Failed to connect to seed' })
      expect(driver.parseLogLine('Nov 13 2026 06:22:20 UTC: ERROR(36152) [aerospike.c:89] [aerospike_defaults] - Failed to parse: x.yml'))
        .to.eql({ level: 'ERROR', message: 'Failed to parse: x.yml' })
    })

    it('ignores lower levels and lines that are not log lines', function () {
      expect(driver.parseLogLine('Nov 16 2026 05:01:50 UTC: INFO (9017) [as_cluster.c:1] [fn] - Add node')).to.be.null
      expect(driver.parseLogLine('Nov 16 2026 05:01:50 UTC: DEBUG (9017) [as_cluster.c:1] [fn] - x')).to.be.null
      expect(driver.parseLogLine('Expected event 6. Received event: 9 Offset: 171')).to.be.null
      expect(driver.parseLogLine('')).to.be.null
    })
  })

  describe('partition IDs', function () {
    it('returns the partition of a string key in its set', function () {
      // The client's digest, checked against the server's below.
      expect(driver.partitionId('l5probe', 'smoke-0')).to.equal(1902)
      for (let i = 0; i < 1000; i++) {
        const id = driver.partitionId('l5', `k-${i}`)
        expect(id).to.be.within(0, driver.PARTITIONS - 1)
      }
    })
  })

  describe('exit status', function () {
    this.timeout(30000)

    it('exits 2 on bad flags, with the reason and usage on stderr and nothing on stdout', async function () {
      const run = await runDriver(['--shape', 'nope'])
      expect(run.code).to.equal(2)
      expect(run.stdout).to.equal('')
      expect(run.stderr).to.match(/--seed is required/).and.match(/^usage: driver.js/m)
    })

    it('exits 3 when the client cannot be created, with an error line', async function () {
      // Port 1 refuses the connection.
      const run = await runDriver(['--seed', '127.0.0.1:1', '--shape', 'pass-through', '--tend-interval', '250',
        '--timeout', '500', '--namespace', 'test', '--set', 'l5'])
      expect(run.code).to.equal(3)
      expect(run.lines).to.have.lengthOf(1)
      expect(run.lines[0]).to.include({ type: 'error' })
      expect(run.lines[0].message).to.be.a('string').that.is.not.empty
      expect(run.stderr).to.match(/could not create the client/)
    })
  })
})

describe('L5 driver against a server', function () {
  this.timeout(120000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null
  let nodeName: string
  let args: string[]

  before(async function () {
    if (!seed) this.skip()
    const client = await Aerospike.connect(helper.config)
    try {
      const nodes = client.getNodes()
      // One node, so the port-map has one entry and the watch has one node.
      if (nodes.length !== 1) this.skip()
      nodeName = nodes[0].name
    } finally {
      client.close()
    }
    args = ['--seed', `${seed.addr}:${seed.port}`, '--shape', 'port-map', '--port-map', `${nodeName}=${seed.addr}:${seed.port}`,
      '--tend-interval', '250', '--timeout', '1000', '--namespace', helper.namespace, '--set', 'l5-driver-test']
    if (helper.config.user) args.push('--user', helper.config.user)
  })

  it('computes the partition ID the server stores the key under', async function () {
    const client = await Aerospike.connect(helper.config)
    try {
      for (let i = 0; i < 20; i++) {
        const key = new Aerospike.Key(helper.namespace, 'l5-driver-test', `digest-${i}`)
        await client.put(key, { v: i })
        const record = await client.get(key)
        const digest: Buffer = record.key.digest as any
        expect(driver.partitionId('l5-driver-test', `digest-${i}`)).to.equal(digest.readUInt16LE(0) & 4095)
        await client.remove(key)
      }
    } finally {
      client.close()
    }
  })

  it('runs a session: ready, snapshots, serve, reset, large, watch, errors and quit', async function () {
    // A listener the watch probes, opened while the watch runs.
    const listener = net.createServer(socket => socket.destroy())
    await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()))
    const probePort = (listener.address() as net.AddressInfo).port
    await new Promise<void>(resolve => listener.close(() => resolve()))

    const env = Object.assign({}, process.env)
    if (helper.config.password) process.env.AEROSPIKE_ADMIN_PASSWORD = helper.config.password
    let reopened: net.Server | null = null
    // The watch starts first, so it sees the port closed before it opens; a
    // watch runs alongside the commands after it.
    const opener = setTimeout(() => {
      reopened = net.createServer(socket => socket.destroy()).listen(probePort, '127.0.0.1')
    }, 3000)
    let run: Run
    try {
      run = await runDriver(args, [
        [2000, `watch 127.0.0.1:${probePort} ${nodeName}`],
        [100, `watch 127.0.0.1:${probePort} ${nodeName}`],
        [100, 'serve test-step'],
        [100, 'reset'],
        [100, 'large big 1000 3'],
        [100, 'bogus command'],
        [100, 'serve'],
        [100, 'quit']
      ])
    } finally {
      clearTimeout(opener)
      process.env = env
      if (reopened !== null) (reopened as net.Server).close()
    }

    expect(run.code, run.stderr).to.equal(0)
    const types = run.lines.map(l => l.type)
    expect(types[0]).to.equal('ready')
    const ts = run.lines.map(l => l.t)
    expect(ts).to.eql([...ts].sort((a, b) => a - b))

    const ready = run.lines[0]
    expect(ready).to.include({ contract: driver.CONTRACT, client: 'nodejs', shape: 'port-map' })
    expect(ready.epochMs).to.be.a('number')
    expect(ready.clientVersion).to.be.a('string')

    const snapshots = run.lines.filter(l => l.type === 'snapshot')
    expect(snapshots.length).to.be.at.least(20)
    const last = snapshots[snapshots.length - 1]
    expect(last).to.have.keys('type', 't', 'reason', 'nodes', 'unowned', 'owners', 'longestUnownedMs', 'succeeded', 'failed', 'maxLatencyMs', 'lastError')
    expect(last.nodes).to.have.lengthOf(1)
    expect(last.nodes[0]).to.include({ name: nodeName, port: seed.port, active: true, reachable: true })
    expect(last.nodes[0].host).to.equal(last.nodes[0].address)
    expect(last.unowned).to.equal(0)
    expect(last.owners).to.eql({ [nodeName]: 4096 })
    expect(last.succeeded).to.be.above(0)
    const heartbeats = snapshots.filter(s => s.reason === 'heartbeat').map(s => s.t)
    const gaps = heartbeats.slice(1).map((t, i) => t - heartbeats[i])
    expect(Math.max(...gaps)).to.be.below(300)

    const served = run.lines.find(l => l.type === 'served')
    expect(served).to.include({ step: 'test-step', partitions: 4096, written: 4096, read: 4096, mismatched: 0, failures: 0, firstFailure: null })

    expect(run.lines.filter(l => l.type === 'reset')).to.have.lengthOf(1)

    const large = run.lines.find(l => l.type === 'large')
    expect(large).to.include({ step: 'big', bytes: 1000, keys: 3, written: 3, read: 3, mismatched: 0, failures: 0 })

    const errors = run.lines.filter(l => l.type === 'error').map(l => l.message)
    expect(errors).to.include('unknown command: bogus command')
    expect(errors).to.include('malformed command: serve')
    expect(errors).to.include(`a watch is already running: watch 127.0.0.1:${probePort} ${nodeName}`)

    const watch = run.lines.find(l => l.type === 'watch')
    expect(watch).to.include({ address: `127.0.0.1:${probePort}`, node: nodeName, ownershipChecked: true })
    expect(watch.servingAt).to.be.a('number')
    expect(watch.lastClosedAt).to.be.a('number').and.below(watch.servingAt)
    expect(watch.addresses).to.eql([{ address: '127.0.0.1', firstConnectedAt: watch.servingAt }])
    expect(watch.usableAt).to.be.at.least(watch.servingAt)
    expect(watch.usableMs).to.equal(watch.usableAt - watch.servingAt)
  })

  it('treats the end of input as quit', async function () {
    const run = await runDriver(args, [[1500, 'reset']])
    expect(run.code, run.stderr).to.equal(0)
    expect(run.lines[0].type).to.equal('ready')
    expect(run.lines.map(l => l.type)).to.include('reset')
  })
})

// Local test only, not for CI: the multi-node cluster of translation_cluster.ts,
// with TLS on each node's port + 10 for the TLS name "ipmap-tls". Skipped unless
// IPMAP_CLUSTER_SEED and IPMAP_CLUSTER_CA are set.
describe('L5 driver over TLS against a multi-node cluster', function () {
  this.timeout(120000)

  const seedEnv = process.env.IPMAP_CLUSTER_SEED
  const caFile = process.env.IPMAP_CLUSTER_CA

  if (!seedEnv || !caFile) {
    it.skip('set IPMAP_CLUSTER_SEED and IPMAP_CLUSTER_CA to run')
    return
  }

  const [seedHost, seedPortText] = seedEnv.split(':')
  const seedPort = Number(seedPortText)
  let portMap: string

  // Every node by name, at its TLS port.
  before(async function () {
    const peers = await info(seedHost, seedPort, 'peers-clear-std')
    const ports = [...peers.matchAll(/\[([0-9A-F]+),[^,]*,\[([^\]]*)\]\]/g)].map(m => Number(m[2].split(':').pop()))
    ports.push(seedPort)
    const entries = await Promise.all(ports.map(async port => `${(await info(seedHost, port, 'node')).trim()}=${seedHost}:${port + 10}`))
    portMap = entries.join(',')
  })

  function tlsArgs (tlsName: string): string[] {
    return ['--seed', `${seedHost}:${seedPort + 10}`, '--shape', 'port-map', '--port-map', portMap,
      '--tend-interval', '250', '--timeout', '2000', '--namespace', 'test', '--set', 'l5-driver-tls',
      '--tls-name', tlsName, '--tls-ca-file', caFile as string]
  }

  it('holds every node on its TLS port and serves every partition', async function () {
    const run = await runDriver(tlsArgs('ipmap-tls'), [[3000, 'serve tls'], [100, 'quit']])
    expect(run.code, run.stderr).to.equal(0)
    expect(run.lines[0].type).to.equal('ready')
    const last = run.lines.filter(l => l.type === 'snapshot').pop()
    const count = portMap.split(',').length
    expect(last.nodes).to.have.lengthOf(count)
    expect(last.nodes.every((n: any) => n.active && n.reachable && n.port % 100 === 10)).to.be.true
    expect(run.lines.find(l => l.type === 'served')).to.include({ written: 4096, read: 4096, failures: 0 })
  })

  it('exits 3 when the certificate does not match the TLS name', async function () {
    const run = await runDriver(tlsArgs('wrong-name'))
    expect(run.code).to.equal(3)
    expect(run.lines).to.have.lengthOf(1)
    expect(run.lines[0].type).to.equal('error')
  })
})
