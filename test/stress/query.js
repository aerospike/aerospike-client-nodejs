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

/* global expect, describe, it, before */

const Aerospike = require('../../lib/aerospike')
const helper = require('../test_helper')
const perfdata = require('./perfdata')

const fs = require('fs')

const mega = 1024 * 1024 // bytes in a MB

describe('client.query()', function () {
  this.enableTimeouts(false)
  var client = helper.client
  var testSet = 'test/queryperf'
  var idxKey = new Aerospike.Key(helper.namespace, helper.set, 'queryPerfData')
  var recordSize = [8, 128] // 8 x 128 bytes ≈ 1 kb / record
  var numberOfRecords = 1e6 // 1 Mio. records at 1 kb ≈ 1 GB total data size

  // Execute query using given onData handler to process each scanned record
  function executeQuery (onData, done) {
    var query = client.query(helper.namespace, testSet)
    query.where(Aerospike.filter.range('id', 0, numberOfRecords))
    var stream = query.foreach()

    var received = 0
    var timer = perfdata.interval(10000, function (ms) {
      var throughput = Math.round(1000 * received / ms)
      var memUsage = process.memoryUsage()
      var rss = Math.round(memUsage.rss / mega)
      var heapUsed = Math.round(memUsage.heapUsed / mega)
      var heapTotal = Math.round(memUsage.heapTotal / mega)
      console.log('%d ms: %d records received (%d rps; mem: %d MB, heap: %d / %d MB)',
          ms, received, throughput, rss, heapUsed, heapTotal)
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
          var index = {
            ns: helper.namespace,
            set: testSet,
            bin: 'id',
            index: 'queryPerfIndex',
            datatype: Aerospike.indexDataType.NUMERIC
          }
          console.info('generating secondary index on performance data')
          console.time('creating secondary index')
          client.createIndex(index, function (err, job) {
            if (err) throw err
            setTimeout(function () {
              job.waitUntilDone(function () {
                console.timeEnd('creating secondary index')
                client.put(idxKey, {norec: numberOfRecords, set: testSet}, done)
              })
            }, 5000)
          })
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
  it('queries ' + numberOfRecords + ' records with noop', function (done) {
    var noop = function () {}
    executeQuery(noop, done)
  })

  it('queries ' + numberOfRecords + ' records with busy loop', function (done) {
    var busy = function () {
      for (var x = 0; x < 1e5; x++) {} // busy loop
    }
    executeQuery(busy, done)
  })

  it('queries ' + numberOfRecords + ' records with file IO', function (done) {
    var file = 'query-stress-test.log'
    var stream = fs.createWriteStream(file)
    stream.on('error', function (err) { throw err })
    var fileAppend = function (record) {
      stream.write(JSON.stringify(record) + '\n')
    }
    executeQuery(fileAppend, function () {
      stream.end()
      fs.unlink(file, done)
    })
  })
})
