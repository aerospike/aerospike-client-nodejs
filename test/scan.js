// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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

/* global expect, describe, it, before, after, context */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen
const recgen = helper.recgen
const valgen = helper.valgen

describe('Scans', function () {
  var client = helper.client
  var testSet = 'test/scan-' + Math.floor(Math.random() * 100000)
  var numberOfRecords = 100

  before(function (done) {
    helper.udf.register('scan.lua')
    var kgen = keygen.string(helper.namespace, testSet, {prefix: 'test/scan/'})
    var rgen = recgen.record({ i: valgen.integer(), s: valgen.string() })
    var mgen = metagen.constant({ ttl: 300 })
    putgen.put(numberOfRecords, kgen, rgen, mgen, function (key) {
      if (!key) done()
    })
  })

  after(function (done) {
    helper.udf.remove('scan.lua')
    done()
  })

  describe('client.scan()', function () {
    it('creates a new Scan instance and sets up it\'s properties', function () {
      var namespace = 'test'
      var set = 'demo'
      var options = {
        concurrent: true,
        select: ['a', 'b', 'c'],
        nobins: false,
        udf: { module: 'x', funcname: 'y', args: [1, 2, 3] },
        percent: 50,
        priority: Aerospike.scanPriority.HIGH
      }
      var scan = client.scan(namespace, set, options)

      expect(scan.ns).to.equal('test')
      expect(scan.set).to.equal('demo')
      expect(scan.concurrent).to.equal(true)
      expect(scan.select).to.eql(['a', 'b', 'c'])
      expect(scan.nobins).to.equal(false)
      expect(scan.udf).to.eql({ module: 'x', funcname: 'y', args: [1, 2, 3] })
      expect(scan.percent).to.equal(50)
      expect(scan.priority).to.equal(Aerospike.scanPriority.HIGH)
    })

    it('creates a scan without specifying the set', function () {
      var namespace = 'test'
      var scan = client.scan(namespace, { select: ['i'] })
      expect(scan.ns).to.equal('test')
      expect(scan.set).to.be(null)
      expect(scan.select).to.eql(['i'])
    })
  })

  describe('scan.applyEach', function () {
    it('sets the scan\'s UDF parameters', function () {
      var scan = client.scan('test', 'test')
      scan.applyEach('myModule', 'myFunction', 'arg1', 'arg2')
      expect(scan.udf).to.eql({ module: 'myModule', funcname: 'myFunction', args: ['arg1', 'arg2'] })
    })

    it('accepts the UDF arguments as an array', function () {
      var scan = client.scan('test', 'test')
      scan.applyEach('myModule', 'myFunction', ['arg1', 'arg2'])
      expect(scan.udf).to.eql({ module: 'myModule', funcname: 'myFunction', args: ['arg1', 'arg2'] })
    })
  })

  describe('scan.selectBins', function () {
    it('sets the selected bins from an argument list', function () {
      var scan = client.scan('test', 'test')
      scan.selectBins('a', 'b', 'c')
      expect(scan.select).to.eql(['a', 'b', 'c'])
    })

    it('sets the selected bins from an array', function () {
      var scan = client.scan('test', 'test')
      scan.selectBins(['a', 'b', 'c'])
      expect(scan.select).to.eql(['a', 'b', 'c'])
    })
  })

  describe('scan.execute()', function () {
    it('retrieves all records in the set', function (done) {
      var scan = client.scan(helper.namespace, testSet)
      var recordsReceived = 0
      var stream = scan.execute()
      stream.on('error', function (error) { throw error })
      stream.on('data', function (record) { recordsReceived++ })
      stream.on('end', function () {
        expect(recordsReceived).to.not.be.lessThan(numberOfRecords)
        done()
      })
    })

    context('with nobins set to true', function () {
      it('should return only meta data', function (done) {
        var scan = client.scan(helper.namespace, testSet)
        scan.nobins = true
        var received = null
        var stream = scan.execute()
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
        scan.selectBins('i')
        var received = null
        var stream = scan.execute()
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
          concurrent: true,
          nobins: true
        })
        var recordsReceived = 0
        var stream = scan.execute()
        stream.on('error', function (error) { throw error })
        stream.on('data', function () {
          recordsReceived++
        })
        stream.on('end', function () {
          // FIXME: with percent < 100, scan oftern returns zero records - is this a problem?!
          expect(recordsReceived).to.be.within(0, numberOfRecords - 1)
          done()
        })
      })
    })

    context('without set', function () {
      it('executes a scan without set', function (done) {
        var scan = client.scan(helper.namespace)
        var recordsReceived = 0
        var stream = scan.execute()
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
      var stream = scan.execute()
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
      backgroundScan.applyEach('scan', 'createBin', 'x', token)
      backgroundScan.background(function (err, task) {
        if (err) throw err
        task.waitUntilDone(10, function (err) {
          if (err) throw err
          var validationScan = client.scan(helper.namespace, testSet)
          var stream = validationScan.execute()
          stream.on('error', function (error) { throw error })
          stream.on('data', function (record) { expect(record['x']).to.be(token) })
          stream.on('end', done)
        })
      })
    })
  })

  describe('scanTask.info()', function () {
    it('returns the scan status and progress', function (done) {
      var scan = client.scan(helper.namespace, testSet, {percent: 10})
      scan.background(function (error, scanTask) {
        if (error) throw error
        scanTask.info(function (error, scanInfo) {
          if (error) throw error
          expect(scanInfo.status).to.be.within(Aerospike.scanStatus.INPROGRESS, Aerospike.scanStatus.COMPLETED)
          expect(scanInfo.recordsScanned).to.be.within(0, numberOfRecords)
          expect(scanInfo.progressPct).to.be.within(0, 100)
          done()
        })
      })
    })
  })
})
