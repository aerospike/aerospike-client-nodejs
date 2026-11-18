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

// The Node.js probe for the aws-tags real AWS harness in aerospike-client-conformance
// (aws-real/README.md there), run by test/discovery/aws-real.manifest as
// AWS_REAL_PROBE. Runs the aws-tags provider, built from a Node.js config, against
// real AWS in one of three modes and prints one JSON object on one line of stdout:
//
// - latency: a cold first refresh, credentials included, then AWS_REAL_WARM warm
//   refreshes;
// - denied: one refresh with the credentials in the environment;
// - join: a client seeded only by the provider joins the tagged nodes, then
//   AWS_REAL_REFRESHES refreshes are counted.
//
// Environment: AWS_REAL_REGION, AWS_REAL_TAG (key=value), and optionally
// AWS_REAL_WARM (default 20), AWS_REAL_EXPECTED_NODES (required by join),
// AWS_REAL_NAMESPACE (default test) and AWS_REAL_REFRESHES (default 30). An empty
// variable counts as unset. AWS_REAL_ENDPOINT, not part of the harness, points the
// provider at another EC2 endpoint for a local check against a stub.
//
// Exits with 2, printing nothing on stdout, on bad usage or a missing or invalid
// variable; otherwise exits with 0 once the JSON object is printed, also when it
// carries an error. Follows the C client's probe; the counts and the credentials
// source come from the C client's log, as there.

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const Aerospike = require('../../../lib/aerospike.js')
const native = require('../../../lib/native.js')

const AWS_PREFIX = 'AWS EC2 seed provider '
const CREDENTIALS_PREFIX = `${AWS_PREFIX}credentials from `
const REFRESH_FAILED = 'Seed provider aws-tags refresh failed'
const OVERRUN = 'exceeding refresh_timeout_ms'
const TRIPPED = 'exceeded tend_refresh_deadline_ms'
const JOIN_WAIT_MS = 60000
const POLL_MS = 100
const LINE = /^[^:]+:\d\d:\d\d [A-Z]+: [A-Z]+\s*\(\d+\) \[[^\]]*\] \[[^\]]*\] - (.*)$/

class Usage extends Error {}

function value (name: string): string | undefined {
  const v = process.env[name]
  return v === undefined || v === '' ? undefined : v
}

function required (name: string): string {
  const v = value(name)
  if (v === undefined) throw new Usage(`${name} is required`)
  return v
}

function count (name: string, fallback?: string): number {
  const v = value(name) ?? fallback
  if (v === undefined) throw new Usage(`${name} is required`)
  if (!/^\d+$/.test(v) || Number(v) === 0) throw new Usage(`${name} must be a positive integer, got '${v}'`)
  return Number(v)
}

function awsOptions (): any {
  const tag = required('AWS_REAL_TAG')
  const eq = tag.indexOf('=')
  if (eq <= 0 || eq === tag.length - 1) throw new Usage('AWS_REAL_TAG must be key=value')
  const aws: any = {
    region: required('AWS_REAL_REGION'),
    filters: [{ name: `tag:${tag.slice(0, eq)}`, values: [tag.slice(eq + 1)] }]
  }
  const endpoint = value('AWS_REAL_ENDPOINT')
  if (endpoint !== undefined) aws.endpoint = endpoint
  return aws
}

// The C client's log, written to a file: the messages since the last clear.
class Log {
  private readonly file = path.join(os.tmpdir(), `aws-real-probe-${process.pid}.log`)
  private offset = 0

  start (level: number): void {
    Aerospike.setDefaultLogging({ level, file: fs.openSync(this.file, 'w') })
  }

  messages (): string[] {
    const text = fs.readFileSync(this.file, 'utf8').slice(this.offset)
    const out: string[] = []
    for (const line of text.split('\n')) {
      const m = LINE.exec(line)
      if (m !== null) out.push(m[1])
    }
    return out
  }

  clear (): void {
    this.offset = fs.statSync(this.file).size
  }

  count (text: string): number {
    return this.messages().filter(m => m.includes(text)).length
  }

  refreshes (): number {
    return this.messages().filter(m => m.startsWith(AWS_PREFIX) && m.includes(' returned ')).length
  }

  credentialsSource (): string | null {
    const line = this.messages().find(m => m.startsWith(CREDENTIALS_PREFIX))
    return line === undefined ? null : line.slice(CREDENTIALS_PREFIX.length).trim()
  }

  remove (): void {
    try {
      fs.unlinkSync(this.file)
    } catch (err) {}
  }
}

