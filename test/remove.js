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

/* global expect, describe, context, it */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const recgen = helper.recgen
const valgen = helper.valgen

const status = Aerospike.status

describe('client.remove()', function () {
  var client = helper.client

  it('should remove a record w/ string key', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()
    var meta = { ttl: 1000 }
    var record = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()

    client.put(key, record, meta, function (err) {
      if (err) throw err
      client.exists(key, function (err) {
        if (err) throw err
        client.remove(key, function (err) {
          if (err) throw err
          client.exists(key, function (err) {
            expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })
    })
  })

  it('should remove a record w/ integer key', function (done) {
    var key = keygen.integer(helper.namespace, helper.set, {prefix: 'test/remove/'})()
    var meta = { ttl: 1000 }
    var record = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()

    client.put(key, record, meta, function (err) {
      if (err) throw err
      client.exists(key, function (err) {
        if (err) throw err
        client.remove(key, function (err) {
          if (err) throw err
          client.exists(key, function (err) {
            expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })
    })
  })

  it('should fail to remove a non-existent key', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/not_found/'})()
    client.remove(key, function (err) {
      expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
      done()
    })
  })

  context('with generation policy value', function () {
    it('should remove the record if the generation matches', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/gen/'})()
      var meta = { ttl: 1000 }
      var record = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()

      client.put(key, record, meta, function (err) {
        if (err) throw err

        var removePolicy = {
          gen: Aerospike.policy.gen.EQ,
          generation: 1
        }
        client.remove(key, removePolicy, function (err) {
          if (err) throw err

          client.exists(key, function (err) {
            expect(err.code).to.equal(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
            done()
          })
        })
      })
    })

    it('should not remove the record if the generation does not match', function (done) {
      var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/gen/'})()
      var meta = { ttl: 1000 }
      var record = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()

      client.put(key, record, meta, function (err) {
        if (err) throw err

        var removePolicy = {
          gen: Aerospike.policy.gen.EQ,
          generation: 2
        }
        client.remove(key, removePolicy, function (err) {
          expect(err.code).to.be(status.AEROSPIKE_ERR_RECORD_GENERATION)

          client.exists(key, function (err) {
            if (err) throw err
            done()
          })
        })
      })
    })
  })

  it('should apply set the durable delete policy', function (done) {
    var key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/gen/'})()
    var meta = { ttl: 1000 }
    var record = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()

    client.put(key, record, meta, function (err) {
      if (err) throw err

      var policy = {
        durableDelete: true
      }
      client.remove(key, policy, function (err) {
        if (err) throw err

        client.exists(key, function (err) {
          expect(err.code).to.be(status.AEROSPIKE_ERR_RECORD_NOT_FOUND)
          done()
        })
      })
    })
  })
})
