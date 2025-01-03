// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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

/* global expect, describe, it, before */

const Aerospike = require('../../lib/aerospike')
const helper = require('../test_helper')
const perfdata = require('./perfdata')

const fs = require('fs')

const mega = 1024 * 1024 // bytes in a MB

describe('client.scan()', function () {
  this.enableTimeouts(false)
  const client = helper.client
  let testSet = 'test/scanperf'
  const idxKey = new Aerospike.Key(helper.namespace, helper.set, 'scanPerfData')
  const recordSize = [8, 128] // 8 x 128 bytes ≈ 1 kb / record
  let numberOfRecords = 1e6 // 1 Mio. records at 1 kb ≈ 1 GB total data size
  const webWorkerThreads = 10 // number of WebWorker threads to use
  const reportingInterval = 10000 // report progress every 10 seconds

  // Execute scan using given onData handler to process each scanned record
  function executeScan (onData, done) {
    const scan = client.scan(helper.namespace, testSet)
    scan.concurrent = true
    const stream = scan.foreach()

    let received = 0
    const timer = perfdata.interval(reportingInterval, function (ms) {
      const throughput = Math.round(1000 * received / ms)
      console.log('%d ms: %d records received (%d rps; %s)',
        ms, received, throughput, perfdata.memUsage())
    })

    stream.on('error', function (err) { throw err })
    stream.on('data', function (record) { received++ })
    stream.on('end', function () {
      timer.call()
      timer.clear()
      expect(received).to.be(numberOfRecords)
      done()
    })
    stream.on('data', onData)
  }

  // Create test data
  before(function (done) {
    client.get(idxKey, function (err, record) {
      if (err && err.code !== Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND) {
        throw err
      } else if (err) {
        // perf test data does not yet exist - generate it
        console.info('generating %d records as performance test data in set %s', numberOfRecords, testSet)
        console.time('generating performance test data')
        perfdata.generate(helper.namespace, testSet, numberOfRecords, recordSize, function (recordsGenerated) {
          console.timeEnd('generating performance test data')
          numberOfRecords = recordsGenerated // might be slightly less due to duplciate keys
          client.put(idxKey, { norec: numberOfRecords, set: testSet }, done)
        })
      } else {
        // perf test data already exists
        numberOfRecords = record.norec
        testSet = record.set
        console.info('using performance test data from set %s (%d records)', testSet, numberOfRecords)
        done()
      }
    })
  })

  // Test definitions
  it('scans ' + numberOfRecords + ' records with noop', function (done) {
    const noop = function () {}
    executeScan(noop, done)
  })

  it('scans ' + numberOfRecords + ' records with busy loop', function (done) {
    const busy = function () {
      // busy loop
      for (let x = 0; x < 1e5; x++) {} // eslint-disable-line
    }
    executeScan(busy, done)
  })

  it('scans ' + numberOfRecords + ' records with busy loop in WebWorker', function (done) {
    let Worker
    try {
      Worker = require('webworker-threads')
    } catch (err) {
      console.error('gem install webworker-threads to run this test!')
      this.skip('gem install webworker-threads to run this test!')
      return
    }
    function doWork () {
      // busy loop
      for (let x = 0; x < 1e5; x++) {} // eslint-disable-line
    }
    const threadPool = Worker.createPool(webWorkerThreads).all.eval(doWork)
    console.log('created WebWorker pool with %s threads', webWorkerThreads)
    let processed = 0
    const timer = perfdata.interval(reportingInterval, function (ms) {
      const throughput = Math.round(1000 * processed / ms)
      const memUsage = process.memoryUsage()
      const rss = Math.round(memUsage.rss / mega)
      const heapUsed = Math.round(memUsage.heapUsed / mega)
      const heapTotal = Math.round(memUsage.heapTotal / mega)
      console.log('%d ms: %d records processed (%d rps; mem: %d MB, heap: %d / %d MB)',
        ms, processed, throughput, rss, heapUsed, heapTotal)
    })
    const worker = function (record, meta, key) {
      threadPool.any.eval('doWork()', function (err) {
        if (err) throw err
        if (++processed === numberOfRecords) {
          timer.call()
          timer.clear()
          threadPool.destroy()
          done()
        }
      })
    }
    executeScan(worker, function () {})
  })

  it('scans ' + numberOfRecords + ' records with file IO', function (done) {
    const file = 'scan-stress-test.log'
    const stream = fs.createWriteStream(file)
    stream.on('error', function (err) { throw err })
    const fileAppend = function (record) {
      stream.write(JSON.stringify(record) + '\n')
    }
    executeScan(fileAppend, function () {
      stream.end()
      fs.unlink(file, done)
    })
  })
})
