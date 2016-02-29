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
const valgen = helper.valgen

const status = Aerospike.status

describe('client.remove()', function () {
  var client = helper.client

  it('should remove a record w/ string key', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/get/'})
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }

      client.get(key, function (err, record, metadata, key) {
        if (err) { throw new Error(err.message) }

        client.remove(key, function (err, key) {
          if (err) { throw new Error(err.message) }

          client.get(key, function (err, record, metadata, key) {
            expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })
    })
  })

  it('should remove a record w/ integer key', function (done) {
    // generators
    var kgen = keygen.integer(helper.namespace, helper.set)
    var mgen = metagen.constant({ttl: 1000})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

    // values
    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    // write the record then check
    client.put(key, record, meta, function (err, key) {
      if (err) { throw new Error(err.message) }

      client.get(key, function (err, record, metadata, key) {
        if (err) { throw new Error(err.message) }

        client.remove(key, function (err, key) {
          expect(err).not.to.be.ok()

          client.get(key, function (err, record, metadata, key) {
            expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })
    })
  })

  it('should apply the remove policy', function (done) {
    var kgen = keygen.integer(helper.namespace, helper.set)
    var mgen = metagen.constant({ttl: 1000, gen: 1})
    var rgen = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})

    var key = kgen()
    var meta = mgen(key)
    var record = rgen(key, meta)

    client.put(key, record, meta, function (err) {
      if (err) { throw new Error(err.message) }

      var remove_policy = {
        gen: Aerospike.policy.gen.EQ,
        generation: 2
      }
      client.remove(key, remove_policy, function (err) {
        expect(err.code).to.be(status.AEROSPIKE_ERR_RECORD_GENERATION)

        client.exists(key, function (err) {
          if (err) { throw new Error(err.message) }
          done()
        })
      })
    })
  })

  it('should not remove a non-existent key', function (done) {
    // generators
    var kgen = keygen.string(helper.namespace, helper.set, {prefix: 'test/not_found/'})

    // values
    var key = kgen()

    client.remove(key, function (err, key) {
      expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
      done()
    })
  })
})
