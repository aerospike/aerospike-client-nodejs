#!/usr/bin/env node
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

// The L5 driver for the pluggable discovery harnesses in
// aerospike-client-conformance (l5-aws/DRIVER.md there, contract version 5).
// It builds a client, applies a fixed load and reports what the client sees as
// JSON lines on stdout; the harness drives the disruptions and decides pass or
// fail. The same driver runs the L2 (l2-proxy) and L3 (l3-kind) rows.
//
// Run by test/discovery/l5-aws.manifest as L5_DRIVER.

const crypto = require('crypto')
const dns = require('dns')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')
const readline = require('readline')

const Aerospike = require('../../../lib/aerospike')
const { version: clientVersion } = require('../../../package.json')

const CONTRACT = 5
const PARTITIONS = 4096
const POLL_MS = 10
const HEARTBEAT_MS = 100
const REACH_INTERVAL_MS = 500
const REACH_TIMEOUT_MS = 1000
const PROBE_MS = 10
const PROBE_CONNECT_MS = 50
const SERVING_ROUNDS = 3
const USABLE_WAIT_MS = 60000
const KEY_SEARCH_LIMIT = 1000000
const QUIT_WAIT_MS = 30000
const LOG_POLL_MS = 50

const USAGE = 'usage: driver.js --seed HOST:PORT --shape pass-through|port-map ' +
  '[--port-map NODE=HOST:PORT,...] [--on-miss strict|pass-through] [--user USER] ' +
  '--tend-interval MS --timeout MS --namespace NS --set SET [--workers N] [--keys N] ' +
  '[--tls-name NAME --tls-ca-file PATH]'

// One monotonic clock for every t, in milliseconds since the driver started.
const START = process.hrtime.bigint()
function now () {
  return Number(process.hrtime.bigint() - START) / 1e6
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Stdout carries only JSON lines, each written synchronously so it is flushed
// as it is written and lines never interleave.
function write (obj) {
  const line = Buffer.from(JSON.stringify(obj) + '\n')
  let offset = 0
  while (offset < line.length) {
    try {
      offset += fs.writeSync(1, line, offset)
    } catch (err) {
      if (err.code !== 'EAGAIN') throw err
    }
  }
}

function message (err) {
  return err && err.message ? err.message : String(err)
}

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

class UsageError extends Error {}

// HOST:PORT with an IPv6 host in brackets.
function parseHostPort (value, flag) {
  const match = /^(\[[^\]]+\]|[^:[\]]+):(\d+)$/.exec(value || '')
  const port = match ? Number(match[2]) : 0
  if (!match || port < 1 || port > 65535) {
    throw new UsageError(`${flag} must be HOST:PORT, got '${value}'`)
  }
  return { host: match[1].replace(/^\[|\]$/g, ''), port }
}

function parsePositive (value, flag) {
  const n = Number(value)
  if (!/^\d+$/.test(value || '') || n < 1) {
    throw new UsageError(`${flag} must be a positive integer, got '${value}'`)
  }
  return n
}

