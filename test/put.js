// *****************************************************************************
// Copyright 2013-2022 Aerospike, Inc.
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

/* global expect, describe, it, context */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const valgen = helper.valgen

const status = Aerospike.status
const AerospikeError = Aerospike.AerospikeError
const Double = Aerospike.Double
const GeoJSON = Aerospike.GeoJSON

const bigint = require('../lib/bigint')
const BigInt = bigint.BigInt

describe('client.put()', function () {
  const client = helper.client

  it('should write and validate records', function (done) {
    const meta = { ttl: 1000 }
    const putAndGet = function (key, bins, cb) {
      client.put(key, bins, meta, function (err) {
        if (err) throw err
        client.get(key, function (err, record) {
          if (err) throw err
          expect(bins).to.eql(record.bins)
          cb()
        })
      })
    }

    const kgen = keygen.string(helper.namespace, helper.set, {
      prefix: 'test/put/putAndGet/',
      random: false
    })
    const rgen = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })
    const total = 50
    let count = 0

    for (let i = 0; i < total; i++) {
      putAndGet(kgen(), rgen(), function () {
        count++
        if (count === total) {
          done()
        }
      })
    }
  })

  context('records with various key types', function () {
    it('should write a record w/ string key', function (done) {
      const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      const record = recgen.record({ i: valgen.integer(), s: valgen.string() })()

      client.put(key, record, function (err) {
        if (err) throw err

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })

    it('should write a record w/ integer key', function (done) {
      const key = keygen.integer(helper.namespace, helper.set)()
      const record = recgen.record({ i: valgen.integer(), s: valgen.string() })()

      client.put(key, record, function (err) {
        if (err) throw err

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })

    context('BigInt keys', function () {
      helper.skipUnless(this, bigint.bigIntSupported, 'BigInt not supported in this Node.js version')

      it('should write a record w/ BigInt key', async function () {
        const key = new Aerospike.Key(helper.namespace, helper.set, BigInt(2) ** BigInt(63) - BigInt(1))
        const record = recgen.record({ i: valgen.integer(), s: valgen.string() })()

        await client.put(key, record)
        const result = await client.get(key)
        expect(result.bins).to.eql(record)
        await client.remove(key)
      })
    })

    it('should write a record w/ byte array key', function (done) {
      const key = keygen.bytes(helper.namespace, helper.set)()
      const record = recgen.record({ i: valgen.integer(), s: valgen.string() })()

      client.put(key, record, function (err, key) {
        if (err) throw err

        client.remove(key, function (err, key) {
          if (err) throw err
          done()
        })
      })
    })
  })

  context('bins with various data types', function () {
    const meta = { ttl: 600 }
    const policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE
    })

    function putGetVerify (bins, expected, done) {
      const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      client.put(key, bins, meta, policy, function (err) {
        if (err) throw err
        client.get(key, function (err, record) {
          if (err) throw err
          expect(record.bins).to.eql(expected)
          client.remove(key, done)
        })
      })
    }

    it('writes bin with string values and reads it back', function (done) {
      const record = { string: 'hello world' }
      const expected = { string: 'hello world' }
      putGetVerify(record, expected, done)
    })

    it('writes bin with integer values and reads it back', function (done) {
      const record = { low: Number.MIN_SAFE_INTEGER, high: Number.MAX_SAFE_INTEGER }
      const expected = { low: -9007199254740991, high: 9007199254740991 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with Buffer value and reads it back', function (done) {
      const record = { buffer: Buffer.from([0x61, 0x65, 0x72, 0x6f, 0x73, 0x70, 0x69, 0x6b, 0x65]) }
      const expected = { buffer: Buffer.from([0x61, 0x65, 0x72, 0x6f, 0x73, 0x70, 0x69, 0x6b, 0x65]) }
      putGetVerify(record, expected, done)
    })

    it('writes bin with float value as double and reads it back', function (done) {
      const record = { double: 3.141592653589793 }
      const expected = { double: 3.141592653589793 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with Double value as double and reads it back', function (done) {
      const record = { double: new Double(3.141592653589793) }
      const expected = { double: 3.141592653589793 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with GeoJSON value and reads it back as string', function (done) {
      const record = { geo: new GeoJSON.Point(103.8, 1.283) }
      const expected = { geo: '{"type":"Point","coordinates":[103.8,1.283]}' }
      putGetVerify(record, expected, done)
    })

    it('writes bin with array value as list and reads it back', function (done) {
      const record = {
        list: [
          1,
          'foo',
          1.23,
          new Double(3.14),
          Buffer.from('bar'),
          GeoJSON.Point(103.8, 1.283),
          [1, 2, 3],
          { a: 1, b: 2 },
          false
        ]
      }
      const expected = {
        list: [
          1,
          'foo',
          1.23,
          3.14,
          Buffer.from('bar'),
          '{"type":"Point","coordinates":[103.8,1.283]}',
          [1, 2, 3],
          { a: 1, b: 2 },
          false
        ]
      }
      putGetVerify(record, expected, done)
    })

    it('writes bin with object value as map and reads it back', function (done) {
      const record = {
        map: {
          a: 1,
          b: 'foo',
          c: 1.23,
          d: new Double(3.14),
          e: Buffer.from('bar'),
          f: GeoJSON.Point(103.8, 1.283),
          g: [1, 2, 3],
          h: { a: 1, b: 2 },
          i: true
        }
      }
      const expected = {
        map: {
          a: 1,
          b: 'foo',
          c: 1.23,
          d: 3.14,
          e: Buffer.from('bar'),
          f: '{"type":"Point","coordinates":[103.8,1.283]}',
          g: [1, 2, 3],
          h: { a: 1, b: 2 },
          i: true
        }
      }
      putGetVerify(record, expected, done)
    })

    it.skip('writes bin with Map value as map and reads it back', function (done) {
      const record = {
        map: new Map([['a', 1], ['b', 'foo'], ['c', 1.23],
          ['d', new Double(3.14)], ['e', Buffer.from('bar')], ['f', GeoJSON.Point(103.8, 1.283)],
          ['g', [1, 2, 3]], ['h', { a: 1, b: 2 }]])
      }
      const expected = {
        map: {
          a: 1,
          b: 'foo',
          c: 1.23,
          d: 3.14,
          e: Buffer.from('bar'),
          f: '{"type":"Point","coordinates":[103.8,1.283]}',
          g: [1, 2, 3],
          h: { a: 1, b: 2 }
        }
      }
      putGetVerify(record, expected, done)
    })

    context('BigInt values', function () {
      helper.skipUnless(this, bigint.bigIntSupported, 'BigInt not supported in this Node.js version')

      it('writes bin with BigInt value and reads it back as a Number', function (done) {
        const record = { bigint: BigInt(42) }
        const expected = { bigint: 42 }
        putGetVerify(record, expected, done)
      })

      it('writes bin with BigInt value outside safe Number range', function (done) {
        const tooLargeForNumber = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(2)
        const record = { bigint: tooLargeForNumber }
        const expected = { bigint: tooLargeForNumber }
        putGetVerify(record, expected, done)
      })
    })

    context('Boolean values', function () {
      helper.skipUnlessVersion('>= 5.6.0', this)

      it('writes bin with boolean value and reads it back', function (done) {
        const record = { bool: true, bool2: false }
        const expected = { bool: true, bool2: false }
        putGetVerify(record, expected, done)
      })
    })

    context('invalid bin values', function () {
      it('should fail with a parameter error when trying to write an undefined bin value', function (done) {
        const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
        const record = { valid: 123, invalid: undefined }

        client.put(key, record, function (err) {
          expect(err.code).to.equal(status.ERR_PARAM)

          client.remove(key, function (err, key) {
            expect(err.code).to.equal(status.ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })
    })
  })

  context('bin names', function () {
    helper.skipUnlessVersion('>= 4.2.0', this)

    it('should write a bin with a name of max. length 15', function () {
      const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      const bins = { 'bin-name-len-15': 'bin name with 15 chars' }

      return client.put(key, bins)
        .then(() => client.get(key))
        .then(record => {
          expect(record.bins).to.eql({
            'bin-name-len-15': 'bin name with 15 chars'
          })
        }).then(() => client.remove(key))
    })

    it('should return a parameter error when bin length exceeds 15 chars', function () {
      const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      const bins = { 'bin-name-size-16': 'bin name with 16 chars' }

      return client.put(key, bins)
        .then(() => 'no error')
        .catch(error => error)
        .then(error => {
          expect(error).to.be.instanceof(AerospikeError)
            .that.has.property('code', Aerospike.status.ERR_REQUEST_INVALID)
        })
    })
  })

  it('should delete a bin when writing null to it', async function () {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    const record = { bin1: 123, bin2: 456 }
    await client.put(key, record)

    const update = { bin1: null }
    await client.put(key, update)

    const result = await client.get(key)
    const expected = { bin2: 456 }
    expect(result.bins).to.eql(expected)
    await client.remove(key)
  })

  it('should write, read, write, and check gen', function (done) {
    const kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })
    const mgen = metagen.constant({ ttl: 1000 })
    const rgen = recgen.record({ i: valgen.integer(), s: valgen.string() })

    const key = kgen()
    const meta = mgen(key)
    const bins = rgen(key, meta)

    // write the record then check
    client.put(key, bins, meta, function (err, key1) {
      if (err) throw err
      expect(key1).to.eql(key)

      client.get(key1, function (err, record2) {
        if (err) throw err
        expect(record2.key).to.eql(key)
        expect(record2.bins).to.eql(bins)

        record2.bins.i++

        client.put(record2.key, record2.bins, meta, function (err, key3) {
          if (err) throw err
          expect(key3).to.eql(key)

          client.get(key3, function (err, record4) {
            if (err) throw err
            expect(record4.key).to.eql(key)
            expect(record4.bins).to.eql(record2.bins)
            expect(record4.gen).to.equal(record2.gen + 1)

            client.remove(key, function (err) {
              if (err) throw err
              done()
            })
          })
        })
      })
    })
  })

  it('should write, read, remove, read, write, and check gen', function (done) {
    const kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })
    const mgen = metagen.constant({ ttl: 1000 })
    const rgen = recgen.record({ i: valgen.integer(), s: valgen.string() })

    const key = kgen()
    const meta = mgen(key)
    const bins = rgen(key, meta)

    // write the record then check
    client.put(key, bins, meta, function (err, key1) {
      if (err) throw err
      expect(key1).to.eql(key)

      client.get(key1, function (err, record2) {
        if (err) throw err
        expect(record2.key).to.eql(key)
        expect(record2.bins).to.eql(bins)

        client.remove(record2.key, function (err, key3) {
          if (err) throw err
          expect(key3).to.eql(key)

          client.get(key3, function (err, record4) {
            expect(err.code).to.equal(status.ERR_RECORD_NOT_FOUND)

            client.put(record4.key, bins, meta, function (err, key5) {
              if (err) throw err
              expect(key5).to.eql(key)

              client.get(key5, function (err, record6) {
                if (err) throw err
                expect(record6.key).to.eql(key)
                expect(record6.bins).to.eql(bins)
                expect(record6.gen).to.equal(1)

                client.remove(record6.key, function (err) {
                  if (err) throw err
                  done()
                })
              })
            })
          })
        })
      })
    })
  })

  it('should fail with a parameter error if gen is invalid', function (done) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    const bins = recgen.record({ i: valgen.integer(), s: valgen.string() })()
    const meta = {
      gen: 'generation1'
    }

    client.put(key, bins, meta, error => {
      expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM)
      done()
    })
  })

  it('should fail with a parameter error if ttl is invalid', function (done) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    const bins = recgen.record({ i: valgen.integer(), s: valgen.string() })()
    const meta = {
      ttl: 'time-to-live'
    }

    client.put(key, bins, meta, error => {
      expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM)
      done()
    })
  })

  it('should write null for bins with empty list and map', function (done) {
    // generators
    const kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })
    const mgen = metagen.constant({ ttl: 1000 })
    const rgen = recgen.record({
      l: valgen.constant([1, 2, 3]),
      le: valgen.constant([]),
      m: valgen.constant({ a: 1, b: 2 }),
      me: valgen.constant({})
    })

    // values
    const key = kgen()
    const meta = mgen(key)
    const bins = rgen(key, meta)

    // write the record then check
    client.put(key, bins, meta, function (err, key1) {
      if (err) throw err
      expect(key1).to.eql(key)

      client.get(key1, function (err, record2) {
        if (err) throw err
        expect(record2.key).to.eql(key)
        expect(record2.bins).to.eql(bins)

        client.remove(key, function (err, key) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should write a key without set name', function (done) {
    const noSet = null
    const key = keygen.string(helper.namespace, noSet, { prefix: 'test/put/' })()
    const record = { bin1: 123, bin2: 456 }

    client.put(key, record, function (err) {
      if (err) throw err

      client.remove(key, function (err) {
        if (err) throw err
        done()
      })
    })
  })

  it('should write a map with undefined entry and verify the record', function (done) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    const record = {
      list: [1, 2, 3, undefined],
      map: { a: 1, b: 2, c: undefined }
    }

    client.put(key, record, function (err) {
      if (err) throw err

      client.get(key, function (err, record) {
        if (err) throw err
        expect(record.bins.map).to.eql({ a: 1, b: 2, c: null })
        expect(record.bins.list).to.eql([1, 2, 3, null])

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  context('exists policy', function () {
    context('policy.exists.UPDATE', function () {
      it('does not create a key that does not exist yet', function () {
        const key = keygen.integer(helper.namespace, helper.set)()
        const policy = new Aerospike.policy.WritePolicy({
          exists: Aerospike.policy.exists.UPDATE
        })

        return client.put(key, { i: 49 }, {}, policy)
          .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND))
          .then(() => client.exists(key))
          .then(exists => expect(exists).to.be.false())
      })
    })

    context('policy.exists.CREATE', function () {
      it('does not update a record if it already exists', function () {
        const key = keygen.integer(helper.namespace, helper.set)()
        const policy = new Aerospike.policy.WritePolicy({
          exists: Aerospike.policy.exists.CREATE
        })

        return client.put(key, { i: 49 }, {}, policy)
          .then(() => client.put(key, { i: 50 }, {}, policy))
          .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_EXISTS))
          .then(() => client.get(key))
          .then(record => expect(record.bins.i).to.equal(49))
      })
    })
  })

  context('gen policy', function () {
    it('updates record if generation matches', function () {
      const key = keygen.integer(helper.namespace, helper.set)()
      const policy = new Aerospike.WritePolicy({
        gen: Aerospike.policy.gen.EQ
      })

      return client.put(key, { i: 1 })
        .then(() => client.get(key))
        .then(record => expect(record.gen).to.equal(1))
        .then(() => client.put(key, { i: 2 }, { gen: 1 }, policy))
        .then(() => client.get(key))
        .then(record => {
          expect(record.bins).to.eql({ i: 2 })
          expect(record.gen).to.equal(2)
        })
        .then(() => client.remove(key))
    })

    it('does not update record if generation does not match', function () {
      const key = keygen.integer(helper.namespace, helper.set)()
      const policy = new Aerospike.WritePolicy({
        gen: Aerospike.policy.gen.EQ
      })

      return client.put(key, { i: 1 })
        .then(() => client.get(key))
        .then(record => expect(record.gen).to.equal(1))
        .then(() => client.put(key, { i: 2 }, { gen: 99 }, policy))
        .catch(err => expect(err.code).to.equal(status.ERR_RECORD_GENERATION))
        .then(() => client.get(key))
        .then(record => {
          expect(record.bins).to.eql({ i: 1 })
          expect(record.gen).to.equal(1)
        })
        .then(() => client.remove(key))
    })
  })
})
