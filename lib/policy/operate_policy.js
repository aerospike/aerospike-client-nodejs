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
 * A policy affecting the behavior of operate operations.
 *
 * @extends BasePolicy
 * @see {@link module:aerospike.policy} for supported policy values.
 */
class OperatePolicy extends BasePolicy {
  constructor (props) {
    props = props || {}
    super(props)

    /**
     * Specifies the behavior for the key.
     *
     * @type number
     */
    this.key = props.key

    /**
     * Specifies the behavior for the generation value.
     *
     * @type number
     */
    this.gen = props.gen

    /**
     * Specifies the replica to be consulted for the read operation.
     *
     * @type number
     */
    this.replica = props.replica

    /**
     * Specifies the number of replicas consulted when reading for the desired
     * consistency guarantee.
     *
     * @type number
     * @default Aerospike.policy.consistencyLevel.ONE
     */
    this.consistencyLevel = props.consistencyLevel

    /**
     * Specifies the number of replicas required to be committed successfully
     * when writing before returning transaction succeeded.
     *
     * @type number
     */
    this.commitLevel = props.commitLevel

    /**
     * Specifies whether a {@link
     * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone}
     * should be written in place of a record that gets deleted as a result of
     * this operation.
     *
     * @type boolean
     * @default false (do not tombstone deleted records)
     */
    this.durableDelete = props.durableDelete
  }
}

module.exports = OperatePolicy
