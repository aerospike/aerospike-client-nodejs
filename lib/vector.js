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

const as = require('./native')
const AerospikeError = require('./error')
const status = require('./status')

const { FLOAT16, INT32, FLOAT32, FLOAT64 } = as.vectorElementType

const ELEMENT_ARRAYS = {
  [FLOAT16]: Uint16Array,
  [INT32]: Int32Array,
  [FLOAT32]: Float32Array,
  [FLOAT64]: Float64Array
}

const INT32_MIN = -(2 ** 31)
const INT32_MAX = 2 ** 31 - 1
// A float16 whose exponent bits are all set is infinite or NaN.
const FLOAT16_EXPONENT = 0x7c00

/**
 * A vector value: a fixed number of elements of one numeric type, stored in
 * its own data type (not as a blob) so that the server can compute
 * {@link module:aerospike/exp.vectorDistance|vector distances} on it.
 * Requires server 8.2.1 or later.
 *
 * Create one with {@link Vector.ofFloat32} or a sibling factory. Only a
 * `Vector` is stored as a vector: a plain typed array is still stored as a
 * blob, and a plain array as a list. Reading a vector bin returns a `Vector`.
 *
 * A vector can't be stored inside a list or a map; the server rejects it.
 *
 * @example
 * const Aerospike = require('aerospike')
 *
 * const embedding = Aerospike.Vector.ofFloat32([0.12, -0.5, 0.33])
 * await client.put(key, { embedding })
 */
class Vector {
  #elementType
  #elements

  /**
   * Creates a vector from its serialized bytes, as returned by
   * {@link Vector#toBytes}.
   *
   * @param {Buffer} bytes - The serialized vector, header included.
   * @throws {TypeError} If `bytes` is not a Buffer.
   * @throws {AerospikeError} With code `ERR_PARAM` if `bytes` is not a valid vector.
   */
  constructor (bytes) {
    if (!Buffer.isBuffer(bytes)) {
      throw new TypeError('Vector bytes must be a Buffer')
    }
    const { elementType, elements } = fromNative(as.vectorDecode(bytes))
    this.#elementType = elementType
    this.#elements = elements
    // Read by the native write paths.
    Object.defineProperty(this, '_bytes', { value: Buffer.from(bytes) })
  }

  /**
   * Creates a vector of half-precision floats from their raw IEEE 754 bit
   * patterns, as every Aerospike client does.
   *
   * @param {Uint16Array|number[]} bits - At most 131,072 bit patterns, each an
   * integer from 0 to 65,535 that encodes a finite number.
   * @returns {Vector}
   * @throws {TypeError} If `bits` is not an array or a typed array of numbers.
   * @throws {AerospikeError} With code `ERR_PARAM` if `bits` is empty, too long, or holds an invalid pattern.
   */
  static ofFloat16 (bits) {
    return create(FLOAT16, bits, value =>
      Number.isInteger(value) && value >= 0 && value <= 0xffff &&
      (value & FLOAT16_EXPONENT) !== FLOAT16_EXPONENT,
    'the bits of a finite float16 (an integer from 0 to 65535)')
  }

  /**
   * Creates a vector of 32-bit signed integers.
   *
   * @param {Int32Array|number[]} elements - From 1 to 65,536 integers.
   * @returns {Vector}
   * @throws {TypeError} If `elements` is not an array or a typed array of numbers.
   * @throws {AerospikeError} With code `ERR_PARAM` if `elements` is empty, too long, or holds a value that isn't a 32-bit integer.
   */
  static ofInt32 (elements) {
    return create(INT32, elements, value =>
      Number.isInteger(value) && value >= INT32_MIN && value <= INT32_MAX,
    'a 32-bit integer')
  }

  /**
   * Creates a vector of 32-bit floats. Values are rounded to 32-bit precision.
   *
   * @param {Float32Array|number[]} elements - From 1 to 65,536 finite numbers.
   * @returns {Vector}
   * @throws {TypeError} If `elements` is not an array or a typed array of numbers.
   * @throws {AerospikeError} With code `ERR_PARAM` if `elements` is empty, too long, or holds a value that isn't finite at 32-bit precision.
   */
  static ofFloat32 (elements) {
    return create(FLOAT32, elements, value => Number.isFinite(Math.fround(value)),
      'a finite 32-bit float')
  }

  /**
   * Creates a vector of 64-bit floats.
   *
   * @param {Float64Array|number[]} elements - From 1 to 32,768 finite numbers.
   * @returns {Vector}
   * @throws {TypeError} If `elements` is not an array or a typed array of numbers.
   * @throws {AerospikeError} With code `ERR_PARAM` if `elements` is empty, too long, or holds a value that isn't finite.
   */
  static ofFloat64 (elements) {
    return create(FLOAT64, elements, Number.isFinite, 'a finite number')
  }

  /**
   * The element type, one of {@link module:aerospike.vectorElementType|vectorElementType}.
   *
   * @type {number}
   */
  get elementType () {
    return this.#elementType
  }

  /**
   * The number of elements.
   *
   * @type {number}
   */
  get dimensions () {
    return this.#elements.length
  }

  /**
   * Returns a copy of the elements: a `Uint16Array` of raw bit patterns for
   * `FLOAT16`, otherwise an `Int32Array`, `Float32Array` or `Float64Array`.
   *
   * @returns {Uint16Array|Int32Array|Float32Array|Float64Array}
   */
  elements () {
    return this.#elements.slice()
  }

  /**
   * Returns a copy of the serialized vector, header included.
   *
   * @returns {Buffer}
   */
  toBytes () {
    return Buffer.from(this._bytes)
  }
}

// Checks each element in JS, where the error can name it; the C client checks
// the number of elements and serializes them.
function create (elementType, values, isValid, expected) {
  if (!Array.isArray(values) && !(ArrayBuffer.isView(values) && !(values instanceof DataView))) {
    throw new TypeError('Vector elements must be an array or a typed array of numbers')
  }
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (typeof value !== 'number') {
      throw new TypeError(`Vector element ${i} must be a number`)
    }
    if (!isValid(value)) {
      throw paramError(`Vector element ${i} must be ${expected}`)
    }
  }
  const elements = ELEMENT_ARRAYS[elementType].from(values)
  return new Vector(fromNative(as.vectorEncode(elementType, elements)))
}

// The native vector helpers return an error object instead of throwing.
function fromNative (result) {
  if (result.code !== undefined) {
    throw AerospikeError.fromASError(result)
  }
  return result
}

function paramError (message) {
  const error = new AerospikeError(message)
  error.code = status.ERR_PARAM
  return error
}

as.setVectorClass(Vector)

module.exports = Vector
