// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

/* eslint-env mocha */
/* global expect */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

const Key = Aerospike.Key

describe('client.batchRead()', function () {
  var client = helper.client

  before(function () {
    const nrecords = 10
    const kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_read/', random: false })
    const mgen = metagen.constant({ ttl: 1000 })
    const rgen = recgen.record({
      i: valgen.integer(),
      s: valgen.string(),
      l: () => [1, 2, 3],
      m: () => { return { a: 1, b: 2, c: 3 } }
    })
    return putgen.put(nrecords, kgen, rgen, mgen)
  })

  it('returns the status whether each key was found or not', function (done) {
    const batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1') },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3') },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5') },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/no_such_key') },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/not_either') }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.equal(5)
      const found = results.filter(
        result => result.status === Aerospike.status.OK)
      expect(found.length).to.equal(3)
      const notFound = results.filter(
        result => result.status === Aerospike.status.ERR_RECORD_NOT_FOUND)
      expect(notFound.length).to.equal(2)
      done()
    })
  })

  it('returns only meta data if no bins are selected', function (done) {
    var batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1') },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3') },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5') }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.equal(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(Aerospike.status.OK)
        expect(result.record.bins).to.be.empty()
      })
      done()
    })
  })

  it('returns just the selected bins', function (done) {
    var batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), bins: ['i'] },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), bins: ['i'] },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), bins: ['i'] }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.equal(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(Aerospike.status.OK)
        expect(result.record.bins).to.have.all.keys('i')
        expect(result.record.gen).to.be.ok()
        expect(result.record.ttl).to.be.ok()
      })
      done()
    })
  })

  it('returns the entire record', function (done) {
    var batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), read_all_bins: true },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), read_all_bins: true },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), read_all_bins: true }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.equal(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(Aerospike.status.OK)
        expect(result.record.bins).to.have.keys('i', 's', 'l', 'm')
        expect(result.record.gen).to.be.ok()
        expect(result.record.ttl).to.be.ok()
      })
      done()
    })
  })

  it('returns selected bins for each key', function (done) {
    var batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), read_all_bins: true },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), read_all_bins: false, bins: ['i'] },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), read_all_bins: false }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok()
      expect(results.length).to.equal(3)
      results.forEach(function (result) {
        const record = result.record
        switch (record.key.key) {
          case 'test/batch_read/1':
            expect(record.bins).to.have.all.keys('i', 's', 'l', 'm')
            break
          case 'test/batch_read/3':
            expect(record.bins).to.have.all.keys('i')
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

  context('with BatchPolicy', function () {
    context('with deserialize: false', function () {
      const policy = new Aerospike.BatchPolicy({
        deserialize: false
      })

      it('returns list and map bins as byte buffers', function () {
        const batch = [{
          key: new Key(helper.namespace, helper.set, 'test/batch_read/1'),
          read_all_bins: true
        }]

        return client.batchRead(batch, policy)
          .then(results => {
            const bins = results[0].record.bins
            expect(bins.i).to.be.a('number')
            expect(bins.s).to.be.a('string')
            expect(bins.l).to.be.instanceof(Buffer)
            expect(bins.m).to.be.instanceof(Buffer)
          })
      })
    })
  })

  it('returns a Promise that resolves to the batch results', function () {
    var batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), read_all_bins: true }
    ]

    return client.batchRead(batchRecords)
      .then(results => {
        expect(results.length).to.equal(1)
        return results.pop()
      })
      .then(result => {
        expect(result.status).to.equal(Aerospike.status.OK)
        expect(result.record).to.be.instanceof(Aerospike.Record)
      })
  })
})
