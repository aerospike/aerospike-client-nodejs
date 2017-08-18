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

/* global expect, describe, it, before */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

const Key = Aerospike.Key
const Record = Aerospike.Record
const status = Aerospike.status

describe('client.batchRead()', function () {
  var client = helper.client

  before(function () {
    var nrecords = 10
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/batch_read/', random: false})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string()})
    return putgen.put(nrecords, kgen, rgen, mgen)
  })

  it('returns the status whether each key was found or not', function (done) {
    var batchRecords = [
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/1')},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/3')},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/5')},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/no_such_key')},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/not_either')}
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.be(5)
      var found = results.filter(function (result) { return result.status === status.AEROSPIKE_OK })
      expect(found.length).to.be(3)
      var notFound = results.filter(function (result) { return result.status === status.AEROSPIKE_ERR_RECORD_NOT_FOUND })
      expect(notFound.length).to.be(2)
      done()
    })
  })

  it('returns only meta data if no bins are selected', function (done) {
    var batchRecords = [
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/1')},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/3')},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/5')}
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.be(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(status.AEROSPIKE_OK)
        expect(result.record.bins).to.be.empty()
      })
      done()
    })
  })

  it('returns just the selected bins', function (done) {
    var batchRecords = [
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), bins: ['i']},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), bins: ['i']},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), bins: ['i']}
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.be(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(status.AEROSPIKE_OK)
        expect(result.record.bins).to.only.have.keys('i')
        expect(result.record.gen).to.be.ok()
        expect(result.record.ttl).to.be.ok()
      })
      done()
    })
  })

  it('returns the entire record', function (done) {
    var batchRecords = [
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), read_all_bins: true},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), read_all_bins: true},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), read_all_bins: true}
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.be(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(status.AEROSPIKE_OK)
        expect(result.record.bins).to.have.keys('i', 's')
        expect(result.record.gen).to.be.ok()
        expect(result.record.ttl).to.be.ok()
      })
      done()
    })
  })

  it('returns selected bins for each key', function (done) {
    var batchRecords = [
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), read_all_bins: true},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), read_all_bins: false, bins: ['i']},
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), read_all_bins: false}
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.be(3)
      results.forEach(function (result) {
        let record = result.record
        switch (record.key.key) {
          case 'test/batch_read/1':
            expect(record.bins).to.only.have.keys('i', 's')
            break
          case 'test/batch_read/3':
            expect(record.bins).to.only.have.keys('i')
            break
          case 'test/batch_read/5':
            expect(record.bins).to.be.empty()
            break
          default:
            throw new Error('unpexected record key')
        }
      })
      done()
    })
  })

  it('returns a Promise that resolves to the batch results', function () {
    var batchRecords = [
      {key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), read_all_bins: true}
    ]

    return client.batchRead(batchRecords)
      .then(results => {
        expect(results.length).to.be(1)
        return results.pop()
      })
      .then(result => {
        expect(result.status).to.be(Aerospike.status.AEROSPIKE_OK)
        expect(result.record).to.be.a(Record)
      })
  })
})
