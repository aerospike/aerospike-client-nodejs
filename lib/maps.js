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

const as = require('bindings')('aerospike.node')
const opcodes = as.operations
const policy = require('./policy')
const Context = require('./cdt_context')
const Operation = require('./operations').Operation

/**
 * @module aerospike/maps
 *
 * @description This module defines operations on the Sorted Map data type that
 * can be used with the {@link Client#operate} command. Operations on Sorted
 * Maps require Aerospike Server
 * <a href="http://www.aerospike.com/download/server/notes.html#3.8.4">&uArr;version 3.8.4</a>
 * or later.
 *
 * For more information, please refer to the
 * <a href="http://www.aerospike.com/docs/guide/cdt-map.html">&uArr;Maps</a>
 * documentation in the Aerospike Feature Guide.
 *
 * #### Sorted Maps
 *
 * The Map data type supports both unordered and ordered maps. Maps can be
 * ordered by key, or by key and value. By default, maps are unordered. The map
 * order is controlled through the map policy and can be set either when the
 * map is created through the {@link module:aerospike/maps.put|put} or {@link
 * module:aerospike/maps.putItems|putItems} operations or later on through the
 * {@link module:aerospike/maps.setPolicy|setPolicy} operation.
 *
 * All maps maintain an index and a rank. The index is the item offset from the
 * start of the map, for both unordered and ordered maps. The rank is the
 * sorted index of the value component. Map supports negative indexing for
 * index and rank.
 *
 * Index examples:
 *
 *  - Index 0: First item in map.
 *  - Index 4: Fifth item in map.
 *  - Index -1: Last item in map.
 *  - Index -3: Third to last item in map.
 *  - Index 1 Count 2: Second and third items in map.
 *  - Index -3 Count 3: Last three items in map.
 *  - Index -5 Count 4: Range between fifth to last item to second to last item inclusive.
 *
 * Rank examples:
 *
 *  - Rank 0: Item with lowest value rank in map.
 *  - Rank 4: Fifth lowest ranked item in map.
 *  - Rank -1: Item with highest ranked value in map.
 *  - Rank -3: Item with third highest ranked value in map.
 *  - Rank 1 Count 2: Second and third lowest ranked items in map.
 *  - Rank -3 Count 3: Top three ranked items in map.
 *
 * @see {@link Client#operate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const maps = Aerospike.maps
 * const key = new Aerospike.Key('test', 'demo', 'mapKey')
 *
 * Aerospike.connect().then(async client => {
 *   let ops = [
 *     maps.put('map', 'e', 5, {
 *       order: maps.order.KEY_ORDERED
 *     }),                                           // => { e: 5 }
 *     maps.putItems('map', { d: 4, b: 2, c: 3 }),   // => { b: 2, c: 3, d: 4, e: 5 }
 *     maps.putItems('map', { c: 99, a: 1 }, {
 *       writeFlags: maps.writeFlags.CREATE_ONLY
 *         | maps.writeFlags.NO_FAIL
 *         | maps.writeFlags.PARTIAL
 *     }),                                           // => { a: 1, b: 2, c: 3, d: 4, e: 5 }
 *     maps.removeByValue('map', 3),                 // => { a: 1, b: 2, d: 4, e: 5 }
 *     maps.removeByIndexRange('map', -2)
 *       .andReturn(maps.returnType.KEY)             // => { a: 1, b: 2 }
 *   ]
 *   let result = await client.operate(key, ops)
 *   console.log(result.bins.map)                    // => ['d', 'e']
 *   let record = await client.get(key)
 *   console.log(record.bins.map)                    // => { a: 1, b: 2 }
 *   await client.remove(key)
 *   client.close()
 * })
  */

/**
 * @class module:aerospike/maps~MapOperation
 *
 * @classdesc Use the methods in the {@link module:aerospike/maps|maps}
 * module to create map operations for use with the {@link Client#operate}
 * command.
 */
