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

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen
const recgen = helper.recgen
const valgen = helper.valgen

describe('client.scan()', function () {
  this.enableTimeouts(false)
  var client = helper.client
  var testSet = 'test/scanperf'
  var idxKey = new Aerospike.Key(helper.namespace, helper.set, 'perfData')
  var numberOfRecords = 1e6 // 1 Mio. records at 1kb ≈ 1 GB total data size

  // Creates a new timer interval and passes the elapsed time in milliseconds
  // into each invocation of the interval callback.
  function interval (duration, callback) {
    var startTime = process.hrtime()
    return setInterval(function () {
      var diff = process.hrtime(startTime)
      var ms = Math.round(diff[0] * 1000 + (diff[1] / 1e6))
      callback(ms)
    }, duration).unref()
  }

  before(function (done) {
    client.get(idxKey, function (err, record) {
      if (err && err.code !== Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND) {
        throw err
      } else if (err) {
        // perf test data does not yet exist - generate it
        console.info('generating %d records as performance test data in set %s', numberOfRecords, testSet)
        console.time('generating performance test data')
        var kgen = keygen.string(helper.namespace, testSet)
        var bins = {}
        for (var i = 0; i < 8; i++) {
          bins['b' + i] = valgen.bytes({length: {min: 128, max: 128}}) // 8 x 128 bytes ≈ 1k/record
        }
        var rgen = recgen.record(bins)
        var mgen = metagen.constant({})
        var keysCreated = 0
        var uniqueKeys = new Set()
        var timer = interval(10 * 1000, function (ms) {
          var throughput = Math.round(1000 * keysCreated / ms)
          console.info('%s ms: %d / %d records created (%d records / second)', ms, keysCreated, numberOfRecords, throughput)
        })
        putgen.put(numberOfRecords, kgen, rgen, mgen, function (key) {
          if (key) {
            keysCreated++
            uniqueKeys.add(key.key)
          } else {
            // actual number of records might be slightly less due to duplicate keys
            numberOfRecords = uniqueKeys.size
            console.timeEnd('generating performance test data')
            clearInterval(timer)
            client.put(idxKey, {norec: numberOfRecords, set: testSet}, done)
          }
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

  // run scan test both with and without busy loop in data handler
  ;[false, true].forEach(function (busyLoop) {
    it('scan a million records - ' + (busyLoop ? 'with' : 'without') + ' busy loop', function (done) {
      var scan = client.scan(helper.namespace, testSet)
      scan.priority = Aerospike.scanPriority.HIGH
      scan.concurrent = true
      var stream = scan.execute()
      var received = 0

      var timer = interval(2000, function (ms) {
        var throughput = Math.round(1000 * received / ms)
        console.log('%d ms: %d records scanned (%d records / second)', ms, received, throughput)
      })

      stream.on('error', function (err) { throw err })
      stream.on('data', function (record) {
        received++
        if (busyLoop) for (var x = 0; x < 1e5; x++) {} // busy loop
      })
      stream.on('end', function () {
        clearInterval(timer)
        expect(received).to.be(numberOfRecords)
        done()
      })
    })
  })
})
