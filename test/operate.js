// *****************************************************************************
// Copyright 2013-2021 Aerospike, Inc.
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
const Double = Aerospike.Double
const GeoJSON = Aerospike.GeoJSON
const helper = require('./test_helper')

const keygen = helper.keygen

const status = Aerospike.status
const AerospikeError = Aerospike.AerospikeError
const op = Aerospike.operations

context('Operations', function () {
  const client = helper.client
  let key = null

  beforeEach(() => {
    key = keygen.string(helper.namespace, helper.set, { prefix: 'test/operate' })()
    const bins = {
      string: 'abc',
      int: 123,
      double1: 1.23,
      double2: new Double(1.0),
      geo: new GeoJSON({ type: 'Point', coordinates: [103.913, 1.308] }),
      blob: Buffer.from('foo'),
      list: [1, 2, 3],
      map: { a: 1, b: 2, c: 3 }
    }
    const policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE
    })
    const meta = { ttl: 60 }
    return client.put(key, bins, meta, policy)
  })

  afterEach(() =>
    client.remove(key)
      .catch((error) => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND))
  )

  describe('Client#operate()', function () {
    describe('operations.write()', function () {
      it('writes a new value to a bin', function () {
        const ops = [
          op.write('string', 'def'),
          op.write('int', 432),
          op.write('double1', 2.34),
          op.write('double2', new Double(2.0)),
          op.write('geo', new GeoJSON({ type: 'Point', coordinates: [123.456, 1.308] })),
          op.write('blob', Buffer.from('bar')),
          op.write('list', [2, 3, 4]),
          op.write('map', { d: 4, e: 5, f: 6 }),
          op.write('boolean', true)
        ]

        return client.operate(key, ops)
          .then(() => client.get(key))
          .then(record => {
            expect(record.bins.string).to.equal('def')
            expect(record.bins.int).to.equal(432)
            expect(record.bins.double1).to.equal(2.34)
            expect(record.bins.double2).to.equal(2.0)
            expect(new GeoJSON(record.bins.geo).toJSON()).to.eql(
              { type: 'Point', coordinates: [123.456, 1.308] }
            )
            expect(record.bins.blob.equals(Buffer.from('bar'))).to.be.ok()
            expect(record.bins.list).to.eql([2, 3, 4])
            expect(record.bins.map).to.eql({ d: 4, e: 5, f: 6 })
            expect(record.bins.boolean).to.eql(true)
          })
      })

      it('deletes a bin by writing null to it', function () {
        const ops = [
          op.write('string', null)
        ]

        return client.operate(key, ops)
          .then(() => client.get(key))
          .then(record => {
            expect(record.bins).to.not.have.key('string')
          })
      })
    })

    describe('operations.add()', function () {
      it('adds an integer value to a bin', function () {
        const ops = [
          op.add('int', 432)
        ]

        return client.operate(key, ops)
          .then(() => client.get(key))
          .then(record => {
            expect(record.bins.int).to.equal(555)
          })
      })

      it('adds a double value to a bin', function () {
        const ops = [
          op.add('double1', 3.45),
          op.add('double2', new Double(3.14159))
        ]

        return client.operate(key, ops)
          .then(() => client.get(key))
          .then(record => {
            expect(record.bins.double1).to.equal(4.68)
            expect(record.bins.double2).to.equal(4.14159)
          })
      })

      it('can be called using the "incr" alias', function () {
        const ops = [
          op.incr('int', 432)
        ]

        return client.operate(key, ops)
          .then(() => client.get(key))
          .then(record => {
            expect(record.bins.int).to.equal(555)
          })
      })

      it('returns a parameter error when trying to add a string value', function () {
        const ops = [
          op.add('int', 'abc')
        ]

        return client.operate(key, ops)
          .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM))
      })
    })

    describe('operations.append()', function () {
      it('appends a string value to a string bin', function () {
        const ops = [
          op.append('string', 'def')
        ]

        return client.operate(key, ops)
          .then(() => client.get(key))
          .then(record => {
            expect(record.bins.string).to.equal('abcdef')
          })
      })

      it('returns a parameter error when trying to append a numeric value', function () {
        const ops = [
          op.append('string', 123)
        ]

        return client.operate(key, ops)
          .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM))
      })
    })

    describe('operations.prepend()', function () {
      it('prepends a string value to a string bin', function () {
        const ops = [
          op.prepend('string', 'def')
        ]

        return client.operate(key, ops)
          .then(() => client.get(key))
          .then(record => {
            expect(record.bins.string).to.equal('defabc')
          })
      })

      it('returns a parameter error when trying to prepend a numeric value', function () {
        const ops = [
          op.prepend('string', 123)
        ]

        return client.operate(key, ops)
          .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_PARAM))
      })
    })

    describe('operations.touch()', function () {
      // TEST LOGIC
      // 1. Write a record to an aerospike server.
      // 2. Read the record to get the TTL and calculate the difference in
      //    the TTL written and the TTL returned by server.
      // 3. Touch the record with a defined TTL.
      // 4. Read the record and calculate the difference in the TTL between the
      //    touch TTL value and read TTL value.
      // 5. Compare the difference with the earlier difference observed.
      // 6. This is to account for the clock asynchronicity between the
      //    client and the server machines.
      // 7. Server returns the timestamp at which the record expires
      //    according the server clock.
      // 8. The client calculates and returns the TTL based on the returned
      //    timestamp. In case the client and server clocks are not in sync,
      //    the calculated TTL may seem to be inaccurate. Nevertheless, the
      //    server will expire the record at the correct time.
      it('updates the record\'s time-to-live (TTL)', async function () {
        const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/operate/ttl' })()
        const bins = { i: 123, s: 'abc' }
        const meta = { ttl: 1000 }

        await client.put(key, bins, meta)

        let record = await client.get(key)
        const ttlDiff = record.ttl - meta.ttl

        const ops = [
          op.touch(2592000) // 30 days
        ]
        await client.operate(key, ops)

        record = await client.get(key)
        expect(record.ttl).to.be.above(2592000 + ttlDiff - 10)
        expect(record.ttl).to.be.below(2592000 + ttlDiff + 10)

        await client.remove(key)
      })
    })

    describe('operations.delete()', function () {
      helper.skipUnlessVersion('>= 4.7.0', this)

      it('deletes the record', function () {
        const ops = [op.delete()]
        return client.operate(key, ops)
          .then(() => client.exists(key))
          .then((exists) => expect(exists).to.be.false)
      })

      it('performs an atomic read-and-delete', function () {
        const ops = [
          op.read('string'),
          op.delete()
        ]
        return client.operate(key, ops)
          .then((result) => expect(result.bins.string).to.eq('abc'))
          .then(() => client.exists(key))
          .then((exists) => expect(exists).to.be.false)
      })
    })

    context('with OperatePolicy', function () {
      context('exists policy', function () {
        context('policy.exists.UPDATE', function () {
          const policy = new Aerospike.policy.OperatePolicy({
            exists: Aerospike.policy.exists.UPDATE
          })

          it('does not create a key that does not exist yet', function () {
            const notExistentKey = keygen.string(helper.namespace, helper.set, { prefix: 'test/operate/doesNotExist' })()
            const ops = [op.write('i', 49)]

            return client.operate(notExistentKey, ops, {}, policy)
              .then(() => 'error expected')
              .catch(error => expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND))
              .then(() => client.exists(notExistentKey))
              .then(exists => expect(exists).to.be.false())
          })
        })
      })

      context('gen policy', function () {
        context('policy.gen.EQ', function () {
          const policy = new Aerospike.OperatePolicy({
            gen: Aerospike.policy.gen.EQ
          })

          it('executes the operation if the generation matches', function () {
            const ops = [op.add('int', 7)]
            const meta = { gen: 1 }

            return client.operate(key, ops, meta, policy)
              .then(() => client.get(key))
              .then(record => expect(record.bins.int).to.equal(130))
          })

          it('rejects the operation if the generation does not match', function () {
            const ops = [op.add('int', 7)]
            const meta = { gen: 99 }

            return client.operate(key, ops, meta, policy)
              .then(() => 'error expected')
              .catch(error => {
                expect(error).to.be.instanceof(AerospikeError)
                  .with.property('code', status.ERR_RECORD_GENERATION)
                return Promise.resolve(true)
              })
              .then(() => client.get(key))
              .then(record => expect(record.bins.int).to.equal(123))
          })
        })
      })

      context('with deserialize: false', function () {
        const policy = new Aerospike.OperatePolicy({
          deserialize: false
        })

        it('returns list and map bins as byte buffers', function () {
          const ops = [op.read('int'), op.read('list'), op.read('map')]

          return client.operate(key, ops, null, policy)
            .then(record => {
              expect(record.bins.int).to.equal(123)
              expect(record.bins.list).to.eql(Buffer.from([0x93, 0x01, 0x02, 0x03]))
              expect(record.bins.map).to.eql(Buffer.from([0x83, 0xa2, 0x03, 0x63, 0x03, 0xa2, 0x03, 0x61, 0x01, 0xa2, 0x03, 0x62, 0x02]))
            })
        })
      })
    })

    it('calls the callback function with the results of the operation', function (done) {
      const ops = [
        op.read('int')
      ]

      client.operate(key, ops, (error, result) => {
        if (error) throw error
        expect(result.bins.int).to.equal(123)
        done()
      })
    })
  })

  describe('Client#add', function () {
    it('acts as a shortcut for the add operation', function () {
      return client.add(key, { int: 234 })
        .then(() => client.get(key))
        .then(record => {
          expect(record.bins.int).to.equal(357)
        })
    })
  })

  describe('Client#incr', function () {
    it('acts as a shortcut for the add operation', function () {
      return client.incr(key, { int: 234 })
        .then(() => client.get(key))
        .then(record => {
          expect(record.bins.int).to.equal(357)
        })
    })
  })

  describe('Client#append', function () {
    it('acts as a shortcut for the append operation', function () {
      return client.append(key, { string: 'def' })
        .then(() => client.get(key))
        .then(record => {
          expect(record.bins.string).to.equal('abcdef')
        })
    })
  })

  describe('Client#prepend', function () {
    it('acts as a shortcut for the prepend operation', function () {
      return client.prepend(key, { string: 'def' })
        .then(() => client.get(key))
        .then(record => {
          expect(record.bins.string).to.equal('defabc')
        })
    })
  })
})
