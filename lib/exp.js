// *****************************************************************************
// Copyright 2021 Aerospike, Inc.
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
const exp = as.exp

/*********************************************************************************
 * VALUE EXPRESSIONS
 *********************************************************************************/

function int (val) {
  return [ { op: exp.ops.VAL_INT, intVal: val } ]
}
exports.int = int

/*********************************************************************************
 * KEY EXPRESSIONS
 *********************************************************************************/

exports.keyInt = function () {
  return [
    { op: exp.ops.KEY, count: 2 },
    ...int(exp.type.INT)
  ]
}

exports.keyExist = function keyExists () {
  return [ { op: exp.ops.KEY_EXIST, count: 1 } ]
}

/*********************************************************************************
 * BIN EXPRESSIONS
 *********************************************************************************/

function valRawStr (val) {
  return [ { op: exp.ops.VAL_RAWSTR, strVal: val } ]
}

exports.binInt = function binInt (binName) {
  return [
    { op: exp.ops.BIN, count: 3 },
    ...int(exp.type.INT),
    ...valRawStr(binName)
  ]
}

/*********************************************************************************
 * COMPARISON EXPRESSIONS
 *********************************************************************************/

exports.cmpEq = function cmpEq (left, right) {
  return [
    { op: exp.ops.CMP_EQ, count: 3 },
    ...left,
    ...right
  ]
}
