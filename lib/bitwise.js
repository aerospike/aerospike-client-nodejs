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
 * @description This module defines bitwise operations on the Bytes data type. Create
 * bitwise operations used by the {@link Client#operate} command.
 *
 * @see {@link Client#operate}
 */

const as = require('bindings')('aerospike.node')
const opcodes = as.bitOperations

/**
 * @class module:aerospike/bitwise~BitOperation
 *
 * @classdesc Use the methods in the {@link module:aerospike/bitwise|bitwise}
 * module to create bitwise operations for use with the {@link Client#operate}
 * command.
 */
class BitOperation {
  /**
   * @private
   */
  constructor (op, bin, props) {
    this.op = op
    this.bin = bin
    if (props) {
      Object.assign(this, props)
    }
  }

  withPolicy (policy) {
    this.policy = policy
    return this
  }
}

exports.resize = function (bin, size, flags = 0) {
  return new BitOperation(opcodes.BIT_RESIZE, bin, {
    size,
    flags
  })
}

exports.insert = function (bin, offset, value) {
  return new BitOperation(opcodes.BIT_INSERT, bin, {
    offset,
    value
  })
}

exports.remove = function (bin, byteOffset, byteSize) {
  return new BitOperation(opcodes.BIT_REMOVE, bin, {
    offset: byteOffset,
    size: byteSize
  })
}

exports.set = function (bin, bitOffset, bitSize, value) {
  if (Buffer.isBuffer(value)) {
    return new BitOperation(opcodes.BIT_SET, bin, {
      bitOffset,
      bitSize,
      value
    })
  } else if (Number.isSafeInteger(value)) {
    return new BitOperation(opcodes.BIT_SET_INT, bin, {
      bitOffset,
      bitSize,
      value
    })
  }
  throw new TypeError('Value should be a Buffer or an Integer')
}

exports.or = function (bin, bitOffset, bitSize, value) {
  return new BitOperation(opcodes.BIT_OR, bin, {
    bitOffset,
    bitSize,
    value
  })
}

exports.xor = function (bin, bitOffset, bitSize, value) {
  return new BitOperation(opcodes.BIT_XOR, bin, {
    bitOffset,
    bitSize,
    value
  })
}

exports.and = function (bin, bitOffset, bitSize, value) {
  return new BitOperation(opcodes.BIT_AND, bin, {
    bitOffset,
    bitSize,
    value
  })
}

exports.not = function (bin, bitOffset, bitSize) {
  return new BitOperation(opcodes.BIT_NOT, bin, {
    offset: bitOffset,
    size: bitSize
  })
}

exports.lshift = function (bin, bitOffset, bitSize, shift) {
  return new BitOperation(opcodes.BIT_LSHIFT, bin, {
    bitOffset,
    bitSize,
    shift
  })
}

exports.rshift = function (bin, bitOffset, bitSize, shift) {
  return new BitOperation(opcodes.BIT_RSHIFT, bin, {
    bitOffset,
    bitSize,
    shift
  })
}

exports.add = function (bin, bitOffset, bitSize, value, sign, action = 0) {
  return new BitOperation(opcodes.BIT_ADD, bin, {
    bitOffset,
    bitSize,
    value,
    sign,
    action
  })
}

exports.subtract = function (bin, bitOffset, bitSize, value, sign, action) {
  return new BitOperation(opcodes.BIT_SUBTRACT, bin, {
    bitOffset,
    bitSize,
    value,
    sign,
    action
  })
}

exports.get = function (bin, bitOffset, bitSize) {
  return new BitOperation(opcodes.BIT_GET, bin, {
    bitOffset,
    bitSize
  })
}

exports.getInt = function (bin, bitOffset, bitSize, sign) {
  return new BitOperation(opcodes.BIT_GET_INT, bin, {
    bitOffset,
    bitSize,
    sign
  })
}

exports.lscan = function (bin, bitOffset, bitSize, value) {
  return new BitOperation(opcodes.BIT_LSCAN, bin, {
    bitOffset,
    bitSize,
    value
  })
}

exports.rscan = function (bin, bitOffset, bitSize, value) {
  return new BitOperation(opcodes.BIT_RSCAN, bin, {
    bitOffset,
    bitSize,
    value
  })
}
