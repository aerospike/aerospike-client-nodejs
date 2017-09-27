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

/**
 * A policy affecting the behavior of info operations.
 */
class InfoPolicy {
  constructor (props) {
    props = props || {}

    /**
     * Maximum time in milliseconds to wait for the operation to complete.
     *
     * @type number
     */
    this.timeout = props.timeout

    /**
     * Send request without any further processing.
     *
     * @type boolean
     */
    this.sendAsIs = props.sendAsIs

    /**
     * Ensure the request is within allowable size limits.
     *
     * @type boolean
     */
    this.checkBounds = props.checkBounds
  }
}

module.exports = InfoPolicy
