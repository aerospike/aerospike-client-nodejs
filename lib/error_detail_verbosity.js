// *****************************************************************************
// Copyright 2013-2026 Aerospike, Inc.
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

const as = require('bindings')('aerospike.node')

/**
 * @module aerospike/errorDetailVerbosity
 *
 * @description Error detail verbosity levels for {@link BasePolicy#errorDetailVerbosity}.
 *
 * Set on policy objects to request optional server error detail fields in
 * responses. Requires Aerospike Server version >= 8.1.3.
 */

/**
 * No error details requested (default).
 * @const {number}
 */
exports.NONE = as.subcode.AEROSPIKE_ERROR_DETAIL_NONE

/**
 * Request subcode only from the server on error responses.
 * @const {number}
 */
exports.SUBCODE = as.subcode.AEROSPIKE_ERROR_DETAIL_SUBCODE

/**
 * Request subcode and human-readable message from the server on error responses.
 * @const {number}
 */
exports.MESSAGE = as.subcode.AEROSPIKE_ERROR_DETAIL_MESSAGE
