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

// Command codes for HLL read/readList operations.
const GET_COUNT_COMMAND = 50
const GET_UNION_COMMAND = 51
const GET_UNION_COUNT_COMMAND = 52
const GET_INTERSECT_COUNT_COMMAND = 53
const GET_SIMILARITY_COMMAND = 54
const DESCRIBE_COMMAND = 55

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

  /**
   * @summary Applies a {@link HLLPolicy} to the operation.
   *
   * @param {HLLPolicy} policy - Policy to apply to the operation.
   */
  withPolicy (policy) {
    this.policy = policy
    return this
  }
}

/**
 * Initializes a HLL bin, using the specified index and (optional) min hash
 * counts.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {number} indexBitCount - Number of index bits. Must be between 4 and 16 inclusive.
 * @param {number} [mhBitCount] - Number of min hash bits. If specified, must
 * be between 4 and 58 inclusive.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.init = function (bin, indexBitCount, mhBitCount = -1) {
  return new HLLOperation(opcodes.INIT, bin, {
    indexBitCount,
    mhBitCount
  })
}

/**
 * Adds one or more entries to an HLL set, an returns the number of entries
 * that caused HLL to update a register. If the HLL bin does not yet exist, the
 * operation creates it, using the specified bit counts.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - Entries to be added to the HLL set.
 * @param {number} indexBitCount - Number of index bits. Must be between 4 and 16 inclusive.
 * @param {number} [mhBitCount] - Number of min hash bits. If specified, must
 * be between 4 and 58 inclusive.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.add = function (bin, list, indexBitCount, mhBitCount = -1) {
  return new HLLOperation(opcodes.ADD, bin, {
    list,
    indexBitCount,
    mhBitCount
  })
}

/**
 * Updates one or more entries on an existing HLL set, and returns the number of
 * entries that caused HLL to update a register. This operation assumes HLL bin
 * already exists.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - Entries to be added to the HLL set.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.update = function (bin, list) {
  return new HLLOperation(opcodes.ADD, bin, {
    list,
    indexBitCount: -1,
    mhBitCount: -1
  })
}

/**
 * Sets a union of the specified HLL objects with the HLL bin.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - List of HLL objects (of type Buffer).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.setUnion = function (bin, list) {
  return new HLLOperation(opcodes.SET_UNION, bin, {
    list
  })
}

/**
 * Updates the cached count (if stale), and returns the estimated number of
 * elements in the HLL bin.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.refreshCount = function (bin) {
  return new HLLOperation(opcodes.REFRESH_COUNT, bin)
}

/**
 * Folds the index bit count to the specified value. This can only be applied
 * when the min hash count on the HLL bin is 0.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {number} indexBitCount - Number of index bits. Must be between 4 and 16 inclusive.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.fold = function (bin, indexBitCount) {
  return new HLLOperation(opcodes.FOLD, bin, {
    indexBitCount
  })
}

/**
 * Returns the estimated number of elements in the HLL bin.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.getCount = function (bin) {
  return new HLLOperation(opcodes.READ, bin, {
    command: GET_COUNT_COMMAND
  })
}

/**
 * Returns an HLL object, which is the union of all specified HLL objects in
 * the list with the HLL bin.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - List of HLL objects (of type Buffer).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.getUnion = function (bin, list) {
  return new HLLOperation(opcodes.READ_LIST, bin, {
    list,
    command: GET_UNION_COMMAND
  })
}

/**
 * Returns the estimated number of elements that would be contained by the
 * union of these HLL objects.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - List of HLL objects (of type Buffer).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.getUnionCount = function (bin, list) {
  return new HLLOperation(opcodes.READ_LIST, bin, {
    list,
    command: GET_UNION_COUNT_COMMAND
  })
}

/**
 * Returns the estimated number of elements that would be contained by the
 * intersection of these HLL objects.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - List of HLL objects (of type Buffer).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.getIntersectCount = function (bin, list) {
  return new HLLOperation(opcodes.READ_LIST, bin, {
    list,
    command: GET_INTERSECT_COUNT_COMMAND
  })
}

/**
 * Returns the estimated similarity of these HLL objects. Return type is double.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - List of HLL objects (of type Buffer).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.getSimilarity = function (bin, list) {
  return new HLLOperation(opcodes.READ_LIST, bin, {
    list,
    command: GET_SIMILARITY_COMMAND
  })
}

/**
 * Returns the index and min hash bit counts used to create the HLL bin as a
 * list of integers.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.describe = function (bin) {
  return new HLLOperation(opcodes.READ, bin, {
    command: DESCRIBE_COMMAND
  })
}
