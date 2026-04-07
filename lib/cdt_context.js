// *****************************************************************************
// Copyright 2019-2023 Aerospike, Inc.
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
const exp = as.exp
const ctxType = as.ctxType

/** @private **/
const EXP = ctxType.EXP
/** @private **/
const LIST_INDEX = ctxType.LIST_INDEX
/** @private **/
const LIST_RANK = ctxType.LIST_RANK
/** @private **/
const LIST_VALUE = ctxType.LIST_VALUE
/** @private **/
const MAP_INDEX = ctxType.MAP_INDEX
/** @private **/
const MAP_RANK = ctxType.MAP_RANK
/** @private **/
const MAP_KEY = ctxType.MAP_KEY
/** @private **/
const MAP_VALUE = ctxType.MAP_VALUE
/** @private **/
const MAP_KEYS_IN = ctxType.MAP_KEYS_IN
/** @private **/
const int32Max = 2147483647
/** @private **/
const int32Min = -2147483648

/**
 * @summary Nested CDT context type.
 *
 * @see {@link module:aerospike/lists~ListOperation#withContext|ListOperation#withContext} Adding context to list operations
 * @see {@link module:aerospike/maps~MapOperation#withContext|Map#Operation#withContext} Adding context to map operations
 *
 * @since v3.12.0
 */
class CdtContext {
  constructor () {
    this.items = []
  }

  /**
   * @summary Lookup list by index offset.
   *
   * @description If the index is negative, the resolved index starts backwards
   * from end of list. If an index is out of bounds, a parameter error will be
   * returned. Examples:
   *
   * - 0: First item.
   * - 4: Fifth item.
   * - -1: Last item.
   * - -3: Third to last item.
   *
   * @param {number} index - List index
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addListIndex (index) {
    if (int32Max < index) {
      throw new Error('index overflow, largest supported integer is ' + int32Max)
    } else if (int32Min > index) {
      throw new Error('index underflow, smallest supported integer is ' + int32Min)
    }
    return this.add(LIST_INDEX, index)
  }

  /**
   * @summary Lookup list by base list's index offset.
   *
   * @description If the list at index offset is not found,
   * create it with the given sort order at that index offset.
   * If pad is true and the index offset is greater than the
   * bounds of the base list, nil entries will be inserted before the newly
   * created list.
   *
   * @param {number} index - List index
   * @param {number} order - Sort order used if a list is created
   * @param {boolean} pad - Pads list entries between index and the
   * final list entry with zeros.
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addListIndexCreate (index, order, pad) {
    if (int32Max < index) {
      throw new Error('index overflow, largest supported integer is' + int32Max)
    } else if (int32Min > index) {
      throw new Error('index underflow, smallest supported integer is' + int32Min)
    }
    if (order) {
      return this.add(LIST_INDEX | 0xc0, index)
    } else {
      if (pad) {
        return this.add(LIST_INDEX | 0x80, index)
      } else {
        return this.add(LIST_INDEX | 0x40, index)
      }
    }
  }

  /**
   * @summary Lookup list by rank.
   *
   * @description Examples:
   *
   * - 0 = smallest value
   * - N = Nth smallest value
   * - -1 = largest value
   *
   * @param {number} rank - List rank
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addListRank (rank) {
    if (int32Max < rank) {
      throw new Error('rank overflow, largest supported integer is' + int32Max)
    } else if (int32Min > rank) {
      throw new Error('rank underflow, smallest supported integer is' + int32Min)
    }
    return this.add(LIST_RANK, rank)
  }

  /**
   * @summary Lookup list by value.
   *
   * @param {any} value - List value
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addListValue (value) {
    return this.add(LIST_VALUE, value)
  }

  /**
   * @summary Lookup map by index offset.
   *
   * @description If the index is negative, the resolved index starts backwards
   * from end of list. If an index is out of bounds, a parameter error will be
   * returned. Examples:
   *
   * - 0: First item.
   * - 4: Fifth item.
   * - -1: Last item.
   * - -3: Third to last item.
   *
   * @param {number} index - Map index
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addMapIndex (index) {
    if (int32Max < index) {
      throw new Error('index overflow, largest supported integer is' + int32Max)
    } else if (int32Min > index) {
      throw new Error('index underflow, smallest supported integer is' + int32Min)
    }
    return this.add(MAP_INDEX, index)
  }

  /**
   * @summary Lookup map by rank.
   *
   * @description Examples:
   *
   * - 0 = smallest value
   * - N = Nth smallest value
   * - -1 = largest value
   *
   * @param {number} rank - Map rank
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addMapRank (rank) {
    if (int32Max < rank) {
      throw new Error('rank overflow, largest supported integer is' + int32Max)
    } else if (int32Min > rank) {
      throw new Error('rank underflow, smallest supported integer is' + int32Min)
    }
    return this.add(MAP_RANK, rank)
  }

  /**
   * @summary Lookup map by key.
   *
   * @param {any} key - Map key
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addMapKey (key) {
    return this.add(MAP_KEY, key)
  }

  /**
   * @summary Lookup map by base map's key. If the map at key is not found,
   * create it with the given sort order at that key.
   *
   * @param {any} key - Map key
   * @param {number} order - Sort order used if a map is created
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addMapKeyCreate (key, order) {
    if (!order) {
      return this.add(MAP_KEY | 0x40, key)
    } else if (order === 1) {
      return this.add(MAP_KEY | 0x80, key)
    } else {
      return this.add(MAP_KEY | 0xc0, key)
    }
  }

  /**
   * @summary Lookup map by value.
   *
   * @param {any} value - Map value
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addMapValue (value) {
    return this.add(MAP_VALUE, value)
  }

  /**
   * Look up one or more keys in a map expression.
   *
   * @param {list} keys - list of keys to query in the map context.
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addMapKeysIn (keys) {
	return this.add(MAP_KEYS_IN, keys)
  }

  /**
   * @summary At the current context, causes a query to return a list of all the children
   * of the current item. For a map, this will recurse into the map elements.
   * For a list, this will include all the children in the list.
   *
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addAllChildren () {
    return this.add(EXP)
  }

  /**
   * @summary All children of the current level will be selected, and then the filter expression
   * is applied to each item in turn.  Items that cause the expression to evaluate to true will be added to the
   * list of items returned in a query for this level.  Items that cause the expression to evaluate to false
   * will be filtered out
   *
   * @param {AerospikExp} filterExpression - Aerospike expression. Must resolve to a boolean expression.
   *
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addAllChildrenWithFilter (exp) {
    return this.add(EXP, exp)
  }

  /** @private **/
  add (type, value) {
    this.items.push([type, value])
    return this
  }

  /**
   * Retrieve expression type list/map from ctx or from type.
   *
   * @param {CdtContext} ctx, ctx value object.
   * @param {number} type, {@link exp.type} default expression type.
   * @return {number} {@link exp.type} expression type.
   */
  static getContextType (/* CdtContext */ctx, type) {
    if (ctx != null) {
      return ((ctx.items[ctx.items.length - 1][0] & LIST_INDEX) === 0) ? exp.type.MAP : exp.type.LIST
    }
    return type
  }
}

module.exports = CdtContext
