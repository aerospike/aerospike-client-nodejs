// *****************************************************************************
// Copyright 2022-2023 Aerospike, Inc.
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
// const util = require('util')
const batchType = Aerospike.batchType
const status = Aerospike.status

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
    const nrecords = 20
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
          key: new Key(helper.namespace, helper.set, 'test/batch_write/2')
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/3')
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
        expect(err).not.to.be.ok
        expect(results.length).to.equal(5)
        expect(found.length).to.equal(3 - inDoubt.length)
        expect(notFound.length).to.equal(2)
        done()
      })
    })

    it('returns only meta data if no bins are selected', function (done) {
      const batchWriteRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/4'),
          ops: [
            op.write('string', 'def'),
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar')),
            op.append('str2', 'world')]
        },
        {
          type: batchType.BATCH_REMOVE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/5')
        }
      ]

      const batchReadRecords = [
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/4'),
          readAllBins: true
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/5'),
          readAllBins: true
        },
        {
          type: batchType.BATCH_READ,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/4')
        }
      ]

      client.batchWrite(batchWriteRecords, function (err, results) {
        expect(err).to.be.null
        expect(results.length).to.equal(2)
        expect(results[1].record.bins).to.be.empty
        client.batchWrite(batchReadRecords, function (err, results) {
          expect(err).not.to.be.ok
          expect(results.length).to.equal(3)
          expect(results[0].record.bins).to.have.all.keys('i', 's', 'l', 'm', 'str2', 'geo', 'blob', 'string')
          expect(results[1].status).to.equal(Aerospike.status.ERR_RECORD_NOT_FOUND)
          expect(results[2].record.bins).to.be.empty
          // results.forEach(function (result) {
          //   console.log(util.inspect(result, true, 10, true))
          // })
          done()
        })
      })
    })
  })

  context('with BatchPolicy', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns list and map bins as byte buffers', function () {
      const batch = [{
        type: batchType.BATCH_READ,
        key: new Key(helper.namespace, helper.set, 'test/batch_write/6'),
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
          key: new Key(helper.namespace, helper.set, 'test/batch_write/7'),
          readAllBins: true
        }
      ]

      return client.batchWrite(batchRecords)
        .then(results => {
          expect(results.length).to.equal(1)
          return results.pop()
        })
        .then(result => {
          expect(result.status).to.equal(status.OK)
          expect(result.record).to.be.instanceof(Aerospike.Record)
        })
    })
  })

  context('with exists.IGNORE returning callback', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function (done) {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/8'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.IGNORE
          })
        }

      ]

      client.batchWrite(batchRecords, function (error, results) {
        if (error) throw error
        client.batchWrite(batchRecords, function (error, results) {
          expect(error).not.to.be.ok
          expect(results[0].status).to.equal(status.OK)
          done()
        })
      })
    })
  })

  context('with exists.IGNORE returning promise', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function () {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/9'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.IGNORE
          })
        }

      ]

      return client.batchWrite(batchRecords)
        .then(results => {
          return client.batchWrite(batchRecords)
        })
        .then(results => {
          expect(results[0].status).to.equal(status.OK)
        })
    })
  })

  context('with exists.CREATE returning callback', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the correct status and error value', function (done) {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/10'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.CREATE
          })
        }

      ]

      client.batchWrite(batchRecords, function (error, results) {
        if (error) throw error
        client.batchWrite(batchRecords, function (error, results) {
          expect(error).not.to.be.ok
          expect(results[0].status).to.equal(status.ERR_RECORD_EXISTS)
          done()
        })
      })
    })

    it('Returns correct status and error with async', async function () {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/11'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.CREATE
          })
        }

      ]

      await client.batchWrite(batchRecords)
      const results = await client.batchWrite(batchRecords)

      expect(results[0].status).to.equal(status.ERR_RECORD_EXISTS)
    })
  })

  context('with exists.CREATE returning promise', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function () {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/11'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.CREATE
          })
        }

      ]
      return client.batchWrite(batchRecords)
        .then((results) => {
          return client.batchWrite(batchRecords)
        })
        .then((results) => {
          expect(results[0].status).to.equal(status.ERR_RECORD_EXISTS)
        })
    })
  })

  context('with exists.UPDATE return callback', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function (done) {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/12'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.UPDATE
          })
        }

      ]

      client.remove(new Key(helper.namespace, helper.set, 'test/batch_write/12'), function (error, results) {
        if (error) throw error
        client.batchWrite(batchRecords, function (error, results) {
          expect(error).not.to.be.ok
          expect(results[0].status).to.equal(status.ERR_RECORD_NOT_FOUND)
          done()
        })
      })
    })
  })

  context('with exists.UPDATE returning promise', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function () {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/13'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.UPDATE
          })
        }

      ]

      return client.remove(new Key(helper.namespace, helper.set, 'test/batch_write/13'))
        .then((results) => {
          return client.batchWrite(batchRecords)
        })
        .then((results) => {
          expect(results[0].status).to.equal(status.ERR_RECORD_NOT_FOUND)
        })
    })
  })

  context('with exists.REPLACE return callback', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function (done) {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/14'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.REPLACE
          })
        }

      ]

      client.remove(new Key(helper.namespace, helper.set, 'test/batch_write/14'), function (error, results) {
        if (error) throw error
        client.batchWrite(batchRecords, function (error, results) {
          expect(error).not.to.be.ok
          expect(results[0].status).to.equal(status.ERR_RECORD_NOT_FOUND)
          done()
        })
      })
    })
  })

  context('with exists.REPLACE returning promise', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function () {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/15'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.REPLACE
          })
        }

      ]

      return client.remove(new Key(helper.namespace, helper.set, 'test/batch_write/15'))
        .then((results) => {
          return client.batchWrite(batchRecords)
        })
        .then((results) => {
          expect(results[0].status).to.equal(status.ERR_RECORD_NOT_FOUND)
        })
    })
  })

  context('with exists.CREATE_OR_REPLACE return callback', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function (done) {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/16'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.CREATE_OR_REPLACE
          })
        }

      ]

      client.batchWrite(batchRecords, function (error, results) {
        if (error) throw error
        client.batchWrite(batchRecords, function (error, results) {
          expect(error).not.to.be.ok
          expect(results[0].status).to.equal(status.OK)
          done()
        })
      })
    })
  })

  context('with exists.CREATE_OR_REPLACE returning promise', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('returns the status whether each key was found or not', function () {
      const batchRecords = [
        {
          type: batchType.BATCH_WRITE,
          key: new Key(helper.namespace, helper.set, 'test/batch_write/17'),
          ops: [
            op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
            op.write('blob', Buffer.from('bar'))
          ],
          policy: new Aerospike.BatchWritePolicy({
            exists: Aerospike.policy.exists.CREATE_OR_REPLACE
          })
        }

      ]

      return client.batchWrite(batchRecords)
        .then((results) => {
          return client.batchWrite(batchRecords)
        })
        .then((results) => {
          expect(results[0].status).to.equal(status.OK)
        })
    })
  })

  context('with BatchParentWritePolicy', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)
    this.timeout(10000)
    it('returns list and map bins as byte buffers', async function () {
      const batch = [{
        type: batchType.BATCH_READ,
        key: new Key(helper.namespace, helper.set, 'test/batch_write/18'),
        readAllBins: true
      }]

      const config = {
        hosts: helper.config.hosts,
        policies: {
          batchParentWrite: new Aerospike.BatchPolicy({ socketTimeout: 0, totalTimeout: 0, deserialize: false })
        }
      }

      const dummyClient = await Aerospike.connect(config)
      const results = await dummyClient.batchWrite(batch)
      const bins = results[0].record.bins
      expect(bins.i).to.be.a('number')
      expect(bins.s).to.be.a('string')
      expect(bins.l).to.be.instanceof(Buffer)
      expect(bins.m).to.be.instanceof(Buffer)
      await dummyClient.close()
    })
  })

  context('with BatchWritePolicy ttl', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('writes value with correct ttl', async function () {
      const batch = [{
        type: batchType.BATCH_WRITE,
        key: new Key(helper.namespace, helper.set, 'test/batch_write/19'),
        ops: [
          op.write('example', 35),
          op.write('blob', [4, 14, 28])
        ],
        policy: new Aerospike.BatchWritePolicy({
          exists: Aerospike.policy.exists.REPLACE,
          ttl: 1367
        })
      }]
      await client.batchWrite(batch)
      return client.get(new Key(helper.namespace, helper.set, 'test/batch_write/19'))
        .then(results => {
          const bins = results.bins
          expect(bins.example).to.be.a('number')
          expect(bins.blob).to.be.a('array')
          expect(results.ttl).to.equal(1367)
        })
    })
  })
})
