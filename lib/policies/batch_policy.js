// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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
     * Algorithm used to determine target node.
     * @type number
     * @default Aerospike.policy.replica.MASTER
     * @see {@link module:aerospike/policy.replica} for supported policy values.
     */
    this.replica = props.replica

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
     * Determine if batch commands to each server are run in parallel threads.
     *
     * Values:
     * false: Issue batch commands sequentially.  This mode has a performance advantage for small
     * to medium sized batch sizes because commands can be issued in the main transaction thread.
     * This is the default.
     * true: Issue batch commands in parallel threads.  This mode has a performance
     * advantage for large batch sizes because each node can process the command immediately.
     * The downside is extra threads will need to be created (or taken from
     * a thread pool).
     * @type boolean
     * @default <code>false</code>
     */
    this.concurrent = props.concurrent
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
     * Allow batch to be processed immediately in the server's receiving thread for SSD
     * namespaces. If false, the batch will always be processed in separate service threads.
     * Server versions &lt; 6.0 ignore this field.
     *
     * Inline processing can introduce the possibility of unfairness because the server
     * can process the entire batch before moving onto the next command.
     *
     * @type boolean
     * @default <code>false</code>
     */
    this.allowInlineSSD = props.allowInlineSSD
    /**
     * Should all batch keys be attempted regardless of errors. This field is used on both
     * the client and server. The client handles node specific errors and the server handles
     * key specific errors.
     *
     * If true, every batch key is attempted regardless of previous key specific errors.
     * Node specific errors such as timeouts stop keys to that node, but keys directed at
     * other nodes will continue to be processed.
     *
     * If false, the server will stop the batch to its node on most key specific errors.
     * The exceptions are AEROSPIKE_ERR_RECORD_NOT_FOUND and AEROSPIKE_FILTERED_OUT
     * which never stop the batch. The client will stop the entire batch on node specific
     * errors for sync commands that are run in sequence (concurrent == false). The client
     * will not stop the entire batch for async commands or sync commands run in parallel.
     *
     * Server versions &lt; 6.0 do not support this field and treat this value as false
     * for key specific errors.
     *
     * @type boolean
     * @default <code>true</code>
     */
    this.respondAllKeys = props.respondAllKeys

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
     * Should CDT data types (Lists / Maps) be deserialized to JS data types
     * (Arrays / Objects) or returned as raw bytes (Buffer).
     *
     * @type boolean
     * @default <code>true</code>
     * @since v3.7.0
     */
    this.deserialize = props.deserialize
  }
}

module.exports = BatchPolicy
