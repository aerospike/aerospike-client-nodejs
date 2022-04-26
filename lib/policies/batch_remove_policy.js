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
 * A policy affecting the behavior of batch remove operations.
 *
 * @since v5.0.0
 */
class BatchRemovePolicy {
  /**
   * Initializes a new BatchRemovePolicy from the provided policy values.
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
     * Specifies the behavior for the generation value.
     *
     * @type number
     * @see {@link module:aerospike/policy.gen} for supported policy values.
     */
    this.gen = props.gen

    /**
     * The generation of the record.
     *
     * @type number
     */
    this.generation = props.generation

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

module.exports = BatchRemovePolicy
