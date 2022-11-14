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
 * For more information, please refer to the
 * <a href="https://www.aerospike.com/docs/guide/hyperloglog.html">&uArr;HyperLogLog</a>
 * documentation in the Aerospike Feature Guide.
 *
 * @see {@link Client#operate}
 * @since v3.16.0
 *
 * @example <caption>Adds items to HyperLogLog bin and gets approximate count</caption>
 *
 * const Aerospike = require('aerospike')
 * const hll = Aerospike.hll
 * const key = new Aerospike.Key('test', 'demo', 'hllDemo')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * Aerospike.connect(config).then(async client => {
 *   const result = await client.operate(key, [
 *     hll.init('demo', 10),
 *     hll.add('demo', ['blue', 'green', 'red']),
 *     hll.add('demo', ['green', 'orange', 'yellow']),
 *     hll.add('demo', ['red', 'blue']),
 *     hll.getCount('demo')
 *   ])
 *   console.log('Count:', result.bins.demo) // => Count: 5
 *   client.close()
 * })
 *
 * @example <caption>Performs a union of multiple sets</caption>
 *
 * const Aerospike = require('aerospike')
 * const hll = Aerospike.hll
 * const ops = Aerospike.operations
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * const key1 = new Aerospike.Key('test', 'demo', 'hllDemo1')
 * const key2 = new Aerospike.Key('test', 'demo', 'hllDemo2')
 * const key3 = new Aerospike.Key('test', 'demo', 'hllDemo3')
 *
 * Aerospike.connect(config).then(async client => {
 *   const { bins: { colors: colors1 } } = await client.operate(key1, [
 *     hll.add('colors', ['blue', 'green', 'orange', 'yellow'], 12),
 *     ops.read('colors')
 *   ])
 *
 *   const { bins: { colors: colors2 } } = await client.operate(key2, [
 *     hll.add('colors', ['violet', 'purple', 'pink', 'orange'], 8),
 *     ops.read('colors')
 *   ])
 *
 *   const { bins: { colors: count } } = await client.operate(key3, [
 *     hll.add('colors', ['red', 'yellow', 'brown', 'green'], 10),
 *     hll.setUnion('colors', [colors1, colors2])
         .withPolicy({ writeFlags: hll.writeFlags.ALLOW_FOLD }),
 *     hll.getCount('colors')
 *   ])
 *
 *   console.log('Count:', count) // => Count: 9
 *   client.close()
 * })
 */

const as = require('bindings')('aerospike.node')
const opcodes = as.hllOperations
const Operation = require('./operations').Operation

// Command codes for HLL read/readList operations.
const GET_COUNT_COMMAND = 50
const GET_UNION_COMMAND = 51
const GET_UNION_COUNT_COMMAND = 52
const GET_INTERSECT_COUNT_COMMAND = 53
const GET_SIMILARITY_COMMAND = 54
const DESCRIBE_COMMAND = 55

/**
 * @class aerospike/hll~HLLOperation
 *
 * @classdesc Use the methods in the {@link module:aerospike/hll|hll}
 * module to create HLL operations for use with the {@link Client#operate}
 * command.
 */
class HLLOperation extends Operation {
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
 * @summary HLL write flags.
 *
 * @type Object
 * @property {number} DEFAULT - Allow create or update. Default.
 * @property {number} CREATE_ONLY - If the bin already exists, the operation
 * will be denied. If the bin does not exist, a new bin will be created.
 * @property {number} UPDATE_ONLY - If the bin already exists, the bin will be
 * overwritten. If the bin does not exist, the operation will be denied.
 * @property {number} NO_FAIL - Do not raise error if operation is denied.
 * @property {number} ALLOW_FOLD - Allow the resulting set to be the minimum of
 * provided index bits. For {@link
 * module:aerospike/hll.getIntersectCount|getIntersectCount} and {@link
 * module:aerospike/hll.getSimilarity|getSimilarity}, allow the usage of less
 * precise HLL algorithms when min hash bits of all participating sets do not
 * match.
 *
 * @see {@link HLLPolicy}
 */
exports.writeFlags = as.hll.writeFlags

/**
 * Creates a new HLL or re-initializes an existing HLL. Re-initialization
 * clears existing contents.
 *
 * The <code>init</code> operation supports the following {@link
 * module:aerospike/hll.writeFlags|HLL Policy write flags}:
 * * <code>CREATE_ONLY</code>
 * * <code>UPDATE_ONLY</code>
 * * <code>NO_FAIL</code>
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {number} indexBits - Number of index bits. Must be between 4 and 16 inclusive.
 * @param {number} [minhashBits] - Number of minhash bits. If specified, must
 * be between 4 and 51 inclusive.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.init = function (bin, indexBits, minhashBits = -1) {
  return new HLLOperation(opcodes.INIT, bin, { indexBits, minhashBits })
}

/**
 * Adds elements to the HLL set. If the bin does not exist, create the HLL with
 * the <code>indexBits</code> and <code>minhashBits</code> parameters.
 *
 * Returns an integer indicating number of entries that caused HLL to update a
 * register.
 *
 * The <code>add</code> operation supports the following {@link
 * module:aerospike/hll.writeFlags|HLL Policy write flags}:
 * * <code>CREATE_ONLY</code>
 * * <code>NO_FAIL</code>
 *
 * Not specifying the bit count, implies <code>UPDATE_ONLY</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - Entries to be added to the HLL set.
 * @param {number} [indexBits] - Number of index bits. If specified, must
 * be between 4 and 16 inclusive.
 * @param {number} [minhashBits] - Number of minhash bits. If specified, must
 * be between 4 and 51 inclusive.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.add = function (bin, list, indexBits = -1, minhashBits = -1) {
  return new HLLOperation(opcodes.ADD, bin, { list, indexBits, minhashBits })
}

/**
 * Sets a union of the specified HLLs with the HLL bin value (if it exists)
 * back into the HLL bin.
 *
 * The <code>setUnion</code> operation supports the following {@link
 * module:aerospike/hll.writeFlags|HLL Policy write flags}:
 * * <code>CREATE_ONLY</code>
 * * <code>UPDATE_ONLY</code>
 * * <code>ALLOW_FOLD</code>
 * * <code>NO_FAIL</code>
 *
 * If <code>ALLOW_FOLD</code> is not set, all provided HLLs and the target bin
 * (if it exists) must have matching index bits and minhash bits. If
 * <code>ALLOW_FOLD</code> is set, server will union down to the minimum index
 * bits of all provided HLLs and the target bin (if it exists). Additionally,
 * if minhash bits differs on any HLL, the resulting union will have 0 minhash
 * bits.
 *
 * @param {string} bin - The name of the bin. The bin must contain an HLL value.
 * @param {array} list - List of HLL objects (of type Buffer).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.setUnion = function (bin, list) {
  return new HLLOperation(opcodes.SET_UNION, bin, { list })
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
 * @param {number} indexBits - Number of index bits. Must be between 4 and 16 inclusive.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.fold = function (bin, indexBits) {
  return new HLLOperation(opcodes.FOLD, bin, { indexBits })
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
