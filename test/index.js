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

/* eslint-env mocha */
/* global expect */

const Aerospike = require('../lib/aerospike')
const Job = require('../lib/job')
const IndexJob = require('../lib/index_job')
const helper = require('./test_helper')

context('secondary indexes', function () {
  const client = helper.client

  // generate unique index name for each test
  const testIndex = { name: null, bin: null, counter: 0 }
  beforeEach(() => {
    testIndex.counter++
    testIndex.name = 'idx-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
    testIndex.bin = 'bin-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
  })

  function verifyIndexExists (namespace, indexName) {
    const sindex = 'sindex/' + namespace + '/' + indexName
    const checkStatus = function () {
      return client.infoAll(sindex)
        .then(() => true)
        .catch(error => {
          if (error.code !== Aerospike.status.ERR_INDEX_NOT_FOUND) {
            return Promise.reject(error)
          }
          return false
        })
    }
    return Job.pollUntilDone(checkStatus, 10)
      .then(() => helper.index.remove(indexName))
  }

  describe('Client#indexCreate()', function () {
    it('returns an IndexJob instance', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name,
        datatype: Aerospike.indexDataType.NUMERIC
      }

      return client.createIndex(options)
        .then(job => expect(job).to.be.instanceof(IndexJob))
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })

    it('should create a complex index on list', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name,
        type: Aerospike.indexType.LIST,
        datatype: Aerospike.indexDataType.NUMERIC
      }

      return client.createIndex(options)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })

    it('should create an integer index with info policy', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name,
        datatype: Aerospike.indexDataType.NUMERIC
      }
      const policy = new Aerospike.InfoPolicy({
        totalTimeout: 100
      })

      return client.createIndex(options, policy)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })

    it('re-creating an index with identical options returns an error', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name,
        datatype: Aerospike.indexDataType.NUMERIC
      }

      return client.createIndex(options)
        .then(job => job.wait(10))
        .then(() => client.createIndex(options)
          .then(job => Promise.reject(new Error('Recreating existing index should have returned an error')))
          .catch(error => {
            if (error.code === Aerospike.status.ERR_INDEX_FOUND) {
              // All good!
            } else {
              return Promise.reject(error)
            }
          }))
    })
  })

  describe('Client#createIntegerIndex()', function () {
    it('should create an integer index', function () {
      const options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name
      }

      return client.createIntegerIndex(options)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })
  })

  describe('Client#createStringIndex()', function () {
    it('should create an string index', function () {
      const args = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name
      }

      return client.createStringIndex(args)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })
  })

  describe('Client#createGeo2DSphereIndex()', function () {
    it('should create a geospatial index', function () {
      const args = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name
      }

      return client.createGeo2DSphereIndex(args)
        .then(() => verifyIndexExists(helper.namespace, testIndex.name))
    })
  })

  describe('Client#indexRemove()', function () {
    beforeEach(() => helper.index.create(testIndex.name, helper.set, testIndex.bin,
      Aerospike.indexDataType.STRING, Aerospike.indexType.DEFAULT))

    it('should drop an index', function (done) {
      client.indexRemove(helper.namespace, testIndex.name, function (err) {
        expect(err).to.be.null()
        done()
      })
    })

    it('should return a Promise if called without callback function', function () {
      return client.indexRemove(helper.namespace, testIndex.name)
    })
  })
})
