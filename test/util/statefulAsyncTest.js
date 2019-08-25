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

/* global expect */

const Aerospike = require('../../lib/aerospike')
const AerospikeError = Aerospike.AerospikeError
const helper = require('../test_helper')

class State {
  enrich (name, promise) {
    if (this._expectError) {
      return promise.catch(error => {
        this.error = error
        return this
      })
    } else {
      return promise.then(value => {
        this[name] = value
        return this
      })
    }
  }

  passthrough (promise) {
    return promise.then(() => this)
  }

  resolve (value) {
    return Promise.resolve(value).then(() => this)
  }

  expectError () {
    this._expectError = true
    return this
  }
}

exports.initState = async () => new State()

exports.expectError = () => (state) => state.expectError()

exports.createRecord = (bins) => (state) => {
  const key = helper.keygen.string(helper.namespace, helper.set)()
  const meta = { ttl: 600 }
  const policy = new Aerospike.WritePolicy({
    exists: Aerospike.policy.exists.CREATE_OR_REPLACE
  })
  return state.enrich('key', helper.client.put(key, bins, meta, policy))
}

exports.operate = (ops) => (state) =>
  state.enrich('result',
    helper.client.operate(state.key, Array.isArray(ops) ? ops : [ops])
  )

exports.assertResultEql = (expected) => (state) =>
  state.resolve(
    expect(state.result.bins).to.eql(expected, 'result of operation does not match expectation')
  )

exports.assertResultSatisfy = (matcher) => (state) =>
  state.resolve(
    expect(state.result.bins).to.satisfy(matcher, 'result of operation does not satisfy expectation')
  )

exports.assertRecordEql = (expected) => (state) =>
  state.passthrough(
    helper.client.get(state.key).then(
      (record) => expect(record.bins).to.eql(expected, 'after operation, record bins do not match expectations')
    )
  )

exports.assertError = (code) => (state) =>
  state.resolve(
    expect(state.error, `expected operation to raise exception with error code ${code}`)
      .to.be.instanceof(AerospikeError)
      .with.property('code', code)
  )

exports.cleanup = () => (state) =>
  state.passthrough(
    helper.client.remove(state.key)
  )
