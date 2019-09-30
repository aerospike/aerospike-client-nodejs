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

/**
 * @module aerospike/bitwise
 *
 * @description This module defines bitwise operations on the Bytes data type.
 * The operations are executed using the {@link Client#operate} command.
 *
 * Offset orientation is left-to-right. Negative offsets are supported. If the
 * offset is negative, the offset starts backwards from end of the bitmap. If
 * an offset is out of bounds, a parameter error will be returned.
 *
 * For more information, please refer to the
 * <a href="http://www.aerospike.com/docs/guide/data-types.html#bytes">&uArr;Bytes Data Type</a>
 * and <a href="http://www.aerospike.com/docs/guide/bitwise.html">&uArr;Bitwise Operations</a>
 * documentation in the Aerospike Feature Guide.
 *
 * Bitwise operations require Aerospike Server 4.6.0 or later.
 *
 * @see {@link Client#operate}
 * @since v3.13.0
 */

const Operation = require('./operations').Operation
const as = require('bindings')('aerospike.node')
const opcodes = as.bitOperations

/**
 * @class module:aerospike/bitwise~BitwiseOperation
 *
 * @classdesc Use the methods in the {@link module:aerospike/bitwise|bitwise}
 * module to create bitwise operations for use with the {@link Client#operate}
 * command.
 */
class BitwiseOperation extends Operation {
  /**
   * @summary Applies a {@link BitwisePolicy} to the operation.
   *
   * @param {BitwisePolicy} policy - Policy to apply to the operation.
   */
  withPolicy (policy) {
    this.policy = policy
    return this
  }
}

/**
 * @class module:aerospike/bitwise~OverflowableBitwiseOp
 *
 * @classdesc Bitwise operation variant that can overflow/underflow.
 *
 * @see module:aerospike/bitwise.add
 * @see module:aerospike/bitwise.subtract
 */
class OverflowableBitwiseOp extends BitwiseOperation {
  constructor (op, bin, props) {
    super(op, bin, props)
    this.overflowAction = as.bitwise.overflow.FAIL
  }

  /**
   * @summary Sets the action to take when the operation overflows/underflows.
   *
   * @param {number} action - {@link module:aerospike/bitwise.overflow|overflow
   * action} to apply to the operation.
   */
  onOverflow (action) {
    this.overflowAction = action
    return this
  }
}

/**
 * @summary Bitwise write flags.
 *
 * @type Object
 * @property {number} DEFAULT - Allow create or update. Default.
 * @property {number} CREATE_ONLY - If the bin already exists, the operation
 * will be denied. If the bin does not exist, a new bin will be created.
 * @property {number} UPDATE_ONLY - If the bin already exists, the bin will be
 * overwritten. If the bin does not exist, the operation will be denied.
 * @property {number} NO_FAIL - Do not raise error if operation is denied.
 * @property {number} PARTIAL - Allow other valid operations to be committed if
 * this operations is denied due to flag constraints.
 *
 * @see {@link BitwisePolicy}
 */
exports.writeFlags = as.bitwise.writeFlags

/**
 * @summary Bitwise resize flags.
 *
 * @type Object
 * @property {number} DEFAULT - Default.
 * @property {number} FROM_FRONT - Add/remove bytes from the beginning instead
 * of the end.
 * @property {number} GROW_ONLY - Only allow the bitmap size to increase.
 * @property {number} SHRINK_ONLY - Only allow the bitmap size to decrease.
 */
exports.resizeFlags = as.bitwise.resizeFlags

/**
 * @summary Bitwise overflow action.
 *
 * @description Action to take when a bitwise {@link
 * module:aerospike/bitwise.add|add}/{@link
 * module:aerospike/bitwise.subtract|subtract} operation results in
 * overflow/underflow.
 *
 * @type Object
 * @property {number} FAIL - Fail operation with error. Default.
 * @property {number} SATURATE - If add/subtract overflows/underflows, set to
 * max/min value. Example: MAXINT + 1 = MAXINT.
 * @property {number} WRAP - If add/subtract overflows/underflows, wrap the
 * value. Example: MAXINT + 1 = -1.
 */
