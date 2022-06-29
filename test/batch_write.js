// *****************************************************************************
// Copyright 2022 Aerospike, Inc.
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
// const util = require('util')
const batchType = Aerospike.batchType

const op = Aerospike.operations
const GeoJSON = Aerospike.GeoJSON

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

const Key = Aerospike.Key

describe('client.batchWrite()', function () {
  const client = helper.client

  before(function () {
    const nrecords = 10
    const generators = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_write/', random: false }),
      recgen: recgen.record({
        i: valgen.integer(),
        s: valgen.string(),
        str2: valgen.string('hello'),
        l: () => [1, 2, 3],
        m: () => { return { a: 1, b: 2, c: 3 } }
      }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    return putgen.put(nrecords, generators)
  })

  context('with batch write', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function (done) {
      const batchRecords = [
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/1'),
          readAllBins: true
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/3')
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/5')
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/no_such_key')
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/not_either')
        }
      ]

      client.batchWrite(batchRecords, function (err, results) {
        const found = results.filter(
          result => result.status === Aerospike.status.OK)
        const inDoubt = results.filter(
          result => result.inDoubt === true)
        const notFound = results.filter(
          result => result.status === Aerospike.status.ERR_RECORD_NOT_FOUND)
        console.log('found:', found.length, 'inDoubt:', inDoubt.length, 'notFound:', notFound.length)
        expect(err).not.to.be.ok()
        expect(results.length).to.equal(5)
        expect(found.length).to.equal(3 - inDoubt.length)
        expect(notFound.length).to.equal(2)
        done()
      })
    })

    it('returns only meta data if no bins are selected', function (done) {
      const batchRecords = [
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/1')
        },
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/3'),
          ops: [
            op.write('string', 'def'),
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar')),
            op.append('str2', 'world')]
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/3'),
          readAllBins: true
        },
        {
          type: batchType.BATCH_REMOVE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/5')
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/5'),
          readAllBins: true
        }
      ]

      client.batchWrite(batchRecords, function (err, results) {
        expect(err).not.to.be.ok()
        expect(results.length).to.equal(5)
        expect(results[0].record.bins).to.be.empty()
        expect(results[2].record.bins).to.have.all.keys('i', 's', 'l', 'm', 'str2', 'geo', 'blob', 'string')
        expect(results[3].record.bins).to.be.empty()
        expect(results[4].status).to.equal(Aerospike.status.ERR_RECORD_NOT_FOUND)
        // results.forEach(function (result) {
        //   console.log(util.inspect(result, true, 10, true))
        // })
        done()
      })
    })
  })

  context('with BatchPolicy', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns list and map bins as byte buffers', function () {
      const batch = [{
        type: batchType.BATCH_READ,
        key: new Key(helper.namespace, helper.set, 'test/batch_write/1'),
        readAllBins: true
      }]
      const policy = new Aerospike.BatchPolicy({
        deserialize: false
      })

      return client.batchWrite(batch, policy)
        .then(results => {
          const bins = results[0].record.bins
          expect(bins.i).to.be.a('number')
          expect(bins.s).to.be.a('string')
          expect(bins.l).to.be.instanceof(Buffer)
          expect(bins.m).to.be.instanceof(Buffer)
        })
    })

    it('returns a Promise that resolves to the batch results', function () {
      const batchRecords = [
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/1'),
          readAllBins: true
        }
      ]

      return client.batchWrite(batchRecords)
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
})
