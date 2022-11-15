// *****************************************************************************
// Copyright 2022 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the 'License')
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************
const as = require('bindings')('aerospike.node')
const exp = as.exp
const bits = as.bitwise

const _valueExp = (op, valName) => (value) => [{ op, [valName]: value }]
const _uint = _valueExp(exp.ops.VAL_UINT, 'uintVal')
const _int = _valueExp(exp.ops.VAL_INT, 'intVal')
const _rtype = _valueExp(exp.ops.VAL_RTYPE, 'intVal')
/*********************************************************************************
 * BIT MODIFY EXPRESSIONS
 *********************************************************************************/

const _bitModify = () => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(exp.type.BLOB),
  ..._int(exp.sys.CALL_BITS | exp.sys.FLAG_MODIFY_LOCAL)
]

const _bitModStart = (op, param) => [
  ..._bitModify(),
  { op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

const _bitRead = (returnType) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(returnType),
  ..._int(exp.sys.CALL_BITS)
]

const _bitReadStart = (returnType, op, param) => [
  ..._bitRead(returnType),
  { op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

/**
 * @module aerospike/exp/bit
 *
 * @description The {@link module:aerospike/exp/bit|aerospike/exp/bit} module defines functions
 * for expressions on the Blob datatype.
 */
module.exports = {

  /**
 * Create an expression that performs bit resize operation.
 *
 * @param {Object} policy bit policy value.
 * @param {number} byteSize Number of bytes the resulting blob should occupy.
 * @param {number} flags bit resize flags value.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin byteSize bytes.
 */
  reSize: (bin, flags, byteSize, policy = null) => [
    ..._bitModStart(bits.opcodes.RESIZE, 3),
    ...byteSize,
    ..._uint((policy ? policy.flags : 0)),
    ..._uint(flags),
    ...bin
  ],

  /**
 * Create an expression that performs bit insert operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} byteOffset Byte index of where to insert the value.
 * @param {AerospikeExp} value Blob expression containing the bytes to insert.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob containing the inserted bytes.
 */
  insert: (bin, value, byteOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.INSERT, 3),
    ...byteOffset,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit remove operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} byteOffset Byte index of where to remove from.
 * @param {number} byteSize Number of bytes to remove.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes removed.
 */
  remove: (bin, byteSize, byteOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.REMOVE, 3),
    ...byteOffset,
    ...byteSize,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit set operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start writing.
 * @param {AerospikeExp} bitSize Number of bytes to overwrite.
 * @param {AerospikeExp} value Blob expression containing bytes to write.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes overwritten.
 */
  set: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.SET, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit or operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bytes to be operated on.
 * @param {AerospikeExp} value Blob expression containing bytes to write.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  or: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.OR, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit xor operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Blob expression containing bytes to write.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  xor: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.XOR, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit and operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Blob expression containing bytes to write.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  and: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.AND, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit not operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  not: (bin, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.NOT, 3),
    ...bitOffset,
    ...bitSize,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs an bit lshift operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {number} shift Number of bits to shift by.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  lShift: (bin, shift, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.LSHIFT, 4),
    ...bitOffset,
    ...bitSize,
    ...shift,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit rshift operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {number} shift Number of bits to shift by.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  rShift: (bin, shift, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.RSHIFT, 4),
    ...bitOffset,
    ...bitSize,
    ...shift,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit add operation.
 * Note: integers are stored big-endian.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Integer expression for value to add.
 * @param {number} action bit overflow action value.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  add: (bin, action, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.ADD, 5),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ..._uint(action),
    ...bin
  ],

  /**
 * Create an expression that performs bit add operation.
 * Note: integers are stored big-endian.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Integer expression for value to subtract.
 * @param {number} action bit overflow action value.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  subtract: (bin, action, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.SUBTRACT, 5),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ..._uint(action),
    ...bin
  ],

  /**
 * Create an expression that performs bit add operation.
 * Note: integers are stored big-endian.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Integer expression for value to set.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  setInt: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.SET_INT, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /*********************************************************************************
 * BIT READ EXPRESSIONS
 *********************************************************************************/

  /**
 * Create an expression that performs bit get operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin bit_size bits rounded up to the nearest byte size.
 */
  get: (bin, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.BLOB, bits.opcodes.GET, 2),
    ...bitOffset,
    ...bitSize,
    ...bin
  ],

  /**
 * Create an expression that performs bit count operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {number} integer value number of bits set to 1 in the bit_size region.
 */
  count: (bin, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.INT, bits.opcodes.COUNT, 2),
    ...bitOffset,
    ...bitSize,
    ...bin
  ],

  /**
 * Create an expression that performs bit lscan operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {AerospikeExp} value Boolean expression, true searches for 1, false for 0.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {number} integer value Index of the left most bit starting from __offset set to value.
 */
  lScan: (bin, value, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.INT, bits.opcodes.LSCAN, 3),
    ...bitOffset,
    ...bitSize,
    ...value,
    ...bin
  ],

  /**
 * Create an expression that performs bit rscan operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {AerospikeExp} value Boolean expression, true searches for 1, false for 0.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {number} integer value Index of the right most bit starting from __offset set to value.
 */
  rScan: (bin, value, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.INT, bits.opcodes.RSCAN, 3),
    ...bitOffset,
    ...bitSize,
    ...value,
    ...bin
  ],

  /**
 * Create an expression that performs bit get_int operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {boolean} sign Boolean value, true for signed, false for unsigned.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} integer value Index of the left most bit starting from offset set to value.
 */
  getInt: (bin, sign, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.INT, bits.opcodes.GET_INT, 3),
    ...bitOffset,
    ...bitSize,
    ..._int((sign ? 1 : 0)),
    ...bin
  ]
}
