// *****************************************************************************
// Copyright 2013-2026 Aerospike, Inc.
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

import type { Vector as Vec, status as statusModule } from '../lib/aerospike.js';
import * as Aerospike from '../lib/aerospike.js';

import { expect } from 'chai';

const Vector: typeof Vec = Aerospike.Vector
const status: typeof statusModule = Aerospike.status

describe('Aerospike.Vector #noserver', function () {
  describe('static factories', function () {
    it('creates a FLOAT32 vector from a plain array', function () {
      const v: Vec = Vector.ofFloat32([0.5, -1.25, 3.0])

      expect(v).to.be.instanceof(Vector)
      expect(v.elementType).to.equal(Vector.ElementType.FLOAT32)
      expect(v.dimensions).to.equal(3)
      expect(Array.from(v.elements as Float32Array)).to.eql([0.5, -1.25, 3.0])
      expect(v.version).to.equal(Vector.VERSION)
    })

    it('creates a FLOAT64 vector from a plain array', function () {
      const v: Vec = Vector.ofFloat64([1.1, 2.2, 3.3])

      expect(v.elementType).to.equal(Vector.ElementType.FLOAT64)
      expect(Array.from(v.elements as Float64Array)).to.eql([1.1, 2.2, 3.3])
    })

    it('creates an INT32 vector from a plain array', function () {
      const v: Vec = Vector.ofInt32([-5, 0, 7, 12345])

      expect(v.elementType).to.equal(Vector.ElementType.INT32)
      expect(Array.from(v.elements as Int32Array)).to.eql([-5, 0, 7, 12345])
    })

    it('creates a FLOAT16 vector from raw bit patterns', function () {
      // 0x3c00 = 1.0, 0xbc00 = -1.0, 0x4000 = 2.0 (IEEE 754 half precision)
      const v: Vec = Vector.ofFloat16([0x3c00, 0xbc00, 0x4000])

      expect(v.elementType).to.equal(Vector.ElementType.FLOAT16)
      expect(Array.from(v.elements as Uint16Array)).to.eql([0x3c00, 0xbc00, 0x4000])
    })

    it('accepts an already-typed array', function () {
      const v: Vec = Vector.ofFloat32(Float32Array.from([1, 2, 3]))
      expect(Array.from(v.elements as Float32Array)).to.eql([1, 2, 3])
    })

    it('rejects a non-array-like value', function () {
      const fn = () => Vector.ofFloat32('not an array' as any)
      expect(fn).to.throw()
      try {
        fn()
      } catch (error: any) {
        expect(error.code).to.equal(status.ERR_PARAM)
      }
    })
  })

  describe('validation', function () {
    it('rejects an empty vector', function () {
      const fn = () => Vector.ofFloat32([])
      expect(fn).to.throw(/at least one element/)
    })

    it('rejects a vector exceeding the per-type dimension cap', function () {
      // FLOAT64 caps out at 32,768 dimensions (256KB / 8 bytes).
      const tooLong = new Float64Array(32769)
      const fn = () => Vector.ofFloat64(tooLong)
      expect(fn).to.throw(/exceeds the maximum/)
    })

    it('accepts a vector at exactly the per-type dimension cap', function () {
      // FLOAT32/INT32 cap out at 65,536 dimensions (256KB / 4 bytes).
      const atCap = new Float32Array(65536)
      const v: Vec = Vector.ofFloat32(atCap)
      expect(v.dimensions).to.equal(65536)
    })

    it('rejects NaN elements for float types', function () {
      const fn = () => Vector.ofFloat32([1.0, NaN, 3.0])
      expect(fn).to.throw(/finite number/)
    })

    it('rejects Infinity elements for float types', function () {
      const fn = () => Vector.ofFloat64([1.0, Infinity, 3.0])
      expect(fn).to.throw(/finite number/)
    })

    it('rejects out-of-range int32 elements', function () {
      const fn = () => Vector.ofInt32([2147483648])
      expect(fn).to.throw(/not a valid int32 value/)
    })

    it('rejects non-integer int32 elements', function () {
      const fn = () => Vector.ofInt32([1.5])
      expect(fn).to.throw(/not a valid int32 value/)
    })

    it('rejects out-of-range float16 bit patterns', function () {
      const fn = () => Vector.ofFloat16([0x10000])
      expect(fn).to.throw(/not a valid float16 bit pattern/)
    })

    it('raises errors with AerospikeError ERR_PARAM semantics', function () {
      try {
        Vector.ofFloat32([])
        expect.fail('expected an error to be thrown')
      } catch (error: any) {
        expect(error.code).to.equal(status.ERR_PARAM)
      }
    })
  })

  describe('#toBuffer() / Vector.fromBuffer()', function () {
    it('round-trips a FLOAT32 vector', function () {
      const v: Vec = Vector.ofFloat32([0.5, -1.25, 3.0])
      const buf: Buffer = v.toBuffer()
      const roundTripped: Vec = Vector.fromBuffer(buf)

      expect(roundTripped.elementType).to.equal(v.elementType)
      expect(roundTripped.version).to.equal(v.version)
      expect(Array.from(roundTripped.elements as Float32Array)).to.eql(Array.from(v.elements as Float32Array))
    })

    it('round-trips a FLOAT64 vector', function () {
      const v: Vec = Vector.ofFloat64([1.1, 2.2, 3.3])
      const roundTripped: Vec = Vector.fromBuffer(v.toBuffer())
      expect(Array.from(roundTripped.elements as Float64Array)).to.eql(Array.from(v.elements as Float64Array))
    })

    it('round-trips an INT32 vector', function () {
      const v: Vec = Vector.ofInt32([-5, 0, 7, 12345])
      const roundTripped: Vec = Vector.fromBuffer(v.toBuffer())
      expect(Array.from(roundTripped.elements as Int32Array)).to.eql(Array.from(v.elements as Int32Array))
    })

    it('round-trips a FLOAT16 vector', function () {
      const v: Vec = Vector.ofFloat16([0x3c00, 0xbc00, 0x4000])
      const roundTripped: Vec = Vector.fromBuffer(v.toBuffer())
      expect(Array.from(roundTripped.elements as Uint16Array)).to.eql(Array.from(v.elements as Uint16Array))
    })

    it('produces an 8-byte header followed by little-endian element data', function () {
      const v: Vec = Vector.ofInt32([1, 2])
      const buf: Buffer = v.toBuffer()

      expect(buf.length).to.equal(8 + 2 * 4)
      expect(buf.readUInt8(0)).to.equal(Vector.VERSION) // version
      expect(buf.readUInt8(1)).to.equal(Vector.ElementType.INT32) // element_type
      expect(buf.readUInt32LE(2)).to.equal(2) // dimensions
      expect(buf.readUInt16LE(6)).to.equal(0) // reserved
      expect(buf.readInt32LE(8)).to.equal(1)
      expect(buf.readInt32LE(12)).to.equal(2)
    })

    it('rejects a buffer shorter than the header', function () {
      const fn = () => Vector.fromBuffer(Buffer.alloc(4))
      expect(fn).to.throw(/smaller than the 8-byte header/)
    })

    it('rejects a buffer with an unknown element type', function () {
      const buf = Buffer.alloc(8)
      buf.writeUInt8(1, 0) // version
      buf.writeUInt8(0xff, 1) // unknown element type
      const fn = () => Vector.fromBuffer(buf)
      expect(fn).to.throw(/unknown element type code/)
    })

    it('rejects a buffer that is too short for its declared dimensions', function () {
      const buf = Buffer.alloc(8)
      buf.writeUInt8(1, 0) // version
      buf.writeUInt8(Vector.ElementType.FLOAT64, 1)
      buf.writeUInt32LE(10, 2) // claims 10 elements, but no data follows
      const fn = () => Vector.fromBuffer(buf)
      expect(fn).to.throw(/smaller than expected/)
    })

    it('rejects a non-Buffer argument', function () {
      const fn = () => Vector.fromBuffer('not a buffer' as any)
      expect(fn).to.throw(/requires a Buffer/)
    })
  })

  describe('#elementBytes()', function () {
    it('returns element data only, without the 8-byte header', function () {
      const v: Vec = Vector.ofInt32([1, 2, 3])
      const bytes: Buffer = v.elementBytes()

      expect(bytes.length).to.equal(3 * 4)
      expect(bytes.readInt32LE(0)).to.equal(1)
      expect(bytes.readInt32LE(4)).to.equal(2)
      expect(bytes.readInt32LE(8)).to.equal(3)
    })

    it('matches the tail of toBuffer() (i.e. the header-stripped payload)', function () {
      const v: Vec = Vector.ofFloat32([0.5, -1.25, 3.0])
      const full: Buffer = v.toBuffer()
      const elementsOnly: Buffer = v.elementBytes()

      expect(full.subarray(8)).to.eql(elementsOnly)
    })
  })
})