function parseArgs (argv) {
  const known = ['--seed', '--shape', '--port-map', '--on-miss', '--user', '--tend-interval', '--timeout',
    '--namespace', '--set', '--workers', '--keys', '--tls-name', '--tls-ca-file']
  const values = {}
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]
    if (!known.includes(flag)) throw new UsageError(`unknown flag '${flag}'`)
    if (i + 1 >= argv.length) throw new UsageError(`${flag} needs a value`)
    values[flag] = argv[i + 1]
  }
  for (const flag of ['--seed', '--shape', '--tend-interval', '--timeout', '--namespace', '--set']) {
    if (values[flag] === undefined) throw new UsageError(`${flag} is required`)
  }
  const shape = values['--shape']
  if (shape !== 'pass-through' && shape !== 'port-map') {
    throw new UsageError(`--shape must be pass-through or port-map, got '${shape}'`)
  }
  const onMiss = values['--on-miss'] ?? 'strict'
  if (onMiss !== 'strict' && onMiss !== 'pass-through') {
    throw new UsageError(`--on-miss must be strict or pass-through, got '${onMiss}'`)
  }
  if (values['--port-map'] !== undefined && shape !== 'port-map') {
    throw new UsageError('--port-map is only valid with --shape port-map')
  }
  // A key that contains ':' is an advertised HOST:PORT, any other a node name;
  // each is passed to the port-map translator as given.
  const portMap = {}
  if (values['--port-map'] !== undefined) {
    for (const entry of values['--port-map'].split(',')) {
      const eq = entry.indexOf('=')
      if (eq <= 0) throw new UsageError(`--port-map entry must be KEY=HOST:PORT, got '${entry}'`)
      const target = entry.slice(eq + 1)
      parseHostPort(target, '--port-map target')
      portMap[entry.slice(0, eq)] = target
    }
  }
  if (values['--tls-ca-file'] !== undefined && values['--tls-name'] === undefined) {
    throw new UsageError('--tls-ca-file is only valid with --tls-name')
  }
  return {
    seed: parseHostPort(values['--seed'], '--seed'),
    shape,
    portMap,
    onMiss,
    user: values['--user'],
    tendInterval: parsePositive(values['--tend-interval'], '--tend-interval'),
    timeout: parsePositive(values['--timeout'], '--timeout'),
    namespace: values['--namespace'],
    set: values['--set'],
    workers: values['--workers'] === undefined ? 4 : parsePositive(values['--workers'], '--workers'),
    keys: values['--keys'] === undefined ? 1000 : parsePositive(values['--keys'], '--keys'),
    tlsName: values['--tls-name'],
    tlsCaFile: values['--tls-ca-file']
  }
}

// ---------------------------------------------------------------------------
// Client logs
// ---------------------------------------------------------------------------

// The C client writes its log to a file descriptor, so it goes to a temporary
// file that is read as it grows. Each WARN or ERROR line becomes a log object.
// Lines before ready go to stderr: ready is the first line on stdout.
class LogTail {
  constructor (isReady) {
    this.isReady = isReady
    this.file = path.join(os.tmpdir(), `aerospike-l5-driver-${process.pid}.log`)
    this.fd = fs.openSync(this.file, 'w+')
    this.offset = 0
    this.partial = ''
    this.timer = null
  }

  start () {
    this.timer = setInterval(() => this.read(), LOG_POLL_MS)
  }

  read () {
    const buffer = Buffer.alloc(65536)
    let n
    while ((n = fs.readSync(this.fd, buffer, 0, buffer.length, this.offset)) > 0) {
      this.offset += n
      const lines = (this.partial + buffer.toString('utf8', 0, n)).split('\n')
      this.partial = lines.pop()
      for (const line of lines) this.emit(line)
    }
  }

  emit (line) {
    const entry = parseLogLine(line)
    if (entry === null) return
    if (this.isReady()) write({ type: 'log', t: now(), level: entry.level, message: entry.message })
    else process.stderr.write(line + '\n')
  }

  stop () {
    if (this.timer) clearInterval(this.timer)
    this.read()
    fs.closeSync(this.fd)
    try {
      fs.unlinkSync(this.file)
    } catch (err) {}
  }
}

// A C client log line looks like "<date>: WARN(1234) [file.c:12] [fn] - message".
// Returns its level and message when it is WARN or ERROR, otherwise null.
function parseLogLine (line) {
  const match = /^[^:]+:\d\d:\d\d [A-Z]+: (WARN|ERROR)\s*\(\d+\) \[[^\]]*\] \[[^\]]*\] - (.*)$/.exec(line)
  return match === null ? null : { level: match[1], message: match[2] }
}

// ---------------------------------------------------------------------------
// Partition IDs
// ---------------------------------------------------------------------------

// The partition of a string key, from its digest as the client computes it:
// RIPEMD-160 over the set name, the string particle type and the key.
function partitionId (set, key) {
  const digest = crypto.createHash('ripemd160')
    .update(Buffer.concat([Buffer.from(set, 'utf8'), Buffer.from([3]), Buffer.from(key, 'utf8')]))
    .digest()
  return digest.readUInt16LE(0) & (PARTITIONS - 1)
}

