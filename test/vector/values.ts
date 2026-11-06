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

/* global describe, it */

import { expect } from 'chai';
import * as Aerospike from '../../lib/aerospike.js';
import { ELEMENT_TYPES, HEADER_SIZE, header, expectParamError, expectTypeError, nonFiniteVector } from './helpers.ts';

const { Vector, vectorElementType, vectorDistanceMetric } = Aerospike
const { FLOAT16, INT32, FLOAT32, FLOAT64 } = vectorElementType

// The edge values of each element type, which must come back bit-identical.
const EDGES: Array<[number, number[]]> = [
  // FLOAT16 holds raw bit patterns: 0, -0, smallest subnormal, smallest normal, 1, largest, -largest.
  [FLOAT16, [0x0000, 0x8000, 0x0001, 0x0400, 0x3c00, 0x7bff, 0xfbff]],
  [INT32, [-(2 ** 31), 2 ** 31 - 1, 0, -1]],
  [FLOAT32, [3.4028234663852886e38, -3.4028234663852886e38, 1.1754943508222875e-38, 1.401298464324817e-45, -0, 0.1]],
  [FLOAT64, [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, 2.2250738585072014e-308, -0, 0.1]]
]

const typeOf = (elementType: number) => ELEMENT_TYPES.find(t => t.type === elementType)!

// The element bytes of a typed array, as the vector format stores them (little-endian).
const elementBytes = (elements: ArrayBufferView) => Buffer.from(elements.buffer, elements.byteOffset, elements.byteLength)

