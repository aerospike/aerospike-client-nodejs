// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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
 * @module aerospike/lists
 *
 * @description This module defines operations on the List data type. Create
 * list operations used by the {@link Client#operate} command.
 *
 * For more information, please refer to the
 * <a href="http://www.aerospike.com/docs/guide/cdt-list.html">&uArr;Lists</a>
 * and <a href="http://www.aerospike.com/docs/guide/cdt-list.html">&uArr;List Operations</a>
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

const as = require('bindings')('aerospike.node')
const opcodes = as.operations
const Context = require('./cdt_context')
const AerospikeError = require('./error')
const Operation = require('./operations').Operation

/**
 * @class module:aerospike/lists~ListOperation
 *
 * @classdesc Use the methods in the {@link module:aerospike/lists|lists}
 * module to create list operations for use with the {@link Client#operate}
 * command.
 */
class ListOperation extends Operation {
  /**
   * @summary Set the return type for certain list operations.
   * @description The return type only affects <code>getBy\*</code> and
   * <code>removeBy\*</code> list operations.
   *
   * @param {number} returnType - The {@link
   * module:aerospike/lists.returnType|return type} indicating what data of the
   * selected items to return.
   *
   * @example <caption>Fetch the first three list elements and return the values</caption>
   *
   * const Aerospike = require('aerospike')
   * const lists = Aerospike.lists
   * const key = new Aerospike.Key('test', 'demo', 'listsTest')
   *
   * Aerospike.connect().then(async client => {
   *   await client.put(key, { list: [32, 5, 85, 16, 22] })
   *   const ops = [
   *     lists.getByValueRange('list', 10, 30)
   *       .andReturn(lists.returnType.VALUE)
   *   ]
   *   const result = await client.operate(key, ops)
   *   console.info('Result:', result.bins.list) // => Result: [ 16, 22 ]
   *   client.close()
   * })
   */
  andReturn (returnType) {
    this.returnType = returnType
    return this
  }

  /**
   * @summary By setting the context, the list operation will be executed on a
   * nested list, instead of the bin value itself.
   *
   * @param { CdtContext | function } context - Either a Context object, or a
   * function which accepts a Context object.
   * @returns { ListOperation } The list operation itself.
   *
   * @since v3.12.0
   *
   * @example <caption>Fetch the 1st element of the 2nd nested list</caption>
   *
   * const Aerospike = require('aerospike')
   * const lists = Aerospike.lists
   * const key = new Aerospike.Key('test', 'demo', 'listsTest')
   *
   * Aerospike.connect().then(async (client) => {
   *   await client.put(key, { list: [[32, 5, 85], [16, 22]] })
   *   const ops = [
   *     lists.get('list', 0)
   *       .withContext((ctx) => ctx.addListIndex(1))
   *   ]
   *   const result = await client.operate(key, ops)
   *   console.info('Result:', result.bins.list) // => Result: 16
   *   client.close()
   * })
   *
   * @example <caption>Fetch the last element of the nested list stored under the 'nested' map key</caption>
   *
   * const Aerospike = require('aerospike')
   * const lists = Aerospike.lists
   * const Context = Aerospike.cdt.Context
   * const key = new Aerospike.Key('test', 'demo', 'listsTest')
   *
   * Aerospike.connect().then(async (client) => {
   *   await client.put(key, { map: { nested: [32, 5, 85, 16, 22] } })
   *   const context = new Context().addMapKey('nested')
   *   const ops = [
   *     lists.get('map', -1)
   *       .withContext(context)
   *   ]
   *   const result = await client.operate(key, ops)
   *   console.info('Result:', result.bins.map) // => Result: 22
   *   client.close()
   * })
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
   * @summary Inverts the selection of items for certain list operations.
   * @description For <code>getBy\*</code> and <code>removeBy\*</code> list
   * operations, calling the <code>invertSelect</code> method on the
   * <code>ListOperation</code> has the effect of inverting the selection of
   * list elements that the operation affects.
   *
   * @throws {AerospikeError} if the operation is not invertible.
   *
   * @example <caption>Remove all tags except for yellow from the record</caption>
   *
   * const Aerospike = require('aerospike')
   * const lists = Aerospike.lists
   * const key = new Aerospike.Key('test', 'demo', 'listsTest')
   *
   * Aerospike.connect().then(async client => {
   *   await client.put(key, { tags: ['blue', 'yellow', 'pink'] })
   *   const ops = [
   *     lists.removeByValue('tags', 'yellow')
   *       .invertSelection()
   *   ]
   *   await client.operate(key, ops)
   *   const record = await client.get(key)
   *   console.info('Result:', record.bins.tags) // => Result: [ 'yellow' ]
   *   client.close()
   * })
   */
  invertSelection () {
    throw new AerospikeError(`List operation cannot be inverted [op ${this.op}]`)
  }
}

/**
 * List operation variant that can be inverted
 * @private
 */
class InvertibleListOp extends ListOperation {
  constructor (op, bin, props) {
    super(op, bin, props)
    this.inverted = false
  }

  invertSelection () {
    this.inverted = true
    return this
  }
}

/**
 * @summary List order.
 * @description The order determines what kind of index the Aerospike server
 * maintains for the list.
 *
 * @type Object
 * @property {number} UNORDERED - List is not ordered. This is the default.
 * @property {number} ORDERED - List is ordered.
 */
exports.order = as.lists.order

/**
 * @summary List sort flags.
 *
 * @type Object
 * @property {number} DEFAULT - Preserve duplicate values when sorting lists.
 * This is the default.
 * @property {number} DROP_DUPLICATES - Drop duplicate values when sorting
 * list.
 */
exports.sortFlags = as.lists.sortFlags

/**
 * @summary List write flags.
 *
 * @type Object
 * @property {number} DEFAULT - Allow duplicate values and insertions at any
 * index.
 * @property {number} ADD_UNIQUE - Only add unique values.
 * @property {number} INSERT_BOUNDED - Enforce list boundaries when inserting.
 * Do not allow values to be inserted at index outside current list boundaries.
 * @property {number} NO_FAIL - Do not raise error, if a list item fails due to
 * write flag constraints. Requires Aerospike server v4.3.0 or later.
 * @property {number} PARTIAL - Allow other valid list items to be committed,
 * if a list item fails due to write flag constraints. Requires Aerospike
 * server v4.3.0 or later.
 */
exports.writeFlags = as.lists.writeFlags

/**
 * @summary List return type.
 * @description The return type determines what data of the selected items the
 * get and remove operations return in the result of the {@link Client#operate}
 * command. It is optional to specify the return type for remove operations;
 * default is <code>NONE</code>. For get operations the return type parameter
 * is required.
 *
 * @type Object
 * @property {number} NONE - Do not return a result; this is the default.
 * @property {number} INDEX - Return key index order. (0 = first key, 1 =
 * second key, ...)
 * @property {number} REVERSE_INDEX - Return reverse key order. (0 = last key,
 * -1 = second last key, ...)
 * @property {number} RANK - Return value order. (0 = smallest value, 1 =
 * second smallest value, ...)
 * @property {number} REVERSE_RANK - Return reverse value order. (0 = largest
 * value, -1 = second largest value, ...)
 * @property {number} COUNT - Return count of items selected.
 * @property {number} VALUE - Return value for single key read and value list
 * for range read.
 */
exports.returnType = as.lists.returnType

/**
 * @summary Sets the list order.
 * @description This operation does not return any result.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} order - The new {@link module:aerospike/lists.order|list order}.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @since v3.4.0
 */
exports.setOrder = function (bin, order) {
  return new ListOperation(opcodes.LIST_SET_ORDER, bin, {
    order: order
  })
}

/**
 * @summary Sort the list according to flags.
 * @description This operation does not return any result.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} flags - The {@link module:aerospike/lists.sortFlags|sort flags} to use.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @since v3.4.0
 */
exports.sort = function (bin, flags) {
  return new ListOperation(opcodes.LIST_SORT, bin, {
    flags: flags
  })
}

/**
 * @summary Appends an element to the end of a list.
 * @description This operation returns the element count of the list after the
 * operation.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {any} value - The value to be appended.
 * @param {ListPolicy} [policy] - Optional list policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operator
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.append('tags', 'orange'),
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
exports.append = function (bin, value, policy) {
  return new ListOperation(opcodes.LIST_APPEND, bin, {
    value: value,
    policy: policy
  })
}

/**
 * @summary Appends a list of elements to the end of a list.
 * @description This operation returns the element count of the list after the
 * operation.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {Array<any>} list - Array of elements to be appended.
 * @param {ListPolicy} [policy] - Optional list policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operator
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.appendItems('tags', ['orange', 'green']),
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
exports.appendItems = function (bin, list, policy) {
  return new ListOperation(opcodes.LIST_APPEND_ITEMS, bin, {
    list: list,
    policy: policy
  })
}

/**
 * @summary Inserts an element at the specified index.
 * @description This operation returns the element count of the list after the
 * operation.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - List index at which the new element should be inserted.
 * @param {any} value - The value to be appended.
 * @param {ListPolicy} [policy] - Optional list policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operator
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.insert('tags', 2, 'orange'),
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
exports.insert = function (bin, index, value, policy) {
  return new ListOperation(opcodes.LIST_INSERT, bin, {
    index: index,
    value: value,
    policy: policy
  })
}

/**
 * @summary Inserts a list of elements at the specified index.
 * @description This operation returns the element count of the list after the
 * operation.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - List index at which the new elements should be inserted.
 * @param {Array<any>} list - Array of elements to be inserted.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operator
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.insertItems('tags', 2, ['orange', 'green']),
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
exports.insertItems = function (bin, index, list, policy) {
  return new ListOperation(opcodes.LIST_INSERT_ITEMS, bin, {
    index: index,
    list: list,
    policy: policy
  })
}

/**
 * @summary Removes and returns the list element at the specified index.
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
 *   lists.pop('tags', 1)
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
exports.pop = function (bin, index) {
  var op = new ListOperation(opcodes.LIST_POP, bin)
  op.index = index
  return op
}

/**
 * @summary Removes and returns the list elements at the specified range.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the first element in the range.
 * @param {number} [count] - Number of elements in the range; if not specified, the range extends to the end of the list.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.popRange('tags', 0, 2)
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
exports.popRange = function (bin, index, count) {
  var op = new ListOperation(opcodes.LIST_POP_RANGE, bin)
  op.index = index
  op.count = count
  return op
}

/**
 * @summary Removes the list element at the specified index.
 * @description This operation returns the number of elements removed from the
 * list.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the element to be removed
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.remove('tags', 1)
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
exports.remove = function (bin, index) {
  var op = new ListOperation(opcodes.LIST_REMOVE, bin)
  op.index = index
  return op
}

/**
 * @summary Removes the list elements at the specified range.
 * @description This operation returns the number of elements removed from the
 * list.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the first element in the range.
 * @param {number} [count] - Number of elements in the range; if not specified, the range extends to the end of the list.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.removeRange('tags', 0, 2)
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
exports.removeRange = function (bin, index, count) {
  var op = new ListOperation(opcodes.LIST_REMOVE_RANGE, bin)
  op.index = index
  op.count = count
  return op
}

/**
 * @summary Removes a single list element identified by its index from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Zero-based index of the item to remove.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 *
 * @example <caption>Remove the 2nd item in the list and return its value</caption>
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'listsTest')
 *
 * Aerospike.connect().then(async client => {
 *   await client.put(key, { tags: ['blue', 'yellow', 'pink'] })
 *   const ops = [
 *     lists.removeByIndex('tags', 1)
 *       .andReturn(lists.returnType.VALUE)
 *   ]
 *   const result = await client.operate(key, ops)
 *   console.info('Result:', result.bins.tags) // => Result: yellow
 *   const record = await client.get(key)
 *   console.info('Record:', record.bins.tags) // => Record: [ 'blue', 'pink' ]
 *   client.close()
 * })
 */
exports.removeByIndex = function (bin, index, returnType) {
  return new ListOperation(opcodes.LIST_REMOVE_BY_INDEX, bin, {
    index: index,
    returnType: returnType
  })
}

/**
 * @summary Removes the list elements identified by the index range from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the first element in the range.
 * @param {number} [count] - Number of elements in the range; if not specified,
 * the range extends to the end of the list.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.removeByIndexRange = function (bin, index, count, returnType) {
  return new InvertibleListOp(opcodes.LIST_REMOVE_BY_INDEX_RANGE, bin, {
    index: index,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Removes one or more items identified by a single value from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {any} value - The list value to remove.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.removeByValue = function (bin, value, returnType) {
  return new InvertibleListOp(opcodes.LIST_REMOVE_BY_VALUE, bin, {
    value: value,
    returnType: returnType
  })
}

/**
 * @summary Removes one or more items identified by a list of values from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {Array<any>} values - An array of list values to remove.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.removeByValueList = function (bin, values, returnType) {
  return new InvertibleListOp(opcodes.LIST_REMOVE_BY_VALUE_LIST, bin, {
    values: values,
    returnType: returnType
  })
}

/**
 * @summary Removes one or more items identified by a range of values from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {?any} begin - Start values in the range (inclusive). If set to
 * <code>null</code>, the range includes all values less than the
 * <code>end</code> value.
 * @param {?any} end - End value in the range (exclusive). If set to
 * <code>null</code>, the range includes all values greater than or equal to the
 * <code>begin</code> value.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.removeByValueRange = function (bin, begin, end, returnType) {
  return new InvertibleListOp(opcodes.LIST_REMOVE_BY_VALUE_RANGE, bin, {
    begin: begin,
    end: end,
    returnType: returnType
  })
}

/**
 * @summary Removes list items nearest to value and greater, by relative rank.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * Examples for ordered list [0, 4, 5, 9, 11, 15]:
 *
 * * (value, rank, count) = [removed items]
 * * (5, 0, 2) = [5, 9]
 * * (5, 1, 1) = [9]
 * * (5, -1, 2) = [4, 5]
 * * (3, 0, 1) = [4]
 * * (3, 3, 7) = [11, 15]
 * * (3, -3, 2) = []
 *
 * Without count:
 *
 * * (value, rank) = [removed items]
 * * (5, 0) = [5, 9, 11, 15]
 * * (5, 1) = [9, 11, 15]
 * * (5, -1) = [4, 5, 9, 11, 15]
 * * (3, 0) = [4, 5, 9, 11, 15]
 * * (3, 3) = [11, 15]
 * * (3, -3) = [0, 4, 5, 9, 11, 15]
 *
 * Requires Aerospike Server v4.3.0 or later.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {any} value - Find list items nearest to this value and greater.
 * @param {number} rank - Rank of the items to be removed relative to the given value.
 * @param {number} [count] - Number of items to remove. If undefined, the range
 * includes all items nearest to value and greater, until the end.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.5.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'listKey')
 *
 * Aerospike.connect().then(async client => {
 *   await client.put(key, { list: [0, 4, 5, 9, 11, 15] })
 *   let result = await client.operate(key, [
 *     lists.removeByValueRelRankRange('list', 3, 3)
 *       .andReturn(lists.returnType.VALUE)])
 *   console.info(result.bins.list) // => [ 11, 15 ]
 *   let record = await client.get(key)
 *   console.info(record.bins.list) // => [ 0, 4, 5, 9 ]
 *   client.close()
 * })
 */
exports.removeByValueRelRankRange = function (bin, value, rank, count, returnType) {
  return new InvertibleListOp(opcodes.LIST_REMOVE_BY_VALUE_REL_RANK_RANGE, bin, {
    value: value,
    rank: rank,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Removes a single item identified by its rank value from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} rank - Rank of the item to remove.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.removeByRank = function (bin, rank, returnType) {
  return new ListOperation(opcodes.LIST_REMOVE_BY_RANK, bin, {
    rank: rank,
    returnType: returnType
  })
}

/**
 * @summary Removes one or more items in the specified rank range from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Starting rank.
 * @param {number} [count] - Number of items to remove; if undefined, the range
 * includes all items starting from <code>rank</code>.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.removeByRankRange = function (bin, rank, count, returnType) {
  return new InvertibleListOp(opcodes.LIST_REMOVE_BY_RANK_RANGE, bin, {
    rank: rank,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Removes all the elements from the list.
 * @description This operation returns no result.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.clear('tags')
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
exports.clear = function (bin) {
  return new ListOperation(opcodes.LIST_CLEAR, bin)
}

/**
 * @summary Sets the list element at the specified index to a new value.
 * @description This operation returns no result.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the element to be replaced.
 * @param {any} value - The new value to assigned to the list element.
 * @param {ListPolicy} [policy] - Optional list policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.set('tags', 1, 'green')
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
exports.set = function (bin, index, value, policy) {
  return new ListOperation(opcodes.LIST_SET, bin, { index, value, policy })
}

/**
 * @summary Removes all list elements **not** within the specified range.
 * @description This operation returns the number of list elements removed.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the first element in the range.
 * @param {number} count - Number of elements in the range.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.trim('tags', 1, 1)
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
exports.trim = function (bin, index, count) {
  var op = new ListOperation(opcodes.LIST_TRIM, bin)
  op.index = index
  op.count = count
  return op
}

/**
 * @summary Returns the list element at the specified index.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the element to be returned.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.get('tags', 0)
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
exports.get = function (bin, index) {
  var op = new ListOperation(opcodes.LIST_GET, bin)
  op.index = index
  return op
}

/**
 * @summary Returns the list element at the specified range.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the first element in the range.
 * @param {number} [count] - Number of elements in the range; if not specified, the range extends to the end of the list.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.getRange('tags', 1)
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
exports.getRange = function (bin, index, count) {
  var op = new ListOperation(opcodes.LIST_GET_RANGE, bin)
  op.index = index
  op.count = count
  return op
}

/**
 * @summary Retrieves a single list element identified by its index from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Zero-based index of the item to retrieve.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 *
 * @example <caption>Retrieve the 2nd item in the list and return its value</caption>
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'listsTest')
 *
 * Aerospike.connect().then(async client => {
 *   await client.put(key, { tags: ['blue', 'yellow', 'pink'] })
 *   const ops = [
 *     lists.getByIndex('tags', 1)
 *       .andReturn(lists.returnType.VALUE)
 *   ]
 *   const result = await client.operate(key, ops)
 *   console.info('Result:', result.bins.tags) // => Result: yellow
 *   client.close()
 * })
 */
exports.getByIndex = function (bin, index, returnType) {
  return new ListOperation(opcodes.LIST_GET_BY_INDEX, bin, {
    index: index,
    returnType: returnType
  })
}

/**
 * @summary Retrieves the list elements identified by the index range from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the first element in the range.
 * @param {number} [count] - Number of elements in the range; if not specified,
 * the range extends to the end of the list.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.getByIndexRange = function (bin, index, count, returnType) {
  return new InvertibleListOp(opcodes.LIST_GET_BY_INDEX_RANGE, bin, {
    index: index,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Retrieves one or more items identified by a single value from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {any} value - The list value to retrieve.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.getByValue = function (bin, value, returnType) {
  return new InvertibleListOp(opcodes.LIST_GET_BY_VALUE, bin, {
    value: value,
    returnType: returnType
  })
}

/**
 * @summary Retrieves one or more items identified by a list of values from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {Array<any>} values - An array of list values to retrieve.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.getByValueList = function (bin, values, returnType) {
  return new InvertibleListOp(opcodes.LIST_GET_BY_VALUE_LIST, bin, {
    values: values,
    returnType: returnType
  })
}

/**
 * @summary Retrieves one or more items identified by a range of values from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {?any} begin - Start values in the range (inclusive). If set to
 * <code>null</code>, the range includes all values less than the
 * <code>end</code> value.
 * @param {?any} end - End value in the range (exclusive). If set to
 * <code>null</code>, the range includes all values greater than or equal to the
 * <code>begin</code> value.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.getByValueRange = function (bin, begin, end, returnType) {
  return new InvertibleListOp(opcodes.LIST_GET_BY_VALUE_RANGE, bin, {
    begin: begin,
    end: end,
    returnType: returnType
  })
}

/**
 * @summary Retrieves list items nearest to value and greater, by relative rank.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * Examples for ordered list [0, 4, 5, 9, 11, 15]:
 *
 * * (value, rank, count) = [selected items]
 * * (5, 0, 2) = [5, 9]
 * * (5, 1, 1) = [9]
 * * (5, -1, 2) = [4, 5]
 * * (3, 0, 1) = [4]
 * * (3, 3, 7) = [11, 15]
 * * (3, -3, 2) = []
 *
 * Without count:
 *
 * * (value, rank) = [selected items]
 * * (5, 0) = [5, 9, 11, 15]
 * * (5, 1) = [9, 11, 15]
 * * (5, -1) = [4, 5, 9, 11, 15]
 * * (3, 0) = [4, 5, 9, 11, 15]
 * * (3, 3) = [11, 15]
 * * (3, -3) = [0, 4, 5, 9, 11, 15]
 *
 * Requires Aerospike Server v4.3.0 or later.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {any} value - Find list items nearest to this value and greater.
 * @param {number} rank - Rank of the items to be retrieved relative to the given value.
 * @param {number} [count] - Number of items to retrieve. If undefined, the
 * range includes all items nearest to value and greater, until the end.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.5.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'listKey')
 *
 * Aerospike.connect().then(async client => {
 *   await client.put(key, { list: [0, 4, 5, 9, 11, 15] })
 *   await client.operate(key, [ lists.setOrder('list', lists.order.ORDERED) ])
 *   let result = await client.operate(key, [
 *     lists.getByValueRelRankRange('list', 5, -1, 2)
 *       .andReturn(lists.returnType.VALUE)])
 *   console.info(result.bins.list) // => [ 4, 5 ]
 *   client.close()
 * })
 */
exports.getByValueRelRankRange = function (bin, value, rank, count, returnType) {
  return new InvertibleListOp(opcodes.LIST_GET_BY_VALUE_REL_RANK_RANGE, bin, {
    value: value,
    rank: rank,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Retrieves a single item identified by its rank value from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} rank - Rank of the item to retrieve.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.getByRank = function (bin, rank, returnType) {
  return new ListOperation(opcodes.LIST_GET_BY_RANK, bin, {
    rank: rank,
    returnType: returnType
  })
}

/**
 * @summary Retrieves one or more items in the specified rank range from the list.
 * @description This operation returns the data specified by <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Starting rank.
 * @param {number} [count] - Number of items to retrieve. If undefined, the
 * range includes all items starting from <code>rank</code>.
 * @param {number} [returnType] - The {@link module:aerospike/lists.returnType|return type}
 * indicating what data of the removed item(s) to return (if any).
 * @returns {module:aerospike/lists~ListOperation} List operation that can be
 * used with the {@link Client#operate} command.
 *
 * @see Use {@link module:aerospike/lists~ListOperation#invertSelection|ListOperation#invertSelection} to
 * invert the selection of items affected by this operation.
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/lists~ListOperation#andReturn|ListOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.4.0
 */
exports.getByRankRange = function (bin, rank, count, returnType) {
  return new InvertibleListOp(opcodes.LIST_GET_BY_RANK_RANGE, bin, {
    rank: rank,
    count: count,
    returnType: returnType
  })
}

/**
 * Increments the value at the given list index and returns the new value after
 * increment.
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @param {number} index - Index of the list element to increment.
 * @param {number} [value=1] - Value to increment the element by.
 * @param {ListPolicy} [policy] - Optional list policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @since v2.4
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.increment('counters', 1, 3)
 * ]
 *
 * Aerospike.client().connect((error, client) => {
 *   if (error) throw error
 *   client.put(key, { counters: [1, 2, 3] }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error, result) => {
 *       if (error) throw error
 *       console.log(result['counters']) => 5
 *       client.get(key, (error, record) => {
 *         if (error) throw error
 *         console.log(record) // => { counters: [1, 5, 3] }
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
exports.increment = function (bin, index, value, policy) {
  return new ListOperation(opcodes.LIST_INCREMENT, bin, {
    index: index,
    value: value,
    policy: policy
  })
}

/**
 * @summary Returns the element count of the list
 *
 * @param {string} bin - The name of the bin. The bin must contain a List value.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const lists = Aerospike.lists
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 *
 * var ops = [
 *   lists.size('tags')
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
exports.size = function (bin) {
  return new ListOperation(opcodes.LIST_SIZE, bin)
}
