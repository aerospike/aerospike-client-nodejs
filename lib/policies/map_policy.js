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
    this.order = props.order

    /**
     * Specifies the behavior when replacing or inserting map items.
     *
     * Map write mode should only be used for server versions prior to v4.3.
     * For server versions v4.3 or later, the use of {@link
     * MapPolicy#writeFlags|writeFlags} is recommended.
     *
     * @type number
     * @default Aerospike.maps.writeMode.UPDATE
     * @see {@link module:aerospike/maps.writeMode} for supported policy values.
     * @deprecated since v3.5
     */
    this.writeMode = props.writeMode

    /**
     * Specifies the behavior when replacing or inserting map items.
     *
     * Map write flags require server version v4.3 or later. For earier server
     * versions, set the {@link MapPolicy#writeMode|writeMode} instead.
     *
     * @type number
     * @default Aerospike.maps.writeFlags.DEFAULT
     * @see {@link module:aerospike/maps.writeFlags} for supported policy values.
     * @since v3.5
     */
    this.writeFlags = props.writeFlags
  }
}

module.exports = MapPolicy
