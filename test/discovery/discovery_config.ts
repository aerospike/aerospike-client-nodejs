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

/* global describe, it, before, after, beforeEach, afterEach */
/* eslint-disable no-unused-expressions */

import type { Client as Cli, ConfigOptions } from '../../lib/aerospike.js'

import { expect } from 'chai'
import * as fs from 'fs'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import * as Aerospike from '../../lib/aerospike.js'
import * as helper from '../test_helper.ts'
import { connectError } from './helpers.ts'
import { startDnsServer, DnsServer } from './dns_server.ts'

const Config = Aerospike.Config
const native = require('../../lib/native.js')

// Multi-node translation cases are in translation_cluster.ts (local only).

describe('discovery and translation config #noserver', function () {
  describe('Config', function () {
    it('copies discovery and translation', function () {
      const discovery = {
        provider: 'dns' as const,
        dns: { names: ['_aerospike._tcp.example.com'], recordType: 'SRV' as const, servers: ['10.0.0.2', '[2001:db8::1]:53'], timeoutMs: 200, tlsName: 'tls1' },
        mergePolicy: 'discoveryOnly' as const,
        executionMode: 'thread' as const,
        refreshIntervalMs: 5000,
        refreshTimeoutMs: 2000,
        tendRefreshDeadlineMs: 50
      }
      const translation = { provider: 'port-map' as const, portMap: { '10.0.0.1:3000': 'gw.example.com:31001', BB9: '[::1]:3000' }, onMiss: 'strict' as const }
      const config = new Config({ hosts: 'h:3000', discovery, translation })
      expect(config.discovery).to.eql(discovery)
      expect(config.translation).to.eql(translation)
    })

    it('leaves discovery and translation unset by default', function () {
      const config = new Config({ discovery: null, translation: null } as any)
      expect(config).to.not.have.property('discovery')
      expect(config).to.not.have.property('translation')
    })

    describe('hosts default', function () {
      let env: string | undefined
      beforeEach(function () {
        env = process.env.AEROSPIKE_HOSTS
        delete process.env.AEROSPIKE_HOSTS
      })
      afterEach(function () {
        if (env !== undefined) process.env.AEROSPIKE_HOSTS = env
      })

      it('has no localhost default when a seed provider is set', function () {
        const config = new Config({ discovery: { provider: 'dns', dns: { names: ['seeds.example.com'] } } })
        expect(config.hosts).to.eql([])
      })

      it('keeps the localhost default without a provider', function () {
        expect(new Config({ discovery: { mergePolicy: 'merge' } }).hosts).to.equal('localhost:3000')
      })

      it('still reads AEROSPIKE_HOSTS when a seed provider is set', function () {
        process.env.AEROSPIKE_HOSTS = 'db1:3001'
        const config = new Config({ discovery: { provider: 'dns', dns: { names: ['seeds.example.com'] } } })
        expect(config.hosts).to.equal('db1:3001')
      })
    })
  })

  describe('invalid values', function () {
    const dns = { names: ['seeds.example.com'] }
    const invalid: Array<[string, any, RegExp]> = [
      ['discovery not an object', { discovery: 'dns' }, /discovery must be an object/],
      ['an unknown discovery option', { discovery: { refreshInterval: 5 } }, /discovery.refreshInterval is not a valid option/],
      ['an unknown provider', { discovery: { provider: 'aws' } }, /discovery.provider must be one of 'dns'/],
      ['dns without the dns provider', { discovery: { dns } }, /discovery.dns is only valid/],
      ['the dns provider without dns', { discovery: { provider: 'dns' } }, /discovery.dns must be an object/],
      ['no dns names', { discovery: { provider: 'dns', dns: { names: [] } } }, /at least one DNS name/],
      ['an empty dns name', { discovery: { provider: 'dns', dns: { names: [''] } } }, /non-empty strings/],
      ['duplicate dns names', { discovery: { provider: 'dns', dns: { names: ['a.example', 'A.example'] } } }, /more than once/],
      ['an unknown dns option', { discovery: { provider: 'dns', dns: { names: ['a'], ttl: 1 } } }, /discovery.dns.ttl is not a valid option/],
      ['a bad record type', { discovery: { provider: 'dns', dns: { names: ['a'], recordType: 'AAAA' } } }, /recordType must be one of/],
      ['a port out of range', { discovery: { provider: 'dns', dns: { names: ['a'], port: 70000 } } }, /port must be an integer from 1 to 65535/],
      ['an empty tls name', { discovery: { provider: 'dns', dns: { names: ['a'], tlsName: '' } } }, /tlsName must be a non-empty string/],
      ['a zero dns timeout', { discovery: { provider: 'dns', dns: { names: ['a'], timeoutMs: 0 } } }, /timeoutMs must be an integer/],
      ['servers not an array', { discovery: { provider: 'dns', dns: { names: ['a'], servers: '10.0.0.2' } } }, /servers must be an array/],
      ['a bad merge policy', { discovery: { mergePolicy: 'Merge' } }, /mergePolicy must be one of/],
      ['a bad execution mode', { discovery: { executionMode: 'fast' } }, /executionMode must be one of/],
      ['a fractional refresh interval', { discovery: { refreshIntervalMs: 1.5 } }, /refreshIntervalMs must be an integer/],
      ['a zero refresh timeout', { discovery: { refreshTimeoutMs: 0 } }, /refreshTimeoutMs must be an integer/],
      ['a negative tend deadline', { discovery: { tendRefreshDeadlineMs: -1 } }, /tendRefreshDeadlineMs must be an integer/],
      ['translation not an object', { translation: [] }, /translation must be an object/],
      ['an unknown translation option', { translation: { entries: {} } }, /translation.entries is not a valid option/],
      ['an unknown translator', { translation: { provider: 'static-map' } }, /translation.provider must be one of/],
      ['portMap without port-map', { translation: { provider: 'pass-through', portMap: {} } }, /portMap is only valid/],
      ['port-map without portMap', { translation: { provider: 'port-map' } }, /portMap must be an object/],
      ['a portMap value without a port', { translation: { provider: 'port-map', portMap: { '10.0.0.1:3000': 'gw' } } }, /must map to a host:port/],
      ['a portMap value with a bad port', { translation: { provider: 'port-map', portMap: { '10.0.0.1:3000': 'gw:0' } } }, /must map to a host:port/],
      ['an unbracketed IPv6 key', { translation: { provider: 'port-map', portMap: { '::1:3000': 'gw:3000' } } }, /must be a host:port or a node name/],
      ['a bad onMiss', { translation: { onMiss: 'STRICT' } }, /onMiss must be one of/]
    ]

    invalid.forEach(([name, options, message]) => {
      it(`rejects ${name} with a TypeError`, function () {
        expect(() => new Config(options as ConfigOptions)).to.throw(TypeError, message)
        expect(() => Aerospike.client(options as ConfigOptions)).to.throw(TypeError, message)
      })
    })

    // The native layer checks again, for callers that skip Config, and the C
    // client validates the contents. It returns null for an invalid config.
    const nativeInvalid: Array<[string, any]> = [
      ['an unknown provider', { discovery: { provider: 'aws' } }],
      ['the dns provider without names', { discovery: { provider: 'dns', dns: {} } }],
      ['a resolver that is not an IP address', { discovery: { provider: 'dns', dns: { names: ['a.example'], servers: ['resolver.example'] } } }],
      ['a bad execution mode', { discovery: { executionMode: 'fast' } }],
      ['a portMap entry with a bad port', { translation: { provider: 'port-map', portMap: { '10.0.0.1:3000': 'gw:70000' } } }],
      ['port-map without portMap', { translation: { provider: 'port-map' } }],
      ['a bad onMiss', { translation: { onMiss: 'drop' } }],
      ['discovery not an object', { discovery: 'dns' }],
      ['translation not an object', { translation: 7 }],
      ['an enum that is not a string', { discovery: { executionMode: 1 } }],
      ['dns not an object', { discovery: { provider: 'dns', dns: 'a.example' } }],
      ['dns names not an array', { discovery: { provider: 'dns', dns: { names: 'a.example' } } }],
      ['a dns name that is not a string', { discovery: { provider: 'dns', dns: { names: [7] } } }],
      ['an empty dns name', { discovery: { provider: 'dns', dns: { names: [''] } } }],
      ['dns servers not an array', { discovery: { provider: 'dns', dns: { names: ['a.example'], servers: '127.0.0.1' } } }],
      ['a dns port of 0', { discovery: { provider: 'dns', dns: { names: ['a.example'], port: 0 } } }],
      ['a dns port over 65535', { discovery: { provider: 'dns', dns: { names: ['a.example'], port: 70000 } } }],
      ['a dns port that is not a number', { discovery: { provider: 'dns', dns: { names: ['a.example'], port: '3000' } } }],
      ['a tls name that is not a string', { discovery: { provider: 'dns', dns: { names: ['a.example'], tlsName: 7 } } }],
      ['a tls name with an invalid resolver', { discovery: { provider: 'dns', dns: { names: ['a.example'], tlsName: 'tls1', servers: ['resolver.example'] } } }],
      ['a refresh interval that is not a number', { discovery: { refreshIntervalMs: '30000' } }],
      ['portMap not an object', { translation: { provider: 'port-map', portMap: ['10.0.0.1:3000'] } }],
      ['a portMap value that is not a string', { translation: { provider: 'port-map', portMap: { '10.0.0.1:3000': 3000 } } }],
      ['a bad record type', { discovery: { provider: 'dns', dns: { names: ['a.example'], recordType: 'AAAA' } } }],
      ['a dns timeout that is not a number', { discovery: { provider: 'dns', dns: { names: ['a.example'], timeoutMs: '80' } } }],
      ['a bad merge policy', { discovery: { mergePolicy: 'Merge' } }],
      ['a refresh timeout that is not a number', { discovery: { refreshTimeoutMs: '10000' } }],
      ['a tend deadline that is not a number', { discovery: { tendRefreshDeadlineMs: '100' } }],
      ['an unknown translator', { translation: { provider: 'static-map' } }],
      ['discovery as an array', { discovery: [] }],
      ['translation as an array', { translation: [] }],
      ['dns as an array', { discovery: { provider: 'dns', dns: [] } }],
      ['dns names of null with the dns provider', { discovery: { provider: 'dns', dns: { names: null } } }]
    ]

    nativeInvalid.forEach(([name, options]) => {
      it(`rejects ${name} in the native layer`, function () {
        expect(native.client(Object.assign({ hosts: 'localhost:3000', log: { level: -1 } }, options))).to.be.null
      })
    })

    // Not closed: native close() before connect() is unsafe on dev (CLIENT-5899).
    it('accepts discovery settings without a provider in the native layer', function () {
      expect(native.client({ hosts: 'localhost:3000', discovery: { executionMode: 'tend', mergePolicy: 'discoveryOnly', refreshIntervalMs: 5000, refreshTimeoutMs: 2000, tendRefreshDeadlineMs: 50 } })).to.not.be.null
    })

    it('accepts null discovery and translation in the native layer', function () {
      expect(native.client({ hosts: 'localhost:3000', discovery: null, translation: null })).to.not.be.null
      expect(native.client({ hosts: 'localhost:3000', discovery: { executionMode: null, mergePolicy: null }, translation: { onMiss: null } })).to.not.be.null
    })

    it('accepts explicit default values in the native layer', function () {
      const options = {
        hosts: 'localhost:3000',
        discovery: { provider: 'dns', dns: { names: ['a.example'], recordType: 'A', servers: ['127.0.0.1'], tlsName: null }, executionMode: 'thread', mergePolicy: 'merge' },
        translation: { provider: 'port-map', portMap: {}, onMiss: 'passThrough' }
      }
      expect(native.client(options)).to.not.be.null
    })

    it('accepts translation with only onMiss in the native layer', function () {
      expect(native.client({ hosts: 'localhost:3000', translation: { onMiss: 'strict' } })).to.not.be.null
    })

    it('accepts valid discovery and translation in the native layer', function () {
      // Not closed: native close() before connect() is unsafe on dev (CLIENT-5899).
      const client = native.client({
        hosts: 'localhost:3000',
        discovery: { provider: 'dns', dns: { names: ['a.example'], servers: ['127.0.0.1'], recordType: 'SRV' }, executionMode: 'tend', mergePolicy: 'replace' },
        translation: { provider: 'pass-through', onMiss: 'strict' }
      })
      expect(client).to.not.be.null
    })
  })
})