function print (obj: any): void {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

function micros (start: bigint): number {
  return Number((process.hrtime.bigint() - start) / 1000n)
}

function createProvider (): number | { error: { message: string } } {
  const config = new Aerospike.Config({ discovery: { provider: 'aws-tags', aws: awsOptions() } })
  return native._conformance('providerCreate', config)
}

function latency (log: Log, warm: number): void {
  const out: any = { mode: 'latency' }
  const id = createProvider()
  if (typeof id !== 'number') {
    print(Object.assign(out, { credentials_source: log.credentialsSource(), error: id.error.message }))
    return
  }
  try {
    let start = process.hrtime.bigint()
    const cold = native._conformance('providerRefresh', id)
    const coldUs = micros(start)
    if (cold.status !== 0) {
      print(Object.assign(out, { credentials_source: log.credentialsSource(), error: cold.message }))
      return
    }
    const warmUs: number[] = []
    const failures: string[] = []
    for (let i = 0; i < warm; i++) {
      start = process.hrtime.bigint()
      const r = native._conformance('providerRefresh', id)
      warmUs.push(micros(start))
      if (r.status !== 0) failures.push(r.message)
    }
    print(Object.assign(out, {
      credentials_source: log.credentialsSource(),
      hosts: cold.hosts.map((h: any) => `${h.host}:${h.port}`),
      cold_us: coldUs,
      warm_us: warmUs,
      warm_failures: failures
    }))
  } finally {
    native._conformance('providerDestroy', id)
  }
}

function denied (log: Log): void {
  const out: any = { mode: 'denied' }
  const id = createProvider()
  if (typeof id !== 'number') {
    print(Object.assign(out, { credentials_source: log.credentialsSource(), error: id.error.message }))
    return
  }
  try {
    const r = native._conformance('providerRefresh', id)
    out.credentials_source = log.credentialsSource()
    if (r.status !== 0) out.error = r.message
    else out.hosts = r.hosts.map((h: any) => `${h.host}:${h.port}`)
    print(out)
  } finally {
    native._conformance('providerDestroy', id)
  }
}

// Node count, and partitions of ns whose master is a held node.
function counts (client: any, ns: string): { nodes: number, owned: number, partitions: number } {
  const routing = client.as_client._routing(ns)
  const nodes = routing?.nodes?.length ?? 0
  const masters: Array<string | null> = routing?.masters ?? []
  return { nodes, owned: masters.filter(m => m !== null).length, partitions: masters.length }
}

async function join (log: Log, expected: number, ns: string, refreshes: number): Promise<void> {
  const out: any = { mode: 'join' }
  const tendInterval = 1000
  let client: any
  try {
    client = await Aerospike.connect({
      tenderInterval: tendInterval,
      discovery: { provider: 'aws-tags', executionMode: 'thread', refreshIntervalMs: tendInterval, aws: awsOptions() }
    })
  } catch (err: any) {
    print(Object.assign(out, { error: err.message }))
    return
  }
  let error: string | undefined
  let c = counts(client, ns)
  let deadline = Date.now() + JOIN_WAIT_MS
  while (!(c.nodes >= expected && c.partitions > 0 && c.owned >= c.partitions)) {
    if (Date.now() > deadline) {
      error = `nodes=${c.nodes} owned=${c.owned} after 60s`
      break
    }
    await new Promise(resolve => setTimeout(resolve, POLL_MS))
    c = counts(client, ns)
  }
  if (error === undefined) {
    log.clear()
    const wait = refreshes * tendInterval + JOIN_WAIT_MS
    deadline = Date.now() + wait
    while (log.refreshes() < refreshes && log.count(TRIPPED) === 0) {
      if (Date.now() > deadline) {
        error = `only ${log.refreshes()} refreshes in ${wait}ms`
        break
      }
      await new Promise(resolve => setTimeout(resolve, POLL_MS))
    }
  }
  c = counts(client, ns)
  Object.assign(out, {
    nodes: c.nodes,
    owned_partitions: c.owned,
    partitions: c.partitions,
    refreshes: log.refreshes(),
    overruns: log.count(OVERRUN),
    failures: log.messages().filter(m => m.includes(REFRESH_FAILED)),
    tripped: log.count(TRIPPED) > 0
  })
  if (error !== undefined) out.error = error
  print(out)
  client.close()
}

async function main (): Promise<number> {
  const mode = process.argv[2]
  const log = new Log()
  try {
    if (process.argv.length !== 3 || !['latency', 'denied', 'join'].includes(mode)) {
      throw new Usage('usage: probe.ts latency|denied|join')
    }
    if (mode === 'latency') {
      const warm = count('AWS_REAL_WARM', '20')
      awsOptions()
      log.start(Aerospike.log.INFO)
      latency(log, warm)
    } else if (mode === 'denied') {
      awsOptions()
      log.start(Aerospike.log.INFO)
      denied(log)
    } else {
      const expected = count('AWS_REAL_EXPECTED_NODES')
      const refreshes = count('AWS_REAL_REFRESHES', '30')
      awsOptions()
      log.start(Aerospike.log.DEBUG)
      await join(log, expected, value('AWS_REAL_NAMESPACE') ?? 'test', refreshes)
    }
    return 0
  } catch (err: any) {
    if (err instanceof Usage) {
      process.stderr.write(`${err.message}\n`)
      return 2
    }
    throw err
  } finally {
    log.remove()
    try {
      Aerospike.releaseEventLoop()
    } catch (err) {
      // No client registered the event loop (latency and denied).
    }
  }
}

main().then(code => { process.exitCode = code })
