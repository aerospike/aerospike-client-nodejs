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

// L1 conformance runner for the Node.js client: runs the aerospike-client-conformance
// fixture set and writes the shared report (schema/report.schema.json there).
//
//   npx tsx test/discovery/l1/runner.ts --fixtures <dir> --declarations <file> --report <path>
//
// Every *.yaml under <dir>/discovery and <dir>/tls is a fixture file. Each row's
// config is turned into a Node.js config and validated by Node's own Config, as
// an application's would be, then run through the C client's built-ins the
// Node.js client uses: translate, collision and merge through the C conformance
// entry points, dns and aws-tags through the providers Node's config builds,
// against the conformance fixture server, and tls through the C client's name
// matching. A blocked row is reported blocked; nothing is skipped. The actual
// result of every row is compared with its declaration in <file>
// (nodejs-declared.yaml); a row not declared there is declared pass, or blocked
// when the fixture row is blocked. Follows the C client's conformance runner.
//
// Exit codes: 0 when every result equals its declaration and the report was
// written; 1 on any mismatch (the report is still written); 2 on a usage, I/O,
// fixture, declaration or fixture-server error, which leaves no report.

import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as net from 'net'
import * as path from 'path'
import * as readline from 'readline'

const yaml = require('js-yaml')
const Aerospike = require('../../../lib/aerospike.js')
const native = require('../../../lib/native.js')
const { version: clientVersion } = require('../../../package.json')

const RUNTIME = 'nodejs'
const KINDS = ['translate', 'collision', 'merge', 'tls', 'dns', 'aws-tags']
const FIXTURE_SERVER = 'discovery/providers/fixture-server.py'
const PROVIDER_TIMEOUT_MS = 2000
const ACCESS_KEY = 'AKIDCONFORMANCE00000'
const SECRET_KEY = 'conformance-secret-key-not-real'
const SESSION_TOKEN = 'conformance-session-token-not-real'
const DNS_KEYS = ['names', 'record_type', 'port', 'tls_name', 'timeout_ms']
const AWS_KEYS = ['region', 'filters', 'address_field', 'port', 'tls_name', 'timeout_ms']

class Fatal extends Error {}

type Result = 'pass' | 'fail' | 'unsupported' | 'blocked'
interface Outcome { result: Result, reason?: string }
interface Row {
  file: string
  dir: string
  kind: string
  name: string
  node: any
  blockedBy?: string
  declared: Result
  declaredReason?: string
  outcome?: Outcome
}
interface Host { host: string, port: number, tlsName: string | null }

const pass = (): Outcome => ({ result: 'pass' })
const fail = (reason: string): Outcome => ({ result: 'fail', reason })
const unsupported = (reason: string): Outcome => ({ result: 'unsupported', reason })

function die (message: string): never {
  throw new Fatal(message)
}

// --- Facts in error messages, as the C runner matches them ----------------------

function isHostChar (c: string): boolean {
  return /[a-zA-Z0-9.:-]/.test(c)
}

// endpoint ("<host>:<port>") as a whole token of message, so port 3000 doesn't
// match 30001 and host 0.0.1 doesn't match 10.0.0.1.
function containsEndpoint (message: string, endpoint: string): boolean {
  for (let i = message.indexOf(endpoint); i >= 0; i = message.indexOf(endpoint, i + 1)) {
    const before = i === 0 ? '' : message[i - 1]
    const after = message[i + endpoint.length] ?? ''
    if ((i === 0 || !isHostChar(before)) && !/[0-9]/.test(after)) return true
  }
  return false
}

