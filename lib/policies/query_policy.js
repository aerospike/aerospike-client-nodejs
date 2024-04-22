// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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
 * A policy affecting the behavior of query operations.
 *
 * @extends BasePolicy
 * @since v3.0.0
 */
class QueryPolicy extends BasePolicy {
  /**
   * Initializes a new QueryPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}
    super(props)

    /**
     * Specifies the replica to be consulted for the query operation.
     *
     * @type number
     * @see {@link module:aerospike/policy.replica} for supported policy values.
     */
    this.replica = props.replica

    /**
     * Should CDT data types (Lists / Maps) be deserialized to JS data types
     * (Arrays / Objects) or returned as raw bytes (Buffer).
     *
     * @type boolean
     * @default <code>true</code>
     * @since v3.7.0
     */
    this.deserialize = props.deserialize

    /**
     * Terminate the query if the cluster is in migration state. If the query's
     * "where" clause is not defined (scan), this field is ignored.
     *
     * Requires Aerospike Server version 4.2.0.2 or later.
     *
     * @type boolean
     * @default <code>false</code>
     * @since v3.4.0
     */
    this.failOnClusterChange = props.failOnClusterChange

    /**
     * Timeout in milliseconds used when the client sends info commands to
     * check for cluster changes before and after the query. This timeout is
     * only used when {@link
     * QueryPolicy#failOnClusterChange|failOnClusterChange} is true and the
     * query's "where" clause is defined.
     *
     * @type number
     * @default 10000 ms
     * @since v3.16.5
     */
    this.infoTimeout = props.infoTimeout

    /**
     * Total transaction timeout in milliseconds.
     *
     * The <code>totalTimeout</code> is tracked on the client and sent to the
     * server along with the transaction in the wire protocol. The client will
     * most likely timeout first, but the server also has the capability to
     * timeout the transaction.
     *
     * If <code>totalTimeout</code> is not zero and <code>totalTimeout</code>
     * is reached before the transaction completes, the transaction will return
     * error {@link module:aerospike/status.ERR_TIMEOUT|ERR_TIMEOUT}.
     * If <code>totalTimeout</code> is zero, there will be no total time limit.
     *
     * @type number
     * @default 0
     * @override
     */
    this.totalTimeout = props.totalTimeout

    /**
     * Expected query duration. The server treats the query in different ways depending on the expected duration.
     * This field is ignored for aggregation queries, background queries and server versions &lt; 6.0.
     *
     * @see {@link module:aerospike/policy.queryDuration} for supported policy values.
     * @type {@link module:aerospike/policy.queryDuration}
     * @default {@link module:aerospike/policy.queryDuration.LONG}
     */
    this.expectedDuration = props.expectedDuration
  }
}

module.exports = QueryPolicy
