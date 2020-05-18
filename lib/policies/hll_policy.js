// *****************************************************************************
// Copyright 2020 Aerospike, Inc.
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
 * A policy affecting the behavior of {@link module:aerospike/hll|HLL} operations.
 *
 * @since v3.16.0
 */
class HLLPolicy {
  /**
   * Initializes a new HLLPolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   */
  constructor (props) {
    props = props || {}

    /**
     * Specifies the behavior when writing byte values.
     *
     * @type number
     * @default Aerospike.hll.writeFlags.DEFAULT
     * @see {@link module:aerospike/hll.writeFlags} for supported policy values.
     */
    this.writeFlags = props.writeFlags
  }
}

module.exports = HLLPolicy
