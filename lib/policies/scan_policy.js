// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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
 * A policy affecting the behavior of scan operations.
 *
 * @extends BasePolicy
 * @since v3.0.0
 */
class ScanPolicy extends BasePolicy {
  /**
   * Initializes a new ScanPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}
    super(props)

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
     * Limit returned records per second (RPS) rate for each server. Do not
     * apply RPS limit if <code>recordsPerSecond</code> is zero.
     *
     * Requires server >= 4.7.
     *
     * @type number
     * @default 0
     *
     * @since v3.14.0
     */
    this.recordsPerSecond = props.recordsPerSecond

    /**
     * Approximate number of records to return to client. This number is
     * divided by the number of nodes involved in the scan. The actual number
     * of records returned may be less than maxRecords if node record counts
     * are small and unbalanced across nodes.
     *
     * Requires server >= 4.9.
     *
     * @type number
     * @default 0 (do not limit record count)
     *
     * @since v3.16.0
     */
    this.maxRecords = props.maxRecords
  }
}

module.exports = ScanPolicy
