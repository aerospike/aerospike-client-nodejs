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
const lists = as.lists
const maps = as.maps

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

exports.float = _valueExp(exp.ops.VAL_FLOAT, 'floatVal')

exports.geo = _valueExp(exp.ops.VAL_GEO, 'val')

exports.nil = () => [{ op: exp.ops.AS_VAL, val: null }]

const _val = _valueExp(exp.ops.AS_VAL, 'val')
exports.list = _val
exports.map = _val

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

const _rawStr = (val) => [{ op: exp.ops.VAL_RAWSTR, strVal: val }]

const _binTypeExp = (type) => (binName) => [
  { op: exp.ops.BIN, count: 3 },
  ..._int(type),
  ..._rawStr(binName)
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
  ..._rawStr(binName)
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

exports.cmpRegex = (options, regex, cmpStr) => [
  { op: exp.ops.CMP_REGEX, count: 4 },
  ..._int(options),
  ..._rawStr(regex),
  ...cmpStr
]

exports.cmpGeo = _cmpExp(exp.ops.CMP_GEO)

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

function getContextType (ctx, type) {
  let expected = exp.type.LIST
  
  return expected
}

function getListType (type, returnType, isMulti) {
  let expected = type

  switch (returnType & ~lists.returnType.INVERTED) {
    case lists.returnType.INDEX:
    case lists.returnType.REVERSE_INDEX:
    case lists.returnType.RANK:
    case lists.returnType.REVERSE_RANK:
      expected = isMulti ? exp.type.LIST : exp.type.INT
      break
    case lists.returnType.COUNT:
      expected = exp.type.INT
      break
    case lists.returnType.VALUE:
      if (isMulti) {
        expected = exp.type.LIST
      }
      break
    case lists.returnType.NONE:
    default:
      return exp.type.ERROR
  }

  if (type === exp.type.AUTO || type === expected) {
    return expected
  }

  return exp.type.ERROR
}

const _rtype = _valueExp(exp.ops.VAL_RTYPE, 'intVal')

const _listRead = (type, returnType, isMulti) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(getListType(type, returnType, isMulti)),
  ..._int(exp.sys.CALL_CDT)
]

const _listModify = (ctx, pol, op, param, extraParam) => [
  { op: exp.ops.CALL, count: 5 },
  exp.type.LIST,
  ..._int(exp.sys.CALL_CDT | exp.sys.FLAG_MODIFY_LOCAL),
  { op: exp.ops.CALL_VOP_START, count: 1 + param + pol ? extraParam : 0, ctx },
  ..._int(op)
]

const _listStart = (ctx, op, param) => [
  { op: exp.ops.CALL_VOP_START, count: 1 + param, ctx },
  ..._int(op)
]

exports.lists = {
  size: (bin, ctx = null) => [
    ..._listRead(exp.type.AUTO, lists.returnType.COUNT, false),
    ..._listStart(ctx, lists.opcodes.SIZE, 0),
    ...bin
  ],

  getByValue: (bin, value, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_ALL_BY_VALUE, 2),
    ..._int(returnType),
    ...value,
    ...bin
  ],

  getByValueRange: (bin, begin, end, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_VALUE_INTERVAL, 3),
    ..._int(returnType),
    ...begin,
    ...end,
    ...bin
  ],

  getByValueList: (bin, value, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_VALUE_LIST, 2),
    ..._int(returnType),
    ...value,
    ...bin
  ],

  getByRelRankRangeToEnd: (bin, value, rank, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_VALUE_REL_RANK_RANGE, 3),
    ..._int(returnType),
    ...value,
    ...rank,
    ...bin
  ],

  getByRelRankRange: (bin, value, rank, count, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_VALUE_REL_RANK_RANGE, 4),
    ..._int(returnType),
    ...value,
    ...rank,
    ...count,
    ...bin
  ],

  getByIndex: (bin, index, valueType, returnType, ctx = null) => [
    ..._listRead(valueType, returnType, false),
    ..._listStart(ctx, lists.opcodes.GET_BY_INDEX, 2),
    ..._int(returnType),
    ...index,
    ...bin
  ],

  getByIndexRangeToEnd: (bin, index, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_INDEX_RANGE, 2),
    ..._int(returnType),
    ...index,
    ...bin
  ],

  getByIndexRange: (bin, index, count, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_INDEX_RANGE, 3),
    ..._int(returnType),
    ...index,
    ...count,
    ...bin
  ],

  getByRank: (bin, rank, valueType, returnType, ctx = null) => [
    ..._listRead(valueType, returnType, false),
    ..._listStart(ctx, lists.opcodes.GET_BY_RANK, 2),
    ..._int(returnType),
    ...rank,
    ...bin
  ],

  getByRankRangeToEnd: (bin, rank, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_RANK_RANGE, 2),
    ..._int(returnType),
    ...rank,
    ...bin
  ],

  getByRankRange: (bin, rank, count, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_RANK_RANGE, 3),
    ..._int(returnType),
    ...rank,
    ...count,
    ...bin
  ],

  append: (bin, val, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.APPEND, 1, 2),
    ...val,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ]
}

/*********************************************************************************
 * MAP MODIFY EXPRESSIONS
 *********************************************************************************/

/*********************************************************************************
 * MAP READ EXPRESSIONS
 *********************************************************************************/

function getMapType (type, returnType, isMulti) {
  let expected = type

  switch (returnType & ~maps.returnType.INVERTED) {
    case maps.returnType.INDEX:
    case maps.returnType.REVERSE_INDEX:
    case maps.returnType.RANK:
    case maps.returnType.REVERSE_RANK:
      expected = isMulti ? exp.type.LIST : exp.type.INT
      break
    case maps.returnType.COUNT:
      expected = exp.type.INT
      break
    case maps.returnType.KEY:
    case maps.returnType.VALUE:
      if (isMulti) {
        expected = exp.type.LIST
      }
      break
    case maps.returnType.KEY_VALUE:
      expected = exp.type.MAP
      break
    case maps.returnType.NONE:
    default:
      return exp.type.ERROR
  }

  if (type === exp.type.AUTO || type === expected) {
    return expected
  }

  return exp.type.ERROR
}

const _mapRead = (type, returnType, isMulti) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(getMapType(type, returnType, isMulti)),
  ..._int(exp.sys.CALL_CDT)
]

const _mapStart = (ctx, op, param) => [
  { op: exp.ops.CALL_VOP_START, count: 1 + param, ctx },
  ..._int(op)
]

exports.maps = {
  size: (bin, ctx = null) => [
    ..._mapRead(exp.type.AUTO, maps.returnType.COUNT, false),
    ..._mapStart(ctx, maps.opcodes.SIZE, 0),
    ...bin
  ]
}

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
