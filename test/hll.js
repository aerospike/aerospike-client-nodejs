// *****************************************************************************
// Copyright 2020 Aerospike, Inc.
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

const hll = Aerospike.hll
const ops = Aerospike.operations

const {
  assertError,
  assertRecordEql,
  assertResultEql,
  assertResultSatisfy,
  cleanup,
  createRecord,
  expectError,
  initState,
  operate
} = require('./util/statefulAsyncTest')

describe('client.operate() - HyperLogLog operations', function () {
  helper.skipUnlessVersion('>= 4.9.0', this)

  describe('hll.init', function () {
    it('initializes a HLL bin value', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate(hll.init('hll', 10)))
        .then(cleanup())
    })
  })

  describe('hll.add', function () {
    it('initializes a new HLL value if it does not exist', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate(hll.add('hll', ['cat', 'dog', 'tiger', 'dog', 'lion', 'dog'], 8)))
        .then(assertResultEql({ hll: 4 }))
        .then(cleanup())
    })
  })
})
