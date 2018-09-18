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
 * A policy affecting the behavior of batch operations.
 *
 * @extends BasePolicy
 * @since v3.0.0
 */
class BatchPolicy extends BasePolicy {
  /**
   * Initializes a new BatchPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}
    super(props)

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
     * Should CDT data types (Lists / Maps) be deserialized to JS data types
     * (Arrays / Objects) or returned as raw bytes (Buffer).
     *
     * @type boolean
     * @default <code>true</code>
     */
    this.deserialize = props.deserialize

    /**
     * Allow batch to be processed immediately in the server's receiving thread
     * when the server deems it to be appropriate. If false, the batch will
     * always be processed in separate transaction threads.
     *
     * @type boolean
     * @default <code>true</code>
     */
    this.allowInline = props.allowInline

    /**
     * Send set name field to server for every key in the batch. This is only
     * necessary when authentication is enabled and security roles are defined
     * on a per-set basis.
     *
     * @type boolean
     * @default <code>false</code>
     */
    this.sendSetName = props.sendSetName

    /**
     * Force reads to be linearized for server namespaces that support strong
     * consistency (aka CP mode).
     *
     * @type boolean
     * @default <code>false</code>
     */
    this.linearizeRead = props.linearizeRead
  }
}

module.exports = BatchPolicy