exports.overflow = as.bitwise.overflow

/**
 * @summary Create byte "resize" operation.
 * @description Server resizes bitmap to byte size according to flags.
 * Server does not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} size - Number of bytes to resize the byte value to.
 * @param {number} [flags=bitwise.resizeFlags.DEFAULT] - Optional {@link module:aerospike/bitwise.resizeFlags|resize flags}.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.resize = function (bin, size, flags = 0) {
  return new BitwiseOperation(opcodes.BIT_RESIZE, bin, {
    size,
    flags
  })
}

/**
 * @summary Create byte "insert" operation.
 * @description Server inserts value bytes into bitmap. Server does not return
 * a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} offset - Offset in bytes.
 * @param {buffer} value - Bytes to insert.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.insert = function (bin, byteOffset, value) {
  return new BitwiseOperation(opcodes.BIT_INSERT, bin, {
    offset: byteOffset,
    value
  })
}

/**
 * @summary Create byte "remove" operation.
 * @description Server removes bytes from bitmap. Server does not return a
 * value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} byteOffset - Offset in bytes.
 * @param {number} byteSize - Number of bytes to remove
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.remove = function (bin, byteOffset, byteSize) {
  return new BitwiseOperation(opcodes.BIT_REMOVE, bin, {
    offset: byteOffset,
    size: byteSize
  })
}

/**
 * @summary Create bit "set" operation.
 * @description Server sets value on bitmap. Server does not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits to set.
 * @param {number | buffer} value - Value to set.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 *
 * @throws TypeError unless value is an integer or a Buffer.
 */
exports.set = function (bin, bitOffset, bitSize, value) {
  if (Buffer.isBuffer(value)) {
    return new BitwiseOperation(opcodes.BIT_SET, bin, {
      bitOffset,
      bitSize,
      value
    })
  } else if (Number.isSafeInteger(value)) {
    return new BitwiseOperation(opcodes.BIT_SET_INT, bin, {
      bitOffset,
      bitSize,
      value
    })
  }
  throw new TypeError('Value should be a Buffer or an Integer')
}

/**
 * @summary Create bit "or" operation.
 * @description Server performs bitwise "or" on value and bitmap. Server does
 * not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits.
 * @param {buffer} value - Value.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.or = function (bin, bitOffset, bitSize, value) {
  return new BitwiseOperation(opcodes.BIT_OR, bin, {
    bitOffset,
    bitSize,
    value
  })
}

/**
 * @summary Create bit "exclusive or" operation.
 * @description Server performs bitwise "xor" on value and bitmap. Server does
 * not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits.
 * @param {buffer} value - Value.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.xor = function (bin, bitOffset, bitSize, value) {
  return new BitwiseOperation(opcodes.BIT_XOR, bin, {
    bitOffset,
    bitSize,
    value
  })
}

/**
 * @summary Create bit "and" operation.
 * @description Server performs bitwise "and" on value and bitmap. Server does
 * not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits.
 * @param {buffer} value - Value.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.and = function (bin, bitOffset, bitSize, value) {
  return new BitwiseOperation(opcodes.BIT_AND, bin, {
    bitOffset,
    bitSize,
    value
  })
}

/**
 * @summary Create bit "not" operation.
 * @description Server negates bitmap. Server does not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.not = function (bin, bitOffset, bitSize) {
  return new BitwiseOperation(opcodes.BIT_NOT, bin, {
    offset: bitOffset,
    size: bitSize
  })
}

/**
 * @summary Create bit "left shift" operation.
 * @description Server shifts left bitmap. Server does not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits to shift.
 * @param {number} shift - Distance to shift bits.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.lshift = function (bin, bitOffset, bitSize, shift) {
  return new BitwiseOperation(opcodes.BIT_LSHIFT, bin, {
    bitOffset,
    bitSize,
    shift
  })
}

/**
 * @summary Create bit "right shift" operation.
 * @description Server shifts right bitmap. Server does not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits to shift.
 * @param {number} shift - Distance to shift bits.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.rshift = function (bin, bitOffset, bitSize, shift) {
  return new BitwiseOperation(opcodes.BIT_RSHIFT, bin, {
    bitOffset,
    bitSize,
    shift
  })
}

/**
 * @summary Create bit "add" operation.
 * @description Server adds value to bitmap. Server does not return a value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits; must be <= 64.
 * @param {number} value - Value to add.
 * @param {boolean} sign - Sign indicates if bits should be treated as a signed
 * number.
 * @returns {OverflowableBitwiseOp} Operation that can be passed to the {@link
 * Client#operate} command.
 *
 * @see {@link * module:aerospike/bitwise~OverflowableBitwiseOp#onOverflow|OverflowableBitwiseOp#onOverflow}
 * can used to control how the operation executes, when the addition results
 * in an overflow/underflow.
 */
