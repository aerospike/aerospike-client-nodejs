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

const AerospikeError = require('./error')
const status = require('./status')

// -----------------------------------------------------------------------------
// Wire format (little-endian), confirmed against the real C/Java "aie/vector"
// client implementations - see docs/design/vector-phase-1-client-design.md §4.1.1:
//
//   Offset  Size (bytes)  Field         Description
//   0       1             version       Wire format version (currently 1).
//   1       1             element_type  See Vector.ElementType.
//   2       4             dimensions    Number of elements, little-endian uint32.
//   6       2             reserved      Reserved for future use; always 0.
//   8       variable      data          Contiguous little-endian element array.
// -----------------------------------------------------------------------------

const VERSION = 1
const HEADER_SIZE = 8

// Element type codes - matches as_vector_element_type (C) / Vector.ElementType (Java).
// There is intentionally no BIN/Hamming type; neither real client implements one.
const ElementType = {
  FLOAT16: 0x01,
  INT32: 0x02,
  FLOAT32: 0x03,
  FLOAT64: 0x04
}

const ELEMENT_TYPE_NAMES = Object.freeze({
  [ElementType.FLOAT16]: 'FLOAT16',
  [ElementType.INT32]: 'INT32',
  [ElementType.FLOAT32]: 'FLOAT32',
  [ElementType.FLOAT64]: 'FLOAT64'
})

// Size in bytes of a single element, per type.
const ELEMENT_SIZE = Object.freeze({
  [ElementType.FLOAT16]: 2,
  [ElementType.INT32]: 4,
  [ElementType.FLOAT32]: 4,
  [ElementType.FLOAT64]: 8
})

// Server-enforced payload cap: 256KB (1 << 18 bytes), matching
// AS_VECTOR_VALUE_MAX_ELEMENTS_BYTES in the C client.
const MAX_ELEMENTS_BYTES = 1 << 18

function maxDimensions (elementType) {
  const size = ELEMENT_SIZE[elementType]
  return size ? Math.floor(MAX_ELEMENTS_BYTES / size) : 0
}

function paramError (message) {
  const err = new AerospikeError(message)
  err.code = status.ERR_PARAM
  return err
}

function isTypedOrPlainArray (value) {
  return Array.isArray(value) ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array
}

function validateDimensions (elementType, length) {
  if (length < 1) {
    throw paramError('Vector must have at least one element')
  }
  const max = maxDimensions(elementType)
  if (length > max) {
    throw paramError(
      `Vector dimensions (${length}) exceeds the maximum of ${max} for element type ${ELEMENT_TYPE_NAMES[elementType]}`
    )
  }
}

function validateFloat16Elements (raw) {
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i]
    if (!Number.isInteger(v) || v < 0 || v > 0xffff) {
      throw paramError(`Vector element at index ${i} is not a valid float16 bit pattern (expected an integer in [0, 65535]): ${v}`)
    }
  }
}

function validateInt32Elements (raw) {
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i]
    if (!Number.isInteger(v) || v < -2147483648 || v > 2147483647) {
      throw paramError(`Vector element at index ${i} is not a valid int32 value: ${v}`)
    }
  }
}

function validateFloatElements (raw) {
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i]
    if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) {
      throw paramError(`Vector element at index ${i} must be a finite number (NaN/Infinity are not allowed): ${v}`)
    }
  }
}

/**
 * @class Vector
 *
 * @classdesc Representation of a fixed-dimension numeric vector, used for
 * vector similarity search (see {@link module:aerospike/exp.vector}. Wire
 * format, element-type set, and API shape are modeled directly on the
 * reference C/Java client implementations - see
 * <code>docs/design/vector-phase-1-client-design.md</code> §4.1 in this
 * repository for the full design rationale.
 *
 * <code>Vector</code> instances are constructed via one of the
 * {@link Vector.ofFloat16}, {@link Vector.ofInt32}, {@link Vector.ofFloat32},
 * or {@link Vector.ofFloat64} static factory methods - there is no public
 * constructor, matching the real C (<code>as_vector_value_new_*</code>) and
 * Java (<code>Vector.of*</code>) APIs.
 *
 * Note: as of this writing, sending/receiving <code>Vector</code> values
 * to/from the Aerospike server is not yet implemented in this client - the
 * vendored C client submodule does not yet expose the required
 * <code>AS_BYTES_VECTOR</code> support. This class can be constructed,
 * validated, and serialized to/from its wire-format {@link Buffer}
 * representation independently of a live connection.
 *
 * @since v6.next
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Vector = Aerospike.Vector
 *
 * const embedding = Vector.ofFloat32([0.12, -0.98, 0.33, 0.04])
 * console.log(embedding.dimensions) // => 4
 * console.log(embedding.elementType === Vector.ElementType.FLOAT32) // => true
 *
 * const buf = embedding.toBuffer()
 * const roundTripped = Vector.fromBuffer(buf)
 */