// The first fact of messageContains missing from message, or null. A map's host
// and port match together as one <host>:<port> token; every other value, and
// each element of a list value, matches as a substring.
function missingFact (message: string, facts: any): string | null {
  if (facts === undefined || facts === null) return null
  if (Array.isArray(facts)) {
    for (const f of facts) if (!message.includes(String(f))) return String(f)
    return null
  }
  if (typeof facts !== 'object') die('messageContains must be a map or a list')
  const endpoint = facts.host !== undefined && facts.port !== undefined
  if (endpoint) {
    const token = `${facts.host}:${facts.port}`
    if (!containsEndpoint(message, token)) return token
  }
  for (const [key, value] of Object.entries(facts)) {
    if (endpoint && (key === 'host' || key === 'port')) continue
    const values = Array.isArray(value) ? value : [value]
    for (const v of values) if (!message.includes(String(v))) return String(v)
  }
  return null
}

// --- Config ------------------------------------------------------------------------

// The row's translation, through Node's Config: ip_map, or translation with
// provider static-map (static_map), port-map (port_map) or pass-through, and
// on_miss. Returns the translation for the native call, an unsupported reason,
// or a fail when Node rejects the config.
function translation (config: any): { t?: any, outcome?: Outcome } {
  const options: any = {}
  if (config.ip_map !== undefined) options.ipMap = config.ip_map
  const tr = config.translation
  if (tr !== undefined) {
    const provider = tr.provider
    if (!['static-map', 'port-map', 'pass-through'].includes(provider)) {
      return { outcome: unsupported(`translator ${provider} is not implemented`) }
    }
    const translationOptions: any = { provider }
    if (tr.static_map !== undefined) translationOptions.staticMap = tr.static_map
    if (tr.port_map !== undefined) translationOptions.portMap = tr.port_map
    if (tr.on_miss !== undefined) translationOptions.onMiss = tr.on_miss === 'pass_through' ? 'passThrough' : tr.on_miss
    options.translation = translationOptions
  }
  let normalized: any
  try {
    normalized = new Aerospike.Config(options)
  } catch (err: any) {
    return { outcome: fail(`Node rejects the config: ${err.message}`) }
  }
  const nt = normalized.translation
  const kind = nt?.provider ?? 'static-map'
  const map = kind === 'port-map' ? nt.portMap : normalized.ipMap
  return { t: { kind, onMiss: nt?.onMiss ?? 'passThrough', map: map ?? {} } }
}

function endpoint (input: any): any {
  if (input === null || typeof input !== 'object') die('an advertised endpoint must be a map')
  if (!['standard', 'alternate'].includes(input.sourceList)) die(`unknown sourceList ${input.sourceList}`)
  return { nodeName: input.nodeName, tlsName: input.tlsName ?? null, host: input.host, port: input.port, sourceList: input.sourceList }
}

// The endpoints of one collision peer: its hosts, in order, or its one host and
// port. Consecutive endpoints with the same node name are the hosts of one peer
// (C's as_discovery_conformance_collision), as in the C client's runner.
function peerEndpoints (peer: any): any[] {
  if (peer === null || typeof peer !== 'object') die('a collision peer must be a map')
  const list = peer.hosts
  if (list === undefined || list === null) return [endpoint(peer)]
  if (!Array.isArray(list) || list.length === 0) die('hosts must be a non-empty list')
  if (peer.host !== undefined || peer.port !== undefined) die('a collision peer has hosts or host and port, not both')
  return list.map((h: any) => endpoint({ ...peer, hosts: undefined, host: h.host, port: h.port }))
}

function hostText (h: Host): string {
  return `${h.host}:${h.port}`
}

// --- Rows ----------------------------------------------------------------------------

function runTranslate (r: Row): Outcome {
  const { config, input, expect } = r.node
  const { t, outcome } = translation(config)
  if (outcome !== undefined) return outcome
  const got = native._conformance('translate', t, endpoint(input))
  const error = expect.error
  if (got.error !== undefined) {
    if (got.error.code !== Aerospike.status.ERR_TRANSLATION_MISS) {
      return fail(`translate failed with status ${got.error.code}: ${got.error.message}`)
    }
    if (error === undefined || error.category !== 'translation-miss') return fail(`translation miss: ${got.error.message}`)
    const missing = missingFact(got.error.message, error.messageContains)
    return missing === null ? pass() : fail(`message does not contain ${missing}: ${got.error.message}`)
  }
  const gotText = `${got.host} ${got.port} ${got.tlsName ?? 'null'}`
  if (error !== undefined) return fail(`expected ${error.category} error, got ${gotText}`)
  const expected = `${expect.host} ${expect.port} ${expect.tlsName ?? 'null'}`
  return expected === gotText ? pass() : fail(`expected ${expected}, got ${gotText}`)
}

