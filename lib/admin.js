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

/**
 * @module aerospike/admin
 *
 * @description The admin module contains classes associated with RBAC (Role Based Access Control) security
 * methods defined in {@link Client}
 *
 */

/**
 * The {@link User} class holds role and database usage information for individual users.
 *
 * @summary User.
 */
exports.User = require('./user')

/**
 * The {@link Privilege} class contains a {@link aerospike/privilegeCode | privilegeCode} as well as
 * an namespace and set.
 *
 * @summary Privilege
 */
exports.Privilege = require('./privilege')

/**
 * The {@link Role} class holds quota, whitelist, and privilege information for an specified role.
 *
 * @summary Role
 */
exports.Role = require('./role')
