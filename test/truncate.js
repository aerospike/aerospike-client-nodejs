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

/* global describe, it, beforeEach */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const setgen = helper.valgen.string({
  prefix: 'test/trunc/',
  random: true,
  length: { min: 6, max: 6 }
})
const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen

describe('client.truncate()', function () {
  var client = helper.client

  beforeEach(function () {
    if (!helper.cluster.build_gte('3.12.0')) {
      this.skip('truncate ns/set feature not supported')
    }
  })

  // Generates a number of records; the callback function is called with a list
  // of the record keys.
  function genRecords (kgen, noRecords, done) {
    var mgen = metagen.constant({ ttl: 300 })
    var rgen = recgen.constant({ a: 'foo', b: 'bar' })
    var records = []
    putgen.put(noRecords, kgen, rgen, mgen, function (key) {
      if (key === null) {
        done(records)
      } else {
        records.push({ key: key })
      }
    })
  }

  // Checks to verify that records that are supposed to have been truncated
  // are gone and that records that are supposed to remain still exist. If some
  // truncated records still exist it will try again every pollInt ms.
  function checkRecords (truncated, remaining, pollInt, done) {
    client.batchRead(truncated.concat(remaining), function (err, results) {
      if (err) throw err
      for (var result of results) {
        var expectExist = !!remaining.find(function (record) { return record.key.key === result.key.key })
        switch (result.status) {
          case Aerospike.status.AEROSPIKE_OK:
            if (!expectExist) return setTimeout(checkRecords, pollInt, truncated, remaining, done)
            break
          case Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
            if (expectExist) throw new Error("Truncate removed record it wasn't supposed to: " + result.key)
            break
          default:
            throw new Error('Unexpected batchRead status code: ' + result.status)
        }
      }
      done()
    })
  }

  it('deletes all records in the set', function (done) {
    const ns = helper.namespace
    const set = setgen()
    const noRecords = 5
    const pollIntMs = 50 // Poll interval in ms to check whether records have been removed

    var kgen = keygen.string(ns, set, {prefix: 'test/trunc/', random: false})
    genRecords(kgen, noRecords, function (records) {
      setTimeout(function () {
        client.truncate(ns, set, 0, function (err) {
          if (err) throw err
          checkRecords(records, [], pollIntMs, done)
        })
      }, 1)
    })
  })

  it('deletes all records with an older update timestamp', function (done) {
    const ns = helper.namespace
    const set = setgen()
    const noRecordsToDelete = 5
    const noRecordsToRemain = 2
    const pollIntMs = 50 // Poll interval in ms to check whether records have been removed
    const allowanceMs = 200 // Test will fail if client and server clocks differ by more than this many ms!

    var kgen = keygen.string(ns, set, {prefix: 'test/trunc/del/', random: false})
    genRecords(kgen, noRecordsToDelete, function (batchToDelete) {
      setTimeout(function () {
        var timeNanos = new Date().getTime() * 1000000
        setTimeout(function () {
          var kgen = keygen.string(ns, set, {prefix: 'test/trunc/rem/', random: false})
          genRecords(kgen, noRecordsToRemain, function (batchToRemain) {
            setTimeout(function () {
              client.truncate(ns, set, timeNanos, function (err) {
                if (err) throw err
                checkRecords(batchToDelete, batchToRemain, pollIntMs, done)
              })
            }, 1)
          })
        }, allowanceMs)
      }, allowanceMs)
    })
  })
})
