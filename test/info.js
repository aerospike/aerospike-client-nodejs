// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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
const utils = require('../lib/utils')

const AerospikeError = Aerospike.AerospikeError

context('Info commands', function () {
  const client = helper.client

  describe('Client#info()', function () {
    let node = null
    let host = null

    before(() => {
      node = helper.cluster.randomNode()
      host = utils.parseHostString(node.address)
    })

    it('sends status query to a specific cluster node', function (done) {
      client.info('status', host, (error, response) => {
        if (error) throw error
        expect(response).to.equal('status\tok\n')
        done()
      })
    })

    it('accepts a string with the host address', function (done) {
      client.info('status', node.address, (error, response) => {
        if (error) throw error
        expect(response).to.equal('status\tok\n')
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
        expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_CLIENT)
        done()
      })
    })
  })

  describe('Client#infoNode()', function () {
    let node = null

    before(() => {
      node = helper.cluster.randomNode()
    })

    it('sends status query to a specific cluster node', function () {
      return client.infoNode('status', node)
        .then(response => expect(response).to.equal('status\tok\n'))
    })

    it('fetches all info if no request is passed', function () {
      return client.infoNode(null, node)
        .then(response => {
          expect(response).to.contain('\nversion\t')
          expect(response).to.contain('\nedition\t')
        })
    })

    it('should return a client error if the client is not connected', function (done) {
      Aerospike.client(helper.config).infoNode('status', node, error => {
        expect(error).to.be.instanceof(AerospikeError).with.property('code', Aerospike.status.ERR_CLIENT)
        done()
      })
    })
  })

  describe('Client#infoAny()', function () {
    it('executes the info command on a single cluster node', function (done) {
      client.infoAny('status', function (err, result) {
        expect(err).to.not.be.ok()
        expect(result).to.equal('status\tok\n')
        done()
      })
    })

    it('returns a Promise that resolves to the result of the info query', function () {
      return client.infoAny('status')
        .then(result => {
          expect(result).to.equal('status\tok\n')
        })
    })
  })

  describe('client.infoAll()', function () {
    it('executes the info command on all cluster nodes an returns a list of results', function (done) {
      client.infoAll('status', function (err, results) {
        expect(err).to.not.be.ok()
        expect(Array.isArray(results)).to.be.true()
        results.forEach(function (result) {
          expect(result.host).to.be.ok()
          expect(result.info).to.equal('status\tok\n')
        })
        done()
      })
    })

    it('does not require an info command', function () {
      return client.infoAll()
        .then(results =>
          expect(Array.isArray(results)).to.be.true())
    })

    it('returns a Promise that resolves to the result of the info query', function () {
      return client.infoAll('status')
        .then(results => {
          expect(Array.isArray(results)).to.be.true()
          results.forEach(result => {
            expect(result.host).to.be.ok()
            expect(result.info).to.equal('status\tok\n')
          })
        })
    })
  })

  describe('info.parse()', function () {
    it('should parse key-value pairs from an info string', function () {
      var infoStr = 'version\t1\nedition\tCommunity Edition\n'
      var infoHash = info.parse(infoStr)
      expect(infoHash).to.eql({ version: 1, edition: 'Community Edition' })
    })

    it('should parse nested key-value pairs', function () {
      var infoStr = 'statistics\tmem=10;req=20\n'
      var infoHash = info.parse(infoStr)
      expect(infoHash.statistics).to.eql({ mem: 10, req: 20 })
    })

    it('should parse list values', function () {
      var infoStr = 'features\tgeo;double\n'
      var infoHash = info.parse(infoStr)
      expect(infoHash.features).to.eql(['geo', 'double'])
    })

    it('should parse numeric strings as numbers', function () {
      var infoStr = 'version\t1'
      var infoHash = info.parse(infoStr)
      expect(infoHash.version).to.be.a('number')
    })

    it('should be able to handle an empty info response', function () {
      var infoStr = 'foo\n'
      var infoHash = info.parse(infoStr)
      expect(infoHash).to.eql({ foo: undefined })
    })

    it('should be able to handle an empty string', function () {
      var infoStr = ''
      var infoHash = info.parse(infoStr)
      expect(infoHash).to.eql({})
    })

    it('does not split the response if no separators are specified', function () {
      info.separators['test-foo'] = []
      var infoStr = 'test-foo\ta=1;b=2\n'
      var infoHash = info.parse(infoStr)
      expect(infoHash['test-foo']).to.eql('a=1;b=2')
    })

    it('should parse the udf-list info key', function () {
      var infoStr = 'udf-list\tfilename=mod1.lua,hash=00557374fc319b8d0f38c6668015db35358d7b62,type=LUA;filename=mod2.lua,hash=c96771bd8ce6911a22a592e4857fd47082f14990,type=LUA;'
      var infoHash = info.parse(infoStr)
      expect(infoHash['udf-list']).to.eql([
        { filename: 'mod1.lua', hash: '00557374fc319b8d0f38c6668015db35358d7b62', type: 'LUA' },
        { filename: 'mod2.lua', hash: 'c96771bd8ce6911a22a592e4857fd47082f14990', type: 'LUA' }
      ])
    })

    it('should parse empty udf-list info key and return empty array', function () {
      var infoStr = 'udf-list\t'
      var infoHash = info.parse(infoStr)
      expect(infoHash['udf-list']).to.eql([])
    })

    it('should parse the bins info key', function () {
      const infoStr = 'bins\ttest:bin_names=2,bin_names_quota=32768,bin1,bin2;'
      const infoHash = info.parse(infoStr)
      const expected = {
        test: {
          names: ['bin1', 'bin2'],
          stats: { bin_names: 2, bin_names_quota: 32768 }
        }
      }
      expect(infoHash.bins).to.deep.equal(expected)
    })

    it('should pick the right separators to parse based on the key pattern', function () {
      const infoStr = 'sets/test/foo/bar\tobjects=0:tombstones=0:truncate_lut=275452156000:disable-eviction=false;'
      const infoHash = info.parse(infoStr)
      const expected = {
        objects: 0,
        tombstones: 0,
        truncate_lut: 275452156000,
        'disable-eviction': 'false'
      }
      expect(infoHash['sets/test/foo/bar']).to.deep.equal(expected)
    })
  })
})