function collisionReports (message: string, error: any): boolean {
  return error.category === 'translation-collision' && missingFact(message, error.messageContains) === null
}

function runCollision (r: Row): Outcome {
  const { config, input, expect } = r.node
  const { t, outcome } = translation(config)
  if (outcome !== undefined) return outcome
  const peers = input.flatMap(peerEndpoints)
  if (peers.some((p: any) => p.sourceList !== peers[0].sourceList)) {
    return fail('one peers reply cannot mix standard and alternate peers')
  }
  const got = native._conformance('collision', t, peers)
  if (got.error !== undefined) return fail(`collision check failed with status ${got.error.code}: ${got.error.message}`)
  for (const error of expect.errors) {
    if (!got.errors.some((m: string) => collisionReports(m, error))) {
      return fail(`no ${error.category} reported naming ${JSON.stringify(error.messageContains)}, got [${got.errors.join(', ')}]`)
    }
  }
  for (const m of got.errors) {
    if (!expect.errors.some((error: any) => collisionReports(m, error))) return fail(`unexpected collision: ${m}`)
  }
  const expectedNodes = [...expect.nodes].sort()
  const gotNodes = [...got.nodes].sort()
  if (JSON.stringify(expectedNodes) !== JSON.stringify(gotNodes)) {
    return fail(`expected nodes [${expectedNodes.join(', ')}], got [${gotNodes.join(', ')}]`)
  }
  return pass()
}

function hosts (list: any): Host[] {
  if (!Array.isArray(list)) die('a host list must be a list')
  return list.map((h: any) => ({ host: h.host, port: h.port, tlsName: h.tlsName ?? null }))
}

function mergePolicy (config: any): string {
  const policy = config.discovery?.merge_policy ?? 'merge'
  if (!['merge', 'replace', 'discovery_only'].includes(policy)) die(`unknown merge_policy ${policy}`)
  return policy
}

function runMerge (r: Row): Outcome {
  const { config, input, expect } = r.node
  const results = input.discoveryResults
  const expected = expect.snapshots
  if (results.length === 0 || expected.length !== results.length) die('a merge row needs one snapshot per discovery result')
  const policy = mergePolicy(config)
  // Node validates the policy name in its own spelling.
  const nodePolicy = { merge: 'merge', replace: 'replace', discovery_only: 'discoveryOnly' }[policy]
  try {
    // eslint-disable-next-line no-new
    new Aerospike.Config({ discovery: { mergePolicy: nodePolicy } })
  } catch (err: any) {
    return fail(`Node rejects the config: ${err.message}`)
  }
  const got = native._conformance('merge', policy, config.seeds === undefined || config.seeds === null ? [] : hosts(config.seeds), results.map(hosts))
  if (got.error !== undefined) return fail(`merge failed with status ${got.error.code}: ${got.error.message}`)
  for (let i = 0; i < results.length; i++) {
    const e = hosts(expected[i]).map(hostText).join(', ')
    const g = got.snapshots[i].map(hostText).join(', ')
    if (e !== g) return fail(`snapshot ${i}: expected [${e}], got [${g}]`)
  }
  return pass()
}

