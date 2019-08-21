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

describe('client.put()', function () {
  var client = helper.client

  it('should write and validate records', function (done) {
    var meta = { ttl: 1000 }
    var putAndGet = function (key, bins, cb) {
      client.put(key, bins, meta, function (err) {
        if (err) throw err
        client.get(key, function (err, record) {
          if (err) throw err
          expect(bins).to.eql(record.bins)
          cb()
        })
      })
    }

    var kgen = keygen.string(helper.namespace, helper.set, {
      prefix: 'test/put/putAndGet/',
      random: false
    })
    var rgen = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })
    var total = 50
    var count = 0

    for (var i = 0; i < total; i++) {
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
      var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      var record = recgen.record({ i: valgen.integer(), s: valgen.string() })()

      client.put(key, record, function (err) {
        if (err) throw err

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })

    it('should write a record w/ integer key', function (done) {
      var key = keygen.integer(helper.namespace, helper.set)()
      var record = recgen.record({ i: valgen.integer(), s: valgen.string() })()

      client.put(key, record, function (err) {
        if (err) throw err

        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })

    it('should write a record w/ byte array key', function (done) {
      var key = keygen.bytes(helper.namespace, helper.set)()
      var record = recgen.record({ i: valgen.integer(), s: valgen.string() })()

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
      var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
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
      var record = { string: 'hello world' }
      var expected = { string: 'hello world' }
      putGetVerify(record, expected, done)
    })

    it('writes bin with integer values and reads it back', function (done) {
      var record = { low: Number.MIN_SAFE_INTEGER, high: Number.MAX_SAFE_INTEGER }
      var expected = { low: -9007199254740991, high: 9007199254740991 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with Buffer value and reads it back', function (done) {
      var record = { buffer: Buffer.from([0x61, 0x65, 0x72, 0x6f, 0x73, 0x70, 0x69, 0x6b, 0x65]) }
      var expected = { buffer: Buffer.from([0x61, 0x65, 0x72, 0x6f, 0x73, 0x70, 0x69, 0x6b, 0x65]) }
      putGetVerify(record, expected, done)
    })

    it('writes bin with float value as double and reads it back', function (done) {
      var record = { double: 3.141592653589793 }
      var expected = { double: 3.141592653589793 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with Double value as double and reads it back', function (done) {
      var record = { double: new Double(3.141592653589793) }
      var expected = { double: 3.141592653589793 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with GeoJSON value and reads it back as string', function (done) {
      var record = { geo: new GeoJSON.Point(103.8, 1.283) }
      var expected = { geo: '{"type":"Point","coordinates":[103.8,1.283]}' }
      putGetVerify(record, expected, done)
    })

    it('writes bin with array value as list and reads it back', function (done) {
      var record = {
        list: [1, 'foo', 1.23, new Double(3.14), Buffer.from('bar'),
          GeoJSON.Point(103.8, 1.283), [1, 2, 3], { a: 1, b: 2 }]
      }
      var expected = {
        list: [1, 'foo', 1.23, 3.14, Buffer.from('bar'),
          '{"type":"Point","coordinates":[103.8,1.283]}', [1, 2, 3], { a: 1, b: 2 }]
      }
      putGetVerify(record, expected, done)
    })

    it('writes bin with object value as map and reads it back', function (done) {
      var record = {
        map: {
          a: 1,
          b: 'foo',
          c: 1.23,
          d: new Double(3.14),
          e: Buffer.from('bar'),
          f: GeoJSON.Point(103.8, 1.283),
          g: [1, 2, 3],
          h: { a: 1, b: 2 }
        }
      }
      var expected = {
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

    it.skip('writes bin with Map value as map and reads it back', function (done) {
      var record = {
        map: new Map([['a', 1], ['b', 'foo'], ['c', 1.23],
          ['d', new Double(3.14)], ['e', Buffer.from('bar')], ['f', GeoJSON.Point(103.8, 1.283)],
          ['g', [1, 2, 3]], ['h', { a: 1, b: 2 }]])
      }
      var expected = {
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

    context('invalid bin values', function () {
      it('should fail with a parameter error when trying to write an undefined bin value', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
        var record = { valid: 123, invalid: undefined }

        client.put(key, record, function (err) {
          expect(err.code).to.equal(status.ERR_PARAM)

          client.remove(key, function (err, key) {
            expect(err.code).to.equal(status.ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })

      it('should fail with a parameter error when trying to write a boolean bin value', function (done) {
        var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
        var record = { valid: 'true', invalid: true }

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

  it('should delete a bin when writing null to it', function (done) {
    var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    var record = { bin1: 123, bin2: 456 }
    client.put(key, record, function (err) {
      if (err) throw err

      var update = { bin1: null }
      client.put(key, update, function (err, result) {
        if (err) throw err

        client.get(key, function (err, record) {
          if (err) throw err
          var expected = { bin2: 456 }
          expect(record.bins).to.eql(expected)

          client.remove(key, function (err) {
            if (err) throw err
            done()
          })
        })
      })
    })
  })

  it('should write, read, write, and check gen', function (done) {
    var kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })
    var mgen = metagen.constant({ ttl: 1000 })
    var rgen = recgen.record({ i: valgen.integer(), s: valgen.string() })

    var key = kgen()
    var meta = mgen(key)
    var bins = rgen(key, meta)

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
    var kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })
    var mgen = metagen.constant({ ttl: 1000 })
    var rgen = recgen.record({ i: valgen.integer(), s: valgen.string() })

    var key = kgen()
    var meta = mgen(key)
    var bins = rgen(key, meta)

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
    var kgen = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })
    var mgen = metagen.constant({ ttl: 1000 })
    var rgen = recgen.record({
      l: valgen.constant([1, 2, 3]),
      le: valgen.constant([]),
      m: valgen.constant({ a: 1, b: 2 }),
      me: valgen.constant({})
    })

    // values
    var key = kgen()
    var meta = mgen(key)
    var bins = rgen(key, meta)

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
    var noSet = null
    var key = keygen.string(helper.namespace, noSet, { prefix: 'test/put/' })()
    var record = { bin1: 123, bin2: 456 }

    client.put(key, record, function (err) {
      if (err) throw err

      client.remove(key, function (err) {
        if (err) throw err
        done()
      })
    })
  })

  it('should write a map with undefined entry and verify the record', function (done) {
    var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    var record = {
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
