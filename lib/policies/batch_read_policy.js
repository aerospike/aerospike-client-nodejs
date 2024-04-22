// *****************************************************************************
// Copyright 2022-2023 Aerospike, Inc.
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
 * A policy affecting the behavior of batch read operations.
 *
 * @since v5.0.0
 */
class BatchReadPolicy {
  /**
   * Initializes a new BatchReadPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}
    /**
     * Optional expression filter. If filter exp exists and evaluates to false, the
     * transaction is ignored. This can be used to eliminate a client/server roundtrip
     * in some cases.
     *
     */
    this.filterExpression = props.filterExpression
    /**
     * Read policy for AP (availability) namespaces.
     *
     * @type number
     * @default Aerospike.policy.readModeAP.ONE
     * @see {@link module:aerospike/policy.readModeAP} for supported policy values.
     */
    this.readModeAP = props.readModeAP
    /**
      * Read policy for SC (strong consistency) namespaces.
      *
      * @type number
      * @default Aerospike.policy.readModeSC.SESSION
      * @see {@link module:aerospike/policy.readModeSC} for supported policy values.
      */
    this.readModeSC = props.readModeSC

    /**
     * Determine how record TTL (time to live) is affected on reads. When enabled, the server can
     * efficiently operate as a read-based LRU cache where the least recently used records are expired.
     * The value is expressed as a percentage of the TTL sent on the most recent write such that a read
     * within this interval of the record’s end of life will generate a touch.
     *
     * For example, if the most recent write had a TTL of 10 hours and read_touch_ttl_percent is set to
     * 80, the next read within 8 hours of the record's end of life (equivalent to 2 hours after the most
     * recent write) will result in a touch, resetting the TTL to another 10 hours.
     *      *
     * @type number
     * @default 0
     */
    this.readTouchTtlPercent = props.readTouchTtlPercent
  }
}

module.exports = BatchReadPolicy
