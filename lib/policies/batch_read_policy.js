// *****************************************************************************
// Copyright 2022 Aerospike, Inc.
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
  }
}

module.exports = BatchReadPolicy
