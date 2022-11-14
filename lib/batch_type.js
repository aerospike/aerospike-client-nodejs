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
 * @module aerospike/batchType
 *
 * @description Identifies batch record type with designated enumerated type
 */

// ========================================================================
// Constants
// ========================================================================
module.exports = {
  /**
     * An instance of class {@link Record} that is used in a batch for read operations.
     * @const {number}
     */
  BATCH_READ: batchType.BATCH_READ,

  /**
     * An instance of class {@link Record} that is used in a batch for write operations.
     * @const {number}
     */
  BATCH_WRITE: batchType.BATCH_WRITE,

  /**
     * An instance of class {@link Record} that is used in a batch for applying record.
     * @const {number}
     */
  BATCH_APPLY: batchType.BATCH_APPLY,

  /**
     * An instance of class {@link Record} that is used in a batch for removal operations.
     * @const {number}
     */
  BATCH_REMOVE: batchType.BATCH_REMOVE

}
