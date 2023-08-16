// *****************************************************************************
// Copyright 2023 Aerospike, Inc.
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
const privilegeCode = as.privilegeCode

/**
 * @module aerospike/privilegeCode
 *
 * @description Permission codes define the type of permission granted for a user's role.
 */

// ========================================================================
// Constants
// ========================================================================
module.exports = {
  /**
     * User can edit/remove other users.
     * @const {number}
     */
  USER_ADMIN: privilegeCode.USER_ADMIN,

  /**
     * User can perform systems administration functions on a database that do not involve user administration.
     * @const {number}
     */
  SYS_ADMIN: privilegeCode.SYS_ADMIN,

  /**
     * User can perform UDF and SINDEX administration actions.
     * @const {number}
     */
  DATA_ADMIN: privilegeCode.DATA_ADMIN,

  /**
     * User can perform user defined function (UDF) administration actions.
     * @const {number}
     */
  UDF_ADMIN: privilegeCode.UDF_ADMIN,

  /**
     * User can perform secondary index administration actions.
     * @const {number}
     */
  SINDEX_ADMIN: privilegeCode.SINDEX_ADMIN,

  /**
     * User can read data.
     * @const {number}
     */
  READ: privilegeCode.READ,

  /**
     * User can read and write data.
     * @const {number}
     */
  READ_WRITE: privilegeCode.READ_WRITE,

  /**
     * User can read and write data through user defined functions.
     * @const {number}
     */
  READ_WRITE_UDF: privilegeCode.READ_WRITE_UDF,

  /**
     * User can write data.
     * @const {number}
     */
  WRITE: privilegeCode.WRITE,

  /**
     * User can truncate data only.
     * @const {number}
     */
  TRUNCATE: privilegeCode.TRUNCATE
}
