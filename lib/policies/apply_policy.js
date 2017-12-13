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
 * A policy affecting the behavior of apply operations.
 *
 * @extends BasePolicy
 * @since v3.0.0
 */
class ApplyPolicy extends BasePolicy {
  /**
   * Initializes a new ApplyPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}
    super(props)

    /**
     * Specifies the behavior for the generation value.
     *
     * @type number
     * @see {@link module:aerospike/policy.gen} for supported policy values.
     */
    this.gen = props.gen

    /**
     * Specifies the behavior for the key.
     *
     * @type number
     * @see {@link module:aerospike/policy.key} for supported policy values.
     */
    this.key = props.key

    /**
     * Specifies the number of replicas required to be committed successfully
     * when writing before returning transaction succeeded.
     *
     * @type number
     * @see {@link module:aerospike/policy.commitLevel} for supported policy values.
     */
    this.commitLevel = props.commitLevel

    /**
     * The time-to-live (expiration) of the record in seconds.
     *
     * @type number
     */
    this.ttl = props.ttl

    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @type boolean
     * @default <code>false</code> (do not tombstone deleted records)
     */
    this.durableDelete = props.durableDelete

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

module.exports = ApplyPolicy