function runTls (r: Row): Outcome {
  const { input, expect } = r.node
  if (!['accept', 'reject'].includes(expect.outcome)) die(`unknown outcome ${expect.outcome}`)
  const cert = path.join(r.dir, 'certs', `${input.shape}.pem`)
  if (!fs.existsSync(cert)) die(`cannot open certificate ${cert}`)
  const kind = native._conformance('tlsMatch', cert, input.tlsName)
  if (typeof kind !== 'string') die(`${cert}: ${kind.error.message}`)
  // Production accepts both the strict match and the deprecated legacy name check.
  const got = kind === 'none' ? 'reject' : 'accept'
  if (got !== expect.outcome) {
    return fail(`expected ${expect.outcome}, got ${got}${kind === 'legacy' ? ' through the legacy name check' : ''}`)
  }
  return pass()
}

// --- Providers ----------------------------------------------------------------------

let server: ChildProcess | null = null
let ports: { http: number, dns: number } | null = null

async function startFixtureServer (fixtures: string, reportDir: string): Promise<void> {
  const script = path.join(fixtures, FIXTURE_SERVER)
  if (!fs.existsSync(script)) die(`fixture server not found: ${script}`)
  const log = fs.openSync(path.join(reportDir, 'fixture-server.log'), 'w')
  server = spawn('python3', [script], { stdio: ['ignore', 'pipe', log] })
  ports = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Fatal('the fixture server printed no ports line within 10000 ms')), 10000)
    server?.on('error', err => reject(new Fatal(`python3 is required to run the dns and aws-tags fixtures: ${err.message}`)))
    readline.createInterface({ input: server?.stdout as any }).once('line', line => {
      clearTimeout(timer)
      try {
        resolve(JSON.parse(line))
      } catch (err) {
        reject(new Fatal(`unexpected fixture server ports line: ${line}`))
      }
    })
  })
}

function stopFixtureServer (): void {
  if (server !== null) server.kill()
  server = null
}

// POST /fixture/select with Connection: close; the server keeps HTTP/1.1
// connections open otherwise.
function selectRefresh (refresh: any, region: string | null): Promise<void> {
  const body = JSON.stringify({ refresh, region })
  return new Promise((resolve, reject) => {
    const socket = net.connect((ports as any).http, '127.0.0.1', () => {
      socket.write(`POST /fixture/select HTTP/1.1\r\nHost: 127.0.0.1:${(ports as any).http}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`)
    })
    let response = ''
    socket.setTimeout(5000, () => socket.destroy(new Fatal('fixture server select timed out')))
    socket.on('data', chunk => { response += chunk })
    socket.on('error', err => reject(new Fatal(`fixture server select: ${err.message}`)))
    socket.on('close', () => {
      if (response.startsWith('HTTP/1.1 200')) resolve()
      else reject(new Fatal(`fixture server rejected the refresh: ${response || 'no response'}`))
    })
  })
}

// A provider option C (and so Node) does not implement, or null.
function providerUnsupported (block: any, blockName: string, keys: string[]): string | null {
  for (const key of Object.keys(block)) {
    if (keys.includes(key)) continue
    if (key === 'init_timeout_ms') return 'Node has no initTimeoutMs; the first refresh is bounded by refreshTimeoutMs, as in the C client'
    return `option discovery.${blockName}.${key} is not implemented`
  }
  return null
}

// The row's provider block as a Node config, pointed at the fixture server.
function providerConfig (block: any, aws: boolean): any {
  const timeoutMs = block.timeout_ms ?? PROVIDER_TIMEOUT_MS
  if (!aws) {
    const dns: any = { names: block.names, servers: [`127.0.0.1:${(ports as any).dns}`], timeoutMs }
    if (block.record_type !== undefined) dns.recordType = block.record_type
    if (block.port !== undefined) dns.port = block.port
    if (block.tls_name !== undefined) dns.tlsName = block.tls_name
    return { discovery: { provider: 'dns', dns, refreshTimeoutMs: Math.max(timeoutMs, 10000) } }
  }
  const field = block.address_field ?? 'private_ip'
  const addressField = ({ private_ip: 'privateIp', public_ip: 'publicIp', private_dns: 'privateDns', public_dns: 'publicDns' } as any)[field]
  if (addressField === undefined) die(`unknown address_field ${field}`)
  const awsBlock: any = {
    region: block.region,
    filters: block.filters,
    addressField,
    timeoutMs,
    endpoint: `http://127.0.0.1:${(ports as any).http}`,
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
    sessionToken: SESSION_TOKEN
  }
  if (block.port !== undefined) awsBlock.port = block.port
  if (block.tls_name !== undefined) awsBlock.tlsName = block.tls_name
  return { discovery: { provider: 'aws-tags', aws: awsBlock, refreshTimeoutMs: Math.max(timeoutMs, 10000) } }
}