class Vector {
  /**
   * @private
   *
   * Use {@link Vector.ofFloat16}, {@link Vector.ofInt32},
   * {@link Vector.ofFloat32}, or {@link Vector.ofFloat64} instead of calling
   * this constructor directly.
   */
  constructor (elementType, elements, version = VERSION) {
    /**
     * Wire format version. Always {@link Vector.VERSION} for vectors created
     * by this client; may differ for vectors decoded via
     * {@link Vector.fromBuffer} from a future wire format.
     *
     * @type {number}
     */
    this.version = version

    /**
     * Element type of this vector. One of {@link Vector.ElementType}.
     *
     * @type {number}
     */
    this.elementType = elementType

    /**
     * Typed array holding this vector's elements. The concrete type depends
     * on {@link Vector#elementType}: a <code>Uint16Array</code> of raw
     * float16 bit patterns for {@link Vector.ElementType.FLOAT16}, an
     * <code>Int32Array</code> for {@link Vector.ElementType.INT32}, a
     * <code>Float32Array</code> for {@link Vector.ElementType.FLOAT32}, or a
     * <code>Float64Array</code> for {@link Vector.ElementType.FLOAT64}.
     *
     * @type {Uint16Array|Int32Array|Float32Array|Float64Array}
     */
    this.elements = elements

    validateVector(this)
  }

  /**
   * @function Vector#dimensions
   *
   * @summary Number of elements in this vector.
   *
   * @type {number}
   */
  get dimensions () {
    return this.elements.length
  }

  /**
   * @function Vector#toBuffer
   *
   * @summary Serializes this vector into its wire format: an 8-byte header
   * (<code>version</code>, <code>element_type</code>, <code>dimensions</code>,
   * <code>reserved</code>) followed by the little-endian element data.
   *
   * @return {Buffer} the serialized vector, including the 8-byte header.
   */
  toBuffer () {
    const size = ELEMENT_SIZE[this.elementType]
    const buf = Buffer.allocUnsafe(HEADER_SIZE + this.elements.length * size)
    buf.writeUInt8(this.version, 0)
    buf.writeUInt8(this.elementType, 1)
    buf.writeUInt32LE(this.elements.length, 2)
    buf.writeUInt16LE(0, 6) // reserved
    writeElements(buf, HEADER_SIZE, this.elementType, this.elements)
    return buf
  }

  /**
   * @function Vector#elementBytes
   *
   * @summary Returns this vector's element data only, little-endian, without
   * the 8-byte header. This is the form expected as the query-vector
   * argument of a vector-distance expression (see
   * {@link module:aerospike/exp.vector}).
   *
   * @return {Buffer} the little-endian element bytes, with no header.
   */
  elementBytes () {
    const size = ELEMENT_SIZE[this.elementType]
    const buf = Buffer.allocUnsafe(this.elements.length * size)
    writeElements(buf, 0, this.elementType, this.elements)
    return buf
  }

  /**
   * @function Vector.fromBuffer
   *
   * @summary Deserializes a vector from its wire format, the inverse of
   * {@link Vector#toBuffer}. Validates the header size, element-type code,
   * and that <code>buffer</code> is long enough for the declared number of
   * dimensions before trusting the payload.
   *
   * @param {Buffer} buffer - buffer containing the serialized vector,
   * including the 8-byte header.
   *
   * @return {Vector} the deserialized vector.
   */
  static fromBuffer (buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw paramError('Vector.fromBuffer() requires a Buffer')
    }
    if (buffer.length < HEADER_SIZE) {
      throw paramError(`Invalid vector buffer: length ${buffer.length} is smaller than the ${HEADER_SIZE}-byte header`)
    }

    const version = buffer.readUInt8(0)
    const elementType = buffer.readUInt8(1)
    const dimensions = buffer.readUInt32LE(2)
    // Bytes [6, 8) are reserved - read but not currently validated, matching
    // the permissive behavior of the real C/Java decode paths.

    if (!ELEMENT_SIZE[elementType]) {
      throw paramError(`Invalid vector buffer: unknown element type code ${elementType}`)
    }

    const size = ELEMENT_SIZE[elementType]
    const expectedLength = HEADER_SIZE + dimensions * size
    if (buffer.length < expectedLength) {
      throw paramError(
        `Invalid vector buffer: length ${buffer.length} is smaller than expected ${expectedLength} (header + ${dimensions} x ${size}-byte elements)`
      )
    }

