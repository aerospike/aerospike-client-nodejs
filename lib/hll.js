// *****************************************************************************
// Copyright 2020 Aerospike, Inc.
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
 * @module aerospike/hll
 *
 * @description This module defines operations on the HyperLogLog data type.
 * Create HLL operations used by the {@link Client#operate} command.
 *
 * @see {@link Client#operate}
 */

const as = require('bindings')('aerospike.node')
const opcodes = as.hllOperations
const Context = require('./cdt_context')
const AerospikeError = require('./error')
const Operation = require('./operations').Operation

/**
 * @class module:aerospike/hll~HLLOperation
 *
 * @classdesc Use the methods in the {@link module:aerospike/hll|hll}
 * module to create HLL operations for use with the {@link Client#operate}
 * command.
 */
class HLLOperation extends Operation {

  /**
   * @summary By setting the context, the HLL operation will be executed on a
   * nested HLL value, instead of the bin value itself.
   *
   * @param { CdtContext | function } context - Either a Context object, or a
   * function which accepts a Context object.
   * @returns { ListOperation } The list operation itself.
   *
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

exports.init = function (bin, indexBitCount, mhBitCount = -1, policy = undefined) {
  return new HLLOperation(opcodes.INIT, bin, {
    indexBitCount,
    mhBitCount,
    policy
  })
}

exports.add = function (bin, list, indexBitCount, mhBitCount = -1, policy = undefined) {
  return new HLLOperation(opcodes.ADD, bin, {
    list,
    indexBitCount,
    mhBitCount,
    policy
  })
}

exports.update = function (bin, list, policy) {
  return new HLLOperation(opcodes.ADD, bin, {
    list,
    indexBitCount: -1,
    mhBitCount: -1,
    policy
  })
}

exports.refreshCount = function (bin) {
  return new HLLOperation(opcodes.REFRESH_COUNT, bin)
}

exports.fold = function (bin, indexBitCount) {
  return new HLLOperation(opcodes.FOLD, bin, {
    indexBitCount
  })
}

exports.getCount = function (bin) {
  return new HLLOperation(opcodes.GET_COUNT, bin)
}