function categoryMarker (category: string): string {
  const marker = ({ 'discovery-failed': 'DNS seed discovery failed for every name', 'aws-error': 'DescribeInstances failed', timeout: 'timed out' } as any)[category]
  if (marker === undefined) die(`unknown error category ${category}`)
  return marker
}

// Hosts compare as a multiset by canonical host, port and TLS name.
function canonical (host: string): string {
  if (net.isIPv4(host)) return host.split('.').map(Number).join('.')
  if (net.isIPv6(host)) return new URL(`http://[${host}]`).hostname.replace(/^\[|\]$/g, '')
  return host
}

function hostKeysDiff (expected: Host[], got: Host[]): string | null {
  const key = (h: Host): string => h.tlsName !== null && h.tlsName !== undefined ? `${canonical(h.host)} ${h.port} ${h.tlsName}` : `${canonical(h.host)} ${h.port}`
  const e = expected.map(key).sort()
  const g = got.map(key).sort()
  return JSON.stringify(e) === JSON.stringify(g) ? null : `expected [${e.join(', ')}], got [${g.join(', ')}]`
}

function checkStep (i: number, step: any, exp: any, seeds: Host[]): Outcome {
  const error = exp.error
  if (error !== undefined) {
    const marker = categoryMarker(error.category)
    if (step.status === 0) return fail(`refresh ${i}: expected ${error.category}, got hosts [${step.hosts.map(hostText).join(', ')}]`)
    // A provider fails a refresh with ERR_CLIENT; ERR_SEED_DISCOVERY_FAILED is
    // only connect's, when the initial refresh leaves no seed (as the C runner).
    if (step.status !== Aerospike.status.ERR_CLIENT) {
      return fail(`refresh ${i}: failed with status ${step.status} instead of ${Aerospike.status.ERR_CLIENT}: ${step.message}`)
    }
    if (!step.message.includes(marker)) return fail(`refresh ${i}: message lacks '${marker}': ${step.message}`)
    const missing = missingFact(step.message, error.messageContains)
    if (missing !== null) return fail(`refresh ${i}: message lacks '${missing}': ${step.message}`)
    if (step.message.includes(SECRET_KEY) || step.message.includes(SESSION_TOKEN)) return fail(`refresh ${i}: message contains a credential secret`)
  } else {
    if (step.status !== 0) return fail(`refresh ${i}: failed with status ${step.status}: ${step.message}`)
    const diff = hostKeysDiff(hosts(exp.hosts), step.hosts)
    if (diff !== null) return fail(`refresh ${i}: hosts ${diff}`)
  }
  const diff = hostKeysDiff(hosts(exp.seeds), seeds)
  return diff === null ? pass() : fail(`refresh ${i}: seeds ${diff}`)
}