    const elements = readElements(buffer, HEADER_SIZE, elementType, dimensions)
    return new Vector(elementType, elements, version)
  }

  /**
   * @function Vector.ofFloat16
   *
   * @summary Creates a vector of raw float16 (IEEE 754 half precision)
   * elements. Since JavaScript has no native float16 type, each element is
   * passed as its raw 16-bit bit pattern - this client does not perform
   * float&harr;half-float value conversion, matching the real C/Java clients.
   *
   * @param {number[]|Uint16Array} data - array of raw float16 bit patterns,
   * each an integer in <code>[0, 65535]</code>.
   *
   * @return {Vector} a new vector with element type {@link Vector.ElementType.FLOAT16}.
   */
  static ofFloat16 (data) {
    assertArrayLike(data)
    const raw = Array.from(data)
    validateFloat16Elements(raw)
    return new Vector(ElementType.FLOAT16, Uint16Array.from(raw))
  }

  /**
   * @function Vector.ofInt32
   *
   * @summary Creates a vector of int32 elements.
   *
   * @param {number[]|Int32Array} data - array of 32-bit integer elements.
   *
   * @return {Vector} a new vector with element type {@link Vector.ElementType.INT32}.
   */
  static ofInt32 (data) {
    assertArrayLike(data)
    const raw = Array.from(data)
    validateInt32Elements(raw)
    return new Vector(ElementType.INT32, Int32Array.from(raw))
  }

  /**
   * @function Vector.ofFloat32
   *
   * @summary Creates a vector of float (fp32) elements.
   *
   * @param {number[]|Float32Array} data - array of floating point elements.
   *
   * @return {Vector} a new vector with element type {@link Vector.ElementType.FLOAT32}.
   */
  static ofFloat32 (data) {
    assertArrayLike(data)
    const raw = Array.from(data)
    validateFloatElements(raw)
    return new Vector(ElementType.FLOAT32, Float32Array.from(raw))
  }

  /**
   * @function Vector.ofFloat64
   *
   * @summary Creates a vector of double (fp64) elements.
   *
   * @param {number[]|Float64Array} data - array of floating point elements.
   *
   * @return {Vector} a new vector with element type {@link Vector.ElementType.FLOAT64}.
   */
  static ofFloat64 (data) {
    assertArrayLike(data)
    const raw = Array.from(data)
    validateFloatElements(raw)
    return new Vector(ElementType.FLOAT64, Float64Array.from(raw))
  }
}

/**
 * @name Vector.VERSION
 *
 * @summary Current vector wire format version.
 *
 * @type {number}
 */
Vector.VERSION = VERSION

/**
 * @name Vector.ElementType
 *
 * @summary Vector element type. Identifies how each element of a
 * {@link Vector} is encoded on the wire. There is intentionally no
 * <code>BIN</code>/Hamming type - see
 * <code>docs/design/vector-phase-1-client-design.md</code> §4.1.1.
 *
 * @type {Object}
 * @property {number} FLOAT16 - float16: high-density vectors (IEEE 754 half). Elements are raw 16-bit bit patterns.
 * @property {number} INT32 - int32: integer-based embeddings.
 * @property {number} FLOAT32 - float (fp32): standard FP32; the default for {@link module:aerospike/exp.vector}.
 * @property {number} FLOAT64 - double (fp64): high-precision FP64.
 */
Vector.ElementType = ElementType

function assertArrayLike (data) {
  if (!isTypedOrPlainArray(data)) {
    throw paramError('Vector data must be an array or typed array of numbers')
  }
}

function validateVector (vector) {
  if (!ELEMENT_TYPE_NAMES[vector.elementType]) {
    throw paramError(`Unknown vector element type: ${vector.elementType}`)
  }
  validateDimensions(vector.elementType, vector.elements.length)
}

function writeElements (buf, offset, elementType, elements) {
  switch (elementType) {
    case ElementType.FLOAT16:
      for (let i = 0; i < elements.length; i++) {
        buf.writeUInt16LE(elements[i], offset + i * 2)
      }
      break
    case ElementType.INT32:
      for (let i = 0; i < elements.length; i++) {
        buf.writeInt32LE(elements[i], offset + i * 4)
      }
      break
    case ElementType.FLOAT32:
      for (let i = 0; i < elements.length; i++) {
        buf.writeFloatLE(elements[i], offset + i * 4)
      }
      break
    case ElementType.FLOAT64:
      for (let i = 0; i < elements.length; i++) {
        buf.writeDoubleLE(elements[i], offset + i * 8)
      }
      break
    default:
      throw paramError(`Unknown vector element type: ${elementType}`)
  }
}

function readElements (buf, offset, elementType, dimensions) {
  switch (elementType) {
    case ElementType.FLOAT16: {
      const out = new Uint16Array(dimensions)
      for (let i = 0; i < dimensions; i++) {
        out[i] = buf.readUInt16LE(offset + i * 2)
      }
      return out
    }
    case ElementType.INT32: {
      const out = new Int32Array(dimensions)
      for (let i = 0; i < dimensions; i++) {
        out[i] = buf.readInt32LE(offset + i * 4)
      }
      return out
    }
    case ElementType.FLOAT32: {
      const out = new Float32Array(dimensions)
      for (let i = 0; i < dimensions; i++) {
        out[i] = buf.readFloatLE(offset + i * 4)
      }
      return out
    }
    case ElementType.FLOAT64: {
      const out = new Float64Array(dimensions)
      for (let i = 0; i < dimensions; i++) {
        out[i] = buf.readDoubleLE(offset + i * 8)
      }
      return out
    }
    default:
      throw paramError(`Unknown vector element type: ${elementType}`)
  }
}

module.exports = Vector
