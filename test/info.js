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

/* global expect, describe, it, context, before */

const Aerospike = require('../lib/aerospike')
const info = require('../lib/info')
const helper = require('./test_helper')

describe('client.info()', function () {
  var client = helper.client

  context('querying a single node', function () {
    var host = null

    before(function (done) {
      helper.cluster.randomNode(function (addr) {
        host = addr
        done()
      })
    })

    it('sends status query to a specific cluster node', function (done) {
      client.info('status', host, function (err, response) {
        expect(err).not.to.be.ok()
        expect(response).to.be('status\tok\n')
        done()
      })
    })

    it('accepts a string with the host address', function (done) {
      var hostAddress = host.addr + ':' + host.port
      client.info('status', hostAddress, function (err, response, respondingHost) {
        expect(err).not.to.be.ok()
        expect(respondingHost).to.eql(host)
        expect(response).to.be('status\tok\n')
        done()
      })
    })
  })

  context('querying all the nodes', function () {
    it('should return status for all cluster nodes', function (done) {
      client.info('status', function (err, response, host) {
        expect(err).not.to.be.ok()
        expect(response).to.be('status\tok\n')
      }, done)
    })
  })

  it('should call the done callback after the info callback', function (done) {
    var infoCbCalled = 0
    client.info(function () {
      infoCbCalled += 1
    }, function () {
      expect(infoCbCalled).to.not.eql(0)
      done()
    })
  })

  it('should return a client error if the client is not connected', function (done) {
    Aerospike.client(helper.config).info(function (err) {
      expect(err.code).to.be(Aerospike.status.AEROSPIKE_ERR_CLIENT)
      done()
    })
  })
})

describe('client.infoAny()', function () {
  var client = helper.client

  it('executes the info command on a single cluster node', function (done) {
    client.infoAny('status', function (err, result) {
      expect(err).to.not.be.ok()
      expect(result).to.be('status\tok\n')
      done()
    })
  })
})

describe('client.infoAll()', function () {
  var client = helper.client

  it('executes the info command on all cluster nodes an returns a list of results', function (done) {
    client.infoAll('status', function (err, results) {
      expect(err).to.not.be.ok()
      expect(Array.isArray(results)).to.be(true)
      results.forEach(function (result) {
        expect(result.host).to.be.ok()
        expect(result.info).to.be('status\tok\n')
        expect(result.error).to.be.ok()
      })
      done()
    })
  })
})

describe('info.parse()', function () {
  it('should parse key-value pairs from an info string', function () {
    var infoStr = 'version\t1\nedition\tCommunity Edition\n'
    var infoHash = info.parse(infoStr)
    expect(infoHash).to.eql({version: 1, edition: 'Community Edition'})
  })

  it('should parse nested key-value pairs', function () {
    var infoStr = 'statistics\tmem=10;req=20\n'
    var infoHash = info.parse(infoStr)
    expect(infoHash['statistics']).to.eql({mem: 10, req: 20})
  })

  it('should parse list values', function () {
    var infoStr = 'features\tgeo;double\n'
    var infoHash = info.parse(infoStr)
    expect(infoHash['features']).to.eql(['geo', 'double'])
  })

  it('should parse numeric strings as numbers', function () {
    var infoStr = 'version\t1'
    var infoHash = info.parse(infoStr)
    expect(infoHash['version']).to.be.a('number')
  })

  it('should be able to handle an empty string', function () {
    var infoStr = ''
    var infoHash = info.parse(infoStr)
    expect(infoHash).to.eql({})
  })

  it('should parse the udf-list info key', function () {
    var infoStr = 'udf-list\tfilename=mod1.lua,hash=00557374fc319b8d0f38c6668015db35358d7b62,type=LUA;filename=mod2.lua,hash=c96771bd8ce6911a22a592e4857fd47082f14990,type=LUA;'
    var infoHash = info.parse(infoStr)
    expect(infoHash['udf-list']).to.eql([
      { filename: 'mod1.lua', hash: '00557374fc319b8d0f38c6668015db35358d7b62', type: 'LUA' },
      { filename: 'mod2.lua', hash: 'c96771bd8ce6911a22a592e4857fd47082f14990', type: 'LUA' }
    ])
  })

  it('should parse the bins info key', function () {
    var infoStr = 'bins\ttest:bin_names=2,bin_names_quota=32768,bin1,bin2;'
    var infoHash = info.parse(infoStr)
    expect(infoHash['bins']).to.eql({ test: { names: ['bin1', 'bin2'], stats: { bin_names: 2, bin_names_quota: 32768 } } })
  })
})
