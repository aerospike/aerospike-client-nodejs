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
  set (name, promise) {
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

  setExpectError () {
    this._expectError = true
    return this
  }
}

exports.initState = () => Promise.resolve(new State())

exports.expectError = () => (state) => state.setExpectError()

exports.createRecord = (bins) => (state) => {
  const key = helper.keygen.string(helper.namespace, helper.set)()
  const meta = { ttl: 600 }
  const policy = new Aerospike.WritePolicy({
    exists: Aerospike.policy.exists.CREATE_OR_REPLACE
  })
  return state.set('key', helper.client.put(key, bins, meta, policy))
}

exports.operate = (ops) => (state) =>
  state.set('result', helper.client.operate(state.key, Array.isArray(ops) ? ops : [ops]))

exports.assertResultEql = (expected) => (state) => {
  expect(state.result.bins).to.eql(expected, 'result of operation does not match expectation')
  return state
}

exports.assertResultSatisfy = (matcher) => (state) => {
  expect(state.result.bins).to.satisfy(matcher, 'result of operation does not satisfy expectation')
  return state
}

exports.assertRecordEql = (expected) => (state) => {
  return helper.client.get(state.key).then((record) =>
    expect(record.bins).to.eql(expected, 'after operation, record bins do not match expectations')
  ).then(() => state)
}

exports.assertError = (code) => (state) => {
  expect(state.error, `expected operation to raise exception with error code ${code}`)
    .to.be.instanceof(AerospikeError)
    .with.property('code', code)
  return state
}

exports.cleanup = () => (state) =>
  helper.client.remove(state.key)