// ---------------------------------------------------------------------------
// The driver
// ---------------------------------------------------------------------------

class Driver {
  constructor (options) {
    this.options = options
    this.client = null
    this.log = null
    this.stopping = false
    this.ready = false
    this.succeeded = 0
    this.failed = 0
    this.lastError = null
    this.maxLatencyMs = 0
    this.resetAt = 0
    this.reachable = new Map()
    this.lastRouting = null
    this.lastKey = null
    this.unownedSince = null
    this.longestUnownedMs = 0
    this.watching = null
    this.quitting = false
    this.workers = []
    this.timers = []
  }

  config () {
    const o = this.options
    const host = { addr: o.seed.host, port: o.seed.port }
    if (o.tlsName !== undefined) host.tlsname = o.tlsName
    const attempt = { socketTimeout: o.timeout, totalTimeout: o.timeout, maxRetries: 0 }
    const config = {
      hosts: [host],
      tenderInterval: o.tendInterval,
      connTimeoutMs: o.timeout,
      log: { level: Aerospike.log.WARN, file: this.log.fd },
      policies: {
        read: attempt,
        write: attempt,
        info: { timeout: o.timeout }
      },
      useAlternateAccessAddress: o.shape === 'pass-through',
      translation: o.shape === 'pass-through'
        ? { provider: 'pass-through', onMiss: o.onMiss === 'strict' ? 'strict' : 'passThrough' }
        : { provider: 'port-map', portMap: o.portMap, onMiss: o.onMiss === 'strict' ? 'strict' : 'passThrough' }
    }
    if (o.user !== undefined) {
      config.user = o.user
      config.password = process.env.AEROSPIKE_ADMIN_PASSWORD
    }
    if (o.tlsName !== undefined) {
      config.tls = { enable: true }
      if (o.tlsCaFile !== undefined) config.tls.cafile = o.tlsCaFile
    }
    return config
  }

  async start () {
    this.log = new LogTail(() => this.ready)
    Aerospike.setDefaultLogging({ level: Aerospike.log.WARN, file: this.log.fd })
    this.log.start()
    try {
      this.client = await Aerospike.connect(this.config())
    } catch (err) {
      write({ type: 'error', t: now(), message: message(err) })
      process.stderr.write(`could not create the client: ${message(err)}\n`)
      this.log.stop()
      process.exit(3)
    }
    for (let w = 0; w < this.options.workers; w++) {
      this.workers.push(this.work(w))
    }
    this.commands()
  }

  // Polling, heartbeats and reachability start with ready, the first line.
  startMonitors () {
    this.timers.push(setInterval(() => this.poll(false), POLL_MS))
    this.timers.push(setInterval(() => this.poll(true), HEARTBEAT_MS))
    this.timers.push(setInterval(() => this.checkReachable(), REACH_INTERVAL_MS))
    this.checkReachable()
    this.poll(true)
  }

  // --- load ---------------------------------------------------------------

  async work (w) {
    const o = this.options
    for (let i = 0; !this.stopping; i++) {
      const key = new Aerospike.Key(o.namespace, o.set, `load-${(w + i * o.workers) % o.keys}`)
      const firstAttempt = now()
      for (;;) {
        const startedAt = now()
        try {
          if (i % 2 === 0) {
            await this.client.put(key, { v: i })
          } else {
            await this.get(key)
          }
          break
        } catch (err) {
          this.failed++
          this.lastError = message(err)
          if (this.ready) write({ type: 'failure', t: now(), startedAt, message: this.lastError })
          if (this.stopping) return
          await sleep(o.tendInterval)
          if (this.stopping) return
        }
      }
      this.succeeded++
      const latency = now() - firstAttempt
      if (firstAttempt >= this.resetAt && latency > this.maxLatencyMs) this.maxLatencyMs = latency
      if (!this.ready) {
        this.ready = true
        write({
          type: 'ready',
          t: now(),
          contract: CONTRACT,
          epochMs: Date.now(),
          client: 'nodejs',
          clientVersion,
          shape: o.shape
        })
        this.startMonitors()
      }
    }
  }

