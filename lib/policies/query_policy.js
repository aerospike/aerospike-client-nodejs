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
     * Should CDT data types (Lists / Maps) be deserialized to JS data types
     * (Arrays / Objects) or returned as raw bytes (Buffer).
     *
     * @type boolean
     * @default <code>true</code>
     */
    this.deserialize = props.deserialize

    /**
     * Terminate the query if the cluster is in migration state.
     *
     * Requires Aerospike Server version 4.2.0.2 or later.
     *
     * @type boolean
     * @default <code>false</code>
     * @since v3.4.0
     */
    this.failOnClusterChange = props.failOnClusterChange
  }
}

module.exports = QueryPolicy
