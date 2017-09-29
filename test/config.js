// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

const Aerospike = require('../lib/aerospike')
const Config = require('../lib/config')
require('./test_helper')

describe('Config', function () {
  var asHostsEnv
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
      let settings = {
        clusterName: 'testCluster',
        hosts: [ { addr: 'localhost', port: 3000 } ],
        log: { level: 1, file: 2 },
        policies: {
          apply: new Aerospike.ApplyPolicy({ totalTimeout: 1000 }),
          batch: new Aerospike.BatchPolicy({ totalTimeout: 1000 }),
          info: new Aerospike.InfoPolicy({ totalTimeout: 1000 }),
          operate: new Aerospike.OperatePolicy({ totalTimeout: 1000 }),
          query: new Aerospike.QueryPolicy({ totalTimeout: 1000 }),
          read: new Aerospike.ReadPolicy({ totalTimeout: 1000 }),
          remove: new Aerospike.RemovePolicy({ totalTimeout: 1000 }),
          scan: new Aerospike.ScanPolicy({ totalTimeout: 1000 }),
          write: new Aerospike.WritePolicy({ totalTimeout: 1000 })
        },
        connTimeoutMs: 1000,
        tenderInterval: 1000,
        user: 'admin',
        password: 'sekret',
        sharedMemory: { key: 1234 },
        modlua: { systemPath: '/system/path', userPath: '/user/path' },
        port: 3333
      }

      let config = new Config(settings)
      expect(config).to.have.property('clusterName')
      expect(config).to.have.property('hosts')
      expect(config).to.have.property('log')
      expect(config).to.have.property('connTimeoutMs')
      expect(config).to.have.property('tenderInterval')
      expect(config).to.have.property('user')
      expect(config).to.have.property('password')
      expect(config).to.have.property('sharedMemory')
      expect(config).to.have.property('modlua')
      expect(config).to.have.property('port')
      expect(config).to.have.property('policies')

      let policies = config.policies
      expect(policies.apply).to.be.an(Aerospike.ApplyPolicy)
      expect(policies.batch).to.be.an(Aerospike.BatchPolicy)
      expect(policies.info).to.be.an(Aerospike.InfoPolicy)
      expect(policies.operate).to.be.an(Aerospike.OperatePolicy)
      expect(policies.query).to.be.an(Aerospike.QueryPolicy)
      expect(policies.read).to.be.an(Aerospike.ReadPolicy)
      expect(policies.remove).to.be.an(Aerospike.RemovePolicy)
      expect(policies.scan).to.be.an(Aerospike.ScanPolicy)
      expect(policies.write).to.be.an(Aerospike.WritePolicy)
    })

    it('initializes default policies', function () {
      let settings = {
        policies: {
          apply: { totalTimeout: 1000 },
          batch: { totalTimeout: 1000 },
          info: { totalTimeout: 1000 },
          operate: { totalTimeout: 1000 },
          query: { totalTimeout: 1000 },
          read: { totalTimeout: 1000 },
          remove: { totalTimeout: 1000 },
          scan: { totalTimeout: 1000 },
          write: { totalTimeout: 1000 }
        }
      }
      let config = new Config(settings)

      expect(config.policies.apply).to.be.an(Aerospike.ApplyPolicy)
      expect(config.policies.batch).to.be.an(Aerospike.BatchPolicy)
      expect(config.policies.info).to.be.an(Aerospike.InfoPolicy)
      expect(config.policies.operate).to.be.an(Aerospike.OperatePolicy)
      expect(config.policies.query).to.be.an(Aerospike.QueryPolicy)
      expect(config.policies.read).to.be.an(Aerospike.ReadPolicy)
      expect(config.policies.remove).to.be.an(Aerospike.RemovePolicy)
      expect(config.policies.scan).to.be.an(Aerospike.ScanPolicy)
      expect(config.policies.write).to.be.an(Aerospike.WritePolicy)
    })

    it('ignores invalid config properties', function () {
      var obj = {
        log: './debug.log',
        policies: 1000,
        connTimeoutMs: 1.5,
        tenderInterval: '1000',
        user: {name: 'admin'},
        password: 12345,
        sharedMemory: true
      }
      var config = new Config(obj)
      expect(config).to.not.have.property('log')
      expect(config).to.not.have.property('connTimeoutMs')
      expect(config).to.not.have.property('tenderInterval')
      expect(config).to.not.have.property('user')
      expect(config).to.not.have.property('password')
      expect(config).to.not.have.property('sharedMemory')
      expect(config.policies).to.be.empty()
    })

    it('throws a TypeError if invalid policy values are passed', function () {
      let settings = {
        policies: {
          totalTimeout: 1000
        }
      }
      expect(() => new Config(settings)).to.throwException(e =>
        expect(e).to.be.a(TypeError))
    })

    it('reads hosts from AEROSPIKE_HOSTS if not specified', function () {
      process.env.AEROSPIKE_HOSTS = 'db1:3001'
      var config = new Config()
      expect(config.hosts).to.eql('db1:3001')
    })

    it('defaults to "localhost:3000"', function () {
      var config = new Config()
      expect(config.hosts).to.eql('localhost:3000')
    })

    it('defaults to the specified default port number', function () {
      var config = new Config({
        port: 3333
      })
      expect(config.hosts).to.eql('localhost:3333')
    })
  })
})
