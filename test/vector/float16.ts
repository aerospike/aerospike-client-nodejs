// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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

/* global describe, it, after */

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import * as helper from '../test_helper.ts';
import { float16Value, errorFrom, expectParamError, expectTypeError, loadVectors, removeLoadedSets } from './helpers.ts';

const { Vector, status } = Aerospike
const { FLOAT16 } = Aerospike.vectorElementType

// Every bit pattern of a finite half-precision value (exponent not all ones), -0 included.
const FINITE_BITS = Array.from({ length: 0x10000 }, (_, bits) => bits).filter(bits => (bits & 0x7c00) !== 0x7c00)
// The positive finite patterns that have a larger finite neighbour (all but 65,504).
const POSITIVE_BITS = FINITE_BITS.filter(bits => bits < 0x7bff)

// The 32-bit floats just below and just above a positive 32-bit float.
const f32 = new DataView(new ArrayBuffer(4))
function float32Neighbours (value: number): [number, number] {
  f32.setFloat32(0, value, true)
  const bits = f32.getUint32(0, true)
  f32.setUint32(0, bits - 1, true)
  const below = f32.getFloat32(0, true)
  f32.setUint32(0, bits + 1, true)
  return [below, f32.getFloat32(0, true)]
}

const bitsOf = (values: number[]) => Array.from(Vector.ofFloat16(values).elements())

// Checks that ofFloat16 rejects value, at element 2, with the C client's message.
function expectNotFinite (value: number) {
  const error = errorFrom(() => Vector.ofFloat16([1, 2, value]))
  expect(error, `${value}: expected an error`).to.be.instanceof(Aerospike.AerospikeError)
  expect(error.code, `${value}`).to.equal(status.ERR_PARAM)
  expect(error.message, `${value}`).to.match(/^vector: element 2 \(.+\) is not finite as float16$/)
}

describe('Vector.ofFloat16 from numbers #noserver', function () {
  it('converts every finite half-precision value to its own bits, and reads it back exactly', function () {
    const values = FINITE_BITS.map(float16Value)
    const vector = Vector.ofFloat16(values)

    expect(vector.elementType).to.equal(FLOAT16)
    expect(Array.from(vector.elements())).to.eql(FINITE_BITS)
    expect(vector.values()).to.eql(values) // -0 stays -0
  })

  it('rounds a value halfway between two half-precision values to the one with an even last bit', function () {
    const midpoints = POSITIVE_BITS.map(bits => (float16Value(bits) + float16Value(bits + 1)) / 2)
    const even = POSITIVE_BITS.map(bits => (bits & 1) === 0 ? bits : bits + 1)

    expect(bitsOf(midpoints)).to.eql(even)
    expect(bitsOf(midpoints.map(value => -value))).to.eql(even.map(bits => bits | 0x8000))
  })

  it('rounds any other value to the nearest half-precision value', function () {
    const midpoints = POSITIVE_BITS.map(bits => (float16Value(bits) + float16Value(bits + 1)) / 2)
    const neighbours = midpoints.map(float32Neighbours)

    expect(bitsOf(neighbours.map(([below]) => below))).to.eql(POSITIVE_BITS)
    expect(bitsOf(neighbours.map(([, above]) => above))).to.eql(POSITIVE_BITS.map(bits => bits + 1))
  })

  it('rounds to 32 bits first, as Math.fround does', function () {
    // 1 + 2^-11 is halfway between 1 and the next half-precision value, so it rounds to even (1).
    // The 2^-40 above it is lost in the rounding to 32 bits, so it doesn't tip the result up.
    const value = 1 + 2 ** -11 + 2 ** -40
    expect(bitsOf([value])).to.eql([0x3c00])
    expect(Array.from(Vector.ofFloat16(new Float64Array([value])).elements())).to.eql([0x3c00])
  })

  it('keeps the largest values and the smallest, and turns smaller ones into a signed zero', function () {
    expect(bitsOf([65504, -65504, 65519.99, -65519.99])).to.eql([0x7bff, 0xfbff, 0x7bff, 0xfbff])
    expect(bitsOf([2 ** -24, -(2 ** -24), 2 ** -14])).to.eql([0x0001, 0x8001, 0x0400])
    expect(bitsOf([2 ** -26, -(2 ** -26), 1e-10, 0, -0])).to.eql([0x0000, 0x8000, 0x0000, 0x0000, 0x8000])
  })

  it('rejects a value that is not finite as half precision: NaN, an infinity, or a magnitude of 65,520 or more', function () {
    for (const value of [NaN, Infinity, -Infinity, 65520, -65520, 1e6, 1e39]) {
      expectNotFinite(value)
    }
  })

  it('checks its argument the same way as the other factories', function () {
    expectTypeError(() => Vector.ofFloat16('abc' as any), 'Vector elements must be an array or a typed array of numbers')
    expectTypeError(() => Vector.ofFloat16([1, 2, '3' as any]), 'Vector element 2 must be a number')
    expectParamError(() => Vector.ofFloat16([]), 'vector: must have at least 1 dimension')
    expect(Vector.ofFloat16(new Array(131072).fill(1)).dimensions).to.equal(131072)
    expectParamError(() => Vector.ofFloat16(new Array(131073).fill(1)),
      `vector: 131073 dimensions exceed max 131072 for element type ${FLOAT16}`)
  })

  it('builds the same vector as the matching bit patterns', function () {
    expect(Vector.ofFloat16([0.5, -1.25, 3]).toBytes()).to.eql(Vector.ofFloat16Bits([0x3800, 0xbd00, 0x4200]).toBytes())
  })
})

describe('Vector#values #noserver', function () {
  it('returns the elements of every type as plain numbers', function () {
    const cases: Array<[Aerospike.Vector, number[]]> = [
      [Vector.ofFloat16Bits([0x3c00, 0x8000, 0x0001, 0x7bff]), [1, -0, 2 ** -24, 65504]],
      [Vector.ofInt32([-(2 ** 31), 7]), [-(2 ** 31), 7]],
      [Vector.ofFloat32([0.1, -0]), [Math.fround(0.1), -0]],
      [Vector.ofFloat64([0.1, Number.MAX_VALUE]), [0.1, Number.MAX_VALUE]]
    ]
    for (const [vector, expected] of cases) {
      const values = vector.values()
      expect(values, `type ${vector.elementType}`).to.be.an('array').that.eql(expected)
    }
  })

  it('reads half-precision bit patterns the server would reject as NaN or infinity', function () {
    const values = Vector.ofFloat16Bits([0x7e00, 0x7c00, 0xfc00]).values()
    expect(values[0]).to.be.NaN
    expect(values.slice(1)).to.eql([Infinity, -Infinity])
  })

  it('returns a new array each time', function () {
    const vector = Vector.ofFloat16([1, 2])
    vector.values()[0] = 99
    expect(vector.values()).to.eql([1, 2])
  })
})

describe('Vector.ofFloat16 from numbers on the server', function () {
  this.timeout(60000)
  helper.skipUnlessVersion('>= 8.2.1', this)
  after(removeLoadedSets)

  it('reads back the rounded values', async function () {
    const written = Vector.ofFloat16([0.1, -2.5, 65504, 2 ** -24, -0])
    const set = await loadVectors([written])

    const read = (await helper.client.get(new Aerospike.Key(helper.namespace, set, 0))).bins.v as Aerospike.Vector
    expect(read.toBytes()).to.eql(written.toBytes())
    expect(read.values()).to.eql([float16Value(0x2e66), -2.5, 65504, 2 ** -24, -0])
  })
})
