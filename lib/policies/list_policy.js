// *****************************************************************************
// Copyright 2018 Aerospike, Inc.
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
 * A policy affecting the behavior of list operations.
 *
 * @since v3.3.0
 */
class ListPolicy {
  /**
   * Initializes a new ListPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}

    /**
     * Sort order for the list.
     *
     * @type number
     * @default Aerospike.lists.order.UNORDERED
     * @see {@link module:aerospike/lists.order} for supported policy values.
     */
    this.order = props.order

    /**
     * Specifies the behavior when replacing or inserting list items.
     *
     * @type number
     * @default Aerospike.lists.writeFlags.DEFAULT
     * @see {@link module:aerospike/lists.writeFlags} for supported policy values.
     */
    this.writeFlags = props.writeFlags
  }
}

module.exports = ListPolicy