  // A get of a key not written yet is a successful get that finds nothing, as
  // in the Java client, where get returns null rather than failing.
  async get (key) {
    try {
      return await this.client.get(key)
    } catch (err) {
      if (err.code === Aerospike.status.ERR_RECORD_NOT_FOUND) return null
      throw err
    }
  }

  // --- routing ------------------------------------------------------------

  routing () {
    const raw = this.client.as_client._routing(this.options.namespace)
    if (raw === null) return null
    // host is the address the client connects to, as in the C client's
    // driver: a seed node keeps the seed's host name in the client, which is
    // not the name it advertises, while its address is the same either way.
    const nodes = raw.nodes.map(n => ({
      name: n.name,
      host: n.address,
      port: n.port,
      address: n.address,
      active: n.active,
      reachable: this.reachable.has(n.name) ? this.reachable.get(n.name) : null
    })).sort((a, b) => a.name.localeCompare(b.name))
    const routing = { nodes }
    if (raw.masters) {
      const held = new Map(raw.nodes.map(n => [n.name, n]))
      const owners = {}
      let unowned = 0
      for (const master of raw.masters) {
        const node = master === null ? undefined : held.get(master)
        if (node === undefined || !node.active) unowned++
        if (master !== null) owners[master] = (owners[master] || 0) + 1
      }
      routing.unowned = unowned
      routing.owners = owners
    }
    return routing
  }

  // Track the longest stretch with unowned partitions since the last reset.
  trackUnowned (routing, t) {
    if (routing.unowned === undefined) return
    if (routing.unowned > 0 && this.unownedSince === null) this.unownedSince = t
    if (routing.unowned === 0 && this.unownedSince !== null) {
      this.longestUnownedMs = Math.max(this.longestUnownedMs, t - this.unownedSince)
      this.unownedSince = null
    }
  }

  poll (heartbeat) {
    if (this.quitting || this.client === null) return
    const t = now()
    const routing = this.routing()
    if (routing === null) return
    this.trackUnowned(routing, t)
    // A change is a node added or removed, a host, port or active change, or a
    // change of unowned; reachability alone is not.
    const key = JSON.stringify([routing.nodes.map(n => [n.name, n.host, n.port, n.active]), routing.unowned])
    const changed = this.lastKey !== null && key !== this.lastKey
    this.lastKey = key
    this.lastRouting = routing
    if (!heartbeat && !changed) return
    const snapshot = {
      type: 'snapshot',
      t,
      reason: changed && !heartbeat ? 'change' : 'heartbeat',
      nodes: routing.nodes
    }
    if (routing.unowned !== undefined) {
      const open = this.unownedSince === null ? 0 : t - this.unownedSince
      snapshot.unowned = routing.unowned
      snapshot.owners = routing.owners
      snapshot.longestUnownedMs = Math.max(this.longestUnownedMs, open)
    }
    snapshot.succeeded = this.succeeded
    snapshot.failed = this.failed
    snapshot.maxLatencyMs = this.maxLatencyMs
    snapshot.lastError = this.lastError
    write(snapshot)
  }

  checkReachable () {
    if (this.quitting || this.client === null) return
    const raw = this.client.as_client._routing(this.options.namespace)
    if (raw === null) return
    const names = new Set(raw.nodes.map(n => n.name))
    for (const name of this.reachable.keys()) {
      if (!names.has(name)) this.reachable.delete(name)
    }
    for (const name of names) {
      this.client.infoNode('node', { name }, { timeout: REACH_TIMEOUT_MS })
        .then(response => this.reachable.set(name, response.trim().split('\t').pop() === name))
        .catch(() => this.reachable.set(name, false))
    }
  }

  usable (name) {
    const routing = this.routing()
    if (routing === null) return false
    const node = routing.nodes.find(n => n.name === name)
    if (!node || !node.active) return false
    return routing.unowned === undefined || routing.unowned === 0
  }