class MapOperation extends Operation {
  /**
   * @summary Set the return type for certain map operations.
   *
   * @description The return type only affects <code>getBy\*</code> and
   * <code>removeBy\*</code> map operations.
   *
   * @param {number} returnType - The {@link
   * module:aerospike/maps.returnType|return type} indicating what data of the
   * selected items to return.
   *
   * @example <caption>Remove map keys in a given range and return the values</caption>
   *
   * const Aerospike = require('aerospike')
   * const maps = Aerospike.maps
   * const key = new Aerospike.Key('test', 'demo', 'mapKey')
   *
   * Aerospike.connect().then(async client => {
   *   await client.put(key, { map: { a: 1, b: 2, c: 3, d: 4, e: 5 } })
   *   const ops = [
   *     maps.removeByKeyRange('map', 'b', 'd')
   *       .andReturn(maps.returnType.VALUE)
   *   ]
   *   const result = await client.operate(key, ops)
   *   console.info('Result:', result.bins.map) // => Result: [ 2, 3 ]
   *   client.close()
   * })
   */
  andReturn (returnType) {
    this.returnType = returnType
    return this
  }

  /**
   * @summary By setting the context, the map operation will be executed on a
   * nested map, instead of the bin value itself.
   *
   * @param { CdtContext | function } context - Either a CdtContext object, or a
   * function which accepts a CdtContext object.
   * @returns { MapOperation } The map operation itself.
   *
   * @since v3.12.0
   *
   * @example <caption>Fetch the value with the key 'b' from the 2nd nested map</caption>
   *
   * const Aerospike = require('aerospike')
   * const maps = Aerospike.maps
   * const key = new Aerospike.Key('test', 'demo', 'mapsTest')
   *
   * Aerospike.connect().then(async (client) => {
   *   await client.put(key, { maps: [{ a: 1, b: 2 }, { b: 3, c: 4 }] })
   *   const ops = [
   *     maps.getByKey('maps', 'b')
   *       .withContext((ctx) => ctx.addListIndex(1))
   *       .andReturn(maps.returnType.VALUE)
   *   ]
   *   const result = await client.operate(key, ops)
   *   console.info('Result:', result.bins.maps) // => Result: 3
   *   client.close()
   * })
   *
   * @example <caption>Fetch the value with the key 'b' from the nested map under the key 'alpha'</caption>
   *
   * const Aerospike = require('./')
   * const maps = Aerospike.maps
   * const Context = Aerospike.cdt.Context
   * const key = new Aerospike.Key('test', 'demo', 'listsTest')
   *
   * Aerospike.connect().then(async (client) => {
   *   await client.put(key, { maps: { alpha: { a: 1, b: 2 }, beta: { b: 3, c: 4 } } })
   *   const context = new Context().addMapKey('alpha')
   *   const ops = [
   *     maps.getByKey('maps', 'b')
   *       .withContext(context)
   *       .andReturn(maps.returnType.VALUE)
   *   ]
   *   const result = await client.operate(key, ops)
   *   console.info('Result:', result.bins.maps) // => Result: 2
   *   client.close()
   * })
   */
  withContext (contextOrFunction) {
    if (typeof contextOrFunction === 'object') {
      this.context = contextOrFunction
    } else if (typeof contextOrFunction === 'function') {
      this.context = new Context()
      contextOrFunction(this.context)
    }
    return this
  }
}

/**
 * @summary Map order.
 *
 * @description The order determines what kind of index the Aerospike server
 * maintains for the map.
 *
 * @type Object
 * @property {number} UNORDERED - Map is not ordered. This is the default.
 * @property {number} KEY_ORDERED - Order map by key.
 * @property {number} KEY_VALUE_ORDERED - Order map by key, then value.
 */
exports.order = as.maps.order

/**
 * @summary Map write mode.
 *
 * @description The write mode determines whether a write operation succeeds,
 * depending on whether the map key(s) to be written already exist. It also
 * determines whether a new map will be created automatically if the record
 * bin, which the map operation is targeting, is currently empty.
 *
 * Map write mode should only be used for server versions prior to v4.3. For
 * server versions v4.3 or later, the use of {@link
 * module:aerospike/maps.writeFlags|writeFlags} is recommended.
 *
 * @type Object
 * @property {number} UPDATE - If the key already exists, the item will be
 * overwritten. If the key does not exist, a new item will be created. This is
 * the default write mode.
 * @property {number} UPDATE_ONLY - If the key already exists, the item will be
 * overwritten. If the key does not exist, the write will fail.
 * @property {number} CREATE_ONLY - If the key already exists, the write will
 * fail. If the key does not exist, a new item will be created.
 *
 * @deprecated since v3.5.0
 */
