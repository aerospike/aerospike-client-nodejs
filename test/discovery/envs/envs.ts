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

// Node.js tests for the test environments of aerospike-client-conformance
// (envs/README.md there): each environment brings up servers, and a DNS server,
// a stub EC2 endpoint or TLS certificates where it needs them, and writes a
// values file this test reads from its environment. test/discovery/envs/run.sh
// runs it as the command of conformance's test-envs workflow. Outside an
// environment (no ENV_NAME) every test skips; inside one, only that
// environment's tests run.

/* eslint-env mocha */

import { expect } from 'chai'
import { execFileSync } from 'child_process'
import { promises as dnsPromises } from 'dns'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as Aerospike from '../../../lib/aerospike.js'

const driver = require('../l5/driver.js')

const env = process.env
const NAMESPACE = env.ENV_NAMESPACE ?? 'test'
const JOIN_MS = 20000
const SAMPLE_MS = 100

interface EnvNode { name: string, host: string, port: number, advertisedHost: string, advertisedPort: number }

function node (prefix: string): EnvNode {
  const value = (key: string): string => env[`${prefix}_${key}`] ?? ''
  return {
    name: value('NAME'),
    host: value('HOST'),
    port: Number(value('PORT')),
    advertisedHost: value('ADVERTISED_HOST'),
    advertisedPort: Number(value('ADVERTISED_PORT'))
  }
}

// Runs a verb of the environment's script, such as stop-dns.
function verb (...args: string[]): void {
  execFileSync('bash', [env.ENV_CTL as string, ...args], { stdio: 'inherit', env })
}

function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// A new client log file, so a test can read the client's warnings. The C
// client logs through the default logging, not a client's own log setting, so
// this points the default logging at the new file.
function logFile (): { fd: number, read: () => string } {
  const file = path.join(os.tmpdir(), `envs-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.log`)
  const fd = fs.openSync(file, 'w+')
  Aerospike.setDefaultLogging({ level: Aerospike.log.WARN, file: fd })
  return { fd, read: () => fs.readFileSync(file, 'utf8') }
}

function base (log: { fd: number }): any {
  return { log: { level: Aerospike.log.WARN, file: log.fd }, connTimeoutMs: 5000 }
}

async function waitNodes (client: any, names: string[], timeoutMs = JOIN_MS): Promise<string[]> {
  const deadline = Date.now() + timeoutMs
  let held: string[] = []
  while (Date.now() < deadline) {
    held = client.getNodes().map((n: any) => n.name).sort()
    if (JSON.stringify(held) === JSON.stringify([...names].sort())) return held
    await sleep(SAMPLE_MS)
  }
  return held
}

// Writes and reads a few keys, so every node the client holds serves. Retries
// cover a cluster that has just changed size.
async function roundTrip (client: any, set: string): Promise<void> {
  const policy = { totalTimeout: 5000, socketTimeout: 2000, maxRetries: 3 }
  for (let i = 0; i < 20; i++) {
    const key = new Aerospike.Key(NAMESPACE, set, `k-${i}`)
    await client.put(key, { v: i }, {}, new Aerospike.WritePolicy(policy))
    expect((await client.get(key, new Aerospike.ReadPolicy(policy))).bins.v).to.equal(i)
  }
}

// Writes and reads keys whose partitions node masters, from the client's
// partition map: with replication factor 1, a node the client never holds
// leaves its partitions without a master.
async function roundTripOn (client: any, set: string, nodeName: string, count = 20): Promise<void> {
  const masters = client.as_client._routing(NAMESPACE)?.masters ?? []
  const policy = { totalTimeout: 5000, socketTimeout: 2000, maxRetries: 3 }
  let done = 0
  for (let i = 0; done < count && i < count * 1000; i++) {
    const name = `k-${i}`
    if (masters[driver.partitionId(set, name)] !== nodeName) continue
    const key = new Aerospike.Key(NAMESPACE, set, name)
    await client.put(key, { v: i }, {}, new Aerospike.WritePolicy(policy))
    expect((await client.get(key, new Aerospike.ReadPolicy(policy))).bins.v).to.equal(i)
    done++
  }
  expect(done, `keys mastered by ${nodeName}`).to.equal(count)
}

