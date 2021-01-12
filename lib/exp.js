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

const BIN_TYPE_UNDEF = 0

/*********************************************************************************
 * VALUE EXPRESSIONS
 *********************************************************************************/

function int (val) {
  return [{ op: exp.ops.VAL_INT, intVal: val }]
}
exports.int = int

function bool (val) {
  return [{ op: exp.ops.VAL_BOOL, boolVal: val }]
}
exports.bool = bool

function str (val) {
  return [{ op: exp.ops.VAL_STR, strVal: val }]
}
exports.str = str

function bytes (val) {
  return [{ op: exp.ops.VAL_BYTES, bytesVal: val }]
}
exports.bytes = bytes

/*********************************************************************************
 * KEY EXPRESSIONS
 *********************************************************************************/

exports.keyInt = function () {
  return [
    { op: exp.ops.KEY, count: 2 },
    ...int(exp.type.INT)
  ]
}

exports.keyStr = function () {
  return [
    { op: exp.ops.KEY, count: 2 },
    ...int(exp.type.STR)
  ]
}

exports.keyBlob = function () {
  return [
    { op: exp.ops.KEY, count: 2 },
    ...int(exp.type.BLOB)
  ]
}

exports.keyExist = function keyExists () {
  return [{ op: exp.ops.KEY_EXIST, count: 1 }]
}

/*********************************************************************************
 * BIN EXPRESSIONS
 *********************************************************************************/

function valRawStr (val) {
  return [{ op: exp.ops.VAL_RAWSTR, strVal: val }]
}

exports.binInt = function (binName) {
  return [
    { op: exp.ops.BIN, count: 3 },
    ...int(exp.type.INT),
    ...valRawStr(binName)
  ]
}

// TODO: add binFloat support

exports.binStr = function (binName) {
  return [
    { op: exp.ops.BIN, count: 3 },
    ...int(exp.type.STR),
    ...valRawStr(binName)
  ]
}

exports.binBlob = function (binName) {
  return [
    { op: exp.ops.BIN, count: 3 },
    ...int(exp.type.BLOB),
    ...valRawStr(binName)
  ]
}

// TODO: add binGeo

exports.binList = function (binName) {
  return [
    { op: exp.ops.BIN, count: 3 },
    ...int(exp.type.LIST),
    ...valRawStr(binName)
  ]
}

exports.binMap = function (binName) {
  return [
    { op: exp.ops.BIN, count: 3 },
    ...int(exp.type.MAP),
    ...valRawStr(binName)
  ]
}

exports.binHll = function (binName) {
  return [
    { op: exp.ops.BIN, count: 3 },
    ...int(exp.type.HLL),
    ...valRawStr(binName)
  ]
}

function binType (binName) {
  return [
    { op: exp.ops.BIN_TYPE, count: 2 },
    ...valRawStr(binName)
  ]
}
exports.binType = binType

exports.binExists = function (binName) {
  return cmpNe(binType(binName), int(BIN_TYPE_UNDEF))
}

/*********************************************************************************
 * COMPARISON EXPRESSIONS
 *********************************************************************************/

function cmpEq (left, right) {
  return [
    { op: exp.ops.CMP_EQ, count: 3 },
    ...left,
    ...right
  ]
}
exports.cmpEq = cmpEq

function cmpNe (left, right) {
  return [
    { op: exp.ops.CMP_NE, count: 3 },
    ...left,
    ...right
  ]
}
exports.cmpNe = cmpNe
