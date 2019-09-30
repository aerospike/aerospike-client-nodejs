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
/* global expect */

const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')
const status = Aerospike.status

const bits = Aerospike.bitwise

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

    context('with resize flags', function () {
      context('with resize from front flag', function () {
        const resizeFlags = bits.resizeFlags.FROM_FRONT

        it('grows the value from the front', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0x01, 0x02]) }))
            .then(operate(bits.resize('bits', 4, resizeFlags)))
            .then(assertRecordEql({ bits: Buffer.from([0x00, 0x00, 0x01, 0x02]) }))
            .then(cleanup())
        })
      })

      context('with grow only flag', function () {
        const resizeFlags = bits.resizeFlags.GROW_ONLY

        it('returns an error when trying to shrink the value', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
            .then(expectError())
            .then(operate(bits.resize('bits', 2, resizeFlags)))
            .then(assertError(status.ERR_REQUEST_INVALID))
            .then(assertRecordEql({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
            .then(cleanup())
        })
      })

      context('with shrink only flag', function () {
        const resizeFlags = bits.resizeFlags.SHRINK_ONLY

        it('returns an error when trying to grow the value', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
            .then(expectError())
            .then(operate(bits.resize('bits', 4, resizeFlags)))
            .then(assertError(status.ERR_REQUEST_INVALID))
            .then(assertRecordEql({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
            .then(cleanup())
        })
      })
    })

    context('with bitwise policy', function () {
      context('with create-only write flag', function () {
        const policy = {
          writeFlags: bits.writeFlags.CREATE_ONLY
        }

        it('creates a new byte value bin and initializes it with zeros', function () {
          return initState()
            .then(createRecord({ foo: 'bar' }))
            .then(operate(bits.resize('bits', 4).withPolicy(policy)))
            .then(assertRecordEql({ bits: Buffer.from([0x00, 0x00, 0x00, 0x00]), foo: 'bar' }))
            .then(cleanup())
        })

        it('returns an error if the bin already exists', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
            .then(expectError())
            .then(operate(bits.resize('bits', 4).withPolicy(policy)))
            .then(assertError(status.ERR_BIN_EXISTS))
            .then(assertRecordEql({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
            .then(cleanup())
        })

        context('with no-fail write flag', function () {
          const policy = {
            writeFlags: bits.writeFlags.CREATE_ONLY | bits.writeFlags.NO_FAIL
          }

          it('does not update the bin', function () {
            return initState()
              .then(createRecord({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
              .then(operate(bits.resize('bits', 4).withPolicy(policy)))
              .then(assertRecordEql({ bits: Buffer.from([0x01, 0x02, 0x03]) }))
              .then(cleanup())
          })
        })
      })

      context('with update-only write flag', function () {
        const policy = {
          writeFlags: bits.writeFlags.UPDATE_ONLY
        }

        it('updates an existing byte value', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]) }))
            .then(operate(bits.resize('bits', 4).withPolicy(policy)))
            .then(assertRecordEql({ bits: Buffer.from([0x00, 0x01, 0x02, 0x03]) }))
            .then(cleanup())
        })

        it('returns an error if the bin does not exists', function () {
          return initState()
            .then(createRecord({ foo: 'bar' }))
            .then(expectError())
            .then(operate(bits.resize('bits', 4).withPolicy(policy)))
            .then(assertError(status.ERR_BIN_NOT_FOUND))
            .then(assertRecordEql({ foo: 'bar' }))
            .then(cleanup())
        })

        context('with no-fail write flag', function () {
          const policy = {
            writeFlags: bits.writeFlags.UPDATE_ONLY | bits.writeFlags.NO_FAIL
          }

          it('does not create the bin', function () {
            return initState()
              .then(createRecord({ foo: 'bar' }))
              .then(operate(bits.resize('bits', 4).withPolicy(policy)))
              .then(assertRecordEql({ foo: 'bar' }))
              .then(cleanup())
          })
        })
      })
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
    context('with value as Buffer', function () {
      it('sets value on bitmap at offset for size', function () {
        return initState()
          .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
          .then(operate(bits.set('bits', 13, 3, Buffer.from([0b11100000]))))
          .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000111, 0b00000011, 0b00000100, 0b00000101]) }))
          .then(cleanup())
      })
    })

    context('with value as Integer', function () {
      it('sets value on bitmap at offset for size', function () {
        return initState()
          .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
          .then(operate(bits.set('bits', 1, 8, 127)))
          .then(assertRecordEql({ bits: Buffer.from([0b00111111, 0b11000010, 0b00000011, 0b0000100, 0b00000101]) }))
          .then(cleanup())
      })
    })

    it('throws a TypeError if passed an unsupported value type', function () {
      expect(() => { bits.set('bin', 0, 0, 3.1416) }).to.throw(TypeError)
    })

    context('with bitwise policy', function () {
      context('with no-fail flag', function () {
        const policy = {
          writeFlags: bits.writeFlags.UPDATE_ONLY | bits.writeFlags.NO_FAIL
        }

        it('sets value on bitmap at offset for size', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0b00000000]) }))
            .then(operate([
              bits.set('bits', 4, 8, Buffer.from([0b10101010])).withPolicy(policy)
            ]))
            .then(assertRecordEql({
              bits: Buffer.from([0b00000000])
            }))
            .then(cleanup())
        })
      })

      context('with partial flag', function () {
        const policy = {
          writeFlags: bits.writeFlags.UPDATE_ONLY | bits.writeFlags.NO_FAIL | bits.writeFlags.PARTIAL
        }

        it('sets value on bitmap at offset for size', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0b00000000]) }))
            .then(operate([
              bits.set('bits', 4, 8, Buffer.from([0b10101010])).withPolicy(policy)
            ]))
            .then(assertRecordEql({
              bits: Buffer.from([0b00001010])
            }))
            .then(cleanup())
        })
      })
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

  describe('bitwise.lshift', function () {
    it('shifts left bitmap start at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.lshift('bits', 32, 8, 3)))
        .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00101000]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.rshift', function () {
    it('shifts right bitmap start at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.rshift('bits', 0, 9, 1)))
        .then(assertRecordEql({ bits: Buffer.from([0b00000000, 0b11000010, 0b00000011, 0b00000100, 0b00000101]) }))
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

    context('with overflow', function () {
      context('on overflow fail', function () {
        const FAIL = bits.overflow.FAIL

        it('returns an error if the addition overflows', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0b11111111]) }))
            .then(expectError())
            .then(operate(bits.add('bits', 0, 8, 1, false).onOverflow(FAIL)))
            .then(assertError(status.ERR_OP_NOT_APPLICABLE))
            .then(assertRecordEql({ bits: Buffer.from([0b11111111]) }))
            .then(cleanup())
        })
      })

      context('on overflow saturate', function () {
        const SATURATE = bits.overflow.SATURATE

        it('sets max value if the addition overlows', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0b11111100]) }))
            .then(operate(bits.add('bits', 0, 8, 100, false).onOverflow(SATURATE)))
            .then(assertRecordEql({ bits: Buffer.from([0b11111111]) }))
            .then(cleanup())
        })
      })

      context('on overflow wrap', function () {
        const WRAP = bits.overflow.WRAP

        it('wraps the value if the addition overflows', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0b11111110]) }))
            .then(operate(bits.add('bits', 0, 8, 2, false).onOverflow(WRAP)))
            .then(assertRecordEql({ bits: Buffer.from([0b00000000]) }))
            .then(cleanup())
        })
      })
    })
  })

  describe('bitwise.subtract', function () {
    it('subracts value from bitmap starting at bitOffset for bitSize', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.subtract('bits', 24, 16, 128, false)))
        .then(assertRecordEql({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000011, 0b10000101]) }))
        .then(cleanup())
    })

    context('with overflow', function () {
      context('on overflow fail', function () {
        const FAIL = bits.overflow.FAIL

        it('returns an error if the subtraction underflows', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0b00000100]) }))
            .then(expectError())
            .then(operate(bits.subtract('bits', 0, 8, 10, false).onOverflow(FAIL)))
            .then(assertError(status.ERR_OP_NOT_APPLICABLE))
            .then(assertRecordEql({ bits: Buffer.from([0b00000100]) }))
            .then(cleanup())
        })
      })

      context('on overflow saturate', function () {
        const SATURATE = bits.overflow.SATURATE

        it('sets min value if the subtraction underflows', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0b00000100]) }))
            .then(operate(bits.subtract('bits', 0, 8, 10, false).onOverflow(SATURATE)))
            .then(assertRecordEql({ bits: Buffer.from([0b00000000]) }))
            .then(cleanup())
        })
      })

      context('on overflow wrap', function () {
        const WRAP = bits.overflow.WRAP

        it('wraps the value if the subtraction underflows', function () {
          return initState()
            .then(createRecord({ bits: Buffer.from([0b00000100]) }))
            .then(operate(bits.subtract('bits', 0, 8, 10, false).onOverflow(WRAP)))
            .then(assertRecordEql({ bits: Buffer.from([0b11111010]) }))
            .then(cleanup())
        })
      })
    })
  })

  describe('bitwise.get', function () {
    it('returns bits from bitmap starting at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.get('bits', 9, 5)))
        .then(assertResultEql({ bits: Buffer.from([0b10000000]) }))
        .then(cleanup())
    })
  })

  describe('bitwise.getInt', function () {
    it('returns integer from bitmap starting at offset for size', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.getInt('bits', 8, 16, false)))
        .then(assertResultEql({ bits: 16899 }))
        .then(cleanup())
    })
  })

  describe('bitwise.lscan', function () {
    it('returns interger bit offset of the first specified value bit in bitmap', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.lscan('bits', 24, 8, true)))
        .then(assertResultEql({ bits: 5 }))
        .then(cleanup())
    })
  })

  describe('bitwise.rscan', function () {
    it('returns interger bit offset of the last specified value bit in bitmap', function () {
      return initState()
        .then(createRecord({ bits: Buffer.from([0b00000001, 0b01000010, 0b00000011, 0b00000100, 0b00000101]) }))
        .then(operate(bits.rscan('bits', 32, 8, true)))
        .then(assertResultEql({ bits: 7 }))
        .then(cleanup())
    })
  })
})
