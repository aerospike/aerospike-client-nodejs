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

/**
 * @module aerospike/query
 *
 * @description The {@link module:aerospike/query|query} module defines
 * enumerations used by {@link Query#orderBy} and {@link Query#topK} to
 * declare a Top-K (`ORDER BY <bin> LIMIT k`) clause on a foreground {@link
 * Query}.
 *
 * @summary {@link module:aerospike/query|aerospike/query} module
 */

/**
 * @summary Declares the scalar type of the {@link Query#orderBy} bin.
 * Aerospike has no schema, so the type must be declared explicitly.
 *
 * @enum {number}
 */
exports.orderByType = {
  /** 64-bit signed integer bin value. */
  INTEGER: 1,
  /** Double-precision floating point bin value. */
  DOUBLE: 2,
  /** String bin value. */
  STRING: 3,
  /** Byte array (blob) bin value. */
  BYTES: 4
}

/**
 * @summary Sort direction for {@link Query#orderBy}.
 *
 * @enum {number}
 */
exports.order = {
  /** Ascending order - smallest/lowest-ranked value ranks best. */
  ASC: 0,
  /** Descending order - largest/highest-ranked value ranks best. */
  DESC: 1
}

/**
 * @summary Modifier flags for {@link Query#orderBy}.
 *
 * @enum {number}
 */
exports.orderByFlags = {
  /** No modifier flags. */
  NONE: 0,
  /**
   * Case-insensitive comparison. Only valid when the declared {@link
   * orderByType} is <code>STRING</code>.
   */
  CASE_INSENSITIVE: 1
}
