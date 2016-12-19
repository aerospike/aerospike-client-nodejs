// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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

/* global beforeEach, afterEach, expect, describe, it */

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
      var obj = {
        clusterName: 'testCluster',
        hosts: [ { addr: 'localhost', port: 3000 } ],
        log: { level: 1, file: 2 },
        policies: { timeout: 1000 },
        connTimeoutMs: 1000,
        tenderInterval: 1000,
        user: 'admin',
        password: 'sekret',
        sharedMemory: { key: 1234 },
        modlua: { systemPath: '/system/path', userPath: '/user/path' }
      }
      var config = new Config(obj)
      expect(config).to.have.property('clusterName')
      expect(config).to.have.property('hosts')
      expect(config).to.have.property('log')
      expect(config).to.have.property('policies')
      expect(config).to.have.property('connTimeoutMs')
      expect(config).to.have.property('tenderInterval')
      expect(config).to.have.property('user')
      expect(config).to.have.property('password')
      expect(config).to.have.property('sharedMemory')
      expect(config).to.have.property('modlua')
    })

    it('rejects invalid config properties', function () {
      var obj = {
        log: './debug.log',
        policies: 1000,
        connTimeoutMs: 1.5,
        tenderInterval: '1000',
        user: {name: 'admin'},
        password: 12345,
        sharedMemory: true,
        modlua: '/system/path'
      }
      var config = new Config(obj)
      expect(config).to.not.have.property('log')
      expect(config).to.not.have.property('policies')
      expect(config).to.not.have.property('connTimeoutMs')
      expect(config).to.not.have.property('tenderInterval')
      expect(config).to.not.have.property('user')
      expect(config).to.not.have.property('password')
      expect(config).to.not.have.property('sharedMemory')
      expect(config).to.not.have.property('modlua')
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
  })
})
