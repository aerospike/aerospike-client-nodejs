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
 * @module aerospike/lists
 *
 * @description This module defines operations on the List data type. Create
 * list operations used by the {@link Client#operate} command.
 *
 * For more information, please refer to the
 * <a href="http://www.aerospike.com/docs/guide/cdt-list.html">&uArr;Lists</a>
 * documentation in the Aerospike Feature Guide.
 *
 * #### List Index
 *
 * List operations support negative indexing.  If the index is negative, the
 * resolved index starts backwards from end of list.
 *
 * Index/Range examples:
 *
 *  - Index 0: First item in list.
 *  - Index 4: Fifth item in list.
 *  - Index -1: Last item in list.
 *  - Index -3: Third to last item in list.
 *  - Index 1 Count 2: Second and third items in list.
 *  - Index -3 Count 3: Last three items in list.
 *  - Index -5 Count 4: Range between fifth to last item to second to last item inclusive.
 *
 * If an index is out of bounds, a parameter error will be returned. If a range
 * is partially out of bounds, the valid part of the range will be returned.
 *
 * @see {@link Client#operate}
 */

const as = require('../build/Release/aerospike.node')
const opcodes = as.operations

/**
 * @private
 */
function ListOperation (op, bin) {
  this.op = op
  this.bin = bin
}

module.exports = {

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
  append: function append (bin, value) {
    var op = new ListOperation(opcodes.LIST_APPEND, bin)
    op.value = value
    return op
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
  appendItems: function appendItems (bin, list) {
    var op = new ListOperation(opcodes.LIST_APPEND_ITEMS, bin)
    op.list = list
    return op
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
  insert: function insert (bin, index, value) {
    var op = new ListOperation(opcodes.LIST_INSERT, bin)
    op.index = index
    op.value = value
    return op
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
  insertItems: function insertItems (bin, index, list) {
    var op = new ListOperation(opcodes.LIST_INSERT_ITEMS, bin)
    op.index = index
    op.list = list
    return op
  },

  /**
   * Removes and returns the list element at the specified index.
   *
   * @param {string} bin - The name of the bin. The bin must contain a List value.
   * @param {number} index - List index of the element to be removed.
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
  pop: function pop (bin, index) {
    var op = new ListOperation(opcodes.LIST_POP, bin)
    op.index = index
    return op
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
  popRange: function popRange (bin, index, count) {
    var op = new ListOperation(opcodes.LIST_POP_RANGE, bin)
    op.index = index
    op.count = count
    return op
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
  remove: function remove (bin, index) {
    var op = new ListOperation(opcodes.LIST_REMOVE, bin)
    op.index = index
    return op
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
  removeRange: function removeRange (bin, index, count) {
    var op = new ListOperation(opcodes.LIST_REMOVE_RANGE, bin)
    op.index = index
    op.count = count
    return op
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
  clear: function clear (bin) {
    return new ListOperation(opcodes.LIST_CLEAR, bin)
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
  set: function set (bin, index, value) {
    var op = new ListOperation(opcodes.LIST_SET, bin)
    op.index = index
    op.value = value
    return op
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
  trim: function trim (bin, index, count) {
    var op = new ListOperation(opcodes.LIST_TRIM, bin)
    op.index = index
    op.count = count
    return op
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
  get: function get (bin, index) {
    var op = new ListOperation(opcodes.LIST_GET, bin)
    op.index = index
    return op
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
  getRange: function getRange (bin, index, count) {
    var op = new ListOperation(opcodes.LIST_GET_RANGE, bin)
    op.index = index
    op.count = count
    return op
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
  size: function size (bin) {
    return new ListOperation(opcodes.LIST_SIZE, bin)
  }
}