async function runProvider (r: Row, aws: boolean): Promise<Outcome> {
  const discovery = r.node.config.discovery
  const block = discovery[aws ? 'aws' : 'dns']
  const refreshes = r.node.input.refreshes
  const expected = r.node.expect.refreshes
  if (refreshes.length === 0 || expected.length !== refreshes.length) die('a provider row needs one expected refresh per input refresh')
  const reason = providerUnsupported(block, aws ? 'aws' : 'dns', aws ? AWS_KEYS : DNS_KEYS)
  if (reason !== null) return unsupported(reason)

  let config: any
  try {
    config = new Aerospike.Config(providerConfig(block, aws))
  } catch (err: any) {
    return fail(`Node rejects the config: ${err.message}`)
  }
  const id = native._conformance('providerCreate', config)
  if (typeof id !== 'number') return fail(`provider construction failed: ${id.error.message}`)
  const steps: any[] = []
  try {
    for (const refresh of refreshes) {
      await selectRefresh(refresh, aws ? block.region : null)
      steps.push(native._conformance('providerRefresh', id))
    }
  } finally {
    native._conformance('providerDestroy', id)
  }
  // The client's merge with discovery_only and no static seeds: a failed refresh
  // keeps the previous seeds, and a failed first refresh counts as empty.
  const results = steps.map((s, i) => s.status === 0 ? s.hosts : (i === 0 ? [] : null))
  const merged = native._conformance('merge', 'discovery_only', [], results)
  if (merged.error !== undefined) return fail(`merge failed with status ${merged.error.code}: ${merged.error.message}`)
  for (let i = 0; i < steps.length; i++) {
    const o = checkStep(i, steps[i], expected[i], merged.snapshots[i])
    if (o.result !== 'pass') return o
  }
  return pass()
}

async function runRow (r: Row): Promise<Outcome> {
  if (r.blockedBy !== undefined) return { result: 'blocked', reason: r.blockedBy }
  switch (r.kind) {
    case 'translate': return runTranslate(r)
    case 'collision': return runCollision(r)
    case 'merge': return runMerge(r)
    case 'tls': return runTls(r)
    case 'dns': return await runProvider(r, false)
    case 'aws-tags': return await runProvider(r, true)
  }
  return die(`unknown kind ${r.kind}`)
}

// --- Fixtures, declarations and report -------------------------------------------------

function yamlFiles (dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...yamlFiles(p))
    else if (entry.name.endsWith('.yaml')) out.push(p)
  }
  return out
}

function loadFixtures (fixtures: string): Row[] {
  const rows: Row[] = []
  const files: string[] = []
  for (const root of ['discovery', 'tls']) {
    const dir = path.join(fixtures, root)
    if (!fs.existsSync(dir)) die(`fixture directory not found: ${dir}`)
    files.push(...yamlFiles(dir))
  }
  for (const full of files.sort()) {
    const file = path.relative(fixtures, full).split(path.sep).join('/')
    const doc = yaml.load(fs.readFileSync(full, 'utf8'))
    if (doc === null || typeof doc !== 'object') die(`${file}: a fixture file must be a map`)
    if (!KINDS.includes(doc.kind)) die(`${file}: unknown kind ${doc.kind}`)
    if (!Array.isArray(doc.rows) || doc.rows.length === 0) die(`${file}: a fixture file must have rows`)
    const seen = new Set<string>()
    for (const node of doc.rows) {
      if (typeof node.case !== 'string' || node.case === '') die(`${file}: a row has no case`)
      if (seen.has(node.case)) die(`${file}: duplicate case ${node.case}`)
      seen.add(node.case)
      if (node.state !== undefined && node.state !== 'blocked') die(`${file}: ${node.case}: unknown state ${node.state}`)
      const blockedBy = node.state === 'blocked' ? node.blockedBy : undefined
      if (node.state === 'blocked' && (typeof blockedBy !== 'string' || blockedBy === '')) die(`${file}: ${node.case}: blockedBy is empty`)
      rows.push({ file, dir: path.dirname(full), kind: doc.kind, name: node.case, node, blockedBy, declared: blockedBy !== undefined ? 'blocked' : 'pass' })
    }
  }
  if (rows.length === 0) die(`no fixture rows under ${fixtures}`)
  return rows
}

