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

  function genRecords (ns, set, noRecords, callback) {
    var kgen = keygen.string(ns, set, {prefix: 'test/trunc/', random: false})
    var mgen = metagen.constant({ ttl: 300 })
    var rgen = recgen.constant({ a: 'foo', b: 'bar' })
    putgen.put(noRecords, kgen, rgen, mgen, function (key) {
      if (key === null) {
        callback()
      }
    })
  }

  function countRecords (ns, set, callback) {
    var recordsReceived = 0
    var scan = client.scan(ns, set, { nobins: true })
    var stream = scan.foreach()
    stream.on('data', function () { recordsReceived++ })
    stream.on('error', function (error) { throw error })
    stream.on('end', function () {
      callback(recordsReceived)
    })
  }

  it('deletes all records in the set', function (done) {
    var ns = helper.namespace
    var set = setgen()
    var noRecords = 5

    genRecords(ns, set, noRecords, function () {
      setTimeout(function () {
        client.truncate(ns, set, 0, function (err) {
          if (err) throw err
          setTimeout(function () {
            countRecords(ns, set, function (count) {
              expect(count).to.equal(0)
              done()
            })
          }, 100)
        })
      }, 100)
    })
  })

  it('deletes all records with an older update timestamp', function (done) {
    var ns = helper.namespace
    var set = setgen()
    var noRecordsBefore = 5
    var noRecordsAfter = 2

    genRecords(ns, set, noRecordsBefore, function () {
      setTimeout(function () {
        var timeNanos = new Date().getTime() * 1000000
        setTimeout(function () {
          genRecords(ns, set, noRecordsAfter, function () {
            client.truncate(ns, set, timeNanos, function (err) {
              if (err) throw err
              setTimeout(function () {
                countRecords(ns, set, function (count) {
                  expect(count).to.equal(noRecordsAfter)
                  done()
                })
              }, 100)
            })
          })
        }, 100)
      }, 100)
    })
  })
})
