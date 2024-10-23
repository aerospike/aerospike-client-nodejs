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

/* eslint-env mocha */
/* global expect */
/* eslint-disable no-unused-expressions */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

const Key = Aerospike.Key

describe('client.batchRead()', function () {
  const client = helper.client

  before(function () {
    const nrecords = 10
    const generators = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_read/', random: false }),
      recgen: recgen.record({
        i: valgen.integer(),
        s: valgen.string(),
        l: () => [1, 2, 3],
        m: () => { return { a: 1, b: 2, c: 3 } }
      }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    return putgen.put(nrecords, generators)
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
      expect(err).not.to.be.ok
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
    const batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1') },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3') },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5') }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok
      expect(results.length).to.equal(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(Aerospike.status.OK)
        expect(result.record.bins).to.be.empty
      })
      done()
    })
  })

  it('returns just the selected bins', function (done) {
    const batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), bins: ['i'] },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), bins: ['i'] },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), bins: ['i'] }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok
      expect(results.length).to.equal(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(Aerospike.status.OK)
        expect(result.record.bins).to.have.all.keys('i')
        expect(result.record.gen).to.be.ok
        expect(result.record.ttl).to.be.ok
      })
      done()
    })
  })

  it('returns the entire record', function (done) {
    const batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), readAllBins: true },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), readAllBins: true },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), readAllBins: true }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok
      expect(results.length).to.equal(3)
      results.forEach(function (result) {
        expect(result.status).to.equal(Aerospike.status.OK)
        expect(result.record.bins).to.have.keys('i', 's', 'l', 'm')
        expect(result.record.gen).to.be.ok
        expect(result.record.ttl).to.be.ok
      })
      done()
    })
  })

  it('returns selected bins for each key', function (done) {
    const batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), readAllBins: true },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/3'), readAllBins: false, bins: ['i'] },
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/5'), readAllBins: false }
    ]

    client.batchRead(batchRecords, function (err, results) {
      expect(err).not.to.be.ok
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
            expect(record.bins).to.be.empty
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
          readAllBins: true
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
  context('readTouchTtlPercent policy', function () {
    this.timeout(4000)

    context('BatchPolicy policy', function () {
      helper.skipUnlessVersion('>= 7.1.0', this)

      it('100% touches record', async function () {
        const policy = new Aerospike.BatchReadPolicy({
          readTouchTtlPercent: 100
        })

        await client.put(new Aerospike.Key('test', 'demo', 'batchTtl1'), { i: 2 }, { ttl: 10 })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchTtl1'),
          readAllBins: true
        }]

        const batchResult = await client.batchRead(batch, policy)
        expect(batchResult[0].record.bins).to.eql({ i: 2 })
        expect(batchResult[0].record.ttl).to.be.within(7, 8)

        const record = await client.get(new Aerospike.Key('test', 'demo', 'batchTtl1'))
        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(9, 10)

        await client.remove(new Aerospike.Key('test', 'demo', 'batchTtl1'))
      })

      it('71% touches record', async function () {
        const policy = new Aerospike.BatchReadPolicy({
          readTouchTtlPercent: 71
        })

        await client.put(new Aerospike.Key('test', 'demo', 'batchTtl2'), { i: 2 }, { ttl: 10 })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchTtl2'),
          readAllBins: true
        }]

        const batchResult = await client.batchRead(batch, policy)
        expect(batchResult[0].record.bins).to.eql({ i: 2 })
        expect(batchResult[0].record.ttl).to.be.within(7, 8)

        const record = await client.get(new Aerospike.Key('test', 'demo', 'batchTtl2'))
        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(9, 10)

        await client.remove(new Aerospike.Key('test', 'demo', 'batchTtl2'))
      })

      it('60% doesnt touch record', async function () {
        const policy = new Aerospike.BatchReadPolicy({
          readTouchTtlPercent: 60
        })

        await client.put(new Aerospike.Key('test', 'demo', 'batchTtl3'), { i: 2 }, { ttl: 10 })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchTtl3'),
          readAllBins: true
        }]

        const batchResult = await client.batchRead(batch, policy)
        expect(batchResult[0].record.bins).to.eql({ i: 2 })
        expect(batchResult[0].record.ttl).to.be.within(7, 8)

        const record = await client.get(new Aerospike.Key('test', 'demo', 'batchTtl3'))
        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(7, 8)

        await client.remove(new Aerospike.Key('test', 'demo', 'batchTtl3'))
      })

      it('0% doesnt touch record', async function () {
        const policy = new Aerospike.BatchReadPolicy({
          readTouchTtlPercent: 0
        })

        await client.put(new Aerospike.Key('test', 'demo', 'batchTtl4'), { i: 2 }, { ttl: 10 })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchTtl4'),
          readAllBins: true
        }]

        const batchResult = await client.batchRead(batch, policy)
        expect(batchResult[0].record.bins).to.eql({ i: 2 })
        expect(batchResult[0].record.ttl).to.be.within(7, 8)

        const record = await client.get(new Aerospike.Key('test', 'demo', 'batchTtl4'))
        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(7, 8)

        await client.remove(new Aerospike.Key('test', 'demo', 'batchTtl4'))
      })
    })

    context('BatchReadPolicy policy', function () {
      helper.skipUnlessVersion('>= 7.1.0', this)
      it('100% touches record', async function () {
        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchReadTtl1'),
          readAllBins: true,
          policy: new Aerospike.BatchPolicy({
            readTouchTtlPercent: 100
          })
        }]
        await client.put(new Aerospike.Key('test', 'demo', 'batchReadTtl1'), { i: 2 }, { ttl: 10 })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const batchResult = await client.batchRead(batch)
        expect(batchResult[0].record.bins).to.eql({ i: 2 })
        expect(batchResult[0].record.ttl).to.be.within(7, 8)

        const record = await client.get(new Aerospike.Key('test', 'demo', 'batchReadTtl1'))
        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(9, 10)

        await client.remove(new Aerospike.Key('test', 'demo', 'batchReadTtl1'))
      })

      it('71% touches record', async function () {
        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchReadTtl2'),
          readAllBins: true,
          policy: new Aerospike.BatchPolicy({
            readTouchTtlPercent: 71
          })
        }]
        await client.put(new Aerospike.Key('test', 'demo', 'batchReadTtl2'), { i: 2 }, { ttl: 10 })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const batchResult = await client.batchRead(batch)
        expect(batchResult[0].record.bins).to.eql({ i: 2 })
        expect(batchResult[0].record.ttl).to.be.within(7, 8)

        const record = await client.get(new Aerospike.Key('test', 'demo', 'batchReadTtl2'))
        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(9, 10)

        await client.remove(new Aerospike.Key('test', 'demo', 'batchReadTtl2'))
      })

      it('60% doesnt touch record', async function () {
        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchReadTtl3'),
          readAllBins: true,
          policy: new Aerospike.BatchPolicy({
            readTouchTtlPercent: 60
          })
        }]
        await client.put(new Aerospike.Key('test', 'demo', 'batchReadTtl3'), { i: 2 }, { ttl: 10 })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const batchResult = await client.batchRead(batch)
        expect(batchResult[0].record.bins).to.eql({ i: 2 })
        expect(batchResult[0].record.ttl).to.be.within(7, 8)

        const record = await client.get(new Aerospike.Key('test', 'demo', 'batchReadTtl3'))
        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(7, 8)

        await client.remove(new Aerospike.Key('test', 'demo', 'batchReadTtl3'))
      })

      it('0% doesnt touch record', async function () {
        const batch = [{
          key: new Aerospike.Key('test', 'demo', 'batchReadTtl4'),
          readAllBins: true,
          policy: new Aerospike.BatchPolicy({
            readTouchTtlPercent: 0
          })
        }]
        await client.put(new Aerospike.Key('test', 'demo', 'batchReadTtl4'), { i: 2 }, { ttl: 10 })
        await new Promise(resolve => setTimeout(resolve, 3000))

        const batchResult = await client.batchRead(batch)
        expect(batchResult[0].record.bins).to.eql({ i: 2 })
        expect(batchResult[0].record.ttl).to.be.within(7, 8)

        const record = await client.get(new Aerospike.Key('test', 'demo', 'batchReadTtl4'))
        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(7, 8)

        await client.remove(new Aerospike.Key('test', 'demo', 'batchReadTtl4'))
      })
    })
  })

  it('returns a Promise that resolves to the batch results', function () {
    const batchRecords = [
      { key: new Key(helper.namespace, helper.set, 'test/batch_read/1'), readAllBins: true }
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
