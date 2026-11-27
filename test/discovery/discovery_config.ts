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
import { spawn, spawnSync } from 'child_process'
import * as Aerospike from '../../lib/aerospike.js'
import * as helper from '../test_helper.ts'
import { connectError } from './helpers.ts'
import { startDnsServer, DnsServer } from './dns_server.ts'
import { startEc2Server } from './ec2_server.ts'

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

    it('drops unset values and the static provider, and upper-cases the record type', function () {
      const config = new Config({
        discovery: { provider: 'static', mergePolicy: null, executionMode: undefined },
        translation: { provider: null, onMiss: null }
      } as any)
      expect(config.discovery).to.eql({})
      expect(config.translation).to.eql({})
      const dns = new Config({ discovery: { provider: 'dns', dns: { names: ['a.example'], recordType: 'srv', tlsName: null } } } as any)
      expect(dns.discovery).to.eql({ provider: 'dns', dns: { names: ['a.example'], recordType: 'SRV' } })
    })

    it('does not change the options it was given', function () {
      const discovery: any = { provider: 'dns', dns: { names: ['a.example'], recordType: 'srv' }, mergePolicy: null }
      const translation: any = { provider: 'static-map', staticMap: { '10.0.0.1': 'gw' } }
      const copy = JSON.parse(JSON.stringify({ discovery, translation }))
      Aerospike.client({ hosts: 'h:3000', discovery, translation })
      expect({ discovery, translation }).to.eql(copy)
    })

    it('turns static-map with staticMap into ipMap', function () {
      const config = new Config({ translation: { provider: 'static-map', staticMap: { '10.0.0.1': 'gw.example.com' }, onMiss: 'strict' } })
      expect(config.ipMap).to.eql({ '10.0.0.1': 'gw.example.com' })
      expect(config.translation).to.eql({ onMiss: 'strict' })
    })

    it('keeps ipMap with static-map and no staticMap', function () {
      const config = new Config({ ipMap: { '10.0.0.1': 'gw' }, translation: { provider: 'static-map' } })
      expect(config.ipMap).to.eql({ '10.0.0.1': 'gw' })
      expect(config.translation).to.eql({})
    })

    it('treats an empty cluster name as none', function () {
      expect(new Config({ clusterName: '' }).clusterName).to.be.undefined
      expect(new Config({ clusterName: 'prod' }).clusterName).to.equal('prod')
    })

    it('copies the aws-tags options', function () {
      const aws = { region: 'eu-west-1', filters: [{ name: 'tag:cluster', values: ['a', 'b'] }], addressField: 'publicDns' as const, port: 4000, tlsName: 'tls1', timeoutMs: 1500, endpoint: 'https://ec2.example.com', caFile: __filename, accessKeyId: 'AKID', secretAccessKey: 'secret', sessionToken: 'token' }
      expect(new Config({ discovery: { provider: 'aws-tags', aws } }).discovery).to.eql({ provider: 'aws-tags', aws })
    })

    it('accepts any tend interval, with no minimum', function () {
      // The Java client rejects a tend interval below 250 ms; Node keeps
      // accepting it, so a client that tends more often keeps doing so.
      expect(() => new Config({ tenderInterval: 100, discovery: { provider: 'dns', dns: { names: ['a'] } } })).to.not.throw()
      expect(new Config({ tenderInterval: 100 }).tenderInterval).to.equal(100)
    })

    it('accepts valid aws-tags endpoints, CA files and keys', function () {
      const aws = { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }] }
      for (const extra of [{ endpoint: 'http://127.0.0.1:8080/ec2' }, { endpoint: 'https://[::1]:443' }, { caFile: __filename, caPath: __dirname },
        { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalr/K7MDENG+bPxRfiCY!', sessionToken: 'Fw0G//Z=' }]) {
        expect(() => new Config({ discovery: { provider: 'aws-tags', aws: Object.assign({}, aws, extra) } })).to.not.throw()
      }
    })

    it('has no public option or export named after a load balancer product', function () {
      // U-11: the configuration surface stays product neutral.
      const names: string[] = []
      const collect = (obj: any, prefix: string, depth: number): void => {
        if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function') || depth > 2) return
        for (const key of Object.keys(obj)) {
          names.push(prefix + key)
          collect(obj[key], `${prefix}${key}.`, depth + 1)
        }
      }
      collect(Aerospike, '', 0)
      collect(new Config({ discovery: { provider: 'dns', dns: { names: ['a'] } }, translation: { provider: 'port-map', portMap: {} } }), 'config.', 0)
      const declarations = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'aerospike.d.ts'), 'utf8')
        .split('\n').filter(line => !/^\s*(\*|\/\/|\/\*)/.test(line)).join('\n')
      expect(names.filter(name => /nlb/i.test(name))).to.eql([])
      expect(declarations).to.not.match(/nlb/i)
    })

    it('leaves the idle connection limit to the C client default', function () {
      // U-12: with maxSocketIdle unset (0), the C client closes connections
      // idle for 55 s, checked about every 30 tends, well under the 350 s
      // idle timeout of an AWS load balancer endpoint.
      expect(new Config({})).to.not.have.property('maxSocketIdle')
    })

    it('accepts limits that are exactly met', function () {
      expect(() => new Config({ discovery: { provider: 'dns', dns: { names: ['a'], timeoutMs: 2000 } } })).to.not.throw()
      // The default AWS timeout (5000) is within the default refresh timeout, and exactly meets a lower one.
      expect(() => new Config({ discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }] } } })).to.not.throw()
      expect(() => new Config({ discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }] }, refreshTimeoutMs: 5000 } })).to.not.throw()
      expect(() => new Config({ tenderInterval: 30000, discovery: { provider: 'dns', dns: { names: ['a'] } } })).to.not.throw()
      expect(() => new Config({ tenderInterval: 200, discovery: { provider: 'dns', executionMode: 'tend', dns: { names: ['a'], timeoutMs: 100 } } })).to.not.throw()
      // The limits apply only to a provider that refreshes.
      expect(() => new Config({ tenderInterval: 50000, discovery: { executionMode: 'tend', tendRefreshDeadlineMs: 50000 } })).to.not.throw()
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
      ['an unknown provider', { discovery: { provider: 'aws' } }, /discovery.provider must be one of 'static', 'dns', 'aws-tags'/],
      ['dns without the dns provider', { discovery: { dns } }, /discovery.dns is only valid/],
      ['the dns provider without dns', { discovery: { provider: 'dns' } }, /discovery.dns must be an object/],
      ['no dns names', { discovery: { provider: 'dns', dns: { names: [] } } }, /at least one DNS name/],
      ['an empty dns name', { discovery: { provider: 'dns', dns: { names: [''] } } }, /non-empty strings/],
      ['duplicate dns names', { discovery: { provider: 'dns', dns: { names: ['a.example', 'A.example'] } } }, /duplicate name 'A.example'/],
      ['dns names that differ by a trailing dot', { discovery: { provider: 'dns', dns: { names: ['a.example', 'a.example.'] } } }, /duplicate name 'a.example.'/],
      ['the root dns name', { discovery: { provider: 'dns', dns: { names: ['.'] } } }, /Invalid DNS seed provider name: '.'/],
      ['a dns name with a space', { discovery: { provider: 'dns', dns: { names: ['a b'] } } }, /Invalid DNS seed provider name: 'a b'/],
      ['a resolver that is not an IP address', { discovery: { provider: 'dns', dns: { names: ['a'], servers: ['ns.example'] } } }, /server: 'ns.example': expected an IP address/],
      ['a resolver with a bad port', { discovery: { provider: 'dns', dns: { names: ['a'], servers: ['10.0.0.2:0'] } } }, /server: '10.0.0.2:0': invalid port/],
      ['an unclosed IPv6 resolver', { discovery: { provider: 'dns', dns: { names: ['a'], servers: ['[::1:53'] } } }, /Invalid DNS seed provider server: '\[::1:53'/],
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
      ['an unknown translator', { translation: { provider: 'nat' } }, /translation.provider must be one of 'static-map', 'port-map', 'pass-through'/],
      ['staticMap without static-map', { translation: { staticMap: {} } }, /staticMap is only valid/],
      ['a staticMap entry that is not a string', { translation: { provider: 'static-map', staticMap: { a: 1 } } }, /translation.staticMap entry "a"/],
      ['both staticMap and ipMap', { ipMap: { a: 'b' }, translation: { provider: 'static-map', staticMap: { c: 'd' } } }, /Set translation.staticMap or ipMap, not both/],
      ['an ipMap that is not an object', { ipMap: 'a=b' }, /ipMap must be an object/],
      ['portMap without port-map', { translation: { provider: 'pass-through', portMap: {} } }, /portMap is only valid/],
      ['port-map without portMap', { translation: { provider: 'port-map' } }, /portMap must be an object/],
      ['a portMap value without a port', { translation: { provider: 'port-map', portMap: { '10.0.0.1:3000': 'gw' } } }, /must map to a host:port/],
      ['a portMap value with a bad port', { translation: { provider: 'port-map', portMap: { '10.0.0.1:3000': 'gw:0' } } }, /must map to a host:port/],
      ['an unbracketed IPv6 key', { translation: { provider: 'port-map', portMap: { '::1:3000': 'gw:3000' } } }, /must be a host:port or a node name/],
      ['a bad onMiss', { translation: { onMiss: 'STRICT' } }, /onMiss must be one of/],
      // The Java client's limits, for a provider that refreshes.
      ['a refresh interval below the tend interval', { tenderInterval: 250, discovery: { provider: 'dns', dns, refreshIntervalMs: 200 } }, /Discovery refresh interval 200 must be greater or equal to the tend interval 250/],
      ['the default refresh interval below a long tend interval', { tenderInterval: 60000, discovery: { provider: 'dns', dns } }, /Discovery refresh interval 30000 must be greater or equal to the tend interval 60000/],
      ['a DNS timeout over the default refresh timeout', { discovery: { provider: 'dns', dns: { names: ['a'], timeoutMs: 10001 } } }, /DNS seed provider timeout 10001 must be less or equal to the discovery refresh timeout 10000/],
      ['a DNS timeout over the refresh timeout', { discovery: { provider: 'dns', dns: { names: ['a'], timeoutMs: 80 }, refreshTimeoutMs: 50 } }, /DNS seed provider timeout 80 must be less or equal to the discovery refresh timeout 50/],
      ['a tend deadline over half the tend interval', { tenderInterval: 150, discovery: { provider: 'dns', dns, executionMode: 'tend', refreshIntervalMs: 1000 } }, /Invalid discovery tend refresh deadline: 100. Must be > 0 and <= tend interval \/ 2 \(75\)/],
      ['a DNS timeout over the tend deadline', { discovery: { provider: 'dns', dns: { names: ['a'], timeoutMs: 80 }, executionMode: 'tend', tendRefreshDeadlineMs: 50 } }, /DNS seed provider timeout 80 must be less or equal to the discovery tend refresh deadline 50/],
      ['aws-tags in tend mode', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }] }, executionMode: 'tend' } }, /'aws-tags' runs only in discovery.executionMode 'thread'/],
      ['an AWS timeout over the refresh timeout', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], timeoutMs: 10001 } } }, /AWS EC2 seed provider timeout 10001 must be less or equal to the discovery refresh timeout 10000/],
      ['the default AWS timeout over a lower refresh timeout', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }] }, refreshTimeoutMs: 4999 } }, /AWS EC2 seed provider timeout 5000 must be less or equal to the discovery refresh timeout 4999/],
      // aws-tags options.
      ['aws without the aws-tags provider', { discovery: { aws: {} } }, /discovery.aws is only valid with discovery.provider 'aws-tags'/],
      ['the aws-tags provider without aws', { discovery: { provider: 'aws-tags' } }, /discovery.aws must be an object/],
      ['an unknown aws option', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], profile: 'x' } } }, /discovery.aws.profile is not a valid option/],
      ['a bad region', { discovery: { provider: 'aws-tags', aws: { region: 'US East', filters: [{ name: 'tag:a', values: ['b'] }] } } }, /discovery.aws.region must be an AWS region/],
      ['no filters', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [] } } }, /at least one filter/],
      ['a filter on instance-state-name', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'instance-state-name', values: ['running'] }] } } }, /must not filter on instance-state-name/],
      ['duplicate filters', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }, { name: 'tag:a', values: ['c'] }] } } }, /lists "tag:a" more than once/],
      ['a filter with no values', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: [] }] } } }, /"tag:a" must list at least one value/],
      ['a filter with an empty value', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: [''] }] } } }, /"tag:a" values must be an array of non-empty strings/],
      ['a bad address field', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], addressField: 'private_ip' } } }, /addressField must be one of 'privateIp', 'publicIp', 'privateDns', 'publicDns'/],
      ['an empty aws tls name', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], tlsName: '' } } }, /discovery.aws.tlsName must be a non-empty string/],
      ['an access key without a secret', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], accessKeyId: 'AKID' } } }, /must be set together/],
      ['a session token without keys', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], sessionToken: 't' } } }, /sessionToken needs/],
      // The C client's aws-tags checks, made here so the message says what is wrong.
      ['an endpoint that is not http or https', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], endpoint: 'ftp://ec2.example.com' } } }, /Invalid AWS EC2 seed provider endpoint 'ftp:\/\/ec2.example.com'/],
      ['an endpoint with a query', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], endpoint: 'https://ec2.example.com/?x=1' } } }, /expected http or https URL with a host and no query/],
      ['an endpoint with port 0', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], endpoint: 'https://ec2.example.com:0' } } }, /expected http or https URL/],
      ['an endpoint with credentials, not repeated in the message', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], endpoint: 'https://user:pw@ec2.example.com' } } }, /^Invalid AWS EC2 seed provider endpoint: expected/],
      ['an access key with other characters', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], accessKeyId: 'AKID-1', secretAccessKey: 'secret' } } }, /access_key_id: expected letters and digits/],
      ['a secret with a space', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], accessKeyId: 'AKID', secretAccessKey: 'se cret' } } }, /^Invalid AWS EC2 seed provider secret_access_key: invalid character$/],
      ['a session token with a space', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], accessKeyId: 'AKID', secretAccessKey: 'secret', sessionToken: 'to ken' } } }, /session_token: invalid character/],
      ['a CA file that does not exist', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], caFile: '/no/such/ca.pem' } } }, /caFile '\/no\/such\/ca.pem' is not a readable file/],
      ['a CA path that is not a directory', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], caPath: __filename } } }, /caPath '.*' is not a directory/]
    ]

    invalid.forEach(([name, options, message]) => {
      it(`rejects ${name} with an AerospikeError`, function () {
        for (const create of [() => new Config(options as ConfigOptions), () => Aerospike.client(options as ConfigOptions)]) {
          let error: any
          try {
            create()
          } catch (err) {
            error = err
          }
          expect(error).to.be.instanceof(Aerospike.AerospikeError)
          expect(error.code).to.equal(Aerospike.status.ERR_CLIENT)
          expect(error.message).to.match(message)
        }
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
      ['dns names of null with the dns provider', { discovery: { provider: 'dns', dns: { names: null } } }],
      ['aws not an object', { discovery: { provider: 'aws-tags', aws: 'us-east-1' } }],
      ['aws filters not an array', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: {} } } }],
      ['an aws filter that is not an object', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: ['tag:a'] } } }],
      ['an aws filter name that is not a string', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 1, values: ['b'] }] } } }],
      ['aws filter values not an array', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: 'b' }] } } }],
      ['a bad aws address field', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], addressField: 'ip' } } }],
      ['an aws port of 0', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], port: 0 } } }],
      ['an aws region that is not a string', { discovery: { provider: 'aws-tags', aws: { region: 1, filters: [{ name: 'tag:a', values: ['b'] }] } } }],
      ['an aws timeout that is not a number', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], timeoutMs: '100' } } }],
      ['an invalid aws region', { discovery: { provider: 'aws-tags', aws: { region: 'US', filters: [{ name: 'tag:a', values: ['b'] }] } } }],
      ['aws-tags in tend mode', { discovery: { provider: 'aws-tags', executionMode: 'tend', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }] } } }],
      ['an aws endpoint that is not http or https', { discovery: { provider: 'aws-tags', aws: { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b'] }], endpoint: 'ftp://x' } } }]
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

    it('accepts the static and aws-tags providers in the native layer', function () {
      expect(native.client({ hosts: 'localhost:3000', discovery: { provider: 'static' } })).to.not.be.null
      const aws = { region: 'us-east-1', filters: [{ name: 'tag:a', values: ['b', 'c'] }, { name: 'tag:d', values: ['e'] }], addressField: 'privateDns', port: 4000, tlsName: 'tls1', timeoutMs: 1500, endpoint: 'http://127.0.0.1:1', accessKeyId: 'AKID', secretAccessKey: 'secret', sessionToken: 'token' }
      expect(native.client({ hosts: 'localhost:3000', discovery: { provider: 'aws-tags', aws } })).to.not.be.null
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

  it('uses the names that resolve and warns once for each that fails (CN-04)', async function () {
    const logFile = path.join(os.tmpdir(), `discovery-cn04-${process.pid}-${Date.now()}.log`)
    const fd = fs.openSync(logFile, 'w')
    Aerospike.setDefaultLogging({ level: Aerospike.log.WARN, file: fd })
    let text = ''
    try {
      await connectAndUse(dnsConfig({ names: ['missing-a.seeds.test', 'seeds.test', 'missing-b.seeds.test'] }))
    } finally {
      Aerospike.setDefaultLogging(helper.config.log ?? {})
      fs.closeSync(fd)
      text = fs.readFileSync(logFile, 'utf8')
      fs.unlinkSync(logFile)
    }
    expect(text.match(/DNS seed name missing-a\.seeds\.test failed: /g)).to.have.lengthOf(1)
    expect(text.match(/DNS seed name missing-b\.seeds\.test failed: /g)).to.have.lengthOf(1)
    expect(text).to.not.match(/DNS seed name seeds\.test failed/)
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

  it('uses the configured hosts with discoveryOnly when discovery finds no seeds', async function () {
    // An empty answer is a result, not a failure: discoveryOnly falls back to hosts.
    await dns.setRecords({ 'seeds.test': { A: [seed.addr] }, 'v6.seeds.test': { AAAA: ['::1'] }, 'empty.seeds.test': { A: [] } })
    const client: Cli = await Aerospike.connect(config(['empty.seeds.test'], { mergePolicy: 'discoveryOnly' }, { hosts: [{ addr: seed.addr, port: seed.port }] }))
    try {
      expect(client.getNodes()[0].address).to.equal(`${seed.addr}:${seed.port}`)
    } finally {
      client.close()
    }
  })

  it('refreshes periodically in thread mode, and stops after close', async function () {
    const client: Cli = await Aerospike.connect(config(['seeds.test'], { refreshIntervalMs: 300 }))
    try {
      expect(await queriesWhile(client, 1500)).to.be.at.least(3)
    } finally {
      client.close()
    }
    // close() returns at once and the C client stops discovery on its close
    // thread, so a refresh already due may still run just after it returns.
    await new Promise(resolve => setTimeout(resolve, 500))
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

  it('keeps a tend-mode refresh within its deadline when the resolver is slow (TC-06)', async function () {
    // In tend mode the dns provider bounds each lookup with timeoutMs, which
    // may not exceed tendRefreshDeadlineMs: a slow resolver fails the refresh
    // on time, so tend never overruns, the breaker never trips, the previous
    // seeds are kept and the client keeps working. (Only a custom C provider
    // can overrun; a JavaScript provider runs in thread mode only.)
    const readLog = captureLog()
    const discovery = { executionMode: 'tend', tendRefreshDeadlineMs: 100, refreshIntervalMs: 250 }
    const options: any = config(['seeds.test'], discovery)
    options.discovery.dns.timeoutMs = 80
    const client: Cli = await Aerospike.connect(options)
    let log = ''
    try {
      await dns.setDelay(400)
      const before = await dns.queries()
      await new Promise(resolve => setTimeout(resolve, 2000))
      expect((await dns.queries()) - before, 'refreshes ran while the resolver was slow').to.be.at.least(3)
      const key = new Aerospike.Key(helper.namespace, helper.set, 'discovery/tend-slow')
      await client.put(key, { v: 1 })
      await dns.setDelay(0)
      await new Promise(resolve => setTimeout(resolve, 1000))
      await client.put(key, { v: 2 })
      expect((await client.get(key)).bins.v).to.equal(2)
      await client.remove(key)
    } finally {
      await dns.setDelay(0)
      client.close()
      log = readLog()
    }
    expect(log).to.match(/Seed provider dns refresh failed: .*Keeping the previous seeds/)
    expect(log).to.not.match(/exceeding tend_refresh_deadline_ms/)
    expect(log).to.not.match(/no longer refreshed/)
  })

  it('reconnects in tend mode from the seeds it holds, with no new lookup (M-12)', async function () {
    // The seed is a proxy to the server in a separate process: this client
    // connects on the JavaScript thread, so a proxy on it could not answer.
    // Killing the proxy drops the node; a new proxy on the same port brings it
    // back. In tend mode the client re-seeds from the snapshot in hand and makes
    // no lookup (the refresh interval is far off; tend mode has no urgent refresh).
    const startProxy = async (port: number): Promise<{ port: number, stop: () => Promise<void> }> => {
      const child = spawn(process.execPath, ['-e', `
        const net = require('net')
        const server = net.createServer(s => { const u = net.connect(${seed.port}, ${JSON.stringify(seed.addr)}); s.pipe(u); u.pipe(s); s.on('error', () => u.destroy()); u.on('error', () => s.destroy()) })
        server.listen(${port}, '127.0.0.1', () => console.log(server.address().port))
      `])
      const actual = await new Promise<number>((resolve, reject) => {
        child.stdout.once('data', data => resolve(Number(String(data).trim())))
        child.once('exit', code => reject(new Error(`proxy exited ${code}`)))
      })
      return { port: actual, stop: () => new Promise(resolve => { child.once('exit', () => resolve()); child.kill('SIGKILL') }) }
    }
    let proxy = await startProxy(0)
    const port = proxy.port
    const options: any = Object.assign({}, helper.config, { hosts: [], tenderInterval: 250 }, {
      discovery: { provider: 'dns', dns: { names: ['proxy.seeds.test'], servers: [dns.address], port, timeoutMs: 80 }, executionMode: 'tend', refreshIntervalMs: 60000 }
    })
    await dns.setRecords({ 'seeds.test': { A: [seed.addr] }, 'v6.seeds.test': { AAAA: ['::1'] }, 'proxy.seeds.test': { A: ['127.0.0.1'] } })
    let client: Cli | undefined
    const waitFor = async (check: () => boolean, ms: number): Promise<boolean> => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (check()) return true; await new Promise(resolve => setTimeout(resolve, 50)) }
      return check()
    }
    try {
      client = await Aerospike.connect(options)
      const c = client
      const queries = await dns.queries()
      await proxy.stop()
      expect(await waitFor(() => c.getNodes().length === 0, 10000), 'the node is dropped').to.be.true
      proxy = await startProxy(port)
      expect(await waitFor(() => c.getNodes().length === 1, 5000), 'reconnects').to.be.true
      expect(await dns.queries(), 'no lookup for the reconnect').to.equal(queries)
    } finally {
      client?.close()
      await proxy.stop()
      await dns.setRecords({ 'seeds.test': { A: [seed.addr] }, 'v6.seeds.test': { AAAA: ['::1'] } })
    }
  })

  it('takes the provider limits from refreshTimeoutMs when it is set', async function () {
    const client: Cli = await Aerospike.connect(config(['seeds.test'], { refreshTimeoutMs: 3000 }, {}))
    client.close()
    const options: any = config(['seeds.test'], { refreshTimeoutMs: 3000 })
    options.discovery.dns.timeoutMs = 2500
    const withTimeout: Cli = await Aerospike.connect(options)
    withTimeout.close()
  })
})

describe('discovery with the aws-tags provider', function () {
  this.timeout(20000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null

  before(function () {
    if (!seed || !net.isIP(seed.addr)) this.skip()
  })

  function awsConfig (endpoint: string, aws: any = {}): ConfigOptions {
    return Object.assign({}, helper.config, {
      hosts: [],
      discovery: {
        provider: 'aws-tags',
        aws: Object.assign({ region: 'us-east-1', filters: [{ name: 'tag:cluster', values: ['test'] }], endpoint, port: seed.port, accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY' }, aws)
      }
    })
  }

  it('connects through the instances EC2 lists, with the filters it was given', async function () {
    const ec2 = await startEc2Server([seed.addr])
    try {
      const client: Cli = await Aerospike.connect(awsConfig(ec2.endpoint))
      try {
        expect(client.isConnected()).to.be.true
      } finally {
        client.close()
      }
      const [request] = await ec2.requests()
      expect(request).to.include('Action=DescribeInstances')
      expect(request).to.include('Filter.1.Name=tag%3Acluster&Filter.1.Value.1=test')
      expect(request).to.include('Filter.2.Name=instance-state-name&Filter.2.Value.1=running')
    } finally {
      await ec2.stop()
    }
  })

  it('fails with ERR_SEED_DISCOVERY_FAILED when EC2 cannot be reached and there are no hosts', async function () {
    const error = await connectError(awsConfig('http://127.0.0.1:1', { timeoutMs: 500 }))
    expect(error.code).to.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
    expect(error.message).to.match(/Seed provider aws-tags failed and no seed host is left/)
  })

  it('treats an empty EC2 listing as a result, not a discovery failure', async function () {
    const ec2 = await startEc2Server([])
    try {
      const error = await connectError(awsConfig(ec2.endpoint))
      expect(error.code).to.not.equal(Aerospike.status.ERR_SEED_DISCOVERY_FAILED)
      // An empty result is published, so connect has no seed host at all.
      expect(error.message).to.match(/No seed host to connect to/)
    } finally {
      await ec2.stop()
    }
  })
})

describe('a seed TLS name without TLS #noserver', function () {
  // Port 1 refuses the connection, so connect fails at once.
  const log = { level: Aerospike.log.OFF }

  async function failedConnect (hosts: any, extra: any = {}): Promise<any> {
    return await connectError(Object.assign({ hosts, log, connTimeoutMs: 1000 }, extra))
  }

  it('adds the likely cause to the error, keeping its code', async function () {
    const plain = await failedConnect('127.0.0.1:1')
    const named = await failedConnect('127.0.0.1:tls1:1')
    expect(named.code).to.equal(plain.code)
    expect(named.message).to.equal(`${plain.message}. Seed host tlsName 'tls1' defined but client tls not enabled`)
  })

  it('finds the TLS name in a hosts array and in an IPv6 hosts string', async function () {
    expect((await failedConnect([{ addr: '127.0.0.1', port: 1, tlsname: 'tls2' }])).message).to.match(/Seed host tlsName 'tls2' defined/)
    expect((await failedConnect('[::1]:tls3:1')).message).to.match(/Seed host tlsName 'tls3' defined/)
  })

  it('adds nothing without a TLS name, or when TLS is on', async function () {
    expect((await failedConnect('127.0.0.1:1')).message).to.not.match(/tlsName/)
    expect((await failedConnect('[::1]:1')).message).to.not.match(/tlsName/)
    expect((await failedConnect('127.0.0.1:tls1:1', { tls: { enable: true } })).message).to.not.match(/tlsName/)
  })
})

describe('discovery and translation with dynamic config', function () {
  // Discovery and translation are set when the client is created. They are
  // not dynamic config keys: a config file that names them doesn't change the
  // client's own settings. (Today the C client rejects the whole file and
  // logs it; the client keeps working with its own config.)
  it('keeps its own settings when the config file names discovery and translation', async function () {
    const file = path.join(os.tmpdir(), `discovery-dynamic-${process.pid}-${Date.now()}.yml`)
    fs.writeFileSync(file, [
      'version: 1.0.0',
      'dynamic:',
      '  client:',
      '    discovery:',
      '      provider: dns',
      '      merge_policy: discovery_only',
      '    translation:',
      '      provider: pass-through',
      '      on_miss: strict',
      ''
    ].join('\n'))
    const translation = { provider: 'port-map' as const, portMap: { '192.0.2.1:3000': '127.0.0.1:3000' } }
    try {
      const client: Cli = await Aerospike.connect(Object.assign({}, helper.config, {
        log: { level: Aerospike.log.OFF },
        translation,
        configProvider: { path: file, interval: 1000 }
      }))
      try {
        const key = new Aerospike.Key(helper.namespace, helper.set, 'discovery/dynamic')
        await client.put(key, { v: 1 })
        expect((await client.get(key)).bins.v).to.equal(1)
        await client.remove(key)
        expect(client.config.translation).to.eql(translation)
        expect(client.config).to.not.have.property('discovery')
      } finally {
        client.close()
      }
    } finally {
      fs.unlinkSync(file)
    }
  })
})

describe('useAlternateAccessAddress without an alternate address', function () {
  // N-14: a node with no alternate-access-address fails loudly at connect.
  it('fails to connect with ERR_INVALID_NODE, naming the setting', async function () {
    const reply: string = await helper.client.infoAny('service-clear-alt')
    if (helper.config.tls != null || reply.split('\t')[1]?.trim() !== '') this.skip()
    const error = await connectError(Object.assign({}, helper.config, {
      useAlternateAccessAddress: true,
      log: { level: Aerospike.log.OFF }
    }))
    expect(error).to.be.instanceOf(Aerospike.AerospikeError)
    expect(error.code).to.equal(Aerospike.status.ERR_INVALID_NODE)
    expect(error.message).to.match(/no alternate-access-address and use_services_alternate is true/)
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

describe('ipMap ownership with a config file (CY-15)', function () {
  this.timeout(60000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null

  before(function () {
    if (!seed || !net.isIP(seed.addr)) this.skip()
  })

  // When the config file sets ip_map, as_config.ip_map points at the C client's
  // own copy, which it frees; the client frees only the array it built from
  // Config#ipMap. Each case connects, writes, closes and runs again, in a new
  // process (under Guard Malloc on macOS, so a double free or a use after free
  // crashes it). The seed 10.255.0.1 is routable only through the file's map.
  it('frees each ip_map once, whether the file, the code or both set it', function () {
    const file = (body: string[]): string => {
      const name = path.join(os.tmpdir(), `cy15-${process.pid}-${Math.random().toString(36).slice(2)}.yml`)
      fs.writeFileSync(name, ['version: 1.2.0', 'static:', '  client:', ...body, ''].join('\n'))
      return name
    }
    const files = {
      ipMap: file(['    ip_map:', `      "10.255.0.1": "${seed.addr}"`]),
      staticMap: file(['    translation:', '      static_map:', `        "10.255.0.1": "${seed.addr}"`])
    }
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      const files = ${JSON.stringify(files)}
      const real = ${JSON.stringify({ addr: seed.addr, port: seed.port })}
      const viaFile = { addr: '10.255.0.1', port: real.port }
      const codeMap = { '10.255.0.2': real.addr }
      const cases = [
        ['file and code', { hosts: [viaFile], ipMap: codeMap, configProvider: { path: files.ipMap } }, true],
        ['file only', { hosts: [viaFile], configProvider: { path: files.ipMap } }, true],
        ['code only', { hosts: [real], ipMap: codeMap }, true],
        ['file static_map and code', { hosts: [viaFile], ipMap: codeMap, configProvider: { path: files.staticMap } }, true],
        ['file and code, never connected', { hosts: [viaFile], ipMap: codeMap, configProvider: { path: files.ipMap } }, false]
      ]
      ;(async () => {
        for (const [name, config, connect] of cases) {
          for (let i = 0; i < 3; i++) {
            const client = new Aerospike.Client(Object.assign({ log: { level: Aerospike.log.OFF }, connTimeoutMs: 2000 }, config))
            if (connect) {
              await client.connect()
              const key = new Aerospike.Key('test', 'demo', 'cy15')
              await client.put(key, { v: i })
              await client.remove(key)
            }
            client.close()
            await new Promise(resolve => setTimeout(resolve, 300))
          }
          console.log('ok ' + name)
        }
      })().catch(err => { console.log('failed ' + err.message); process.exit(2) })
    `
    const env = Object.assign({}, process.env)
    if (process.platform === 'darwin') Object.assign(env, { DYLD_INSERT_LIBRARIES: '/usr/lib/libgmalloc.dylib', MALLOC_PROTECT_BEFORE: '1' })
    try {
      const result = spawnSync(process.execPath, ['-e', script], { timeout: 50000, encoding: 'utf8', env })
      expect(result.status, `${result.stdout}${result.stderr}`).to.equal(0)
      expect(result.stdout.trim().split('\n')).to.eql([
        'ok file and code', 'ok file only', 'ok code only', 'ok file static_map and code', 'ok file and code, never connected'
      ])
    } finally {
      for (const name of Object.values(files)) fs.unlinkSync(name)
    }
  })
})

// C test plan CY rows, through Node: the discovery keys of the YAML config file.
// Node cannot read the C client's settings, so each case checks behaviour: a
// client with no hosts in code connects only if the file's dns discovery applied.
describe('discovery from the config file (CY-01, CY-04, CY-05, CY-07, CY-08, CY-11, CY-12)', function () {
  this.timeout(30000)

  const hosts: any = helper.config.hosts
  const seed: any = Array.isArray(hosts) ? hosts[0] : null
  let dns: DnsServer
  const files: string[] = []

  before(async function () {
    if (!seed || !net.isIP(seed.addr)) this.skip()
    dns = await startDnsServer({ 'seeds.cfg.test': { A: [seed.addr] } })
  })

  after(async function () {
    if (dns) await dns.stop()
    for (const file of files) try { fs.unlinkSync(file) } catch (err) {}
  })

  function yamlFile (lines: string[]): string {
    const file = path.join(os.tmpdir(), `discovery-file-${process.pid}-${files.length}.yml`)
    fs.writeFileSync(file, lines.join('\n') + '\n')
    files.push(file)
    return file
  }

  // A file with dns discovery under static.client.discovery (extra lines go in
  // that block) and a tend interval of 250 ms, so a 500 ms refresh is valid.
  function dnsBlock (extra: string[] = []): string[] {
    return ['version: 1.2.0', 'static:', '  client:', '    discovery:', '      provider: dns',
      '      merge_policy: discovery_only', '      refresh_interval_ms: 500', ...extra,
      '      dns:', '        names: [seeds.cfg.test]', `        servers: ["${dns.address}"]`, `        port: ${seed.port}`,
      'dynamic:', '  client:', '    tend_interval: 250']
  }

  // Connects with no hosts in code, writes and closes; returns the error or null and the C log.
  async function tryFile (file: string): Promise<{ error: any, log: string }> {
    const logFile = path.join(os.tmpdir(), `discovery-file-${process.pid}-${Date.now()}.log`)
    const fd = fs.openSync(logFile, 'w')
    Aerospike.setDefaultLogging({ level: Aerospike.log.WARN, file: fd })
    let error: any = null
    const client = new Aerospike.Client({ hosts: [], log: { level: Aerospike.log.WARN, file: fd }, configProvider: { path: file } })
    try {
      await client.connect()
      const key = new Aerospike.Key(helper.namespace, helper.set, 'discovery/file')
      await client.put(key, { v: 1 })
      await client.remove(key)
    } catch (err) {
      error = err
    } finally {
      client.close()
      Aerospike.setDefaultLogging(helper.config.log ?? {})
      fs.closeSync(fd)
    }
    const log = fs.readFileSync(logFile, 'utf8')
    fs.unlinkSync(logFile)
    return { error, log }
  }

  it('takes dns discovery, its servers, port and refresh interval from the file (CY-01, CY-11)', async function () {
    const file = yamlFile(dnsBlock())
    const client = new Aerospike.Client({ hosts: [], log: { level: Aerospike.log.OFF }, configProvider: { path: file } })
    try {
      await client.connect()
      const before = await dns.queries()
      await new Promise(resolve => setTimeout(resolve, 2000))
      expect((await dns.queries()) - before, 'refreshes at the file interval').to.be.at.least(3)
      const key = new Aerospike.Key(helper.namespace, helper.set, 'discovery/file-dns')
      await client.put(key, { v: 1 })
      await client.remove(key)
    } finally {
      client.close()
    }
  })

  it('rejects the whole file on an invalid value, keeping the code settings (CY-04)', async function () {
    // The dns block alone would let the client connect; one bad value rejects all of it.
    const { error, log } = await tryFile(yamlFile(dnsBlock(['      execution_mode: background'])))
    expect(error, 'no file key applied, so no seed').to.not.be.null
    expect(log).to.match(/Failed to parse/)
    expect(log).to.match(/execution_mode: background/)
  })

  it('rejects the whole file on a YAML syntax error after valid keys (CY-05)', async function () {
    const { error, log } = await tryFile(yamlFile(dnsBlock(['      bad: [unclosed'])))
    expect(error).to.not.be.null
    expect(log).to.match(/Failed to parse/)
  })

  it('skips unknown keys, maps and lists, and applies the rest (CY-07)', async function () {
    const { error } = await tryFile(yamlFile(dnsBlock(['      future_key: 1', '      future_block:', '        a: [1, 2]', '        b: { c: d }', '      future_list: [x, y]'])))
    expect(error).to.be.null
  })

  it('changes nothing with a version-only file (CY-08)', async function () {
    const file = yamlFile(['version: 1.2.0'])
    const client: Cli = await Aerospike.connect(Object.assign({}, helper.config, { log: { level: Aerospike.log.OFF }, configProvider: { path: file } }))
    try {
      const key = new Aerospike.Key(helper.namespace, helper.set, 'discovery/file-version')
      await client.put(key, { v: 1 })
      await client.remove(key)
    } finally {
      client.close()
    }
  })

  it('uses AEROSPIKE_CLIENT_CONFIG_URL over configProvider.path, with or without file:// (CY-12)', function () {
    const good = yamlFile(dnsBlock())
    const bad = yamlFile(['version: 1.2.0', 'static:', '  client:', '    discovery:', '      provider: dns',
      '      dns:', '        names: [missing.cfg.test]', `        servers: ["${dns.address}"]`, `        port: ${seed.port}`,
      'dynamic:', '  client:', '    tend_interval: 250'])
    const script = `
      const Aerospike = require(${JSON.stringify(path.resolve(__dirname, '../../lib/aerospike.js'))})
      const client = new Aerospike.Client({ hosts: [], log: { level: Aerospike.log.OFF }, configProvider: { path: ${JSON.stringify(bad)} } })
      client.connect().then(() => { console.log('connected'); client.close() }, err => { console.log('failed ' + err.code); client.close() })
    `
    for (const url of [good, `file://${good}`]) {
      const env = Object.assign({}, process.env, { AEROSPIKE_CLIENT_CONFIG_URL: url })
      const result = spawnSync(process.execPath, ['-e', script], { timeout: 20000, encoding: 'utf8', env })
      expect(result.stdout.trim(), `${url}: ${result.stderr}`).to.equal('connected')
    }
  })
})
