// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

/* global expect, describe, it */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen

const status = Aerospike.status
const policy = Aerospike.policy

describe('client.get()', function () {
  var client = helper.client

  it('should read the record', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})()
    var meta = metagen.constant({ttl: 1000})()
    var record = recgen.constant({i: 123, s: 'abc'})()

    client.put(key, record, meta, function (err) {
      if (err) throw err
      client.get(key, function (err, record, metadata, key) {
        if (err) throw err
        client.remove(key, function (err, key) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should not find the record', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/not_found/'})()

    client.get(key, function (err, record) {
      expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
      done()
    })
  })

  it('should read the record with a key send policy', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})()
    var meta = metagen.constant({ttl: 1000})()
    var record = recgen.constant({i: 123, s: 'abc'})()
    var pol = { key: policy.key.SEND }

    client.put(key, record, meta, function (err, key) {
      if (err) throw err
      client.get(key, pol, function (err, record, metadata, key) {
        if (err) throw err
        client.remove(key, function (err, key) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should return the TTL for a never expiring record as Aerospike.ttl.NEVER_EXPIRE', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})()
    var meta = metagen.constant({ttl: Aerospike.ttl.NEVER_EXPIRE})()
    var record = recgen.constant({i: 123, s: 'abc'})()

    client.put(key, record, meta, function (err) {
      if (err) throw err
      client.get(key, function (err, record, meta) {
        if (err) throw err
        expect(meta.ttl).to.be(Aerospike.ttl.NEVER_EXPIRE)
        client.remove(key, function (err) {
          if (err) throw err
          done()
        })
      })
    })
  })
})
