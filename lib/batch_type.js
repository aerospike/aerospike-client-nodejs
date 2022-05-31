// *****************************************************************************
// Copyright 2022 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the 'License')
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

const as = require('bindings')('aerospike.node')
const batchType = as.batchTypes

/**
 * @module aerospike/batch_type
 *
 * @description batch record type.
 */

// ========================================================================
// Constants
// ========================================================================

/**
 * Batch Record for read.
 * @const {number}
 */
exports.BATCH_READ = batchType.BATCH_READ

/**
 * Batch Record for write.
 * @const {number}
 */
exports.BATCH_WRITE = batchType.BATCH_WRITE

/**
 * Batch Record for apply.
 * @const {number}
 */
exports.BATCH_APPLY = batchType.BATCH_APPLY

/**
 * Batch Record for remove.
 * @const {number}
 */
exports.BATCH_REMOVE = batchType.BATCH_REMOVE
