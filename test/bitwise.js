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
  })

  describe('bitwise.remove', function () {
    it('removes number of bytes from the stated offset', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]) }))
        .then(operate(bits.remove('bits', 1, 3)))
        .then(assertRecordEql({ bits: Buffer.from([0x01, 0x05]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.set', function () {
    it('sets value on bitmap at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.set('bits', 13, 3, Buffer.from([0b11100000]))))
        .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000111, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.or', function () {
    it('performs bitwise "or" on value and bitmap at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.or('bits', 17, 6, Buffer.from([0b10101000]))))
        .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000010, 0b01010111, 0b00000100, 0b00000101]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.xor', function () {
    it('performs bitwise "xor" on value and bitmap at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.xor('bits', 17, 6, Buffer.from([0b10101100]))))
        .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000010, 0b01010101, 0b00000100, 0b00000101]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.and', function () {
    it('performs bitwise "and" on value and bitmap at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.and('bits', 23, 9, Buffer.from([0b00111100, 0b10000000]))))
        .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000010, 0b00000000, 0b00000101]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.not', function () {
    it('negates bitmap starting at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.not('bits', 25, 6)))
        .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b01111010, 0b00000101]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.add', function () {
    it('adds value to bitmap starting at bitOffset for bitSize', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.add('bits', 24, 16, 128, false)))
        .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b10000101]) }))
        .then(cleanup())
    })
  })
})
