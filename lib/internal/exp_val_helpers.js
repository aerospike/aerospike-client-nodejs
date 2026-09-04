// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
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
//
// Shared expression literal helpers (Julian review): used by exp_string;
// exp_bit and other exp_* modules can import here to avoid duplicating
// int/uint/rtype and number-vs-expression branching.
// *****************************************************************************

'use strict'

const as = require('../native')
const exp = as.exp

/** @param {number} n */
const intVal = (n) => [{ op: exp.ops.VAL_INT, intVal: n }]
/** @param {number} n */
const uintVal = (n) => [{ op: exp.ops.VAL_UINT, uintVal: n }]
/** @param {number} t expression return type tag */
const rtypeVal = (t) => [{ op: exp.ops.VAL_RTYPE, intVal: t }]

/**
 * @param {number|import('../exp').AerospikeExp} n
 * @returns {import('../exp').AerospikeExp}
 */
function intOrExp (n) {
  return typeof n === 'number' ? intVal(n) : n
}

module.exports = {
  intVal,
  uintVal,
  rtypeVal,
  intOrExp
}
