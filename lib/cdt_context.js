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

/** @private **/
const LIST_INDEX = 0x10
/** @private **/
const LIST_RANK = 0x11
/** @private **/
const LIST_VALUE = 0x13
/** @private **/
const MAP_INDEX = 0x20
/** @private **/
const MAP_RANK = 0x21
/** @private **/
const MAP_KEY = 0x22
/** @private **/
const MAP_VALUE = 0x23

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
    return this.add(LIST_INDEX, index)
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
   * @summary yLookup map by index offset.
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
   * @summary Lookup map by value.
   *
   * @param {any} value - Map value
   * @return {CdtContext} Updated CDT context, so calls can be chained.
   */
  addMapValue (value) {
    return this.add(MAP_VALUE, value)
  }

  /** @private **/
  add (type, value) {
    this.items.push([type, value])
    return this
  }
}

module.exports = CdtContext