exports.writeMode = as.maps.writeMode

/**
 * @summary Map write flags.
 *
 * @description The write flags determine whether a write operation succeeds,
 * depending on whether the map key(s) to be written already exist. They also
 * determine whether a new map will be created automatically if the record bin,
 * which the map operation is targeting, is currently empty.
 *
 * Map write flags require server version v4.3 or later. For earier server
 * versions, set the {@link module:aerospike/maps.writeMode|writeMode} instead.
 *
 * @type Object
 * @property {number} DEFAULT - Allow create or update. Default.
 * @property {number} CREATE_ONLY - If the key already exists, the item will be
 * denied.  If the key does not exist, a new item will be created.
 * @property {number} UPDATE_ONLY - If the key already exists, the item will be
 * overwritten. If the key does not exist, the item will be denied.
 * @property {number} NO_FAIL - Do not raise error, if map item is denied due
 * to write flag constraints.
 * @property {number} PARTIAL - Allow other valid map items to be committed, if
 * a map item is denied due to write flag constraints.
 *
 * @since v3.5.0
 */
exports.writeFlags = as.maps.writeFlags

/**
 * @summary Map return type.
 *
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
 * @property {number} KEY - Return key for single key read and key list for
 * range read.
 * @property {number} VALUE - Return value for single key read and value list
 * for range read.
 * @property {number} KEY_VALUE - Return map items keys and values as an Array,
 * i.e. [key1, value1, key2, value2, ...].
 */
exports.returnType = as.maps.returnType

/**
 * @private
 */
exports.MapPolicy = policy.MapPolicy

