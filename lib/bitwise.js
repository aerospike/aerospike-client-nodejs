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
const Context = require('./cdt_context')
const AerospikeError = require('./error')

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

  /**
   * @summary By setting the context, the bitwise operation will be executed on
   * a nested binary value, instead of the bin value itself.
   *
   * @param { CdtContext | function } context - Either a Context object, or a
   * function which accepts a Context object.
   * @returns { BitOperation } The bitwise operation itself.
   */
  withContext (contextOrFunction) {
    if (contextOrFunction instanceof Context) {
      this.context = contextOrFunction
    } else if (typeof contextOrFunction === 'function') {
      this.context = new Context()
      contextOrFunction(this.context)
    } else {
      throw new AerospikeError('Context param must be a CDT Context or a function that accepts a context')
    }
    return this
  }
}

exports.resize = function (bin, byteSize, flags = 0) {
  return new BitOperation(opcodes.BIT_RESIZE, bin, {
    byteSize,
    flags
  })
}

exports.insert = function (bin, offset, value) {
  return new BitOperation(opcodes.BIT_INSERT, bin, {
    offset,
    value
  })
}
