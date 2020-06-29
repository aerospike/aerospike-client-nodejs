// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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
const Job = require('../lib/job')
const helper = require('./test_helper')

const Key = Aerospike.Key
const op = Aerospike.operations

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen
const recgen = helper.recgen
const valgen = helper.valgen

context('Scans', function () {
  const client = helper.client
  const testSet = 'test/scan-' + Math.floor(Math.random() * 100000)
  const numberOfRecords = 100
  let keys = []

  before(() => helper.udf.register('udf.lua')
    .then(() => {
      const config = {
        keygen: keygen.string(helper.namespace, testSet, { prefix: 'test/scan/', random: false }),
        recgen: recgen.record({ i: valgen.integer(), s: valgen.string() }),
        metagen: metagen.constant({ ttl: 300 }),
        policy: new Aerospike.WritePolicy({
          totalTimeout: 1000,
          key: Aerospike.policy.key.SEND,
          exists: Aerospike.policy.exists.CREATE_OR_REPLACE
        })
      }
      return putgen.put(numberOfRecords, config)
        .then((records) => { keys = records.map((rec) => rec.key) })
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

      expect(scan).to.be.instanceof(Scan)
      expect(scan.ns).to.equal('test')
      expect(scan.set).to.equal('demo')
      expect(scan.concurrent).to.be.true()
      expect(scan.selected).to.eql(['a', 'b', 'c'])
      expect(scan.nobins).to.be.false()
      expect(scan.percent).to.equal(50)
      expect(scan.priority).to.equal(Aerospike.scanPriority.HIGH)
    })

    it('creates a scan without specifying the set', function () {
      var namespace = 'test'
      var scan = client.scan(namespace, { select: ['i'] })
      expect(scan).to.be.instanceof(Scan)
      expect(scan.ns).to.equal('test')
      expect(scan.set).to.be.null()
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

  describe('scan.foreach() #slow', function () {
    it('retrieves all records in the set', function (done) {
      var scan = client.scan(helper.namespace, testSet)
      var recordsReceived = 0
      var stream = scan.foreach()
      stream.on('data', () => recordsReceived++)
      stream.on('end', () => {
        expect(recordsReceived).to.equal(numberOfRecords)
        done()
      })
    })

    it('returns the key if it is stored on the server', function (done) {
      // requires { key: Aerospike.policy.key.SEND } when creating the record
      var scan = client.scan(helper.namespace, testSet)
      var stream = scan.foreach()
      stream.on('data', record => {
        expect(record.key).to.be.instanceof(Key)
        expect(record.key.key).to.not.be.empty()
        stream.abort()
      })
      stream.on('end', done)
    })

    it('attaches event handlers to the stream', function (done) {
      const scan = client.scan(helper.namespace, testSet)
      let dataHandlerCalled = false
      const stream = scan.foreach(null,
        (_record) => {
          dataHandlerCalled = true
          stream.abort()
        },
        (error) => { throw error },
        () => {
          expect(dataHandlerCalled).to.be.true()
          done()
        })
    })

    it('sets a scan policy', function (done) {
      const scan = client.scan(helper.namespace, testSet)
      const policy = new Aerospike.ScanPolicy({
        totalTimeout: 1000,
        socketTimeout: 1000,
        durableDelete: true,
        failOnClusterChange: true,
        recordsPerSecond: 50,
        maxRecords: 5000
      })

      const stream = scan.foreach(policy)
      stream.on('data', () => stream.abort())
      stream.on('error', error => {
        if (error.code === Aerospike.status.ERR_CLUSTER_CHANGE) {
          // ignore errors caused by cluster change events
        } else {
          throw error
        }
      })
      stream.on('end', done)
    })

    context('with nobins set to true', function () {
      it('should return only meta data', function (done) {
        const scan = client.scan(helper.namespace, testSet, { nobins: true })
        const stream = scan.foreach()
        stream.on('data', record => {
          expect(record.bins).to.be.empty()
          expect(record.gen).to.be.ok()
          expect(record.ttl).to.be.ok()
          stream.abort()
        })
        stream.on('end', done)
      })
    })

    context('with bin selection', function () {
      it('should return only selected bins', function (done) {
        var scan = client.scan(helper.namespace, testSet)
        scan.select('i')
        var stream = scan.foreach()
        stream.on('data', record => {
          expect(record.bins).to.have.all.keys('i')
          stream.abort()
        })
        stream.on('end', done)
      })
    })

    context('with percent sampling', function () {
      helper.skipUnlessVersion('< 4.9', this)

      it('should only scan approx. half of the records', function (done) {
        const scan = client.scan(helper.namespace, testSet, {
          percent: 50,
          nobins: true
        })
        var recordsReceived = 0
        var stream = scan.foreach()
        stream.on('data', () => recordsReceived++)
        stream.on('end', () => {
          // The scan percentage is not very exact, esp. for small sets, so we
          // just test that the scan did not return every single record.
          expect(recordsReceived).to.be.lessThan(numberOfRecords)
          done()
        })
      })
    })

    context('with max records limit', function () {
      helper.skipUnlessVersion('>= 4.9.0', this)

      it('returns at most X number of records', function (done) {
        const scan = client.scan(helper.namespace, testSet, { nobins: true })

        const maxRecords = 33
        const stream = scan.foreach({ maxRecords })
        let recordsReceived = 0
        stream.on('data', () => recordsReceived++)
        stream.on('end', () => {
          // The actual number returned may be less than maxRecords if node
          // record counts are small and unbalanced across nodes.
          expect(recordsReceived).to.be.at.most(maxRecords)
          done()
        })
      })
    })

    context('without set', function () {
      it('executes a scan without set', function (done) {
        var scan = client.scan(helper.namespace)
        var recordsReceived = 0
        var stream = scan.foreach()
        stream.on('error', error => { throw error })
        stream.on('data', () => {
          recordsReceived++
          stream.abort()
        })
        stream.on('end', () => {
          expect(recordsReceived).to.equal(1)
          done()
        })
      })
    })
  })

  describe('scan.background()', function () {
    it('applies a UDF to every record', function (done) {
      var token = valgen.string({ length: { min: 10, max: 10 } })()
      var backgroundScan = client.scan(helper.namespace, testSet)
      backgroundScan.background('udf', 'updateRecord', ['x', token], function (err, job) {
        if (err) throw err
        job.waitUntilDone(10, function (err) {
          if (err) throw err
          var validationScan = client.scan(helper.namespace, testSet)
          var stream = validationScan.foreach()
          stream.on('error', error => { throw error })
          stream.on('data', record => expect(record.bins.x).to.equal(token))
          stream.on('end', done)
        })
      })
    })

    it('returns a Promise that resolves to a Job', function () {
      const backgroundScan = client.scan(helper.namespace, testSet)
      return backgroundScan.background('udf', 'noop')
        .then(job => {
          expect(job).to.be.instanceof(Job)
        })
    })
  })

  describe('scan.operate()', function () {
    helper.skipUnlessVersion('>= 4.7.0', this)

    it('should perform a background scan that executes the operations', async function () {
      const scan = client.scan(helper.namespace, testSet)
      const ops = [op.write('backgroundOps', 1)]
      const job = await scan.operate(ops)
      await job.waitUntilDone()

      const key = keys[Math.floor(Math.random() * keys.length)]
      const record = await client.get(key)
      expect(record.bins.backgroundOps).to.equal(1)
    })
  })

  describe('stream.abort()', function () {
    it('should stop the scan when the stream is aborted', function (done) {
      const scan = client.scan(helper.namespace, testSet)
      const stream = scan.foreach()
      let recordsReceived = 0
      stream.on('data', () => {
        recordsReceived++
        if (recordsReceived === 5) {
          stream.abort()
        }
      })
      stream.on('end', () => {
        expect(recordsReceived).to.equal(5)
        done()
      })
    })
  })

  describe('job.info()', function () {
    it('returns the scan status and progress', function (done) {
      var scan = client.scan(helper.namespace, testSet, { percent: 10 })
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
