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

/* global expect, describe, it, beforeEach */

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

  function genRecords (kgen, noRecords, callback) {
    var mgen = metagen.constant({ ttl: 300 })
    var rgen = recgen.constant({ a: 'foo', b: 'bar' })
    var records = []
    putgen.put(noRecords, kgen, rgen, mgen, function (key) {
      if (key === null) {
        callback(records)
      } else {
        records.push({ key: key })
      }
    })
  }

  function foundKeys (batchResults) {
    var found = []
    batchResults.forEach(function (result) {
      if (result.status === Aerospike.status.AEROSPIKE_OK) {
        found.push({ key: result.key })
      }
    })
    return found
  }

  it('deletes all records in the set', function (done) {
    var ns = helper.namespace
    var set = setgen()
    var noRecords = 5

    var kgen = keygen.string(ns, set, {prefix: 'test/trunc/', random: false})
    genRecords(kgen, noRecords, function (records) {
      setTimeout(function () {
        client.truncate(ns, set, 0, function (err) {
          if (err) throw err
          setTimeout(function () {
            client.batchRead(records, function (err, results) {
              if (err) throw err
              expect(foundKeys(results)).to.eql([])
              done()
            })
          }, 200)
        })
      }, 200)
    })
  })

  it('deletes all records with an older update timestamp', function (done) {
    var ns = helper.namespace
    var set = setgen()
    var noRecordsBefore = 5
    var noRecordsAfter = 2

    var kgen = keygen.string(ns, set, {prefix: 'test/trunc/', random: false})
    genRecords(kgen, noRecordsBefore, function (batchBefore) {
      setTimeout(function () {
        var timeNanos = new Date().getTime() * 1000000
        setTimeout(function () {
          genRecords(kgen, noRecordsAfter, function (batchAfter) {
            client.truncate(ns, set, timeNanos, function (err) {
              if (err) throw err
              setTimeout(function () {
                client.batchRead(batchBefore.concat(batchAfter), function (err, results) {
                  if (err) throw err
                  expect(foundKeys(results)).to.eql(batchAfter)
                  done()
                })
              }, 200)
            })
          })
        }, 200)
      }, 200)
    })
  })
})
