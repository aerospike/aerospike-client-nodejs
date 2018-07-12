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
const AerospikeError = Aerospike.AerospikeError

describe('client.remove()', function () {
  let client = helper.client

  it('removes an existing record', function () {
    let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()

    return client.put(key, {str: 'abcde'})
      .then(() => client.remove(key))
      .then(() => client.exists(key))
      .then(result => expect(result).to.be.false())
  })

  it('returns an error when trying to remove a non-existing key', function () {
    let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()

    return client.remove(key)
      .catch(error =>
        expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_NOT_FOUND))
  })

  context('with generation policy value', function () {
    it('should remove the record if the generation matches', function () {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()
      let policy = new Aerospike.RemovePolicy({
        gen: Aerospike.policy.gen.EQ,
        generation: 1
      })

      return client.put(key, {str: 'abcde'})
        .then(() => {
          return client.remove(key, policy)
        })
        .then(() => client.exists(key))
        .then(result => expect(result).to.be.false())
    })

    it('should not remove the record if the generation does not match', function () {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/'})()
      let policy = new Aerospike.RemovePolicy({
        gen: Aerospike.policy.gen.EQ,
        generation: 1
      })

      return client.put(key, {str: 'abcde'})
        .then(() => {
          return client.remove(key, policy)
            .catch(error =>
              expect(error).to.be.instanceof(AerospikeError).with.property('code', status.ERR_RECORD_GENERATION))
        })
        .then(() => client.exists(key))
        .then(result => expect(result).to.be.false())
    })
  })

  context('with durable delete policy', function () {
    helper.cluster.skip_unless_enterprise(this)

    it('should apply the durable delete policy', function () {
      let key = keygen.string(helper.namespace, helper.set, {prefix: 'test/remove/gen/'})()
      let record = recgen.record({i: valgen.integer(), s: valgen.string(), b: valgen.bytes()})()
      let policy = new Aerospike.RemovePolicy({
        durableDelete: true
      })

      return client.put(key, record)
        .then(() => client.remove(key, policy))
        .then(() => client.exists(key))
        .then(result => expect(result).to.be.false())
    })
  })
})