  // --- commands -----------------------------------------------------------

  // Commands run one at a time, in order, as in the Java driver: serve and
  // large finish before the next command is read. A watch runs alongside, so
  // the load, the routing poll and later commands keep going.
  async commands () {
    const lines = readline.createInterface({ input: process.stdin, terminal: false })
    for await (const line of lines) {
      if (await this.command(line.trim()) === false) break
    }
    await this.quit()
  }

  // Runs one command line; returns false on quit.
  async command (line) {
    const words = line.split(/\s+/).filter(w => w !== '')
    if (words.length === 0) return true
    const malformed = () => write({ type: 'error', t: now(), message: `malformed command: ${line}` })
    switch (words[0]) {
      case 'serve':
        if (words.length !== 2) malformed()
        else await this.serve(words[1])
        return true
      case 'reset':
        if (words.length !== 1) malformed()
        else this.reset()
        return true
      case 'watch': {
        let valid = words.length === 3
        try {
          if (valid) parseHostPort(words[1], 'watch')
        } catch (err) {
          valid = false
        }
        if (!valid) malformed()
        else if (this.watching !== null) write({ type: 'error', t: now(), message: `a watch is already running: ${line}` })
        else this.watching = this.watch(words[1], words[2])
        return true
      }
      case 'large':
        if (words.length !== 4 || !/^\d+$/.test(words[2]) || !/^\d+$/.test(words[3])) malformed()
        else await this.large(words[1], Number(words[2]), Number(words[3]))
        return true
      case 'quit':
        if (words.length !== 1) {
          malformed()
          return true
        }
        return false
      default:
        write({ type: 'error', t: now(), message: `unknown command: ${line}` })
        return true
    }
  }

  reset () {
    const t = now()
    this.resetAt = t
    this.maxLatencyMs = 0
    this.longestUnownedMs = 0
    if (this.unownedSince !== null) this.unownedSince = t
    write({ type: 'reset', t })
  }

  // One attempt each, no retries: the policies set maxRetries to 0.
  async serve (step) {
    const o = this.options
    const started = now()
    const keys = new Array(PARTITIONS)
    let found = 0
    for (let i = 0; i < KEY_SEARCH_LIMIT && found < PARTITIONS; i++) {
      const candidate = `${step}-${i}`
      const partition = partitionId(o.set, candidate)
      if (keys[partition] === undefined) {
        keys[partition] = candidate
        found++
      }
    }
    let written = 0
    let read = 0
    let mismatched = 0
    let failures = 0
    let firstFailure = null
    for (let partition = 0; partition < PARTITIONS; partition++) {
      if (keys[partition] === undefined) {
        failures++
        firstFailure = firstFailure ?? `partition ${partition}: no key in ${KEY_SEARCH_LIMIT} candidates`
        continue
      }
      const key = new Aerospike.Key(o.namespace, o.set, keys[partition])
      const value = `${step}-${partition}`
      try {
        await this.client.put(key, { v: value })
        written++
      } catch (err) {
        failures++
        firstFailure = firstFailure ?? `partition ${partition} put: ${message(err)}`
        continue
      }
      try {
        const record = await this.get(key)
        if (record !== null && record.bins.v === value) read++
        else mismatched++
      } catch (err) {
        failures++
        firstFailure = firstFailure ?? `partition ${partition} get: ${message(err)}`
      }
    }
    write({
      type: 'served',
      t: now(),
      step,
      partitions: PARTITIONS,
      written,
      read,
      mismatched,
      failures,
      firstFailure,
      elapsedMs: now() - started
    })
  }