function loadDeclarations (file: string, rows: Row[]): void {
  const doc = yaml.load(fs.readFileSync(file, 'utf8')) ?? {}
  const byKey = new Map(rows.map(r => [`${r.file}:${r.name}`, r]))
  for (const [fixtureFile, cases] of Object.entries(doc as Record<string, any>)) {
    for (const [name, declaration] of Object.entries(cases as Record<string, any>)) {
      const r = byKey.get(`${fixtureFile}:${name}`)
      if (r === undefined) die(`${file}: ${fixtureFile}:${name} is not a fixture row`)
      if (!['pass', 'fail', 'unsupported', 'blocked'].includes(declaration.result)) die(`${file}: ${fixtureFile}:${name}: unknown result ${declaration.result}`)
      if (declaration.result !== 'pass' && (typeof declaration.reason !== 'string' || declaration.reason === '')) {
        die(`${file}: ${fixtureFile}:${name}: a ${declaration.result} declaration needs a reason`)
      }
      r.declared = declaration.result
      r.declaredReason = declaration.reason
    }
  }
}

function writeReport (report: string, rows: Row[]): Record<Result, number> {
  const counts: Record<Result, number> = { pass: 0, fail: 0, unsupported: 0, blocked: 0 }
  const out = [...rows].sort((a, b) => `${a.file}:${a.name}`.localeCompare(`${b.file}:${b.name}`)).map(r => {
    const o = r.outcome as Outcome
    counts[o.result]++
    const entry: any = { file: r.file, case: r.name, result: o.result }
    const reason = r.declaredReason !== undefined && r.declared === o.result ? r.declaredReason : o.reason
    if (reason !== undefined) entry.reason = reason
    if (o.reason !== undefined && o.reason !== reason) entry.detail = o.reason
    return entry
  })
  const body = JSON.stringify({ runtime: RUNTIME, clientVersion, counts, rows: out }, null, 2) + '\n'
  // Written next to the report under another name, so no partial report is ever read.
  const tmp = path.join(path.dirname(report), `conformance-report.tmp.${process.pid}`)
  fs.writeFileSync(tmp, body)
  fs.renameSync(tmp, report)
  return counts
}

function options (argv: string[]): { fixtures: string, declarations: string, report: string } {
  const values: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]
    if (!['--fixtures', '--declarations', '--report'].includes(flag) || argv[i + 1] === undefined) {
      die('usage: runner.ts --fixtures <dir> --declarations <file> --report <path>')
    }
    values[flag.slice(2)] = argv[i + 1]
  }
  if (values.fixtures === undefined || values.declarations === undefined || values.report === undefined) {
    die('usage: runner.ts --fixtures <dir> --declarations <file> --report <path>')
  }
  return values as any
}

async function main (): Promise<number> {
  let report: string | undefined
  try {
    const o = options(process.argv.slice(2))
    report = o.report
    if (fs.existsSync(report)) fs.unlinkSync(report)
    Aerospike.setDefaultLogging({ level: Aerospike.log.OFF })
    const rows = loadFixtures(o.fixtures)
    loadDeclarations(o.declarations, rows)
    if (rows.some(r => r.kind === 'dns' || r.kind === 'aws-tags')) await startFixtureServer(o.fixtures, path.dirname(path.resolve(report)))
    for (const r of rows) r.outcome = await runRow(r)
    const counts = writeReport(report, rows)
    console.error(`conformance: ${rows.length} rows: ${counts.pass} pass, ${counts.fail} fail, ${counts.unsupported} unsupported, ${counts.blocked} blocked`)
    let mismatches = 0
    for (const r of rows) {
      const got = (r.outcome as Outcome).result
      if (got !== r.declared) {
        mismatches++
        console.error(`MISMATCH ${r.file}:${r.name}: declared ${r.declared}, got ${got}${r.outcome?.reason !== undefined ? `: ${r.outcome.reason}` : ''}`)
      }
    }
    return mismatches === 0 ? 0 : 1
  } catch (err: any) {
    if (report !== undefined && fs.existsSync(report)) fs.unlinkSync(report)
    console.error(`conformance: ${err instanceof Fatal ? err.message : err.stack}`)
    return 2
  } finally {
    stopFixtureServer()
  }
}

main().then(code => { process.exitCode = code })
