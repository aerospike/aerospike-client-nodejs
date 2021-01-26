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

const _valueExp = (op, valName) => (val) => [{ op, [valName]: val }]

exports.bool = _valueExp(exp.ops.VAL_BOOL, 'boolVal')

exports.int = _valueExp(exp.ops.VAL_INT, 'intVal')
const _int = exports.int

exports.str = _valueExp(exp.ops.VAL_STR, 'strVal')

exports.bytes = _valueExp(exp.ops.VAL_BYTES, 'bytesVal')

// TODO: Add float, geo, nil value expressions

/*********************************************************************************
 * KEY EXPRESSIONS
 *********************************************************************************/

const _keyTypeExp = (type) => () => [
  { op: exp.ops.KEY, count: 2 },
  ..._int(type)
]

exports.keyInt = _keyTypeExp(exp.type.INT)

exports.keyStr = _keyTypeExp(exp.type.STR)

exports.keyBlob = _keyTypeExp(exp.type.BLOB)

exports.keyExist = () => [{ op: exp.ops.KEY_EXIST, count: 1 }]

/*********************************************************************************
 * BIN EXPRESSIONS
 *********************************************************************************/

const _valRawStr = (val) => [{ op: exp.ops.VAL_RAWSTR, strVal: val }]

const _binTypeExp = (type) => (binName) => [
  { op: exp.ops.BIN, count: 3 },
  ..._int(type),
  ..._valRawStr(binName)
]

exports.binInt = _binTypeExp(exp.type.INT)

exports.binFloat = _binTypeExp(exp.type.FLOAT)

exports.binStr = _binTypeExp(exp.type.STR)

exports.binBlob = _binTypeExp(exp.type.BLOB)

exports.binGeo = _binTypeExp(exp.type.GEOJSON)

exports.binList = _binTypeExp(exp.type.LIST)

exports.binMap = _binTypeExp(exp.type.MAP)

exports.binHll = _binTypeExp(exp.type.HLL)

exports.binType = (binName) => [
  { op: exp.ops.BIN_TYPE, count: 2 },
  ..._valRawStr(binName)
]
const _binType = exports.binType

exports.binExists = (binName) => _ne(_binType(binName), _int(BIN_TYPE_UNDEF))

/*********************************************************************************
 * METADATA EXPRESSIONS
 *********************************************************************************/

const _metaExp = (op) => () => [{ op, count: 1 }]

exports.setName = _metaExp(exp.ops.SET_NAME)

exports.deviceSize = _metaExp(exp.ops.DEVICE_SIZE)

exports.lastUpdate = _metaExp(exp.ops.LAST_UPDATE)

exports.sinceUpdate = _metaExp(exp.ops.SINCE_UPDATE)

exports.voidTime = _metaExp(exp.ops.VOID_TIME)

exports.ttl = _metaExp(exp.ops.TTL)

exports.isTombstone = _metaExp(exp.ops.IS_TOMBSTONE)

exports.memorySize = _metaExp(exp.ops.MEMORY_SIZE)

exports.digestModulo = _metaExp(exp.ops.DIGEST_MODULO)

/*********************************************************************************
 * COMPARISON EXPRESSIONS
 *********************************************************************************/

const _cmpExp = (op) => (left, right) => [{ op, count: 3 }].concat(left, right)

exports.eq = _cmpExp(exp.ops.CMP_EQ)

exports.ne = _cmpExp(exp.ops.CMP_NE)
const _ne = exports.ne

exports.gt = _cmpExp(exp.ops.CMP_GT)

exports.ge = _cmpExp(exp.ops.CMP_GE)

exports.lt = _cmpExp(exp.ops.CMP_LT)

exports.le = _cmpExp(exp.ops.CMP_LE)

/*********************************************************************************
 * LOGICAL EXPRESSIONS
 *********************************************************************************/

exports.not = (expr) => [
  { op: exp.ops.NOT, count: 2 },
  ...expr
]

const _logicalVAExp = (op) => (...expr) => [].concat(
  { op },
  ...expr,
  { op: exp.ops.END_OF_VA_ARGS }
)

exports.and = _logicalVAExp(exp.ops.AND)

exports.or = _logicalVAExp(exp.ops.OR)

/*********************************************************************************
 * LIST MODIFY EXPRESSIONS
 *********************************************************************************/

/*********************************************************************************
 * LIST READ EXPRESSIONS
 *********************************************************************************/

/*********************************************************************************
 * MAP MODIFY EXPRESSIONS
 *********************************************************************************/

/*********************************************************************************
 * MAP READ EXPRESSIONS
 *********************************************************************************/

/*********************************************************************************
 * BIT MODIFY EXPRESSIONS
 *********************************************************************************/

/*********************************************************************************
 * BIT READ EXPRESSIONS
 *********************************************************************************/

/*********************************************************************************
 * HLL MODIFY EXPRESSIONS
 *********************************************************************************/

/*********************************************************************************
 * HLL READ EXPRESSIONS
 *********************************************************************************/
