// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

/* global expect, describe, context, it */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const keygen = helper.keygen
const recgen = helper.recgen
const valgen = helper.valgen

const status = Aerospike.status

describe('client.remove()', function () {
  let client = helper.client

  it('removes an existing record', function () {
    let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()

    return client.put(key, {str: 'abcde'})
      .then(() => client.remove(key))
      .then(() => client.exists(key))
      .then(result => expect(result).to.be(false))
  })

  it('returns an error when trying to remove a non-existing key', function () {
    let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()

    return client.remove(key)
      .catch(error =>
        expect(error.code).to.be(status.AEROSPIKE_ERR_RECORD_NOT_FOUND))
  })

  context('with generation policy value', function () {
    it('should remove the record if the generation matches', function () {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()

      return client.put(key, {str: 'abcde'})
        .then(() => {
          let removePolicy = {
            gen: Aerospike.policy.gen.EQ,
            generation: 1
          }
          return client.remove(key, removePolicy)
        })
        .then(() => client.exists(key))
        .then(result => expect(result).to.be(false))
    })

    it('should not remove the record if the generation does not match', function () {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()

      return client.put(key, {str: 'abcde'})
        .then(() => {
          let removePolicy = {
            gen: Aerospike.policy.gen.EQ,
            generation: 1
          }
          return client.remove(key, removePolicy)
            .catch(error =>
              expect(error.code).to.be(status.AEROSPIKE_ERR_RECORD_GENERATION))
        })
        .then(() => client.exists(key))
        .then(result => expect(result).to.be(false))
    })
  })

  it('should apply the durable delete policy', function (done) {
    if (!helper.cluster.is_enterprise()) {
      return this.skip('durable delete requires enterprise edition')
    }
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

        client.exists(key, function (error, result) {
          if (error) throw error
          expect(result).to.be(false)
          done()
        })
      })
    })
  })
})
