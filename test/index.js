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

/* global expect, beforeEach, afterEach, context, describe, it */

const Aerospike = require('../lib/aerospike')
const Job = require('../lib/job')
const IndexJob = require('../lib/index_job')
const helper = require('./test_helper')

context('secondary indexes', function () {
  var client = helper.client

  // generate unique index name for each test
  let testIndex = { name: null, bin: null, counter: 0 }
  beforeEach(() => {
    testIndex.counter++
    testIndex.name = 'idx-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
    testIndex.bin = 'bin-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
  })
  afterEach(() => helper.index.remove(testIndex.name))

  function verifyIndexExists (namespace, indexName, callback) {
    var sindex = 'sindex/' + namespace + '/' + indexName
    var checkStatus = function (callback) {
      return new Promise((resolve, reject) => {
        client.infoAll(sindex, function (err, info) {
          if (err) {
            switch (err.code) {
              case Aerospike.status.AEROSPIKE_ERR_INDEX_NOT_FOUND:
                resolve(false)
                break
              default:
                reject(err)
            }
          } else {
            resolve(true)
          }
        })
      })
    }
    Job.pollUntilDone(checkStatus, 10)
      .then(() => callback())
      .catch(error => { throw error })
  }

  describe('Client#indexCreate()', function () {
    it('should create a complex index on list', function (done) {
      var options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name,
        type: Aerospike.indexType.LIST,
        datatype: Aerospike.indexDataType.NUMERIC
      }
      client.createIndex(options, function (err, job) {
        expect(err).not.to.be.ok()
        expect(job).to.be.a(IndexJob)
        verifyIndexExists(helper.namespace, testIndex.name, done)
      })
    })

    it('should create an integer index with info policy', function (done) {
      var options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name,
        datatype: Aerospike.indexDataType.NUMERIC
      }
      var policy = { timeout: 100 }
      client.createIndex(options, policy, function (err) {
        expect(err).not.to.be.ok()
        verifyIndexExists(helper.namespace, testIndex.name, done)
      })
    })

    it('re-creating an index with identical options returns an error', function () {
      let options = {
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
            if (error.code === Aerospike.status.AEROSPIKE_ERR_INDEX_FOUND) {
              // All good!
            } else {
              return Promise.reject(error)
            }
          }))
    })
  })

  describe('Client#createIntegerIndex()', function () {
    it('should create an integer index', function (done) {
      var options = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name
      }
      client.createIntegerIndex(options, function (err) {
        expect(err).not.to.be.ok()
        verifyIndexExists(helper.namespace, testIndex.name, done)
      })
    })
  })

  describe('Client#createStringIndex()', function () {
    it('should create an string index', function (done) {
      var args = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name
      }
      client.createStringIndex(args, function (err) {
        expect(err).not.to.be.ok()
        verifyIndexExists(helper.namespace, testIndex.name, done)
      })
    })
  })

  describe('Client#createGeo2DSphereIndex()', function () {
    it('should create a geospatial index', function (done) {
      var args = {
        ns: helper.namespace,
        set: helper.set,
        bin: testIndex.bin,
        index: testIndex.name
      }
      client.createGeo2DSphereIndex(args, function (err) {
        expect(err).not.to.be.ok()
        verifyIndexExists(helper.namespace, testIndex.name, done)
      })
    })
  })

  describe('Client#indexRemove()', function () {
    beforeEach(() => helper.index.create(testIndex.name, helper.set, testIndex.bin,
          Aerospike.indexDataType.STRING, Aerospike.indexType.DEFAULT))

    it('should drop an index', function (done) {
      client.indexRemove(helper.namespace, testIndex.name, function (err) {
        expect(err).to.be(null)
        done()
      })
    })

    it('should return a Promise if called without callback function', function () {
      return client.indexRemove(helper.namespace, testIndex.name)
    })
  })
})
