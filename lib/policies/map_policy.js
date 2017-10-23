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

'use strict'

/**
 * A policy affecting the behavior of map operations.
 *
 * @since v3.0.0
 */
class MapPolicy {
  /**
   * Initializes a new MapPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}

    /**
     * Sort order for the map.
     *
     * @type number
     * @default Aerospike.maps.order.UNORDERED
     * @see {@link module:aerospike/maps.order} for supported policy values.
     */
    this.order = props['order']

    /**
     * Specifies the behavior when replacing or inserting map items.
     *
     * @type number
     * @default Aerospike.maps.writeMode.UPDATE
     * @see {@link module:aerospike/maps.writeMode} for supported policy values.
     */
    this.writeMode = props['writeMode']
  }
}

module.exports = MapPolicy
