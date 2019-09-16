// *****************************************************************************
// Copyright 2019 Aerospike, Inc.
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

const bits = Aerospike.bitwise

const {
  assertRecordEql,
  cleanup,
  createRecord,
  initState,
  operate
} = require('./util/statefulAsyncTest')

describe('client.operate() - Bitwise operations', function () {
  helper.skipUnlessSupportsFeature(Aerospike.features.BLOB_BITS, this)

  describe('bitwise.resize', function () {
    it('grows the bytes value', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0x01, 0x02]) }))
        .then(operate(bits.resize('bits', 4)))
        .then(assertRecordEql({ bits: Buffer.from([0x01, 0x02, 0x00, 0x00]) }))
        .then(cleanup())
    })

    it('shrinks the bytes value', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
        .then(operate(bits.resize('bits', 2)))
        .then(assertRecordEql({ bits: Buffer.from([0x01, 0x02]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.insert', function () {
    it('inserts value at the stated offset', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0x01, 0x02]) }))
        .then(operate(bits.insert('bits', 1, Buffer.from([0x03, 0x04]))))
        .then(assertRecordEql({ bits: Buffer.from([0x01, 0x03, 0x04, 0x02]) }))
        .then(cleanup())
    })

    context('with CDT context', function () {
      it('inserts bytes in a nested bytes value', function () {
        return initState()
          .then(createRecord({ list: [Buffer.from([0x01, 0x02]), Buffer.from([0x03, 0x04])] }))
          .then(operate(bits.insert('list', 1, Buffer.from([0x03, 0x04])).withContext(ctx => ctx.addListIndex(0))))
          .then(assertRecordEql({ list: [Buffer.from([0x01, 0x03, 0x04, 0x02]), Buffer.from([0x03, 0x04])] }))
          .then(cleanup())
      })
    })
  })
})
