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

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')

const hll = Aerospike.hll
const status = Aerospike.status

const {
  assertError,
  assertRecordEql,
  assertResultEql,
  cleanup,
  createRecord,
  expectError,
  initState,
  operate
} = require('./util/statefulAsyncTest')

describe('client.operate() - HyperLogLog operations', function () {
  helper.skipUnlessVersion('>= 4.9.0', this)

  // HLL bin value representing the set ('jaguar', 'leopard', 'lion', 'tiger')
  // with an index bit size of 8.
  const hllCats = Buffer.from([0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0,
    0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

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
        .then(operate(hll.add('hll', ['jaguar', 'tiger', 'tiger', 'leopard', 'lion', 'jaguar'], 8)))
        .then(assertResultEql({ hll: 4 }))
        .then(assertRecordEql({ hll: hllCats, foo: 'bar' }))
        .then(cleanup())
    })

    it('returns an error if the bin is of wrong type', function () {
      return initState()
        .then(createRecord({ hll: 'not a HLL set' }))
        .then(expectError())
        .then(operate(hll.add('hll', ['jaguar', 'tiger', 'tiger', 'leopard', 'lion', 'jaguar'], 8)))
        .then(assertError(status.ERR_BIN_INCOMPATIBLE_TYPE))
        .then(cleanup())
    })
  })

  describe('hll.update', function () {
    it('updates an existing HLL value', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.add('hll', ['tiger', 'lion'], 8),
          hll.update('hll', ['leopard', 'tiger', 'tiger', 'jaguar'])
        ]))
        .then(assertResultEql({ hll: 2 }))
        .then(assertRecordEql({ hll: hllCats, foo: 'bar' }))
        .then(cleanup())
    })

    it('returns an error if the HLL bin does not yet exist', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(expectError())
        .then(operate(hll.update('hll', ['leopard', 'tiger', 'tiger', 'jaguar'])))
        .then(assertError(status.ERR_OP_NOT_APPLICABLE))
        .then(cleanup())
    })
  })

  describe('hll.describe', function () {
    it('returns the index and min hash bit counts', function () {
      return initState()
        .then(createRecord({ foo: 'bar' }))
        .then(operate([
          hll.init('hll', 16, 5),
          hll.describe('hll')
        ]))
        .then(assertResultEql({ hll: [16, 5] }))
        .then(cleanup())
    })
  })
})