// Connects and closes, returning the connect error or null. A connect that
// doesn't settle within 30 s fails the test with a clear reason.
async function connectError (config: any): Promise<any> {
  let timer: NodeJS.Timeout | undefined
  const hung = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('connect did not settle within 30 s')), 30000)
  })
  try {
    const client: any = await Promise.race([Aerospike.connect(config), hung])
    client.close()
  } catch (err: any) {
    if (err.message === 'connect did not settle within 30 s') throw err
    return err
  } finally {
    clearTimeout(timer)
  }
  return null
}

// Runs fn with the client and closes it. A cluster the environment has just
// brought up may refuse the first connects for a moment; retryMs retries a
// failed connect for that long.
async function withClient (config: any, fn: (client: any) => Promise<void>, retryMs = 0): Promise<void> {
  const deadline = Date.now() + retryMs
  let client: any
  for (;;) {
    try {
      client = await Aerospike.connect(config)
      break
    } catch (err) {
      if (Date.now() >= deadline) throw err
      await sleep(500)
    }
  }
  try {
    await fn(client)
  } finally {
    client.close()
  }
}

function only (name: string): void {
  before(function () {
    if (env.ENV_NAME !== name) this.skip()
  })
}

describe('conformance test environment', function () {
  this.timeout(120000)

  // Let the process exit once the tests are done: a client keeps Node's event
  // loop handle until it is released.
  after(function () {
    Aerospike.releaseEventLoop()
  })

  before(function () {
    if (env.ENV_NAME === undefined) this.skip()
    console.log(`ENV-RUN environment=${env.ENV_NAME} client=nodejs`)
  })

  describe('dns', function () {
    only('dns')
    const a = (): EnvNode => node('NODE_A')
    const b = (): EnvNode => node('NODE_B')
    // An SRV lookup takes several queries, more than the 80 ms default allows.
    const dnsConfig = (dns: any, extra: any = {}): any => {
      const log = logFile()
      return Object.assign(base(log), {
        useAlternateAccessAddress: true,
        discovery: { provider: 'dns', dns: Object.assign({ servers: [env.DNS_SERVER], timeoutMs: 1000 }, dns) }
      }, extra)
    }

    // Starts the DNS server again and waits until it answers.
    async function startDns (): Promise<void> {
      verb('start-dns')
      const resolver = new dnsPromises.Resolver({ timeout: 500, tries: 1 })
      resolver.setServers([env.DNS_SERVER as string])
      const deadline = Date.now() + 20000
      for (;;) {
        try {
          await resolver.resolve4('seeds.dns.test')
          return
        } catch (err) {
          if (Date.now() > deadline) throw err
          await sleep(200)
        }
      }
    }

    it('connects through A records of seeds.dns.test with no hosts', async function () {
      await withClient(dnsConfig({ names: ['seeds.dns.test'], recordType: 'A', port: a().port }), async client => {
        expect(await waitNodes(client, [a().name, b().name])).to.eql([a().name, b().name].sort())
        await roundTrip(client, 'envdns')
      })
    })

    it('connects through the SRV records of _aerospike._tcp.dns.test with no hosts', async function () {
      await withClient(dnsConfig({ names: ['_aerospike._tcp.dns.test'], recordType: 'SRV' }), async client => {
        expect(await waitNodes(client, [a().name, b().name])).to.eql([a().name, b().name].sort())
      })
    })

    it('falls back to hosts when the DNS server is down at connect', async function () {
      verb('stop-dns')
      try {
        const config = dnsConfig({ names: ['seeds.dns.test'], recordType: 'A', port: a().port }, {
          hosts: [{ addr: a().host, port: a().port }]
        })
        await withClient(config, async client => {
          expect(await waitNodes(client, [a().name, b().name])).to.eql([a().name, b().name].sort())
        })
      } finally {
        await startDns()
      }
    })

    it('fails with ERR_SEED_DISCOVERY_FAILED when the DNS server is down and there are no hosts', async function () {
      verb('stop-dns')
      try {
        const error = await connectError(dnsConfig({ names: ['seeds.dns.test'], recordType: 'A', port: a().port }))
        expect(error).to.be.instanceOf(Aerospike.AerospikeError)
        expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      } finally {
        await startDns()
      }
    })
  })

  describe('aws-tags', function () {
    only('aws-tags')
    const a = (): EnvNode => node('NODE_A')
    const b = (): EnvNode => node('NODE_B')
    const control = async (method: string, route: string, body?: object): Promise<any> => {
      const response = await fetch(`${env.EC2_STUB_CONTROL}/${route}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      })
      if (!response.ok) throw new Error(`stub ${method} ${route}: ${response.status}`)
      return await response.json().catch(() => null)
    }
    const awsConfig = (aws: any = {}): any => {
      const log = logFile()
      return Object.assign(base(log), {
        useAlternateAccessAddress: true,
        ipMap: { [a().advertisedHost]: a().host, [b().advertisedHost]: b().host },
        discovery: {
          provider: 'aws-tags',
          aws: Object.assign({
            region: env.AWS_REGION,
            endpoint: env.EC2_ENDPOINT,
            filters: [{ name: 'tag:aerospike-cluster', values: ['prod-a'] }],
            port: a().port
          }, aws)
        }
      })
    }

    beforeEach(async function () {
      await control('POST', 'reset')
    })

    after(async function () {
      if (env.ENV_NAME === 'aws-tags') await control('POST', 'reset')
    })

    it('connects to the tagged instances, signing each request with the credentials from the environment', async function () {
      await withClient(awsConfig(), async client => {
        expect(await waitNodes(client, [a().name, b().name])).to.eql([a().name, b().name].sort())
        await roundTrip(client, 'envaws')
      })
      const requests = await control('GET', 'requests')
      const list = Array.isArray(requests) ? requests : requests.requests
      expect(list).to.not.be.empty
      expect(list.every((r: any) => r.authorization_valid === true)).to.be.true
    })

    it('reads every page of a paged answer', async function () {
      await control('POST', 'settings', { page_size: 1 })
      await withClient(awsConfig(), async client => {
        expect(await waitNodes(client, [a().name, b().name])).to.eql([a().name, b().name].sort())
      })
    })

    it('fails with ERR_SEED_DISCOVERY_FAILED when EC2 refuses the request and there are no hosts', async function () {
      await control('POST', 'settings', { mode: 'unauthorized' })
      const error = await connectError(awsConfig())
      expect(error).to.be.instanceOf(Aerospike.AerospikeError)
      expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      expect(error.message).to.match(/UnauthorizedOperation/)
    })

    it('fails within the provider timeout when EC2 does not answer and there are no hosts', async function () {
      await control('POST', 'settings', { mode: 'hang' })
      const started = Date.now()
      const error = await connectError(awsConfig({ timeoutMs: 1000 }))
      expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      expect(Date.now() - started).to.be.below(5000)
    })
  })

  describe('port-map', function () {
    only('port-map')
    const a = (): EnvNode => node('NODE_A')
    const b = (): EnvNode => node('NODE_B')

    it('reaches node A by its advertised host:port and node B, started later, by its name', async function () {
      const log = logFile()
      const config = Object.assign(base(log), {
        hosts: [{ addr: a().host, port: a().port }],
        translation: {
          provider: 'port-map',
          portMap: {
            [`${a().advertisedHost}:${a().advertisedPort}`]: `${a().host}:${a().port}`,
            [b().name]: `${b().host}:${b().port}`
          }
        }
      })
      await withClient(config, async client => {
        expect(await waitNodes(client, [a().name])).to.eql([a().name])
        verb('start-node-b')
        expect(await waitNodes(client, [a().name, b().name])).to.eql([a().name, b().name].sort())
        await roundTrip(client, 'envportmap')
      })
    })
  })

  describe('collision', function () {
    only('collision')
    const passThrough = (seed: EnvNode, log: { fd: number }): any => Object.assign(base(log), {
      hosts: [{ addr: seed.host, port: seed.port }],
      useAlternateAccessAddress: true,
      translation: { provider: 'pass-through' }
    })

    it('holds both nodes of the control cluster', async function () {
      const a = node('CONTROL_NODE_A')
      const b = node('CONTROL_NODE_B')
      await withClient(passThrough(a, logFile()), async client => {
        expect(await waitNodes(client, [a.name, b.name])).to.eql([a.name, b.name].sort())
      }, 20000)
    })

    it('keeps the node in use and never holds the node that translates to its address', async function () {
      const a = node('COLLISION_NODE_A')
      const b = node('COLLISION_NODE_B')
      const log = logFile()
      await withClient(passThrough(a, log), async client => {
        const deadline = Date.now() + 5000
        while (Date.now() < deadline) {
          expect(client.getNodes().map((n: any) => n.name)).to.eql([a.name])
          await sleep(SAMPLE_MS)
        }
        await roundTripOn(client, 'envcollision', a.name)
      })
      expect(log.read()).to.include(b.name)
    })
  })

  describe('yaml', function () {
    only('yaml')

    // The file is the client's only configuration; the client seeds node A.
    // Follows envs/yaml.sh and the C client's yaml_pass_through and
    // yaml_port_map_strict.
    function yamlConfig (file: string, seed: EnvNode, log: { fd: number }): any {
      return Object.assign(base(log), {
        hosts: [{ addr: seed.host, port: seed.port }],
        configProvider: { path: env[file] as string }
      })
    }

    it('takes pass-through and the alternate addresses from the file, and both nodes serve', async function () {
      const a = node('PASS_THROUGH_NODE_A')
      const b = node('PASS_THROUGH_NODE_B')
      await withClient(yamlConfig('PASS_THROUGH_CLIENT_CONFIG', a, logFile()), async client => {
        expect(await waitNodes(client, [a.name, b.name])).to.eql([a.name, b.name].sort())
        const addresses = client.getNodes().map((n: any) => n.address).sort()
        expect(addresses).to.eql([`${a.advertisedHost}:${a.advertisedPort}`, `${b.advertisedHost}:${b.advertisedPort}`].sort())
        await roundTrip(client, 'envyamlpt')
      }, 10000)
    })

    it('takes a strict port-map from the file, by host:port and by node name, and both nodes serve', async function () {
      const a = node('PORT_MAP_NODE_A')
      const b = node('PORT_MAP_NODE_B')
      const log = logFile()
      await withClient(yamlConfig('PORT_MAP_CLIENT_CONFIG', a, log), async client => {
        expect(await waitNodes(client, [a.name, b.name])).to.eql([a.name, b.name].sort())
        const addresses = client.getNodes().map((n: any) => n.address).sort()
        expect(addresses).to.eql([`${a.host}:${a.port}`, `${b.host}:${b.port}`].sort())
        await roundTrip(client, 'envyamlpm')
      }, 10000)
      expect(log.read()).to.not.match(/has no mapping/)
    })
  })

  describe('pass-through', function () {
    only('pass-through')

    it('holds every node at its advertised alternate address', async function () {
      const a = node('NODE_A')
      const b = node('NODE_B')
      const log = logFile()
      await withClient(Object.assign(base(log), {
        hosts: [{ addr: a.host, port: a.port }],
        useAlternateAccessAddress: true,
        translation: { provider: 'pass-through' }
      }), async client => {
        expect(await waitNodes(client, [a.name, b.name])).to.eql([a.name, b.name].sort())
        const addresses = client.getNodes().map((n: any) => n.address).sort()
        expect(addresses).to.eql([`${a.advertisedHost}:${a.advertisedPort}`, `${b.advertisedHost}:${b.advertisedPort}`].sort())
        await roundTrip(client, 'envpassthrough')
      })
    })
  })

  describe('on-miss', function () {
    only('on-miss')
    const a = (): EnvNode => node('NODE_A')
    const b = (): EnvNode => node('NODE_B')
    const config = (onMiss: string, log: { fd: number }): any => Object.assign(base(log), {
      hosts: [{ addr: a().host, port: a().port }],
      useAlternateAccessAddress: true,
      translation: { provider: 'port-map', portMap: { [a().name]: `${a().host}:${a().port}` }, onMiss }
    })

    it('never holds the unmapped node with strict, and logs the miss', async function () {
      const log = logFile()
      await withClient(config('strict', log), async client => {
        const deadline = Date.now() + 3000
        while (Date.now() < deadline) {
          expect(client.getNodes().map((n: any) => n.name)).to.eql([a().name])
          await sleep(SAMPLE_MS)
        }
      })
      expect(log.read()).to.match(new RegExp(`has no mapping for node ${b().name}`))
    })

    it('holds the unmapped node at its advertised address with passThrough, without a miss warning', async function () {
      const log = logFile()
      await withClient(config('passThrough', log), async client => {
        expect(await waitNodes(client, [a().name, b().name])).to.eql([a().name, b().name].sort())
      })
      expect(log.read()).to.not.match(/has no mapping for node/)
    })
  })

  describe('alt-missing', function () {
    only('alt-missing')
    const config = (seed: EnvNode, log: { fd: number }): any => Object.assign(base(log), {
      hosts: [{ addr: seed.host, port: seed.port }],
      useAlternateAccessAddress: true,
      translation: { provider: 'pass-through' }
    })

    it('holds both nodes of the control cluster', async function () {
      const a = node('CONTROL_NODE_A')
      const b = node('CONTROL_NODE_B')
      await withClient(config(a, logFile()), async client => {
        expect(await waitNodes(client, [a.name, b.name])).to.eql([a.name, b.name].sort())
      }, 20000)
    })

    it('fails with ERR_INVALID_NODE, naming the setting, when a node has no alternate address', async function () {
      for (const seed of [node('MISSING_NODE_A'), node('MISSING_NODE_B')]) {
        const error = await connectError(config(seed, logFile()))
        expect(error, `seeded at ${seed.name}`).to.be.instanceOf(Aerospike.AerospikeError)
        expect(error.code).to.equal(Aerospike.status.ERR_INVALID_NODE)
        expect(error.message).to.match(/use_services_alternate/)
      }
    })
  })

  describe('tls-matching', function () {
    only('tls-matching')

    // What Node expects of each case, as the C client declares it (Node matches
    // through the C client): pass, the env's expectation; fail, the deprecated
    // legacy name check accepts with one warning what the env expects rejected
    // (kept until the next major release, FR-45); blocked, undecided in the
    // spec. Follows envs/tls-matching.sh and tls/name-matching.yaml.
    const FR45 = 'legacy name check kept until the next major release (FR-45)'
    const DECLARED: Record<string, { declared: 'pass' | 'fail' | 'blocked', reason?: string }> = {
      dns_exact: { declared: 'pass' },
      dns_case: { declared: 'pass' },
      ipv4_ip_san: { declared: 'pass' },
      ipv6_ip_san: { declared: 'pass' },
      ipv6_ip_san_equivalent: { declared: 'pass' },
      ipv6_bracketed: { declared: 'blocked', reason: 'undecided whether a bracketed IPv6 tlsName is an IP-ID' },
      ipv6_scoped: { declared: 'blocked', reason: 'undecided how a scoped IPv6 tlsName (fe80::1%en0) compares' },
      ipv4_leading_zero: { declared: 'blocked', reason: 'undecided whether 127.000.0.1 is an IP-ID' },
      dns_only_as_ip: { declared: 'pass' },
      wildcard_one_label: { declared: 'pass' },
      wildcard_case: { declared: 'pass' },
      wildcard_bare_domain: { declared: 'pass' },
      wildcard_two_labels: { declared: 'pass' },
      wildcard_partial_label: { declared: 'pass' },
      wildcard_double: { declared: 'pass' },
      wildcard_inner_label: { declared: 'pass' },
      ip_vs_wildcard: { declared: 'fail', reason: FR45 },
      cn_case_only: { declared: 'fail', reason: FR45 },
      legacy_cn_only: { declared: 'pass' },
      legacy_cn_nonmatching_dns: { declared: 'pass' },
      legacy_ip_as_dns: { declared: 'pass' },
      dns_san_nonmatching_cn: { declared: 'pass' },
      ci_setup_aerospike_server: { declared: 'pass' },
      ci_setup_aerospike_server_fixed: { declared: 'pass' },
      revoked_serial: { declared: 'pass' }
    }

    // One case per process, named by TLS_CASE, as the Java and C clients run
    // them: the legacy warning is logged once per name in a process.
    it('accepts or rejects the TLS_CASE certificate case as declared, with the legacy warning where expected', async function () {
      const name = env.TLS_CASE
      if (name === undefined) this.skip()
      const key = (name as string).toUpperCase()
      const value = (k: string): string => env[`TLS_${key}_${k}`] ?? ''
      const declaration = DECLARED[name as string]
      expect(declaration, `a declaration for ${name}`).to.not.be.undefined
      if (declaration.declared === 'blocked') {
        console.log(`TLS-CASE case=${name} result=blocked reason=${declaration.reason}`)
        this.skip()
      }
      verb('serve', name as string)
      const tlsConfig = (tlsName: string, log: { fd: number }): any => {
        const tls: any = { enable: true, cafile: value('CA') }
        if (value('REVOKE') !== '') {
          const blacklist = path.join(os.tmpdir(), `envs-revoke-${process.pid}-${key}`)
          fs.writeFileSync(blacklist, `${value('REVOKE')}\n`)
          tls.certBlacklist = blacklist
        }
        return Object.assign(base(log), { hosts: [{ addr: env.ENV_HOST, port: Number(value('PORT')), tlsname: tlsName }], tls })
      }
      if (value('BOOTSTRAP') !== '' && value('REVOKE') === '') {
        // The server is up and its certificate is good for another name.
        const error = await connectError(tlsConfig(value('BOOTSTRAP'), logFile()))
        expect(error, `bootstrap name ${value('BOOTSTRAP')}`).to.be.null
      }
      const log = logFile()
      const error = await connectError(tlsConfig(value('NAME'), log))
      const accepted = error === null
      const warned = log.read().includes('only through the legacy name check')
      const expectAccept = value('EXPECT') === 'accept'
      const expectWarning = value('WARNING') === 'true'
      console.log(`TLS-CASE case=${name} name=${value('NAME')} expect=${value('EXPECT')} accepted=${accepted} warning=${warned} expectWarning=${expectWarning} declared=${declaration.declared}${error !== null ? ` error=${error.code}` : ''}`)
      if (declaration.declared === 'pass') {
        expect(accepted, error !== null ? error.message : 'accepted').to.equal(expectAccept)
        if (accepted) expect(warned, 'legacy warning').to.equal(expectWarning)
      } else {
        // Declared fail: the legacy check accepts, with its warning, what the env expects rejected.
        expect(expectAccept, 'the env expects a reject').to.be.false
        expect(accepted, 'accepted through the legacy check').to.be.true
        expect(warned, 'with the legacy warning').to.be.true
        console.log(`TLS-CASE case=${name} result=declared-fail reason=${declaration.reason}`)
      }
    })

    it('holds both proxy nodes through their forwarders, the tls-name checked against a SAN-only certificate', async function () {
      if (env.TLS_CASE !== undefined) this.skip()
      const a = node('PROXY_NODE_A')
      const b = node('PROXY_NODE_B')
      const log = logFile()
      await withClient(Object.assign(base(log), {
        hosts: [{ addr: a.host, port: a.port, tlsname: env.PROXY_TLS_NAME }],
        tls: { enable: true, cafile: env.PROXY_CA },
        translation: { provider: 'port-map', portMap: { [a.name]: `${a.host}:${a.port}`, [b.name]: `${b.host}:${b.port}` } }
      }), async client => {
        expect(await waitNodes(client, [a.name, b.name])).to.eql([a.name, b.name].sort())
        await roundTrip(client, 'envtls')
      })
      expect(log.read()).to.not.include('only through the legacy name check')
    })
  })
})
