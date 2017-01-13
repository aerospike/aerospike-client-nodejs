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

/* global expect, beforeEach, afterEach, context, describe, it */

const Aerospike = require('../lib/aerospike')
const AerospikeError = require('../lib/aerospike_error')
const Info = require('../lib/info')
const Job = require('../lib/job')
const IndexJob = require('../lib/index_job')
const helper = require('./test_helper')

context('secondary indexes', function () {
  var client = helper.client

  // generate unique index name for each test
  var testIndex = { name: null, bin: null, counter: 0 }
  beforeEach(function () {
    testIndex.counter++
    testIndex.name = 'idx-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
    testIndex.bin = 'bin-' + testIndex.counter + '-' + Math.floor(Math.random() * 10000000)
  })
  afterEach(function (done) {
    helper.index.remove(testIndex.name, function () { done() })
  })

  function verifyIndexExists (namespace, indexName, callback) {
    var sindex = 'sindex/' + namespace + '/' + indexName
    var checkStatus = function (callback) {
      client.infoAll(sindex, function (err, info) {
        if (err) {
          callback(err)
        } else {
          var done = info.every(function (response) {
            var stats = Info.parseInfo(response.info)[sindex]
            var noIndexErr = (typeof stats === 'string') && (stats.indexOf('FAIL:201:NO INDEX') >= 0)
            return !noIndexErr
          })
          callback(null, done)
        }
      })
    }
    Job.pollUntilDone(checkStatus, 1000, function (err) {
      if (err) throw err
      callback()
    })
  }

  describe('client.indexCreate()', function () {
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
  })

  describe('client.createIntegerIndex()', function () {
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

  describe('client.createStringIndex()', function () {
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

  describe('client.createGeo2DSphereIndex()', function () {
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

  describe('client.indexRemove()', function () {
    beforeEach(function (done) {
      helper.index.create(testIndex.name, helper.set, testIndex.bin,
          Aerospike.indexDataType.STRING, Aerospike.indexType.DEFAULT, function () { done() })
    })

    it('should drop an index', function (done) {
      client.indexRemove(helper.namespace, testIndex.name, function (err) {
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
        bin: testIndex.bin,
        index: testIndex.name
      }
      client.createIntegerIndex(args, function (err) {
        if (err) throw err

        client.indexCreateWait(helper.namespace, testIndex.name, 100, function (err) {
          expect(err).not.to.be.ok()
          verifyIndexExists(helper.namespace, testIndex.name, done)
        })
      })
    })
  })

  describe('IndexJob', function () {
    describe('IndexJob#waitUntilDone()', function () {
      it('should wait until the index creation is completed', function (done) {
        var options = {
          ns: helper.namespace,
          set: helper.set,
          bin: testIndex.bin,
          index: testIndex.name
        }
        client.createIntegerIndex(options, function (err, job) {
          if (err) throw err

          job.waitUntilDone(10, function (err) {
            expect(err).to.not.be.ok()
            done()
          })
        })
      })
    })

    describe('IndexJob#checkStatus()', function () {
      it('should return a boolean indicating whether the job is done or not', function (done) {
        var options = {
          ns: helper.namespace,
          set: helper.set,
          bin: testIndex.bin,
          index: testIndex.name
        }
        client.createIntegerIndex(options, function (err, job) {
          if (err) throw err

          job.checkStatus(function (err, status) {
            expect(err).to.not.be.ok()
            expect(status).to.be.a('boolean')
            done()
          })
        })
      })

      it('should return false if the index does not exist', function (done) {
        var job = new IndexJob(client, helper.namespace, 'thisIndexDoesNotExist')
        job.checkStatus(function (err, status) {
          expect(err).to.not.be.ok()
          expect(status).to.be(false)
          done()
        })
      })

      it('should return an error if one of the cluster nodes cannot be queried', function (done) {
        var client = Aerospike.client() // not connected, should return error when info command is executed
        var job = new IndexJob(client, helper.ns, 'thisIndexDoesNotExist')
        job.checkStatus(function (err, status) {
          expect(err).to.be.a(AerospikeError)
          done()
        })
      })
    })
  })
})