  async large (step, bytes, count) {
    const o = this.options
    const started = now()
    let written = 0
    let read = 0
    let mismatched = 0
    let failures = 0
    let firstFailure = null
    let maxMs = 0
    for (let i = 0; i < count; i++) {
      const name = `${step}-${i}`
      const key = new Aerospike.Key(o.namespace, o.set, name)
      const value = name.length >= bytes ? name.slice(0, bytes) : name + 'x'.repeat(bytes - name.length)
      let t = now()
      try {
        await this.client.put(key, { v: value })
        written++
      } catch (err) {
        failures++
        firstFailure = firstFailure ?? `${name} put: ${message(err)}`
        continue
      } finally {
        maxMs = Math.max(maxMs, now() - t)
      }
      t = now()
      try {
        const record = await this.get(key)
        if (record !== null && record.bins.v === value) read++
        else mismatched++
      } catch (err) {
        failures++
        firstFailure = firstFailure ?? `${name} get: ${message(err)}`
      } finally {
        maxMs = Math.max(maxMs, now() - t)
      }
    }
    write({
      type: 'large',
      t: now(),
      step,
      bytes,
      keys: count,
      written,
      read,
      mismatched,
      failures,
      firstFailure,
      maxMs,
      elapsedMs: now() - started
    })
  }

  // Probe HOST:PORT until every address it resolves to accepts connections in
  // 3 consecutive rounds, then wait for the client to use NODE.
  async watch (address, name) {
    const { host, port } = parseHostPort(address, 'watch')
    const seen = new Map()
    let consecutive = 0
    let servingAt = null
    let lastClosedAt = null
    let roundStart = null
    let next = now()
    while (servingAt === null && !this.quitting) {
      const start = now()
      let addresses = []
      try {
        addresses = (await dns.promises.lookup(host, { all: true, verbatim: true })).map(a => a.address)
      } catch (err) {}
      for (const a of addresses) if (!seen.has(a)) seen.set(a, null)
      const results = await Promise.all(addresses.map(a => connects(a, port)))
      results.forEach((ok, i) => {
        if (ok && seen.get(addresses[i]) === null) seen.set(addresses[i], start)
      })
      if (addresses.length > 0 && results.every(ok => ok)) {
        if (consecutive === 0) roundStart = start
        consecutive++
        if (consecutive === SERVING_ROUNDS) servingAt = roundStart
      } else {
        consecutive = 0
        lastClosedAt = start
      }
      next = Math.max(next + PROBE_MS, now())
      if (servingAt === null) await sleep(next - now())
    }
    let usableAt = null
    if (servingAt !== null) {
      while (!this.quitting && now() - servingAt < USABLE_WAIT_MS) {
        const t = now()
        if (this.usable(name)) {
          usableAt = t
          break
        }
        await sleep(POLL_MS)
      }
    }
    const routing = this.routing()
    write({
      type: 'watch',
      t: now(),
      address,
      node: name,
      servingAt,
      lastClosedAt,
      addresses: [...seen].map(([a, firstConnectedAt]) => ({ address: a, firstConnectedAt })),
      usableAt,
      usableMs: usableAt === null ? null : usableAt - servingAt,
      ownershipChecked: routing !== null && routing.unowned !== undefined
    })
    this.watching = null
  }

  // Stop the load and let a running watch reply, both within 30 s, then close
  // the client and exit 0.
  async quit () {
    if (this.stopping) return
    this.stopping = true
    const deadline = sleep(QUIT_WAIT_MS).then(() => { this.quitting = true })
    await Promise.race([Promise.allSettled(this.workers), deadline])
    if (this.watching !== null) await Promise.race([this.watching, deadline])
    // Past the deadline a watch stops probing and still writes its reply.
    this.quitting = true
    if (this.watching !== null) await this.watching
    for (const timer of this.timers) clearInterval(timer)
    if (this.client !== null) this.client.close(true)
    this.log.stop()
    process.exit(0)
  }
}

// Whether a TCP connection to address:port opens within the probe timeout.
function connects (address, port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: address, port })
    const done = ok => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(PROBE_CONNECT_MS, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

function main () {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (err) {
    if (!(err instanceof UsageError)) throw err
    process.stderr.write(`${err.message}\n${USAGE}\n`)
    process.exit(2)
  }
  new Driver(options).start()
}

if (require.main === module) {
  main()
}

// For the driver's own tests.
module.exports = { parseArgs, parseHostPort, parseLogLine, partitionId, UsageError, CONTRACT, PARTITIONS }
