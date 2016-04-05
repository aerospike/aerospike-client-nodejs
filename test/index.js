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

/* global expect, context, describe, it */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

context('secondary indexes', function () {
  var client = helper.client

  describe('client.indexCreate()', function () {
    it('should create a complex index on list', function (done) {
      var indexName = 'complexIndex'
      var options = {
        ns: helper.namespace,
        set: helper.set,
        bin: 'policy_bin',
        index: indexName,
        type: Aerospike.indexType.LIST,
        datatype: Aerospike.indexDataType.NUMERIC
      }
      client.createIndex(options, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })

    it('should create an integer index with info policy', function (done) {
      var options = {
        ns: helper.namespace,
        set: helper.set,
        bin: 'policy_bin',
        index: 'policy_index',
        datatype: Aerospike.indexDataType.NUMERIC
      }
      var policy = { timeout: 100 }
      client.createIndex(options, policy, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })

  describe('client.createIntegerIndex()', function () {
    it('should create an integer index', function (done) {
      var args = {
        ns: helper.namespace,
        set: helper.set,
        bin: 'integer_bin',
        index: 'integer_index'
      }
      client.createIntegerIndex(args, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })

  describe('client.createStringIndex()', function () {
    it('should create an string index', function (done) {
      var args = {
        ns: helper.namespace,
        set: helper.set,
        bin: 'string_bin',
        index: 'string_index'
      }
      client.createStringIndex(args, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })

  describe('client.createGeo2DSphereIndex()', function () {
    it('should create a geospatial index', function (done) {
      var args = {
        ns: helper.namespace,
        set: helper.set,
        bin: 'geo_bin',
        index: 'geo_index'
      }
      client.createGeo2DSphereIndex(args, function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })

  describe('client.indexRemove()', function () {
    it('should drop an index', function (done) {
      client.indexRemove(helper.namespace, 'string_integer', function (err) {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })

  describe('client.indexCreateWait()', function (done) {
    it('should create an index and wait until index creation is done', function (done) {
      var args = {
        ns: helper.namespace,
        set: helper.set,
        bin: 'integer_done',
        index: 'integer_index_done'
      }
      client.createIntegerIndex(args, function (err) {
        expect(err).not.to.be.ok()
        client.indexCreateWait(helper.namespace, 'integer_index_done', 100, function (err) {
          expect(err).not.to.be.ok()
          done()
        })
      })
    })
  })
})