exports.add = function (bin, bitOffset, bitSize, value, sign) {
  return new OverflowableBitwiseOp(opcodes.BIT_ADD, bin, {
    bitOffset,
    bitSize,
    value,
    sign
  })
}

/**
 * @summary Create bit "subtract" operation.
 * @description Server subtracts value from bitmap. Server does not return a
 * value.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits; must be <= 64.
 * @param {number} value - Value to subtract.
 * @param {boolean} sign - Sign indicates if bits should be treated as a signed
 * number.
 * @returns {OverflowableBitwiseOp} Operation that can be passed to the {@link
 * Client#operate} command.
 *
 * @see {@link * module:aerospike/bitwise~OverflowableBitwiseOp#onOverflow|OverflowableBitwiseOp#onOverflow}
 * can used to control how the operation executes, when the addition results
 * in an overflow/underflow.
 */
exports.subtract = function (bin, bitOffset, bitSize, value, sign) {
  return new OverflowableBitwiseOp(opcodes.BIT_SUBTRACT, bin, {
    bitOffset,
    bitSize,
    value,
    sign
  })
}

/**
 * @summary Create bit "get" operation.
 * @description Server returns bits from bitmap.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits to return.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link
 * Client#operate} command.
 */
exports.get = function (bin, bitOffset, bitSize) {
  return new BitwiseOperation(opcodes.BIT_GET, bin, {
    bitOffset,
    bitSize
  })
}

/**
 * @summary Create bit "get integer" operation.
 * @description Server returns integer from bitmap.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits to return.
 * @param {boolean} sign - Sign indicates if bits should be treated as a
 * signed.
 * @returns {BitwiseOperation} Operation that can be passed to the {@link
 * Client#operate} command.
 */
exports.getInt = function (bin, bitOffset, bitSize, sign) {
  return new BitwiseOperation(opcodes.BIT_GET_INT, bin, {
    bitOffset,
    bitSize,
    sign
  })
}

/**
 * @summary Create bit "left scan" operation.
 * @description Server returns integer bit offset of the first specified value
 * bit in bitmap.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits.
 * @param {boolean} value - value to scan for, "0" (false) or "1" (true).
 * @returns {BitwiseOperation} Operation that can be passed to the {@link
 * Client#operate} command.
 */
exports.lscan = function (bin, bitOffset, bitSize, value) {
  return new BitwiseOperation(opcodes.BIT_LSCAN, bin, {
    bitOffset,
    bitSize,
    value
  })
}

/**
 * @summary Create bit "right scan" operation.
 * @description Server returns integer bit offset of the last specified value
 * bit in bitmap.
 *
 * @param {string} bin - The name of the bin. The bin must contain a byte value.
 * @param {number} bitOffset - Offset in bits.
 * @param {number} bitSize - Number of bits.
 * @param {boolean} value - value to scan for, "0" (false) or "1" (true).
 * @returns {BitwiseOperation} Operation that can be passed to the {@link
 * Client#operate} command.
 */
exports.rscan = function (bin, bitOffset, bitSize, value) {
  return new BitwiseOperation(opcodes.BIT_RSCAN, bin, {
    bitOffset,
    bitSize,
    value
  })
}