describe('Vector values #noserver', function () {
  it('exports the element types and metrics with their wire values', function () {
    expect(vectorElementType).to.eql({ FLOAT16: 1, INT32: 2, FLOAT32: 3, FLOAT64: 4 })
    expect(vectorDistanceMetric).to.eql({ EUCLIDEAN_SQUARED: 0, DOT_PRODUCT: 1, COSINE_SIMILARITY: 2 })
  })

  it('keeps the element type, dimensions and edge values of each type bit for bit', function () {
    for (const [elementType, values] of EDGES) {
      const { name, build, array } = typeOf(elementType)
      const vector = build(values)
      const expected = array.from(values)

      expect(vector).to.be.instanceof(Vector)
      expect(vector.elementType, name).to.equal(elementType)
      expect(vector.dimensions, name).to.equal(values.length)
      expect(vector.elements(), name).to.be.instanceof(array)
      expect(elementBytes(vector.elements()), name).to.eql(elementBytes(expected))
    }
  })

  it('rounds FLOAT32 elements to 32-bit precision, as a Float32Array does', function () {
    const values = [0.1, 1 / 3, 16777217, -2.5e-40]
    expect(Array.from(Vector.ofFloat32(values).elements())).to.eql(values.map(Math.fround))
  })

  it('builds the same vector from a plain array and a typed array', function () {
    for (const { name, build, array } of ELEMENT_TYPES) {
      const values = [1, 2, 3]
      expect(build(array.from(values)).toBytes(), name).to.eql(build(values).toBytes())
    }
  })

  it('serializes to a 6-byte header followed by the little-endian elements (R3, R46)', function () {
    for (const { name, type, build, array, size } of ELEMENT_TYPES) {
      const values = [1, 2, 3]
      expect(build(values).toBytes(), name).to.eql(Buffer.concat([header(type, 3), elementBytes(array.from(values))]))
      expect(build(new Array(768).fill(1)).toBytes().length, name).to.equal(HEADER_SIZE + 768 * size)
    }
    expect(Vector.ofFloat32(new Array(768).fill(1)).toBytes().length).to.equal(3078)
  })

  it('accepts the most dimensions of each type and rejects one more (R6)', function () {
    for (const { name, type, build, array, maxDimensions } of ELEMENT_TYPES) {
      expect(build(new array(maxDimensions)).dimensions, name).to.equal(maxDimensions)
      expectParamError(() => build(new array(maxDimensions + 1)),
        `vector: ${maxDimensions + 1} dimensions exceed max ${maxDimensions} for element type ${type}`, name)
    }
  })

  it('rejects a vector with no dimensions (R30)', function () {
    for (const { name, build, array } of ELEMENT_TYPES) {
      expectParamError(() => build([]), 'vector: must have at least 1 dimension', name)
      expectParamError(() => build(new array(0)), 'vector: must have at least 1 dimension', name)
    }
  })

  it('throws a TypeError unless the elements are an array or a typed array', function () {
    for (const { name, build } of ELEMENT_TYPES) {
      for (const elements of [undefined, null, 'abc', 3, { 0: 1, length: 1 }, new DataView(new ArrayBuffer(4))]) {
        expectTypeError(() => build(elements as any), 'Vector elements must be an array or a typed array of numbers', `${name} ${String(elements)}`)
      }
    }
  })

  it('throws a TypeError naming the first element that is not a number', function () {
    for (const { name, build } of ELEMENT_TYPES) {
      for (const element of ['1', 1n, null, undefined, true, [1]]) {
        expectTypeError(() => build([1, 2, element as any]), 'Vector element 2 must be a number', `${name} ${String(element)}`)
      }
    }
  })

  it('rejects INT32 and FLOAT16 elements the typed array would change', function () {
    for (const value of [1.5, 2 ** 31, -(2 ** 31) - 1, NaN, Infinity]) {
      expectParamError(() => Vector.ofInt32([0, value]), 'Vector element 1 must be a 32-bit integer', `INT32 ${value}`)
    }
    for (const value of [-1, 65536, 0.5, NaN]) {
      expectParamError(() => Vector.ofFloat16Bits([value]), 'Vector element 0 must be an integer from 0 to 65535', `FLOAT16 ${value}`)
    }
  })

  it('rejects NaN and infinite float elements before sending (R8, R10)', function () {
    for (const build of [Vector.ofFloat32, Vector.ofFloat64]) {
      for (const value of [NaN, Infinity, -Infinity]) {
        expectParamError(() => build([1, value]), 'vector: element 1 is not finite (no NaN or infinity)', `${build.name} ${value}`)
      }
    }
    // Too large for 32 bits: rounds to infinity.
    expectParamError(() => Vector.ofFloat32([1e40]), 'vector: element 0 is not finite (no NaN or infinity)', 'FLOAT32 1e40')
    for (const bits of [0x7e00, 0x7c00, 0xfc00]) {
      expectParamError(() => Vector.ofFloat16Bits([0x3c00, bits]), 'vector: element 1 is not finite (no NaN or infinity)', `FLOAT16 bits ${bits}`)
    }
  })

  it('rejects NaN and infinity in a typed array of the element type, and checks other typed arrays', function () {
    const message = 'vector: element 1 is not finite (no NaN or infinity)'
    expectParamError(() => Vector.ofFloat32(new Float32Array([1, NaN])), message, 'Float32Array NaN')
    expectParamError(() => Vector.ofFloat64(new Float64Array([1, -Infinity])), message, 'Float64Array -Infinity')
    expectParamError(() => Vector.ofFloat16(new Float32Array([1, Infinity])), 'vector: element 1 (inf) is not finite as float16', 'ofFloat16 Float32Array Infinity')
    expectParamError(() => Vector.ofFloat16Bits(new Uint16Array([0x3c00, 0x7e00])), message, 'Uint16Array NaN bits')
    expectParamError(() => Vector.ofInt32(new Float64Array([0, 1.5])), 'Vector element 1 must be a 32-bit integer', 'Float64Array into INT32')
    expectTypeError(() => Vector.ofFloat32(new BigInt64Array([1n]) as any), 'Vector element 0 must be a number', 'BigInt64Array')
  })

  it('builds a vector from bytes without checking its elements, so the server checks them', function () {
    const vector = nonFiniteVector(FLOAT32, [1, NaN])
    expect(vector.dimensions).to.equal(2)
    expect(vector.elements()[1]).to.be.NaN
  })

  it('reads back its own bytes, and only a Buffer', function () {
    for (const { name, build } of ELEMENT_TYPES) {
      const vector = build([7, 8, 9])
      const copy = new Vector(vector.toBytes())
      expect(copy.elementType, name).to.equal(vector.elementType)
      expect(copy.toBytes(), name).to.eql(vector.toBytes())
    }
    for (const bytes of [undefined, 'abc', new Uint8Array(10), [1, 3, 1, 0, 0, 0]]) {
      expectTypeError(() => new Vector(bytes as any), 'Vector bytes must be a Buffer', String(bytes))
    }
  })

  it('rejects bytes that are not a valid vector', function () {
    const good = Vector.ofFloat32([1, 2, 3]).toBytes()
    const withHeader = (h: Buffer) => Buffer.concat([h, good.subarray(HEADER_SIZE)])
    const cases: Array<[string, Buffer, string]> = [
      ['shorter than the header', good.subarray(0, 3), 'vector: value size 3 smaller than 6-byte header'],
      ['an unknown format version', withHeader(header(FLOAT32, 3, 9)), 'vector: unsupported format version 9 (expected 1)'],
      ['an unknown element type', withHeader(header(7, 3)), 'vector: invalid element type 7'],
      ['no dimensions', header(FLOAT32, 0), 'vector: must have at least 1 dimension'],
      ['one byte short', good.subarray(0, good.length - 1), 'vector: value size 17 does not match 18 (3 dimensions of 4 bytes, little-endian)'],
      ['too many dimensions', header(FLOAT32, 65537), 'vector: 65537 dimensions exceed max 65536 for element type 3']
    ]
    for (const [name, bytes, message] of cases) {
      expectParamError(() => new Vector(bytes), message, name)
    }
  })

  it('is not changed by its input, elements() or toBytes()', function () {
    const input = [1, 2, 3]
    const vector = Vector.ofFloat32(input)
    const original = vector.toBytes()

    input[0] = 99
    vector.elements()[0] = 99
    vector.toBytes()[HEADER_SIZE + 3] = 0

    expect(vector.toBytes()).to.eql(original)
    expect(Array.from(vector.elements())).to.eql([1, 2, 3])
  })
})
