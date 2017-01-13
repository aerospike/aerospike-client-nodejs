// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

/**
 * @module aerospike/operations
 *
 * @description This module provides functions to easily define operations to
 * be performed on a record via the {@link Client#operate} command.
 *
 * @see {@link Client#operate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   op.append('a', 'xyz'),
 *   op.incr('b', 10),
 *   op.read('b')
 * ]
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   client.put(key, { a: 'abc', b: 42 }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error, record) => {
 *       if (error) throw error
 *       console.log(record) // => { b: 52 }
 *       client.close()
 *     })
 *   })
 * })
 */

const as = require('../build/Release/aerospike.node')
const ops = as.operations

/**
 * @private
 */
function Operation (op, bin) {
  this.op = op
  this.bin = bin
}

module.exports = {

  /**
   * @summary Read the value of the bin.
   *
   * @param {string} bin - The name of the bin.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  read: function read (bin) {
    return new Operation(ops.READ, bin)
  },

  /**
   * @summary Update the value of the bin.
   *
   * @param {string} bin - The name of the bin.
   * @param {any} value - The value to set the bin to.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  write: function write (bin, value) {
    var op = new Operation(ops.WRITE, bin)
    op.value = value
    return op
  },

  /**
   * @summary Increment the value of the bin by the given value.
   *
   * @description The bin must contain either an Integer or a Double, and the
   * value must be of the same type.
   *
   * @param {string} bin - The name of the bin.
   * @param {(number|Double)} value - The value to increment the bin by.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  incr: function incr (bin, value) {
    var op = new Operation(ops.INCR, bin)
    op.value = value
    return op
  },

  /**
   * @summary Append the value to the bin.
   *
   * @description The bin must contain either String or a Byte Array, and the
   * value must be of the same type.
   *
   * @param {string} bin - The name of the bin.
   * @param {(string|Buffer)} value - The value to append to the bin.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  append: function append (bin, value) {
    var op = new Operation(ops.APPEND, bin)
    op.value = value
    return op
  },

  /**
   * @summary Prepend the value to the bin.
   *
   * @description The bin must contain either String or a Byte Array, and the
   * value must be of the same type.
   *
   * @param {string} bin - The name of the bin.
   * @param {(string|Buffer)} value - The value to prepend to the bin.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  prepend: function prepend (bin, value) {
    var op = new Operation(ops.PREPEND, bin)
    op.value = value
    return op
  },

  /**
   * @summary Update the TTL (time-to-live) for a record.
   *
   * @description If the optional `ttl` parameter is not specified, the server
   * will reset the record's TTL value to the default TTL value for the
   * namespace.
   *
   * @param {number} [ttl=Aerospike.ttl.NAMESPACE_DEFAULT] - The new, relative TTL to set for the record, when it is touched.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @see {@link module:aerospike.ttl} for "special" TTL values.
   */
  touch: function touch (ttl) {
    var op = new Operation(ops.TOUCH)
    op.ttl = ttl
    return op
  }
}
