// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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

import Aerospike, { status as statusModule, AerospikeError as ASError, Double as Doub, GeoJSON as GJ, Client as Cli, RecordMetadata, AerospikeBins, AerospikeRecord, Key, WritePolicy, Bin} from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const keygen: any = helper.keygen
const metagen: any = helper.metagen
const recgen: any = helper.recgen
const valgen: any = helper.valgen

const status: typeof statusModule = Aerospike.status
const AerospikeError: typeof ASError = Aerospike.AerospikeError
const Double: typeof Doub = Aerospike.Double
const GeoJSON: typeof GJ = Aerospike.GeoJSON


describe('client.put()', function () {
  const client: Cli = helper.client

  it('should write and validate records', function (done) {
    const meta: RecordMetadata = { ttl: 1000 }
    const putAndGet: Function = function (key: Key, bins: AerospikeBins, cb: Function) {
      client.put(key, bins, meta, function (err?: ASError) {
        if (err) throw err
        client.get(key, function (err?: ASError, record?: AerospikeRecord) {
          if (err) throw err
          expect(bins).to.eql(record?.bins)
          cb()
        })
      })
    }

    const kgen: Function = keygen.string(helper.namespace, helper.set, {
      prefix: 'test/put/putAndGet/',
      random: false
    })
    const rgen: Function = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })
    const total: number = 50
    let count: number = 0

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
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      const record: AerospikeRecord = recgen.record({ i: valgen.integer(), s: valgen.string() })()

      client.put(key, record, function (err?: ASError) {
        if (err) throw err

        client.remove(key, function (err?: ASError) {
          if (err) throw err
          done()
        })
      })
    })

    it('should write a record w/ integer key', function (done) {
      const key: Key = keygen.integer(helper.namespace, helper.set)()
      const record: AerospikeRecord = recgen.record({ i: valgen.integer(), s: valgen.string() })()

      client.put(key, record, function (err?: ASError) {
        if (err) throw err

        client.remove(key, function (err?: ASError) {
          if (err) throw err
          done()
        })
      })
    })

    context('BigInt keys', function () {

      it('should write a record w/ BigInt key', async function () {
        const key: Key = new Aerospike.Key(helper.namespace, helper.set, BigInt(2) ** BigInt(63) - BigInt(1))
        const record: AerospikeRecord = recgen.record({ i: valgen.integer(), s: valgen.string() })()

        await client.put(key, record)
        const result = await client.get(key)
        expect(result.bins).to.eql(record)
        await client.remove(key)
      })
    })

    it('should write a record w/ byte array key', function (done) {
      const key: Key = keygen.bytes(helper.namespace, helper.set)()
      const record: AerospikeRecord = recgen.record({ i: valgen.integer(), s: valgen.string() })()

      client.put(key, record, function (err?: ASError) {
        if (err) throw err

        client.remove(key, function (err?: ASError) {
          if (err) throw err
          done()
        })
      })
    })
  })

  context('bins with various data types', function () {
    const meta: RecordMetadata = { ttl: 600 }
    const policy: WritePolicy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE
    })

    function putGetVerify (bins: AerospikeBins | Bin, expected: AerospikeBins, done: any) {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      client.put(key, bins, meta, policy, function (err?: ASError) {
        if (err) throw err
        client.get(key, function (err?: ASError, record?: AerospikeRecord) {
          if (err) throw err
          expect(record?.bins).to.eql(expected)
          client.remove(key, done)
        })
      })
    }

    it('writes bin with string values and reads it back', function (done) {
      const record: AerospikeBins = { string: 'hello world' }
      const expected: AerospikeBins = { string: 'hello world' }
      putGetVerify(record, expected, done)
    })

    it('writes bin with integer values and reads it back', function (done) {
      const record: AerospikeBins = { low: Number.MIN_SAFE_INTEGER, high: Number.MAX_SAFE_INTEGER }
      const expected: AerospikeBins = { low: -9007199254740991, high: 9007199254740991 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with Buffer value and reads it back', function (done) {
      const record: AerospikeBins = { buffer: Buffer.from([0x61, 0x65, 0x72, 0x6f, 0x73, 0x70, 0x69, 0x6b, 0x65]) }
      const expected: AerospikeBins = { buffer: Buffer.from([0x61, 0x65, 0x72, 0x6f, 0x73, 0x70, 0x69, 0x6b, 0x65]) }
      putGetVerify(record, expected, done)
    })

    it('writes bin with float value as double and reads it back', function (done) {
      const record: AerospikeBins = { double: 3.141592653589793 }
      const expected: AerospikeBins = { double: 3.141592653589793 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with Double value as double and reads it back', function (done) {
      const record: AerospikeBins = { double: new Double(3.141592653589793) }
      const expected: AerospikeBins = { double: 3.141592653589793 }
      putGetVerify(record, expected, done)
    })

    it('writes bin with GeoJSON value and reads it back as string', function (done) {
      const record: AerospikeBins = { geo: new GeoJSON.Point(103.8, 1.283) }
      const expected: AerospikeBins = { geo: '{"type":"Point","coordinates":[103.8,1.283]}' }
      putGetVerify(record, expected, done)
    })

    it('writes bin with array value as list and reads it back', function (done) {
      const record: AerospikeBins = {
        list: [
          1,
          'foo',
          1.23,
          new Double(3.14),
          Buffer.from('bar'),
          new GeoJSON.Point(103.8, 1.283),
          [1, 2, 3],
          { a: 1, b: 2 },
          false
        ]
      }
      const expected: AerospikeBins = {
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
      const record: AerospikeBins = {
        map: {
          a: 1,
          b: 'foo',
          c: 1.23,
          d: new Double(3.14),
          e: Buffer.from('bar'),
          f: new GeoJSON.Point(103.8, 1.283),
          g: [1, 2, 3],
          h: { a: 1, b: 2 },
          i: true
        }
      }
      const expected: AerospikeBins = {
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

    it('writes bin with Map value as map and reads it back as an ordered object', function (done) {
      const record: AerospikeBins = {
        map: new Map<string, any>([['g', [1, 2, 3]], ['h', { a: 1, b: 2 }], ['j', new Map<any, any>([['b', 'foo'], ['a', 1]])],
          ['d', new Double(3.14)], ['e', Buffer.from('bar')], ['f', new GeoJSON.Point(103.8, 1.283)],
          ['a', 1], ['b', 'foo'], ['c', 1.23]]
        )
      }
      const expected: AerospikeBins = {
        map: {
          a: 1,
          b: 'foo',
          c: 1.23,
          d: 3.14,
          e: Buffer.from('bar'),
          f: '{"type":"Point","coordinates":[103.8,1.283]}',
          g: [1, 2, 3],
          h: { a: 1, b: 2 },
          j: { a: 1, b: 'foo' }
        }
      }
      putGetVerify(record, expected, done)
    })

    it('writes bin with the Bin class and reads it back as an object', function (done) {
      const record: Bin = new Aerospike.Bin('map', {
        g: [1, 2, 3],
        h: { a: 1, b: 2 },
        j: new Map<string, any>([['b', 'foo'], ['a', 1]]),
        e: Buffer.from('bar'),
        f: '{"type":"Point","coordinates":[103.8,1.283]}',
        a: 1,
        b: 'foo',
        c: 1.23,
        d: 3.14
      })
      const expected: AerospikeBins = {
        map: {
          a: 1,
          b: 'foo',
          c: 1.23,
          d: 3.14,
          e: Buffer.from('bar'),
          f: '{"type":"Point","coordinates":[103.8,1.283]}',
          g: [1, 2, 3],
          h: { a: 1, b: 2 },
          j: { a: 1, b: 'foo' }
        }
      }
      putGetVerify(record, expected, done)
    })

    context('BigInt values', function () {

      it('writes bin with BigInt value and reads it back as a Number', function (done) {
        const record: AerospikeBins = { bigint: BigInt(42) }
        const expected: AerospikeBins = { bigint: 42 }
        putGetVerify(record, expected, done)
      })

      it('writes bin with BigInt value outside safe Number range', function (done) {
        const tooLargeForNumber: BigInt = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(2)
        const record: AerospikeBins = { bigint: tooLargeForNumber }
        const expected: AerospikeBins = { bigint: tooLargeForNumber }
        putGetVerify(record, expected, done)
      })
    })

    context('Boolean values', function () {
      helper.skipUnlessVersion('>= 5.6.0', this)

      it('writes bin with boolean value and reads it back', function (done) {
        const record: AerospikeBins = { bool: true, bool2: false }
        const expected: AerospikeBins = { bool: true, bool2: false }
        putGetVerify(record, expected, done)
      })
    })

    context('invalid bin values', function () {
      it('should fail with a parameter error when trying to write an undefined bin value', function (done) {
        const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
        const record: AerospikeBins = { valid: 123, invalid: undefined }

        client.put(key, record, function (err?: ASError) {
          expect(err?.code).to.equal(status.ERR_PARAM)

          client.remove(key, function (err?: ASError) {
            expect(err?.code).to.equal(status.ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })
    })
  })

  context('bin names', function () {
    helper.skipUnlessVersion('>= 4.2.0', this)

    it('should write a bin with a name of max. length 15', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      const bins: any = { 'bin-name-len-15': 'bin name with 15 chars' }

      return client.put(key, bins)
        .then(() => client.get(key))
        .then((record: AerospikeRecord) => {
          expect(record.bins).to.eql({
            'bin-name-len-15': 'bin name with 15 chars'
          })
        }).then(() => client.remove(key))
    })

    it('should return a parameter error when bin length exceeds 15 chars', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
      const bins: AerospikeBins = { 'bin-name-size-16': 'bin name with 16 chars' }

      return client.put(key, bins)
        .then(() => 'no error')
        .catch((error: any) => error)
        .then((error: any) => {
          expect(error).to.be.instanceof(AerospikeError)
            .that.has.property('code', Aerospike.status.ERR_REQUEST_INVALID)
        })
    })
  })

  it('should delete a bin when writing null to it', async function () {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    const record: AerospikeBins = { bin1: 123, bin2: 456 }
    await client.put(key, record)

    const update: AerospikeBins = { bin1: null }
    await client.put(key, update)

    const result: AerospikeRecord = await client.get(key)
    const expected: AerospikeBins = { bin2: 456 }
    expect(result.bins).to.eql(expected)
    await client.remove(key)
  })

  it('should write, read, write, and check gen', function (done) {
    const kgen: Function = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })
    const mgen: Function = metagen.constant({ ttl: 1000 })
    const rgen: Function = recgen.record({ i: valgen.integer(), s: valgen.string() })

    const key: Key = kgen()
    const meta: RecordMetadata = mgen(key)
    const bins: AerospikeBins = rgen(key, meta)

    // write the record then check
    client.put(key, bins, meta, function (err?: ASError, key1?: Key) {
      if (err) throw err
      expect(key1!).to.eql(key)

      client.get(key1!, function (err?: ASError, record2?: AerospikeRecord) {
        if (err) throw err
        expect(record2?.key).to.eql(key)
        expect(record2?.bins).to.eql(bins)

        record2!.bins.i = (record2!.bins.i as number) + 1;

        client.put(record2?.key!, record2?.bins!, meta, function (err?: ASError, key3?: Key) {
          if (err) throw err
          expect(key3).to.eql(key)

          client.get(key3!, function (err?: ASError, record4?: AerospikeRecord) {
            if (err) throw err
            expect(record4?.key).to.eql(key)
            expect(record4?.bins).to.eql(record2?.bins)
            expect(record4?.gen!).to.equal(record2?.gen! + 1)

            client.remove(key, function (err?: ASError) {
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
    client.put(key, bins, meta, function (err?: ASError, key1?: Key) {
      if (err) throw err
      expect(key1!).to.eql(key)

      client.get(key1!, function (err?: ASError, record2?: AerospikeRecord) {
        if (err) throw err
        expect(record2?.key).to.eql(key)
        expect(record2?.bins).to.eql(bins)

        client.remove(record2?.key!, function (err?: ASError, key3?: Key) {
          if (err) throw err
          expect(key3).to.eql(key)

          client.get(key3!, function (err?: ASError, record4?: AerospikeRecord) {
            expect(err?.code).to.eql(status.ERR_RECORD_NOT_FOUND)

            client.put(record4?.key!, bins, meta, function (err?: ASError, key5?: Key) {
              if (err) throw err
              expect(key5!).to.eql(key)

              client.get(key5!, function (err?: ASError, record6?: AerospikeRecord) {
                if (err) throw err
                expect(record6?.key).to.eql(key)
                expect(record6?.bins).to.eql(bins)
                expect(record6?.gen).to.eql(1)

                client.remove(record6?.key!, function (err?: ASError) {
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
  /*
  it('should fail with a parameter error if gen is invalid', function (done) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    const bins = recgen.record({ i: valgen.integer(), s: valgen.string() })()
    const meta = {
      gen: 'generation1'
    }

    client.put(key, bins, meta, (error: any) => {
      expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM)
      done()
    })
  })
  */
  /*
  it('should fail with a parameter error if ttl is invalid', function (done) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    const bins = recgen.record({ i: valgen.integer(), s: valgen.string() })()
    const meta = {
      ttl: 'time-to-live'
    }

    client.put(key, bins, meta, (error: any) => {
      expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM)
      done()
    })
  })
  */

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
    client.put(key, bins, meta, function (err?: ASError, key1?: Key) {
      if (err) throw err
      expect(key1!).to.eql(key)

      client.get(key1!, function (err?: ASError, record2?: AerospikeRecord) {
        if (err) throw err
        expect(record2?.key).to.eql(key)
        expect(record2?.bins).to.eql(bins)

        client.remove(key, function (err?: ASError) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should write a key without set name', function (done) {
    const noSet: null = null
    const key: Key = keygen.string(helper.namespace, noSet, { prefix: 'test/put/' })()
    const record: AerospikeBins = { bin1: 123, bin2: 456 }

    client.put(key, record, function (err?: ASError) {
      if (err) throw err

      client.remove(key, function (err?: ASError) {
        if (err) throw err
        done()
      })
    })
  })

  it('should write a map with undefined entry and verify the record', function (done) {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/put/' })()
    const record: AerospikeBins = {
      list: [1, 2, 3, undefined],
      map: { a: 1, b: 2, c: undefined }
    }

    client.put(key, record, function (err?: ASError) {
      if (err) throw err

      client.get(key, function (err?: ASError, record?: AerospikeRecord) {
        if (err) throw err
        expect(record?.bins.map).to.eql({ a: 1, b: 2, c: null })
        expect(record?.bins.list).to.eql([1, 2, 3, null])

        client.remove(key, function (err?: ASError) {
          if (err) throw err
          done()
        })
      })
    })
  })

  context('exists policy', function () {
    context('policy.exists.UPDATE', function () {
      it('does not create a key that does not exist yet', function () {
        const key: Key = keygen.integer(helper.namespace, helper.set)()
        const policy: WritePolicy = new Aerospike.policy.WritePolicy({
          exists: Aerospike.policy.exists.UPDATE
        })

        return client.put(key, { i: 49 }, {}, policy)
          .catch((error: any) => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND))
          .then(() => client.exists(key))
          .then((exists: any) => expect(exists).to.be.false)
      })
    })

    context('policy.exists.CREATE', function () {
      it('does not update a record if it already exists', function () {
        const key: any = keygen.integer(helper.namespace, helper.set)()
        const policy: any = new Aerospike.policy.WritePolicy({
          exists: Aerospike.policy.exists.CREATE
        })

        return client.put(key, { i: 49 }, {}, policy)
          .then(() => client.put(key, { i: 50 }, {}, policy))
          .catch((error: any) => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_EXISTS))
          .then(() => client.get(key))
          .then((record: AerospikeRecord) => expect(record.bins.i).to.equal(49))
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
        .then((record: AerospikeRecord) => expect(record.gen).to.equal(1))
        .then(() => client.put(key, { i: 2 }, { gen: 1 }, policy))
        .then(() => client.get(key))
        .then((record: AerospikeRecord) => {
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
        .then((record: AerospikeRecord) => expect(record.gen).to.equal(1))
        .then(() => client.put(key, { i: 2 }, { gen: 99 }, policy))
        .catch((err: any) => expect(err.code).to.equal(status.ERR_RECORD_GENERATION))
        .then(() => client.get(key))
        .then((record: AerospikeRecord) => {
          expect(record.bins).to.eql({ i: 1 })
          expect(record.gen).to.equal(1)
        })
        .then(() => client.remove(key))
    })
  })
})
