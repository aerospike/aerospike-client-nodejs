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

/* global expect, beforeEach, afterEach, context, describe, it */

const Aerospike = require('../lib/aerospike')
const IndexTask = require('../lib/index_task')
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
  afterEach(function () {
    helper.index.remove(testIndex.name)
  })

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
      client.createIndex(options, function (err, task) {
        expect(err).not.to.be.ok()
        expect(helper.index.exists(testIndex.name)).to.be(true)
        expect(task).to.be.a(IndexTask)
        done()
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
        expect(helper.index.exists(testIndex.name)).to.be(true)
        done()
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
        expect(helper.index.exists(testIndex.name)).to.be(true)
        done()
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
        expect(helper.index.exists(testIndex.name)).to.be(true)
        done()
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
        expect(helper.index.exists(testIndex.name)).to.be(true)
        done()
      })
    })
  })

  describe('client.indexRemove()', function () {
    beforeEach(function () {
      helper.index.create(testIndex.name, helper.set, testIndex.bin, Aerospike.indexDataType.STRING)
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
          expect(helper.index.exists(testIndex.name)).to.be(true)
          done()
        })
      })
    })
  })

  describe('IndexTask', function () {
    describe('IndexTask#waitUntilDone()', function () {
      it('should wait until the index creation is completed', function (done) {
        var options = {
          ns: helper.namespace,
          set: helper.set,
          bin: testIndex.bin,
          index: testIndex.name
        }
        client.createIntegerIndex(options, function (err, indexTask) {
          if (err) throw err

          indexTask.waitUntilDone(10, function (err) {
            expect(err).to.not.be.ok()
            done()
          })
        })
      })
    })

    describe('IndexTask#checkStatus()', function () {
      it('should return a boolean indicating whether the task is done or not', function (done) {
        var options = {
          ns: helper.namespace,
          set: helper.set,
          bin: 'integer_bin',
          index: 'indexTaskCheckStatusIndex'
        }
        client.createIntegerIndex(options, function (err, indexTask) {
          if (err) throw err

          indexTask.checkStatus(function (err, status) {
            expect(err).to.not.be.ok()
            expect(status).to.be.a('boolean')
            done()
          })
        })
      })
    })
  })
})
