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

const BasePolicy = require('./base_policy')

/**
 * A policy affecting the behavior of read operations.
 *
 * @extends BasePolicy
 * @since v3.0.0
 */
class ReadPolicy extends BasePolicy {
  /**
   * Initializes a new ReadPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}
    super(props)

    /**
     * Specifies the behavior for the key.
     *
     * @type number
     * @see {@link module:aerospike/policy.key} for supported policy values.
     */
    this.key = props.key

    /**
     * Specifies the replica to be consulted for the read operation.
     *
     * @type number
     * @see {@link module:aerospike/policy.replica} for supported policy values.
     */
    this.replica = props.replica

    /**
     * Specifies the number of replicas consulted when reading for the desired
     * consistency guarantee.
     *
     * @type number
     * @default Aerospike.policy.consistencyLevel.ONE
     * @see {@link module:aerospike/policy.consistencyLevel} for supported policy values.
     */
    this.consistencyLevel = props.consistencyLevel

    /**
     * Force reads to be linearized for server namespaces that support strong
     * consistency (aka CP mode).
     *
     * @type boolean
     * @default <code>false</code>
     */
    this.linearizeRead = props.linearizeRead;
  }
}

module.exports = ReadPolicy
