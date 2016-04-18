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

describe('client.query()', function () {
  this.enableTimeouts(false)
  var client = helper.client
  var testSet = 'test/queryperf'
  var idxKey = new Aerospike.Key(helper.namespace, helper.set, 'queryPerfData')
  var numberOfRecords = 1e6 // 1 Mio. records at 1kb ≈ 1 GB total data size

  before(function (done) {
    client.get(idxKey, function (err, record) {
      if (err && err.code !== Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND) {
        throw err
      } else if (err) {
        // perf test data does not yet exist - generate it
        console.info('generating %d records as performance test data in set %s', numberOfRecords, testSet)
        console.time('generating performance test data')
        perfdata.generate(helper.namespace, testSet, numberOfRecords, function (recordsGenerated) {
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
                job.info(function (err, info) { if (!err) console.info(info) })
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

  // run query test both with and without busy loop in data handler
  ;[false, true].forEach(function (busyLoop) {
    it('query a million records - ' + (busyLoop ? 'with' : 'without') + ' busy loop', function (done) {
      var query = client.query(helper.namespace, testSet)
      query.where(Aerospike.filter.range('id', 0, numberOfRecords))
      var stream = query.foreach()
      var received = 0

      var timer = perfdata.interval(2000, function (ms) {
        var throughput = Math.round(1000 * received / ms)
        console.log('%d ms: %d records received (%d records / second)', ms, received, throughput)
      })

      stream.on('error', function (err) { throw err })
      stream.on('data', function (record) {
        received++
        if (busyLoop) for (var x = 0; x < 1e5; x++) {} // busy loop
      })
      stream.on('end', function () {
        timer.call()
        timer.clear()
        expect(received).to.be(numberOfRecords)
        done()
      })
    })
  })
})
