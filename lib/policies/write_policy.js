// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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
 * A policy affecting the behavior of write operations.
 *
 * @extends BasePolicy
 * @since v3.0.0
 */
class WritePolicy extends BasePolicy {
  /**
   * Initializes a new WritePolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}
    super(props)

    /**
     * Minimum record size beyond which it is compressed and sent to the
     * server.
     *
     * @type number
     */
    this.compressionThreshold = props.compressionThreshold

    /**
     * Specifies the behavior for the key.
     *
     * @type number
     * @see {@link module:aerospike/policy.key} for supported policy values.
     */
    this.key = props.key

    /**
     * Specifies the behavior for the generation value.
     *
     * @type number
     * @see {@link module:aerospike/policy.gen} for supported policy values.
     */
    this.gen = props.gen

    /**
     * Specifies the behavior for the existence of the record.
     *
     * @type number
     * @see {@link module:aerospike/policy.exists} for supported policy values.
     */
    this.exists = props.exists

    /**
     * Specifies the number of replicas required to be committed successfully
     * when writing before returning transaction succeeded.
     *
     * @type number
     * @see {@link module:aerospike/policy.commitLevel} for supported policy values.
     */
    this.commitLevel = props.commitLevel

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
  }
}

module.exports = WritePolicy