/**
 * @summary Sets map policy attributes.
 *
 * @description This operation does not return any result.
 *
 * @param {string} bin - The name of the bin. The bin must contain a Map value.
 * @param {MapPolicy} policy - The map policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.setPolicy = function (bin, policy) {
  var op = new MapOperation(opcodes.MAP_SET_POLICY, bin)
  op.policy = policy
  return op
}

/**
 * @summary Writes a key/value item to the map.
 *
 * @description Depending on the map policy and whether an entry with the same
 * key already exists in the map, a new key will be added to the map or the
 * existing entry with the same key will be updated. If the bin does not yet
 * contain a map value, a new map may be created.
 *
 * This operation returns the new size of the map.
 *
 * @param {string} bin - The name of the bin. If the bin exists, it must
 * contain a Map value; if it does not yet exist, a new Map may be created
 * depending on the map policy's write mode.
 * @param {any} key - Map key to write.
 * @param {any} value - Map value to write.
 * @param {MapPolicy} [policy] - The map policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.put = function (bin, key, value, policy) {
  var op = new MapOperation(opcodes.MAP_PUT, bin)
  op.key = key
  op.value = value
  op.policy = policy
  return op
}

/**
 * @summary Writes each entry of the given map to the map bin on the server.
 *
 * @description Depending on the map policy and whether an entry with the same
 * key already exists in the map, a new entry will be added to the map or the
 * existing entry with the same key will be updated. If the bin does not yet
 * contain a map value, a new map may be created.
 *
 * This operation returns the new size of the map.
 *
 * @param {string} bin - The name of the bin. If the bin exists, it must
 * contain a Map value; if it does not yet exist, a new Map may be created
 * depending on the map policy's write mode.
 * @param {object} items - One or more key value pairs to write to the map.
 * @param {MapPolicy} [policy] - The map policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.putItems = function (bin, items, policy) {
  var op = new MapOperation(opcodes.MAP_PUT_ITEMS, bin)
  op.items = items
  op.policy = policy
  return op
}

/**
 * @summary Increments the map entry identified by the given key by the value
 * <code>incr</code>. Valid only for numeric values.
 *
 * @description If a map entry with the given key does not exist, the map
 * policy's write mode determines whether a new entry will be created same as
 * for the {@link module:aerospike/maps.put|put} command. This operation may
 * create a new map if the map bin is currently empty.
 *
 * This operation returns the new value of the map entry.
 *
 * @param {string} bin - The name of the bin. If the bin exists, it must
 * contain a Map value; if it does not yet exist, a new Map may be created
 * depending on the map policy's write mode.
 * @param {any} key - The map key.
 * @param {number} incr - The value to increment the map entry by.
 * @param {MapPolicy} [policy] - The map policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.increment = function (bin, key, incr, policy) {
  var op = new MapOperation(opcodes.MAP_INCREMENT, bin)
  op.key = key
  op.incr = incr
  op.policy = policy
  return op
}

/**
 * @summary Decrements the map entry identified by the given key by the value
 * <code>decr</code>. Valid only for numeric values.
 *
 * @description If a map entry with the given key does not exist, the map
 * policy's write mode determines whether a new entry will be created same as
 * for the {@link module:aerospike/maps.put|put} command. This operation may
 * create a new map if the map bin is currently empty.
 *
 * This operation returns the new value of the map entry.
 *
 * @param {string} bin - The name of the bin. If the bin exists, it must
 * contain a Map value; if it does not yet exist, a new Map may be created
 * depending on the map policy's write mode.
 * @param {any} key - The map key.
 * @param {number} decr - The value to decrement the map entry by.
 * @param {MapPolicy} [policy] - The map policy.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.decrement = function (bin, key, decr, policy) {
  var op = new MapOperation(opcodes.MAP_DECREMENT, bin)
  op.key = key
  op.decr = decr
  op.policy = policy
  return op
}

/**
 * @summary Removes all items in the map.
 *
 * @description This operation does not return any result.
 *
 * @param {string} bin - The name of the bin. If the bin exists, it must
 * contain a Map value; if it does not yet exist, a new Map may be created
 * depending on the map policy's write mode.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.clear = function (bin) {
  return new MapOperation(opcodes.MAP_CLEAR, bin)
}

/**
 * @summary Removes a single item identified by key from the map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {any} key - The map key.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByKey = function (bin, key, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_KEY, bin)
  op.key = key
  op.returnType = returnType
  return op
}

/**
 * @summary Removes one or more items identified by key from the map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {Array<any>} keys - An array of map keys.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByKeyList = function (bin, keys, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_KEY_LIST, bin)
  op.keys = keys
  op.returnType = returnType
  return op
}

/**
 * @summary Removes one or more items identified by a range of keys from the
 * map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {?any} begin - Start key in the range (inclusive). If set to
 * <code>null</code>, the range includes all keys less than the
 * <code>end</code> key.
 * @param {?any} end - End key in the range (exclusive). If set to
 * <code>null</code>, the range includes all keys greater than or equal to the
 * <code>begin</code> key.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByKeyRange = function (bin, begin, end, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_KEY_RANGE, bin)
  op.begin = begin
  op.end = end
  op.returnType = returnType
  return op
}

/**
 * @summary Removes map items nearest to key and greater, by index, from the
 * map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * Examples for map { a: 17, e: 2, f: 15, j: 10 }:
 *
 * * (value, index, count) = [removed items]
 * * ('f', 0, 1) = { f: 15 }
 * * ('f', 1, 2) = { j: 10 }
 * * ('f', -1, 1) = { e: 2 }
 * * ('b', 2, 1) = { j: 10 }
 * * ('b', -2, 2) = { a: 17 }
 *
 * Without count:
 *
 * * (value, index) = [removed items]
 * * ('f', 0) = { f: 15, j: 10 }
 * * ('f', 1) = { j: 10 }
 * * ('f', -1) = { e: 2, f: 15, j: 10 }
 * * ('b', 2) = { j: 10 }
 * * ('b', -2) = { a: 17, e: 2, f: 15, j: 10 }
 *
 * Requires Aerospike Server v4.3.0 or later.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {any} key - Find map items nearest to this key and greater.
 * @param {number} index - Index of items to be removed relative to the given key.
 * @param {number} [count] - Number of items to remove. If undefined, the range
 * includes all items nearest to key and greater, until the end.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.5.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const maps = Aerospike.maps
 * const key = new Aerospike.Key('test', 'demo', 'mapKey')
 *
 * Aerospike.connect()
 *   .then(async client => {
 *     await client.put(key, { map: { a: 17, e: 2, f: 15, j: 10 } })
 *     let result = await client.operate(key, [
 *       maps.removeByKeyRelIndexRange('map', 'f', -1, 1)
 *         .andReturn(maps.returnType.KEY_VALUE)])
 *     console.info(result.bins.map) // => [ 'e', 2 ]
 *     let record = await client.get(key)
 *     console.info(record.bins.map) // => { a: 17, f: 15, j: 10 }
 *     client.close()
 *   })
 */
