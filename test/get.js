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

const status = Aerospike.status

describe('client.get()', function () {
  var client = helper.client

  it('should read the record', function (done) {
    var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })()
    var meta = metagen.constant({ ttl: 1000 })()
    var record = recgen.constant({ i: 123, s: 'abc' })()

    client.put(key, record, meta, function (err) {
      if (err) throw err
      client.get(key, function (err, record) {
        if (err) throw err
        client.remove(key, function (err, key) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should not find the record', function (done) {
    var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/not_found/' })()

    client.get(key, function (err, record) {
      expect(err.code).to.equal(status.ERR_RECORD_NOT_FOUND)
      done()
    })
  })

  context('with ReadPolicy', function () {
    context('with deserialize: false', function () {
      it('should return lists and maps as raw bytes', function () {
        const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })()
        const bins = {
          i: 123,
          s: 'abc',
          l: [1, 2, 3],
          m: { a: 1, b: 2, c: 3 }
        }
        const policy = new Aerospike.ReadPolicy({
          deserialize: false
        })

        return client.put(key, bins)
          .then(() => client.get(key, policy))
          .then(record => {
            const bins = record.bins
            expect(bins.i).to.eql(123)
            expect(bins.s).to.eql('abc')
            expect(bins.l).to.eql(Buffer.from([0x93, 0x01, 0x02, 0x03]))
            expect(bins.m).to.eql(Buffer.from([0x83, 0xa2, 0x03, 0x63, 0x03, 0xa2, 0x03, 0x61, 0x01, 0xa2, 0x03, 0x62, 0x02]))
          })
      })
    })
  })

  it('should return the TTL for a never expiring record as Aerospike.ttl.NEVER_EXPIRE', function (done) {
    var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })()
    var meta = metagen.constant({ ttl: Aerospike.ttl.NEVER_EXPIRE })()
    var record = recgen.constant({ i: 123, s: 'abc' })()

    client.put(key, record, meta, function (err) {
      if (err) throw err
      client.get(key, function (err, record) {
        if (err) throw err
        expect(record.ttl).to.equal(Aerospike.ttl.NEVER_EXPIRE)
        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should return a Promise that resolves to a Record', function () {
    var key = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })()

    return client.put(key, { i: 42 })
      .then(() => client.get(key))
      .then(record => expect(record.bins).to.eql({ i: 42 }))
      .then(() => client.remove(key))
  })

  it('fetches a record given the digest', function () {
    const key = new Aerospike.Key('test', 'test', 'digestOnly')
    client.put(key, { foo: 'bar' })
      .then(() => {
        const digest = key.digest
        const key2 = new Aerospike.Key('test', null, null, digest)
        return client.get(key2)
          .then(record => expect(record.bins.foo).to.equal('bar'))
      })
  })
})
