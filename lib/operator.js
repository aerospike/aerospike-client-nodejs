// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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
 * @module aerospike/operator
 *
 * @description This module provides functions to easily define operations to
 * be performed on a record via the {@link Client#operate}
 * command.
 *
 * @see {@link Client#operate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operator
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
const operations = as.operations
const cdtOperations = as.cdt_operations

function populateOp (op, bin, props) {
  var obj = {}
  obj.operation = op
  obj.bin = bin
  for (var prop in props) {
    obj[prop] = props[prop]
  }
  return obj
}

function populateCdtOp (op, bin, props) {
  var obj = {}
  obj.cdtOperation = op
  obj.bin = bin
  for (var prop in props) {
    obj[prop] = props[prop]
  }
  return obj
}

module.exports = {

  /**
   * Read the value of the bin.
   *
   * @param {string} bin - The name of the bin.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  read: function read (bin) {
    return populateOp(operations.READ, bin)
  },

  /**
   * Update the value of the bin.
   *
   * @param {string} bin - The name of the bin.
   * @param {any} value - The value to set the bin to.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  write: function write (bin, value) {
    return populateOp(operations.WRITE, bin, {value: value})
  },

  /**
   * Increment the value of the bin by the given value. The bin must contain
   * either an Integer or a Double, and the value must be of the same type.
   *
   * @param {string} bin - The name of the bin.
   * @param {(number|Double)} value - The value to increment the bin by.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  incr: function incr (bin, value) {
    return populateOp(operations.INCR, bin, {value: value})
  },

  /**
   * Append the value to the bin. The bin must contain either String or a Byte
   * Array, and the value must be of the same type.
   *
   * @param {string} bin - The name of the bin.
   * @param {(string|Buffer)} value - The value to append to the bin.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  append: function append (bin, value) {
    return populateOp(operations.APPEND, bin, {value: value})
  },

  /**
   * Prepend the value to the bin. The bin must contain either String or a Byte
   * Array, and the value must be of the same type.
   *
   * @param {string} bin - The name of the bin.
   * @param {(string|Buffer)} value - The value to prepend to the bin.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  prepend: function prepend (bin, value) {
    return populateOp(operations.PREPEND, bin, {value: value})
  },

  /**
   * Update the TTL for a record.
   *
   * @param {number} [ttl] - The new, relative TTL to set for the record, when it is touched.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   */
  touch: function touch (ttl) {
    return populateOp(operations.TOUCH, null, {ttl: ttl})
  },

  /**
   * Appends an element to the end of a list.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {any} value - The value to be appended.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listAppend('tags', 'orange'),
   *   op.read('tags')
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error, result) => {
   *       if (error) throw error
   *       console.log(result.tags) // => [ 'blue', 'yellow', 'pink', 'orange' ]
   *       client.close()
   *     })
   *   })
   * })
   */
  listAppend: function listAppend (bin, value) {
    return populateCdtOp(cdtOperations.LIST_APPEND, bin, {value: value})
  },

  /**
   * Appends a list of elements to the end of a list.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {Array<any>} list - Array of elements to be appended.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listAppendItems('tags', ['orange', 'green']),
   *   op.read('tags')
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error, result) => {
   *       if (error) throw error
   *       console.log(result.tags) // => [ 'blue', 'yellow', 'pink', 'orange', 'green' ]
   *       client.close()
   *     })
   *   })
   * })
   */
  listAppendItems: function listAppendItems (bin, list) {
    return populateCdtOp(cdtOperations.LIST_APPEND_ITEMS, bin,
      {list: list})
  },

  /**
   * Inserts an element at the specified index.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - List index at which the new element should be inserted.
   * @param {any} value - The value to be appended.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listInsert('tags', 2, 'orange'),
   *   op.read('tags')
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error, result) => {
   *       if (error) throw error
   *       console.log(result.tags) // => [ 'blue', 'yellow', 'orange', 'pink' ]
   *       client.close()
   *     })
   *   })
   * })
   */
  listInsert: function listInsert (bin, index, value) {
    return populateCdtOp(cdtOperations.LIST_INSERT, bin,
      {index: index, value: value})
  },

  /**
   * Inserts a list of element at the specified index.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - List index at which the new element should be inserted.
   * @param {Array<any>} list - Array of elements to be appended.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listInsertItems('tags', 2, ['orange', 'green']),
   *   op.read('tags')
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error, result) => {
   *       if (error) throw error
   *       console.log(result.tags) // => [ 'blue', 'yellow', 'orange', 'green', 'pink' ]
   *       client.close()
   *     })
   *   })
   * })
   */
  listInsertItems: function listInsertItems (bin, index, list) {
    return populateCdtOp(cdtOperations.LIST_INSERT_ITEMS, bin,
      {index: index, list: list})
  },

  /**
   * Removes and returns the list element at the specified index.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - List index at which the new element should be inserted.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listPop('tags', 1)
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error, result) => {
   *       if (error) throw error
   *       console.log(result.tags) // => [ 'yellow' ]
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: [ 'blue', 'pink' ] }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listPop: function listPop (bin, index) {
    return populateCdtOp(cdtOperations.LIST_POP, bin, {index: index})
  },

  /**
   * Removes and returns the list elements at the specified range.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - Index of the first element in the range.
   * @param {number} [count] - Number of elements in the range; if not specified, the range extends to the end of the list.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listPopRange('tags', 0, 2)
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error, result) => {
   *       if (error) throw error
   *       console.log(result.tags) // => [ 'blue', 'yellow' ]
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: [ 'pink' ] }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listPopRange: function listPopRange (bin, index, count) {
    return populateCdtOp(cdtOperations.LIST_POP_RANGE, bin,
      {index: index, count: count})
  },

  /**
   * Removes the list element at the specified index.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - Index of the element to be removed
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listRemove('tags', 1)
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error) => {
   *       if (error) throw error
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: [ 'blue', 'pink' ] }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listRemove: function listRemove (bin, index) {
    return populateCdtOp(cdtOperations.LIST_REMOVE, bin, {index: index})
  },

  /**
   * Removes the list elements at the specified range.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - Index of the first element in the range.
   * @param {number} [count] - Number of elements in the range; if not specified, the range extends to the end of the list.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listRemoveRange('tags', 0, 2)
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error) => {
   *       if (error) throw error
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: [ 'pink' ] }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listRemoveRange: function listRemoveRange (bin, index, count) {
    return populateCdtOp(cdtOperations.LIST_REMOVE_RANGE, bin,
      {index: index, count: count})
  },

  /**
   * Removes all the elements from the list.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listClear('tags')
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error) => {
   *       if (error) throw error
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: [ ] }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listClear: function listClear (bin) {
    return populateCdtOp(cdtOperations.LIST_CLEAR, bin)
  },

  /**
   * Sets the list element at the specified index to a new value.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - Index of the element to be replaced.
   * @param {any} value - The new value to assigned to the list element.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listSet('tags', 1, 'green')
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error) => {
   *       if (error) throw error
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: [ 'blue', 'green', 'pink' ] }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listSet: function listSet (bin, index, value) {
    return populateCdtOp(cdtOperations.LIST_SET, bin,
      {index: index, value: value})
  },

  /**
   * Removes all list elements **not** within the specified range.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - Index of the first element in the range.
   * @param {number} [count] - Number of elements in the range; if not specified, the range extends to the end of the list.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listTrim('tags', 1, 1)
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error) => {
   *       if (error) throw error
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: [ 'yellow' ] }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listTrim: function listTrim (bin, index, count) {
    return populateCdtOp(cdtOperations.LIST_TRIM, bin,
      {index: index, count: count})
  },

  /**
   * Returns the list element at the specified index.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - Index of the element to be returned.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listGet('tags', 0)
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error) => {
   *       if (error) throw error
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: 'blue' }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listGet: function listGet (bin, index) {
    return populateCdtOp(cdtOperations.LIST_GET, bin, {index: index})
  },

  /**
   * Returns the list element at the specified range.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - Index of the first element in the range.
   * @param {number} [count] - Number of elements in the range; if not specified, the range extends to the end of the list.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listGetRange('tags', 1)
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error) => {
   *       if (error) throw error
   *       client.get(key, (error, record) => {
   *         if (error) throw error
   *         console.log(record) // => { tags: [ 'yellow', 'pink' ] }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
  listGetRange: function listGetRange (bin, index, count) {
    return populateCdtOp(cdtOperations.LIST_GET_RANGE, bin,
      {index: index, count: count})
  },

  /**
   * Returns the element count of the list
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const op = Aerospike.operator
   * const key = new Aerospike.Key('test', 'demo', 'mykey1')
   *
   * var ops = [
   *   op.listSize('tags')
   * ]
   *
   * Aerospike.client().connect((error, client) => {
   *   if (error) throw error
   *   client.put(key, { tags: ['blue', 'yellow', 'pink'] }, (error) => {
   *     if (error) throw error
   *     client.operate(key, ops, (error) => {
   *       if (error) throw error
   *       console.log(record) // => { tags: 3 }
   *       client.close()
   *     })
   *   })
   * })
   */
  listSize: function listSize (bin) {
    return populateCdtOp(cdtOperations.LIST_SIZE, bin)
  }
}
