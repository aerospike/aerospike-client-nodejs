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

/* global expect, describe, it, context, before */

const Aerospike = require('../lib/aerospike')
const info = require('../lib/info')
const helper = require('./test_helper')

context('Info commands', function () {
  let client = helper.client

  describe('Client#info()', function () {
    let host = null

    before(() => helper.cluster.randomNode()
      .then(randomHost => { host = randomHost }))

    it('sends status query to a specific cluster node', function (done) {
      client.info('status', host, (error, response) => {
        if (error) throw error
        expect(response).to.be('status\tok\n')
        done()
      })
    })

    it('accepts a string with the host address', function (done) {
      let hostAddress = host.addr + ':' + host.port
      client.info('status', hostAddress, (error, response) => {
        if (error) throw error
        expect(response).to.be('status\tok\n')
        done()
      })
    })

    it('fetches all info if no request is passed', function (done) {
      client.info(null, host, (error, response) => {
        if (error) throw error
        expect(response).to.contain('\nversion\t')
        expect(response).to.contain('\nedition\t')
        done()
      })
    })

    it('should return a client error if the client is not connected', function (done) {
      Aerospike.client(helper.config).info('status', host, error => {
        expect(error.code).to.be(Aerospike.status.ERR_CLIENT)
        done()
      })
    })
  })

  describe('Client#infoAny()', function () {
    it('executes the info command on a single cluster node', function (done) {
      client.infoAny('status', function (err, result) {
        expect(err).to.not.be.ok()
        expect(result).to.be('status\tok\n')
        done()
      })
    })

    it('returns a Promise that resolves to the result of the info query', function () {
      return client.infoAny('status')
        .then(result => {
          expect(result).to.be('status\tok\n')
        })
    })
  })

  describe('client.infoAll()', function () {
    it('executes the info command on all cluster nodes an returns a list of results', function (done) {
      client.infoAll('status', function (err, results) {
        expect(err).to.not.be.ok()
        expect(Array.isArray(results)).to.be(true)
        results.forEach(function (result) {
          expect(result.host).to.be.ok()
          expect(result.info).to.be('status\tok\n')
        })
        done()
      })
    })

    it('does not require an info command', function () {
      return client.infoAll()
        .then(results =>
          expect(Array.isArray(results)).to.be(true))
    })

    it('returns a Promise that resolves to the result of the info query', function () {
      return client.infoAll('status')
        .then(results => {
          expect(Array.isArray(results)).to.be(true)
          results.forEach(result => {
            expect(result.host).to.be.ok()
            expect(result.info).to.be('status\tok\n')
          })
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
})