describe('discovery with the dns provider', function () {
  this.timeout(20000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null
  let dns: DnsServer

  before(async function () {
    // The DNS answers need the server's IP address.
    if (!seed || !net.isIP(seed.addr)) this.skip()
    dns = await startDnsServer({
      'seeds.test': { A: [seed.addr] },
      '_aerospike._tcp.seeds.test': { SRV: [{ target: 'node.seeds.test', port: seed.port }] },
      'node.seeds.test': { A: [seed.addr] }
    })
  })

  after(async function () {
    if (dns) await dns.stop()
  })

  function dnsConfig (dnsOptions: any, discovery: any = {}): ConfigOptions {
    const config: any = Object.assign({}, helper.config, {
      hosts: [],
      discovery: Object.assign({ provider: 'dns', dns: Object.assign({ servers: [dns.address], port: seed.port }, dnsOptions) }, discovery)
    })
    return config
  }

  async function connectAndUse (config: ConfigOptions): Promise<void> {
    const client: Cli = await Aerospike.connect(config)
    try {
      expect(client.isConnected()).to.be.true
      const key = new Aerospike.Key(helper.namespace, helper.set, 'discovery/dns')
      await client.put(key, { v: 1 })
      expect((await client.get(key)).bins.v).to.equal(1)
      await client.remove(key)
    } finally {
      client.close()
    }
  }

  it('connects with no hosts, through A records', async function () {
    await connectAndUse(dnsConfig({ names: ['seeds.test'] }))
  })

  it('connects with no hosts, through SRV records and their ports', async function () {
    await connectAndUse(dnsConfig({ names: ['_aerospike._tcp.seeds.test'], recordType: 'SRV', port: 1 }))
  })

  it('connects in tend mode', async function () {
    await connectAndUse(dnsConfig({ names: ['seeds.test'] }, { executionMode: 'tend' }))
  })

  it('fails with ERR_SEED_DISCOVERY_FAILED when the name does not exist and there are no hosts', async function () {
    const error = await connectError(dnsConfig({ names: ['missing.seeds.test'] }))
    expect(error).to.be.instanceof(Aerospike.AerospikeError)
    expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
    expect(error.message).to.match(/missing\.seeds\.test/)
  })

  it('fails with ERR_SEED_DISCOVERY_FAILED when the resolver is unreachable and there are no hosts', async function () {
    const config = dnsConfig({ names: ['seeds.test'], servers: ['127.0.0.1:1'], timeoutMs: 200 }, { refreshTimeoutMs: 1000 })
    const error = await connectError(config)
    expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
  })

  it('moves on to the next resolver when one does not answer', async function () {
    const silent = await startDnsServer({}, { silent: true })
    try {
      await connectAndUse(dnsConfig({ names: ['seeds.test'], servers: [silent.address, dns.address] }))
      expect(await silent.queries()).to.be.greaterThan(0)
    } finally {
      await silent.stop()
    }
  })

  it('returns from close() at once while a refresh waits on a slow resolver', async function () {
    const slow = await startDnsServer({ 'seeds.test': { A: [seed.addr] } })
    const client: Cli = await Aerospike.connect(Object.assign(dnsConfig({ names: ['seeds.test'], servers: [slow.address], timeoutMs: 2000 }, { refreshIntervalMs: 300, refreshTimeoutMs: 3000 }), { tenderInterval: 250 }))
    try {
      await slow.setDelay(1500)
      await new Promise(resolve => setTimeout(resolve, 600))
    } finally {
      const start = Date.now()
      client.close()
      expect(Date.now() - start).to.be.below(100)
    }
    // The late answer arrives after close; the process and new clients are unaffected.
    await new Promise(resolve => setTimeout(resolve, 2000))
    await slow.stop()
    await connectAndUse(dnsConfig({ names: ['seeds.test'] }))
  })

  it('falls back to the configured hosts when discovery fails', async function () {
    const config: any = dnsConfig({ names: ['missing.seeds.test'] })
    config.hosts = helper.config.hosts
    await connectAndUse(config)
  })

  it('queries the configured resolver', async function () {
    const before = await dns.queries()
    await connectAndUse(dnsConfig({ names: ['seeds.test'] }))
    expect(await dns.queries()).to.be.greaterThan(before)
  })
})

describe('discovery seed refresh and limits', function () {
  this.timeout(20000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null
  let dns: DnsServer
  let ipv6 = false
  let logFile: string

  before(async function () {
    if (!seed || !net.isIP(seed.addr)) this.skip()
    dns = await startDnsServer({
      'seeds.test': { A: [seed.addr] },
      'v6.seeds.test': { AAAA: ['::1'] }
    })
    // The merge policy tests tell the seeds apart by address family.
    ipv6 = await new Promise<boolean>(resolve => {
      const socket = net.connect(seed.port, '::1', () => { socket.destroy(); resolve(true) })
      socket.on('error', () => resolve(false))
    })
  })

  after(async function () {
    if (dns) await dns.stop()
  })

  // C client log lines, written to a file for the test to read.
  function captureLog (): () => string {
    logFile = path.join(os.tmpdir(), `discovery-${process.pid}-${Date.now()}.log`)
    const fd = fs.openSync(logFile, 'w')
    Aerospike.setDefaultLogging({ level: Aerospike.log.WARN, file: fd })
    return () => {
      Aerospike.setDefaultLogging(helper.config.log ?? {})
      fs.closeSync(fd)
      const text = fs.readFileSync(logFile, 'utf8')
      fs.unlinkSync(logFile)
      return text
    }
  }

  function config (names: string[], discovery: any = {}, extra: any = {}): ConfigOptions {
    return Object.assign({}, helper.config, { hosts: [], tenderInterval: 250 }, extra, {
      discovery: Object.assign({ provider: 'dns', dns: { names, servers: [dns.address], port: seed.port } }, discovery)
    })
  }

  async function queriesWhile (client: Cli, ms: number): Promise<number> {
    const before = await dns.queries()
    await new Promise(resolve => setTimeout(resolve, ms))
    expect(client.isConnected()).to.be.true
    return (await dns.queries()) - before
  }

  describe('merge policy', function () {
    before(function () {
      if (!ipv6) this.skip()
    })

    // The static seed is the IPv4 address and DNS returns only ::1, so the
    // node's address shows which seed the client connected through.
    const policies: Array<[string, string]> = [
      ['merge', 'tries the static seeds first'],
      ['replace', 'tries the static seeds first at connect, like merge'],
      ['discoveryOnly', 'uses only the discovered seeds, here over IPv6']
    ]

    policies.forEach(([mergePolicy, title]) => {
      it(`${mergePolicy} ${title}`, async function () {
        const client: Cli = await Aerospike.connect(config(['v6.seeds.test'], { mergePolicy }, { hosts: [{ addr: seed.addr, port: seed.port }] }))
        try {
          const address = client.getNodes()[0].address
          expect(address).to.equal(mergePolicy === 'discoveryOnly' ? `[::1]:${seed.port}` : `${seed.addr}:${seed.port}`)
        } finally {
          client.close()
        }
      })
    })
  })

  it('refreshes periodically in thread mode, and stops after close', async function () {
    const client: Cli = await Aerospike.connect(config(['seeds.test'], { refreshIntervalMs: 300 }))
    try {
      expect(await queriesWhile(client, 1500)).to.be.at.least(3)
    } finally {
      client.close()
    }
    const afterClose = await dns.queries()
    await new Promise(resolve => setTimeout(resolve, 1000))
    expect(await dns.queries()).to.equal(afterClose)
  })

  it('refreshes periodically in tend mode', async function () {
    const client: Cli = await Aerospike.connect(config(['seeds.test'], { executionMode: 'tend', refreshIntervalMs: 500 }))
    try {
      expect(await queriesWhile(client, 2000)).to.be.at.least(2)
    } finally {
      client.close()
    }
  })

  it('keeps the previous seeds when a refresh fails, and keeps working', async function () {
    const readLog = captureLog()
    const client: Cli = await Aerospike.connect(config(['seeds.test'], { refreshIntervalMs: 300 }))
    try {
      await dns.setRecords({})
      await new Promise(resolve => setTimeout(resolve, 1000))
      const key = new Aerospike.Key(helper.namespace, helper.set, 'discovery/refresh')
      await client.put(key, { v: 1 })
      await client.remove(key)
    } finally {
      await dns.setRecords({ 'seeds.test': { A: [seed.addr] }, 'v6.seeds.test': { AAAA: ['::1'] } })
      client.close()
    }
    expect(readLog()).to.match(/Seed provider dns refresh failed: .*seeds\.test: NXDOMAIN\. Keeping the previous seeds/)
  })

  // C checks these when connecting and names the C settings in its messages.
  const limits: Array<[string, any, any, RegExp]> = [
    ['a DNS timeout over the tend deadline in tend mode', { executionMode: 'tend', tendRefreshDeadlineMs: 50 }, { timeoutMs: 80 }, /timeout_ms 80 exceeds discovery tend_refresh_deadline_ms 50/],
    ['a DNS timeout over the refresh timeout in thread mode', { refreshTimeoutMs: 50 }, { timeoutMs: 80 }, /timeout_ms 80 exceeds discovery refresh_timeout_ms 50/],
    ['a refresh interval below the tend interval', { refreshIntervalMs: 200 }, {}, /refresh_interval_ms 200 must be greater or equal to the tend interval 250/]
  ]

  limits.forEach(([name, discovery, dnsOptions, message]) => {
    it(`fails to connect with ERR_PARAM for ${name}`, async function () {
      const options: any = config(['seeds.test'], discovery)
      Object.assign(options.discovery.dns, dnsOptions)
      const error = await connectError(options)
      expect(error.code).to.equal(Aerospike.status.ERR_PARAM)
      expect(error.message).to.match(message)
    })
  })
})

describe('translation on a single node', function () {
  // A single node advertises no peers, so translation never runs; these check
  // that each translator is accepted at connect and the client works.
  const translators: Array<[string, any]> = [
    ['port-map', { provider: 'port-map', portMap: { '192.0.2.1:3000': '127.0.0.1:3000' } }],
    ['pass-through', { provider: 'pass-through' }],
    ['port-map with strict onMiss', { provider: 'port-map', portMap: { BB9000000000000: '127.0.0.1:3000' }, onMiss: 'strict' }]
  ]

  translators.forEach(([name, translation]) => {
    it(`connects with ${name}`, async function () {
      const client: Cli = await Aerospike.connect(Object.assign({}, helper.config, { translation }))
      try {
        expect(client.isConnected()).to.be.true
      } finally {
        client.close()
      }
    })
  })
})
