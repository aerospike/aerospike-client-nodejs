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

/* global expect, describe, it, before, after, context */

const Aerospike = require('../lib/aerospike')
const Scan = require('../lib/scan')
const helper = require('./test_helper')

const Key = Aerospike.Key

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen
const recgen = helper.recgen
const valgen = helper.valgen

context('Scans', function () {
  let client = helper.client
  let testSet = 'test/scan-' + Math.floor(Math.random() * 100000)
  let numberOfRecords = 100

  before(() => helper.udf.register('udf.lua')
    .then(() => {
      let kgen = keygen.string(helper.namespace, testSet, { prefix: 'test/scan/', random: false })
      let rgen = recgen.record({ i: valgen.integer(), s: valgen.string() })
      let mgen = metagen.constant({ ttl: 300 })
      let policy = {
        key: Aerospike.policy.key.SEND,
        exists: Aerospike.policy.exists.CREATE_OR_REPLACE,
        timeout: 1000
      }
      return putgen.put(numberOfRecords, kgen, rgen, mgen, policy)
    }))

  after(() => helper.udf.remove('udf.lua'))

  describe('client.scan()', function () {
    it('creates a new Scan instance and sets up it\'s properties', function () {
      var namespace = 'test'
      var set = 'demo'
      var options = {
        concurrent: true,
        select: ['a', 'b', 'c'],
        nobins: false,
        percent: 50,
        priority: Aerospike.scanPriority.HIGH
      }
      var scan = client.scan(namespace, set, options)

      expect(scan).to.be.a(Scan)
      expect(scan.ns).to.equal('test')
      expect(scan.set).to.equal('demo')
      expect(scan.concurrent).to.equal(true)
      expect(scan.selected).to.eql(['a', 'b', 'c'])
      expect(scan.nobins).to.equal(false)
      expect(scan.percent).to.equal(50)
      expect(scan.priority).to.equal(Aerospike.scanPriority.HIGH)
    })

    it('creates a scan without specifying the set', function () {
      var namespace = 'test'
      var scan = client.scan(namespace, { select: ['i'] })
      expect(scan).to.be.a(Scan)
      expect(scan.ns).to.equal('test')
      expect(scan.set).to.be(null)
      expect(scan.selected).to.eql(['i'])
    })
  })

  describe('scan.select()', function () {
    it('sets the selected bins from an argument list', function () {
      var scan = client.scan('test', 'test')
      scan.select('a', 'b', 'c')
      expect(scan.selected).to.eql(['a', 'b', 'c'])
    })

    it('sets the selected bins from an array', function () {
      var scan = client.scan('test', 'test')
      scan.select(['a', 'b', 'c'])
      expect(scan.selected).to.eql(['a', 'b', 'c'])
    })
  })

  describe('scan.foreach()', function () {
    it('retrieves all records in the set', function (done) {
      var scan = client.scan(helper.namespace, testSet)
      var recordsReceived = 0
      var stream = scan.foreach()
      stream.on('data', function () { recordsReceived++ })
      stream.on('end', function () {
        expect(recordsReceived).to.not.be.lessThan(numberOfRecords)
        done()
      })
    })

    it('returns the key if it is stored on the server', function (done) {
      // requires { key: Aerospike.policy.key.SEND } when creating the record
      var scan = client.scan(helper.namespace, testSet)
      var stream = scan.foreach()
      stream.on('data', function (record, meta, key) {
        expect(key).to.be.a(Key)
        expect(key.key).to.not.be.empty()
        stream.abort()
      })
      stream.on('end', done)
    })

    it('sets a scan policy', function (done) {
      var scan = client.scan(helper.namespace, testSet)
      var scanPolicy = {
        timeout: 1000,
        socketTimeout: 1000,
        durableDelete: true,
        failOnClusterChange: true
      }
      var stream = scan.foreach(scanPolicy)
      stream.on('data', function () { stream.abort() })
      stream.on('end', done)
    })

    context('with nobins set to true', function () {
      it('should return only meta data', function (done) {
        var scan = client.scan(helper.namespace, testSet)
        scan.nobins = true
        var received = null
        var stream = scan.foreach()
        stream.on('error', function (error) { throw error })
        stream.on('data', function (bins, meta) {
          received = {bins: bins, meta: meta}
          stream.abort()
        })
        stream.on('end', function () {
          expect(received.bins).to.be.empty()
          expect(received.meta).to.not.be.empty()
          done()
        })
      })
    })

    context('with bin selection', function () {
      it('should return only selected bins', function (done) {
        var scan = client.scan(helper.namespace, testSet)
        scan.select('i')
        var received = null
        var stream = scan.foreach()
        stream.on('error', function (error) { throw error })
        stream.on('data', function (bins, meta) {
          received = {bins: bins, meta: meta}
          stream.abort()
        })
        stream.on('end', function () {
          expect(received.bins).to.only.have.keys('i')
          done()
        })
      })
    })

    context('with percent sampling', function () {
      it('should only scan approx. half of the records', function (done) {
        var scan = client.scan(helper.namespace, testSet, {
          percent: 50,
          nobins: true
        })
        var recordsReceived = 0
        var stream = scan.foreach()
        stream.on('error', function (error) { throw error })
        stream.on('data', function () {
          recordsReceived++
        })
        stream.on('end', function () {
          // The scan percentage is not very exact, esp. for small sets, so we
          // just test that the scan did not return every single record.
          expect(recordsReceived).to.be.lessThan(numberOfRecords)
          done()
        })
      })
    })

    context('without set', function () {
      it('executes a scan without set', function (done) {
        var scan = client.scan(helper.namespace)
        var recordsReceived = 0
        var stream = scan.foreach()
        stream.on('error', function (error) { throw error })
        stream.on('data', function () {
          recordsReceived++
          stream.abort()
        })
        stream.on('end', function () {
          expect(recordsReceived).to.equal(1)
          done()
        })
      })
    })

    it('should stop the scan when false is returned from the data handler', function (done) {
      var scan = client.scan(helper.namespace, testSet)
      var stream = scan.foreach()
      var recordsReceived = 0
      stream.on('error', function (error) { throw error })
      stream.on('data', function (record) {
        recordsReceived++
        if (recordsReceived === 5) {
          stream.abort()
        }
      })
      stream.on('end', function () {
        expect(recordsReceived).to.be(5)
        done()
      })
    })
  })

  describe('scan.background()', function () {
    it('applies a UDF to every record', function (done) {
      var token = valgen.string({length: {min: 10, max: 10}})()
      var backgroundScan = client.scan(helper.namespace, testSet)
      backgroundScan.background('udf', 'updateRecord', ['x', token], function (err, job) {
        if (err) throw err
        job.waitUntilDone(10, function (err) {
          if (err) throw err
          var validationScan = client.scan(helper.namespace, testSet)
          var stream = validationScan.foreach()
          stream.on('error', function (error) { throw error })
          stream.on('data', function (record) { expect(record['x']).to.equal(token) })
          stream.on('end', done)
        })
      })
    })
  })

  describe('job.info()', function () {
    it('returns the scan status and progress', function (done) {
      var scan = client.scan(helper.namespace, testSet, {percent: 10})
      scan.background('udf', 'noop', function (error, job) {
        if (error) throw error
        job.info(function (error, info) {
          if (error) throw error
          expect(info.status).to.be.within(Aerospike.jobStatus.INPROGRESS, Aerospike.jobStatus.COMPLETED)
          expect(info.recordsRead).to.be.within(0, numberOfRecords)
          expect(info.progressPct).to.be.within(0, 100)
          done()
        })
      })
    })
  })
})
