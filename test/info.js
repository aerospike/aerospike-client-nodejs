// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

/* global expect, describe, it, context */

const Aerospike = require('../lib/aerospike')
const info = require('../lib/info')
const utils = require('../lib/utils')
const helper = require('./test_helper')

describe('client.info()', function () {
  var client = helper.client

  context('querying a single node', function () {
    var hosts = client.config.hosts
    if (typeof hosts === 'string') {
      hosts = utils.parseHostsString(hosts)
    }
    var host = hosts[0]

    it('should fetch object count from specific cluster node', function (done) {
      client.info('objects', host, function (err, response, respondingHost) {
        expect(err).not.to.be.ok()
        expect(respondingHost).to.eql(host)
        expect(info.parseInfo(response)).to.have.property('objects')
        done()
      })
    })

    it('should accept a string with the host address', function (done) {
      var hostAddress = host.addr + ':' + host.port
      client.info('objects', hostAddress, function (err, response, respondingHost) {
        expect(err).not.to.be.ok()
        expect(respondingHost).to.eql(host)
        expect(info.parseInfo(response)).to.have.property('objects')
        done()
      })
    })
  })

  context('querying all the nodes', function () {
    it('should fetch object count from all cluster nodes', function (done) {
      client.info('objects', function (err, response, host) {
        expect(err).not.to.be.ok()
        expect(info.parseInfo(response)).to.have.property('objects')
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

describe('info.parseInfo()', function () {
  it('should parse key-value pairs from an info string', function () {
    var infoStr = 'version\t1\nedition\tCommunity Edition\n'
    var infoHash = info.parseInfo(infoStr)
    expect(infoHash).to.eql({version: 1, edition: 'Community Edition'})
  })

  it('should parse nested key-value pairs', function () {
    var infoStr = 'statistics\tmem=10;req=20\n'
    var infoHash = info.parseInfo(infoStr)
    expect(infoHash['statistics']).to.eql({mem: 10, req: 20})
  })

  it('should parse list values', function () {
    var infoStr = 'features\tgeo;double\n'
    var infoHash = info.parseInfo(infoStr)
    expect(infoHash['features']).to.eql(['geo', 'double'])
  })

  it('should parse numeric strings as numbers', function () {
    var infoStr = 'version\t1'
    var infoHash = info.parseInfo(infoStr)
    expect(infoHash['version']).to.be.a('number')
  })

  it('should be able to handle an empty string', function () {
    var infoStr = ''
    var infoHash = info.parseInfo(infoStr)
    expect(infoHash).to.eql({})
  })
})