exports.removeByKeyRelIndexRange = function (bin, key, index, count, returnType) {
  return new MapOperation(opcodes.MAP_REMOVE_BY_KEY_REL_INDEX_RANGE, bin, {
    key: key,
    index: index,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Removes one or more items identified by a single value from the
 * map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {any} value - The map value.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByValue = function (bin, value, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_VALUE, bin)
  op.value = value
  op.returnType = returnType
  return op
}

/**
 * @summary Removes one or more items identified by a list of values from the
 * map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {Array<any>} values - An array of map values.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByValueList = function (bin, values, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_VALUE_LIST, bin)
  op.values = values
  op.returnType = returnType
  return op
}

/**
 * @summary Removes one or more items identified by a range of values from the
 * map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {?any} begin - Start values in the range (inclusive). If set to
 * <code>null</code>, the range includes all values less than the
 * <code>end</code> value.
 * @param {?any} end - End value in the range (exclusive). If set to
 * <code>null</code>, the range includes all values greater than or equal to the
 * <code>begin</code> value.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByValueRange = function (bin, begin, end, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_VALUE_RANGE, bin)
  op.begin = begin
  op.end = end
  op.returnType = returnType
  return op
}

/**
 * @summary Removes map items nearest to value and greater, by relative rank.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * Examples for map { e: 2, j: 10, f: 15, a: 17 }:
 *
 * * (value, rank, count) = [removed items]
 * * (11, 1, 1) = { a: 17 }
 * * (11, -1, 1) = { j: 10 }
 *
 * Without count:
 *
 * * (value, rank) = [removed items]
 * * (11, 1) = { a: 17 }
 * * (11, -1) = { j: 10, f: 15, a: 17 }
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {any} value - Find map items nearest to this value and greater.
 * @param {number} rank - Rank of items to be removed relative to the given value.
 * @param {number} [count] - Number of items to remove. If undefined, the range
 * includes all items nearest to value and greater, until the end.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.5.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const maps = Aerospike.maps
 * const key = new Aerospike.Key('test', 'demo', 'mapKey')
 *
 * Aerospike.connect()
 *   .then(async client => {
 *     await client.put(key, { map: { e: 2, j: 10, f: 15, a: 17 } })
 *     let result = await client.operate(key, [
 *       maps.removeByValueRelRankRange('map', 11, -1)
 *         .andReturn(maps.returnType.KEY_VALUE)])
 *     console.info(result.bins.map) // => [ 'j', 10, 'f', 15, 'a', 17 ]
 *     let record = await client.get(key)
 *     console.info(record.bins.map) // => { e: 2 }
 *     client.close()
 *   })
 */
exports.removeByValueRelRankRange = function (bin, value, rank, count, returnType) {
  return new MapOperation(opcodes.MAP_REMOVE_BY_VALUE_REL_RANK_RANGE, bin, {
    value: value,
    rank: rank,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Removes a single item identified by its index value from the map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {number} index - Index of the entry to remove.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByIndex = function (bin, index, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_INDEX, bin)
  op.index = index
  op.returnType = returnType
  return op
}

/**
 * @summary Removes one or more items in the specified index range from the
 * map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {number} index - Starting index.
 * @param {number} [count] - Number of items to delete. If undefined, the range
 * includes all items starting from <code>index</code>.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByIndexRange = function (bin, index, count, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_INDEX_RANGE, bin)
  op.index = index
  op.count = count
  op.returnType = returnType
  return op
}

/**
 * @summary Removes a single item identified by its rank value from the map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {number} rank - Rank of the item to remove.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByRank = function (bin, rank, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_RANK, bin)
  op.rank = rank
  op.returnType = returnType
  return op
}

/**
 * @summary Removes one or more items in the specified rank range from the map.
 *
 * @description This operation returns the removed data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {number} index - Starting rank.
 * @param {number} [count] - Number of items to delete. If undefined, the range
 * includes all items starting from <code>rank</code>.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the affected item(s) to return (if any).
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.removeByRankRange = function (bin, rank, count, returnType) {
  var op = new MapOperation(opcodes.MAP_REMOVE_BY_RANK_RANGE, bin)
  op.rank = rank
  op.count = count
  op.returnType = returnType
  return op
}

/**
 * @summary Returns the size of the map.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 */
exports.size = function (bin) {
  return new MapOperation(opcodes.MAP_SIZE, bin)
}

/**
 * @summary Retrieves a single item identified by key from the map.
 *
 * @description This operation returns the data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {any} key - The map key.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.getByKey = function (bin, key, returnType) {
  var op = new MapOperation(opcodes.MAP_GET_BY_KEY, bin)
  op.key = key
  op.returnType = returnType
  return op
}

/**
 * @summary Retrieves one or more items identified by a range of keys from the
 * map.
 *
 * @description This operation returns the data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {?any} begin - Start key in the range (inclusive). If set to
 * <code>null</code>, the range includes all keys less than the
 * <code>end</code> key.
 * @param {?any} end - End key in the range (exclusive). If set to
 * <code>null</code>, the range includes all keys greater than or equal to the
 * <code>begin</code> key.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.getByKeyRange = function (bin, begin, end, returnType) {
  var op = new MapOperation(opcodes.MAP_GET_BY_KEY_RANGE, bin)
  op.begin = begin
  op.end = end
  op.returnType = returnType
  return op
}

/**
 * @summary Retrieves map items nearest to key and greater, by index, from the
 * map.
 *
 * @description This operation returns the selected data specified by
 * <code>returnType</code>.
 *
 * Examples for map { a: 17, e: 2, f: 15, j: 10 }:
 *
 * * (value, index, count) = [selected items]
 * * ('f', 0, 1) = { f: 15 }
 * * ('f', 1, 2) = { j: 10 }
 * * ('f', -1, 1) = { e: 2 }
 * * ('b', 2, 1) = { j: 10 }
 * * ('b', -2, 2) = { a: 17 }
 *
 * Without count:
 *
 * * (value, index) = [selected items]
 * * ('f', 0) = { f: 15, j: 10 }
 * * ('f', 1) = { j: 10 }
 * * ('f', -1) = { e: 2, f: 15, j: 10 }
 * * ('b', 2) = { j: 10 }
 * * ('b', -2) = { a: 17, e: 2, f: 15, j: 10 }
 *
 * Requires Aerospike Server v4.3.0 or later.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {any} key - Find map items nearest to this key and greater.
 * @param {number} index - Index of items to be retrieved relative to the given key.
 * @param {number} [count] - Number of items to retrieve. If undefined, the
 * range includes all items nearest to key and greater, until the end.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.5.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const maps = Aerospike.maps
 * const key = new Aerospike.Key('test', 'demo', 'mapKey')
 *
 * Aerospike.connect()
 *   .then(async client => {
 *     await client.put(key, { map: { a: 17, e: 2, f: 15, j: 10 } })
 *     let result = await client.operate(key, [
 *       maps.getByKeyRelIndexRange('map', 'b', 2, 1)
 *         .andReturn(maps.returnType.KEY_VALUE)])
 *     console.info(result.bins.map) // => [ 'j', 10 ]
 *     client.close()
 *   })
 */
exports.getByKeyRelIndexRange = function (bin, key, index, count, returnType) {
  return new MapOperation(opcodes.MAP_GET_BY_KEY_REL_INDEX_RANGE, bin, {
    key: key,
    index: index,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Retrieves one or more items identified by a single value from the
 * map.
 *
 * @description This operation returns the data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {any} value - The map value.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.getByValue = function (bin, value, returnType) {
  var op = new MapOperation(opcodes.MAP_GET_BY_VALUE, bin)
  op.value = value
  op.returnType = returnType
  return op
}

/**
 * @summary Retrieves one or more items identified by a range of values from
 * the map.
 *
 * @description This operation returns the data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {?any} begin - Start values in the range (inclusive). If set to
 * <code>null</code>, the range includes all values less than the
 * <code>end</code> value.
 * @param {?any} end - End value in the range (exclusive). If set to
 * <code>null</code>, the range includes all values greater than or equal to the
 * <code>begin</code> value.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.getByValueRange = function (bin, begin, end, returnType) {
  var op = new MapOperation(opcodes.MAP_GET_BY_VALUE_RANGE, bin)
  op.begin = begin
  op.end = end
  op.returnType = returnType
  return op
}

/**
 * @summary Retrieves map items nearest to value and greater, by relative rank.
 *
 * @description This operation returns the selected data specified by
 * <code>returnType</code>.
 *
 * Examples for map { e: 2, j: 10, f: 15, a: 17 }:
 *
 * * (value, rank, count) = [selected items]
 * * (11, 1, 1) = { a: 17 }
 * * (11, -1, 1) = { j: 10 }
 *
 * Without count:
 *
 * * (value, rank) = [selected items]
 * * (11, 1) = { a: 17 }
 * * (11, -1) = { j: 10, f: 15, a: 17 }
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {any} value - Find map items nearest to this value and greater.
 * @param {number} rank - Rank of items to be retrieved relative to the given value.
 * @param {number} [count] - Number of items to retrieve. If undefined, the
 * range includes all items nearest to value and greater, until the end.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 *
 * @since v3.5.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const maps = Aerospike.maps
 * const key = new Aerospike.Key('test', 'demo', 'mapKey')
 *
 * Aerospike.connect()
 *   .then(async client => {
 *     await client.put(key, { map: { e: 2, j: 10, f: 15, a: 17 } })
 *     let result = await client.operate(key, [
 *       maps.getByValueRelRankRange('map', 11, 1, 1)
 *         .andReturn(maps.returnType.KEY_VALUE)])
 *     console.info(result.bins.map) // => [ 'a', 17 ]
 *     client.close()
 *   })
 */
exports.getByValueRelRankRange = function (bin, value, rank, count, returnType) {
  return new MapOperation(opcodes.MAP_GET_BY_VALUE_REL_RANK_RANGE, bin, {
    value: value,
    rank: rank,
    count: count,
    returnType: returnType
  })
}

/**
 * @summary Retrieves a single item identified by it's index value from the
 * map.
 *
 * @description This operation returns the data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {number} index - Index of the entry to remove.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.getByIndex = function (bin, index, returnType) {
  var op = new MapOperation(opcodes.MAP_GET_BY_INDEX, bin)
  op.index = index
  op.returnType = returnType
  return op
}

/**
 * @summary Retrieves one or more items in the specified index range from the
 * map.
 *
 * @description This operation returns the data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {number} index - Starting index.
 * @param {number} [count] - Number of items to delete. If undefined, the range
 * includes all items starting from <code>index</code>.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.getByIndexRange = function (bin, index, count, returnType) {
  var op = new MapOperation(opcodes.MAP_GET_BY_INDEX_RANGE, bin)
  op.index = index
  op.count = count
  op.returnType = returnType
  return op
}

/**
 * @summary Retrieves a single item identified by it's rank value from the map.
 *
 * @description This operation returns the data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {number} rank - Rank of the entry to remove.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.getByRank = function (bin, rank, returnType) {
  var op = new MapOperation(opcodes.MAP_GET_BY_RANK, bin)
  op.rank = rank
  op.returnType = returnType
  return op
}

/**
 * @summary Retrieves one or more items in the specified rank range from the
 * map.
 *
 * @description This operation returns the data specified by
 * <code>returnType</code>.
 *
 * @param {string} bin - The name of the bin, which must contain a Map value.
 * @param {number} index - Starting rank.
 * @param {number} count - Number of items to delete; if not specified, the
 * range includes all items starting from <code>rank</code>.
 * @param {number} [returnType] - The {@link module:aerospike/maps.returnType|return type}
 * indicating what data of the selected item(s) to return.
 * @returns {Object} Operation that can be passed to the {@link Client#operate} command.
 *
 * @see Instead of passing <code>returnType</code>, you can also use
 * {@link module:aerospike/maps~MapOperation#andReturn|MapOperation#andReturn} to
 * select what data to return.
 */
exports.getByRankRange = function (bin, rank, count, returnType) {
  var op = new MapOperation(opcodes.MAP_GET_BY_RANK_RANGE, bin)
  op.rank = rank
  op.count = count
  op.returnType = returnType
  return op
}
