// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

/* global beforeEach, afterEach, expect, describe, it */
/* eslint-disable no-unused-expressions */

import type { ConfigOptions, Config as Conf, ConfigPolicies} from '../lib/aerospike.js';
import * as Aerospike from '../lib/aerospike.js';

import { expect } from 'chai'; 
import * as helper from './test_helper.ts';

const Config = Aerospike.Config
const native = require('../lib/native.js')

describe('Config #noserver', function () {
  let asHostsEnv: any;
  beforeEach(function () {
    asHostsEnv = process.env.AEROSPIKE_HOSTS
    delete process.env.AEROSPIKE_HOSTS
  })

  afterEach(function () {
    delete process.env.AEROSPIKE_HOSTS
    if (asHostsEnv) {
      process.env.AEROSPIKE_HOSTS = asHostsEnv
    }
  })

  describe('new Config', function () {
    it('copies config values from the passed Object', function () {
      const settings: ConfigOptions = {
        authMode: Aerospike.auth.EXTERNAL_INSECURE,
        clusterName: 'testCluster',
        connTimeoutMs: 1000,
        hosts: [{ addr: 'localhost', port: 3000 }],
        log: { level: 1, file: 2 },
        loginTimeoutMs: 2000,
        maxConnsPerNode: 200,
        maxSocketIdle: 30,
        minConnsPerNode: 10,
        maxErrorRate: 100,
        errorRateWindow: 1,
        modlua: { userPath: '/user/path' },
        password: 'sekret',
        port: 3333,
        appId: "ForeverSoup",
        configProvider: {
          path: 'string',
          interval: 2,
        },
        policies: {
          apply: new Aerospike.ApplyPolicy({ totalTimeout: 1000 }),
          batch: new Aerospike.BatchPolicy({ totalTimeout: 1000 }),
          batchParentWrite: new Aerospike.BatchPolicy({ totalTimeout: 1000 }),
          batchWrite: new Aerospike.BatchWritePolicy({ exists: Aerospike.policy.exists.CREATE_OR_REPLACE }),
          info: new Aerospike.InfoPolicy({ timeout: 1000 }),
          operate: new Aerospike.OperatePolicy({ totalTimeout: 1000 }),
          query: new Aerospike.QueryPolicy({ totalTimeout: 1000 }),
          read: new Aerospike.ReadPolicy({ totalTimeout: 1000 }),
          remove: new Aerospike.RemovePolicy({ totalTimeout: 1000 }),
          scan: new Aerospike.ScanPolicy({ totalTimeout: 1000 }),
          txnRoll: new Aerospike.BatchPolicy({ totalTimeout: 1000 }),
          txnVerify: new Aerospike.BatchPolicy({ totalTimeout: 1000 }),
          write: new Aerospike.WritePolicy({ totalTimeout: 1000 })
        },
        rackAware: true,
        rackId: 42,
        sharedMemory: { key: 1234 },
        tenderInterval: 1000,
        tls: { enable: true },
        user: 'admin'
      }

      const config: Conf = new Config(settings)
      expect(config).to.have.property('authMode')
      expect(config).to.have.property('appId')
      expect(config).to.have.property('configProvider')
      expect(config).to.have.property('clusterName')
      expect(config).to.have.property('connTimeoutMs')
      expect(config).to.have.property('maxErrorRate')
      expect(config).to.have.property('errorRateWindow')
      expect(config).to.have.property('hosts')
      expect(config).to.have.property('log')
      expect(config).to.have.property('loginTimeoutMs')
      expect(config).to.have.property('maxConnsPerNode')
      expect(config).to.have.property('maxSocketIdle')
      expect(config).to.have.property('minConnsPerNode')
      expect(config).to.have.property('modlua')
      expect(config).to.have.property('password')
      expect(config).to.have.property('policies')
      expect(config).to.have.property('port')
      expect(config).to.have.property('rackAware')
      expect(config).to.have.property('rackId')
      expect(config).to.have.property('sharedMemory')
      expect(config).to.have.property('tenderInterval')
      expect(config).to.have.property('tls')
      expect(config).to.have.property('user')

      const policies: ConfigPolicies = config.policies
      expect(policies.apply).to.be.instanceof(Aerospike.ApplyPolicy)
      expect(policies.batch).to.be.instanceof(Aerospike.BatchPolicy)
      expect(policies.batchWrite).to.be.instanceof(Aerospike.BatchWritePolicy)
      expect(policies.batchParentWrite).to.be.instanceof(Aerospike.BatchPolicy)
      expect(policies.info).to.be.instanceof(Aerospike.InfoPolicy)
      expect(policies.operate).to.be.instanceof(Aerospike.OperatePolicy)
      expect(policies.query).to.be.instanceof(Aerospike.QueryPolicy)
      expect(policies.read).to.be.instanceof(Aerospike.ReadPolicy)
      expect(policies.remove).to.be.instanceof(Aerospike.RemovePolicy)
      expect(policies.scan).to.be.instanceof(Aerospike.ScanPolicy)
      expect(policies.write).to.be.instanceof(Aerospike.WritePolicy)
      expect(policies.txnRoll).to.be.instanceof(Aerospike.BatchPolicy)
      expect(policies.txnVerify).to.be.instanceof(Aerospike.BatchPolicy)
    })

    it('initializes default policies', function () {
      const settings: ConfigOptions = {
        policies: {
          apply: { totalTimeout: 1000 },
          batch: { totalTimeout: 1000 },
          batchParentWrite: { totalTimeout: 1000 },
          batchWrite: { exists: Aerospike.policy.exists.CREATE_OR_REPLACE },
          info: { timeout: 1000 },
          operate: { totalTimeout: 1000 },
          query: { totalTimeout: 1000 },
          read: { totalTimeout: 1000 },
          remove: { totalTimeout: 1000 },
          scan: { totalTimeout: 1000 },
          txnRoll: { totalTimeout: 1000 },
          txnVerify: { totalTimeout: 1000 },
          write: { totalTimeout: 1000 }
        }
      }
      const config: Conf = new Config(settings)

      expect(config.policies.apply).to.be.instanceof(Aerospike.ApplyPolicy)
      expect(config.policies.batch).to.be.instanceof(Aerospike.BatchPolicy)
      expect(config.policies.batchWrite).to.be.instanceof(Aerospike.BatchWritePolicy)
      expect(config.policies.batchParentWrite).to.be.instanceof(Aerospike.BatchPolicy)
      expect(config.policies.info).to.be.instanceof(Aerospike.InfoPolicy)
      expect(config.policies.operate).to.be.instanceof(Aerospike.OperatePolicy)
      expect(config.policies.query).to.be.instanceof(Aerospike.QueryPolicy)
      expect(config.policies.read).to.be.instanceof(Aerospike.ReadPolicy)
      expect(config.policies.remove).to.be.instanceof(Aerospike.RemovePolicy)
      expect(config.policies.scan).to.be.instanceof(Aerospike.ScanPolicy)
      expect(config.policies.txnRoll).to.be.instanceof(Aerospike.BatchPolicy)
      expect(config.policies.txnVerify).to.be.instanceof(Aerospike.BatchPolicy)
      expect(config.policies.write).to.be.instanceof(Aerospike.WritePolicy)
    })
    /*
    it('ignores invalid config properties', function () {
      const obj = {
        log: './debug.log',
        policies: 1000,
        connTimeoutMs: 1.5,
        tenderInterval: '1000',
        user: { name: 'admin' },
        password: 12345,
        sharedMemory: true,
        rackId: 'myRack'
      }
      const config = new Config(obj)
      expect(config).to.not.have.property('log')
      expect(config).to.not.have.property('connTimeoutMs')
      expect(config).to.not.have.property('tenderInterval')
      expect(config).to.not.have.property('user')
      expect(config).to.not.have.property('password')
      expect(config).to.not.have.property('sharedMemory')
      expect(config).to.not.have.property('rackId')
      expect(config.policies).to.be.empty
    })

    it('throws a TypeError if invalid policy values are passed', function () {
      const settings = {
        policies: {
          timeout: 1000,
          totalTimeout: 1000
        }
      }
      expect(() => new Config(settings)).to.throw(TypeError)
    })
    */
    it('reads hosts from AEROSPIKE_HOSTS if not specified', function () {
      process.env.AEROSPIKE_HOSTS = 'db1:3001'
      const config: Conf = new Config()
      expect(config.hosts).to.eql('db1:3001')
    })

    it('defaults to "localhost:3000"', function () {
      const config: Conf = new Config()
      expect(config.hosts).to.eql('localhost:3000')
    })

    it('defaults to the specified default port number', function () {
      const config: Conf = new Config({
        port: 3333
      })
      expect(config.hosts).to.eql('localhost:3333')
    })
  })

  describe('ipMap', function () {
    it('copies the ipMap', function () {
      const ipMap = { '10.0.0.5': 'gw.example.com', '10.0.0.6': 'gw2.example.com' }
      const config: Conf = new Config({ ipMap })
      expect(config.ipMap).to.eql(ipMap)
    })

    it('leaves ipMap unset by default', function () {
      const config: Conf = new Config()
      expect(config).to.not.have.property('ipMap')
    })

    it('accepts a valid ipMap in the client', function () {
      const client = Aerospike.client({ ipMap: { '10.0.0.5': 'gw.example.com' } })
      client.close()
    })

    it('accepts an empty ipMap in the client', function () {
      const client = Aerospike.client({ ipMap: {} })
      client.close()
    })

    it('treats a null ipMap as unset', function () {
      const config: Conf = new Config({ ipMap: null } as any)
      expect(config).to.not.have.property('ipMap')
      const client = Aerospike.client({ ipMap: null } as any)
      client.close()
    })

    it('accepts several entries, including IPv6 addresses', function () {
      const client = Aerospike.client({
        ipMap: {
          '10.0.0.5': 'gw.example.com',
          '::1': 'gw6.example.com',
          'fe80::1': '[2001:db8::1]'
        }
      })
      client.close()
    })

    it('keeps ipMap when the client is given a Config instance', function () {
      const ipMap = { '10.0.0.5': 'gw.example.com' }
      const client = Aerospike.client(new Config({ ipMap }))
      expect(client.config.ipMap).to.eql(ipMap)
      client.close()
    })

    it('fails to connect when the seed has no matching ipMap key', async function () {
      const client = Aerospike.client({
        hosts: [{ addr: 'ip-map-seed.invalid', port: 3000 }],
        ipMap: { 'other-seed.invalid': '127.0.0.1' },
        log: { level: Aerospike.log.OFF }
      })
      let error: any = null
      try {
        await client.connect()
      } catch (err) {
        error = err
      }
      expect(error).to.be.instanceof(Aerospike.AerospikeError)
      // connect() already closed the native client; closing again must be safe.
      client.close()
      client.close()
    })

    const invalid: Array<[string, any]> = [
      ['a string', 'gw.example.com'],
      ['an array', ['10.0.0.5', 'gw.example.com']],
      ['a non-string value', { '10.0.0.5': 3000 }],
      ['an empty value', { '10.0.0.5': '' }],
      ['an empty key', { '': 'gw.example.com' }],
      ['a bad entry after valid ones', { '10.0.0.5': 'gw.example.com', '10.0.0.6': 'gw2.example.com', '10.0.0.7': 7 }]
    ]
    invalid.forEach(([name, ipMap]) => {
      it(`rejects ${name} with a TypeError naming ipMap`, function () {
        expect(() => new Config({ ipMap } as ConfigOptions)).to.throw(TypeError, /ipMap/)
        expect(() => Aerospike.client({ ipMap } as ConfigOptions)).to.throw(TypeError, /ipMap/)
      })

      // The native layer checks again, for callers that skip Config. It returns
      // null for an invalid config, which Client turns into an AerospikeError.
      it(`rejects ${name} in the native layer too`, function () {
        expect(native.client({ hosts: 'localhost:3000', ipMap })).to.be.null
      })
    })

    it('accepts a valid ipMap in the native layer', function () {
      // Not closed: native close() needs setupEventCb(), which only connect() runs.
      const client = native.client({ hosts: 'localhost:3000', ipMap: { '10.0.0.5': 'gw.example.com' } })
      expect(client).to.not.be.null
    })

    it('names the bad entry in the error', function () {
      expect(() => new Config({ ipMap: { '10.0.0.5': 'gw', '10.0.0.6': 7 } } as any))
        .to.throw(TypeError, 'ipMap entry "10.0.0.6" must map a non-empty host to a non-empty host string')
    })
  })
})
