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

exports.uint = _valueExp(exp.ops.VAL_UINT, 'uintVal')
const _uint = exports.uint

exports.str = _valueExp(exp.ops.VAL_STR, 'strVal')

exports.bytes = _valueExp(exp.ops.VAL_BYTES, 'bytesVal')

exports.float = _valueExp(exp.ops.VAL_FLOAT, 'floatVal')
const _float = exports.float

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
const _binFloat = exports.binFloat

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

const _VAExp = (op) => (...expr) => [].concat(
  { op },
  ...expr,
  { op: exp.ops.END_OF_VA_ARGS }
)

exports.and = _VAExp(exp.ops.AND)

exports.or = _VAExp(exp.ops.OR)

/*********************************************************************************
 * ARITHMETIC EXPRESSIONS
 *********************************************************************************/

const _VAargs = (op) => (...expr) => [].concat(
  { op },
  ...expr,
  { op: exp.ops.END_OF_VA_ARGS }
)

exports.add = _VAargs(exp.ops.ADD)
exports.sub = _VAargs(exp.ops.SUB)
exports.mul = _VAargs(exp.ops.MUL)
exports.div = _VAargs(exp.ops.DIV)

const _p3Exp = (op) => (p1, p2) => [
  { op: op, count: 3 },
  ...p1,
  ...p2
]
exports.pow = _p3Exp(exp.ops.POW)
exports.log = _p3Exp(exp.ops.LOG)
exports.mod = _p3Exp(exp.ops.MOD)

const _p2Exp = (op) => (p1) => [
  { op: op, count: 2 },
  ...p1
]
exports.abs = _p2Exp(exp.ops.ABS)
exports.floor = _p2Exp(exp.ops.FLOOR)
exports.ceil = _p2Exp(exp.ops.CEIL)
exports.toInt = _p2Exp(exp.ops.TO_INT)
exports.toFloat = _p2Exp(exp.ops.TO_FLOAT)

exports.intAnd = _VAargs(exp.ops.INT_AND)
exports.intOr = _VAargs(exp.ops.INT_OR)
exports.intXor = _VAargs(exp.ops.INT_XOR)

exports.intNot = _p2Exp(exp.ops.INT_NOT)

exports.intLshift = _p3Exp(exp.ops.INT_LSHIFT)
exports.intRshift = _p3Exp(exp.ops.INT_RSHIFT)
exports.intArshift = _p3Exp(exp.ops.INT_ARSHIFT)

exports.intCount = _p2Exp(exp.ops.INT_COUNT)

exports.intLscan = _p3Exp(exp.ops.INT_LSCAN)
exports.intRscan = _p3Exp(exp.ops.INT_RSCAN)

exports.min = _VAargs(exp.ops.MIN)
exports.max = _VAargs(exp.ops.MAX)

/*********************************************************************************
 * FLOW CONTROL AND VARIABLE EXPRESSIONS
 *********************************************************************************/
 exports.cond = _VAargs(exp.ops.COND)
 exports.let = _VAargs(exp.ops.LET)

/*********************************************************************************
 * LIST READ EXPRESSIONS
 *********************************************************************************/

function getContextType (ctx, type) {
  let expected = type
  
  return type
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
  ..._rtype(getContextType(ctx, exp.type.LIST)),
  ..._int(exp.sys.CALL_CDT | exp.sys.FLAG_MODIFY_LOCAL),
  { op: exp.ops.CALL_VOP_START, count: 1 + param + (pol ? extraParam : 0), ctx },
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

/*********************************************************************************
 * LIST MODIFY EXPRESSIONS
 *********************************************************************************/

  append: (bin, val, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.APPEND, 1, 2),
    ...val,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],
  
  appendItems: (bin, val, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.APPEND_ITEMS, 1, 2),
    ...val,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  insert: (bin, val, idx, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.INSERT, 2, 1),
    ...idx,
    ...val,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],
  
  insertItems: (bin, val, idx, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.INSERT_ITEMS, 2, 1),
    ...idx,
    ...val,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  increment: (bin, val, idx, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.INCREMENT, 2, 2),
    ...idx,
    ...val,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  set: (bin, val, idx, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.SET, 2, 1),
    ...idx,
    ...val,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],
  
  clear: (bin, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.CLEAR, 0, 0),
    ...bin
  ],
  
  sort: (bin, order, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.SORT, 1, 0),
    ..._int(order),
    ...bin
  ],
  
  removeAllByValue: (bin, val, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_ALL_BY_VALUE, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...val,
    ...bin
  ],
  
  removeByValueList: (bin, values, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_VALUE_LIST, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...values,
    ...bin
  ],
  
  removeByValueRange: (bin, end, begin, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_VALUE_INTERVAL, 3, 0),
    ..._int(lists.RETURN_NONE),
    ...begin,
    ...end,
    ...bin
  ],
  
  removeByRelRankRangeToEnd: (bin, rank, val, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_VALUE_REL_RANK_RANGE, 3, 0),
    ..._int(lists.RETURN_NONE),
    ...val,
    ...rank,
    ...bin
  ],
  
  removeByRelRankRange: (bin, count, rank, val, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_VALUE_REL_RANK_RANGE, 4, 0),
    ..._int(lists.RETURN_NONE),
    ...val,
    ...rank,
    ...count,
    ...bin
  ],

  removeByIndex: (bin, idx, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_INDEX, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...idx,
    ...bin
  ],

  removeByIndexRangeToEnd: (bin, idx, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_INDEX_RANGE, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...idx,
    ...bin
  ],

  removeByIndexRange: (bin, count, idx, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_INDEX_RANGE, 3, 0),
    ..._int(lists.RETURN_NONE),
    ...idx,
    ...count,
    ...bin
  ],

  removeByRank: (bin, rank, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_RANK, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...rank,
    ...bin
  ],

  removeByRankRangeToEnd: (bin, rank, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_RANK_RANGE, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...rank,
    ...bin
  ],

  removeByRankRange: (bin, count, rank, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_RANK_RANGE, 3, 0),
    ..._int(lists.RETURN_NONE),
    ...rank,
    ...count,
    ...bin
  ],
}

/*********************************************************************************
 * MAP MODIFY EXPRESSIONS
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

const _mapModify = (ctx, pol, op, param, extraParam) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(getContextType(ctx, exp.type.MAP)),
  ..._int(exp.sys.CALL_CDT | exp.sys.FLAG_MODIFY_LOCAL),
  { op: exp.ops.CALL_VOP_START, count: 1 + param + (pol ? extraParam : 0), ctx },
  ..._int(op)
]

exports.maps = {

  put: (bin, val, key, policy = null, ctx = null) => [
    ..._mapModify(ctx, policy, maps.opcodes.PUT, 2, 2),
    ...key,
    ...val,
    { op: exp.ops.CDT_MAP_CRMOD, mapPolicy: policy },
    ...bin
  ],

  putItems: (bin, map, policy = null, ctx = null) => [
    ..._mapModify(ctx, policy, maps.opcodes.PUT_ITEMS, 1, 2),
    ...map,
    { op: exp.ops.CDT_MAP_CRMOD, mapPolicy: policy },
    ...bin
  ],

  increment: (bin, val, key, policy = null, ctx = null) => [
    ..._mapModify(ctx, policy, maps.opcodes.INCREMENT, 2, 1),
    ...key,
    ...val,
    { op: exp.ops.CDT_MAP_CRMOD, mapPolicy: policy },
    ...bin
  ],

  clear: (bin, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.CLEAR, 0, 0),
    ...bin
  ],

  removeByKey: (bin, key, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...key,
    ...bin
  ],

  removeByKeyList: (bin, keys, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY_LIST, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...keys,
    ...bin
  ],

  removeByKeyRange: (bin, end, begin, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY_INTERVAL, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...begin,
    ...end,
    ...bin
  ],

  removeByKeyRelIndexRangeToEnd: (bin, idx, key, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY_REL_INDEX_RANGE, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...key,
    ...idx,
    ...bin
  ],

  removeByKeyRelIndexRange: (bin, count, idx, key, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY_REL_INDEX_RANGE, 4, 0),
    ..._int(maps.RETURN_NONE),
    ...key,
    ...idx,
    ...count,
    ...bin
  ],

  removeByValue: (bin, val, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_ALL_BY_VALUE, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...val,
    ...bin
  ],

  removeByValueList: (bin, values, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_VALUE_LIST, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...values,
    ...bin
  ],

  removeByValueRange: (bin, end, begin, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_VALUE_INTERVAL, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...begin,
    ...end,
    ...bin
  ],

  removeByValueRelRankRangeToEnd: (bin, rank, val, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_VALUE_REL_RANK_RANGE, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...val,
    ...rank,
    ...bin
   ],

   removeByValueRelRankRange: (bin, count, rank, val, key, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_VALUE_REL_RANK_RANGE, 4, 0),
    ..._int(maps.RETURN_NONE),
    ...val,
    ...rank,
    ...count,
    ...bin
  ],

  removeByIndex: (bin, idx, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_INDEX, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...idx,
    ...bin
  ],

  removeByIndexRangeToEnd: (bin, idx, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_INDEX_RANGE, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...idx,
    ...bin
  ],

  removeByIndexRange: (bin, count, idx, ctx = null) => [
    ..._mapModify(ctx, policy, maps.opcodes.PUT, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...idx,
    ...count,
    ...bin
  ],

  removeByRank: (bin, rank, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_RANK, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...rank,
    ...bin
  ],

  removeByRankRangeToEnd: (bin, rank, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_RANK_RANGE, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...rank,
    ...bin
  ],

  removeByRankRange: (bin, count, rank, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_RANK_RANGE, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...rank,
    ...count,
    ...bin
  ],

/*********************************************************************************
 * MAP READ EXPRESSIONS
 *********************************************************************************/

  size: (bin, ctx = null) => [
    ..._mapRead(exp.type.AUTO, maps.returnType.COUNT, false),
    ..._mapStart(ctx, maps.opcodes.SIZE, 0),
    ...bin
  ],

  getByKey: (bin, key, vtype, rtype, ctx = null) => [
    ..._mapRead(vtype, rtype, false),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY, 2),
    ..._int(rtype),
    ...key,
    ...bin
  ],

  getByKeyRange: (bin, end, begin, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY_INTERVAL, 3),
    ..._int(rtype),
    ...begin,
    ...end,
    ...bin
  ],

  getByKeyList: (bin, keys, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY_INTERVAL, 2),
    ..._int(rtype),
    ...keys,
    ...bin
  ],

  getByKeyRelIndexRangeToEnd: (bin, idx, key, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY_INTERVAL, 3),
    ..._int(rtype),
    ...key,
    ...idx,
    ...bin
  ],

  getByKeyRelIndexRange: (bin, count, key, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY_REL_INDEX_RANGE, 4),
    ..._int(rtype),
    ...key,
    ...idx,
    ...count,
    ...bin
  ],

  getByValue: (bin, val, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_ALL_BY_VALUE, 2),
    ..._int(rtype),
    ...val,
    ...bin
  ],

  getByValueRange: (bin, end, begin, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_VALUE_INTERVAL, 3),
    ..._int(rtype),
    ...begin,
    ...end,
    ...bin
  ],

  getByValueList: (bin, values, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_VALUE_INTERVAL, 2),
    ..._int(rtype),
    ...values,
    ...bin
  ],

  getByValueRelRankRangeToEnd: (bin, rank, val, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_VALUE_REL_RANK_RANGE, 3),
    ..._int(rtype),
    ...val,
    ...rank,
    ...bin
  ],

  getByValueRelRankRange: (bin, count, rank, val, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_VALUE_REL_INDEX_RANGE, 4),
    ..._int(rtype),
    ...val,
    ...rank,
    ...count,
    ...bin
  ],

  getByIndex: (bin, idx, vtype, rtype, ctx = null) => [
    ..._mapRead(vtype, rtype, false),
    ..._mapStart(ctx, maps.opcodes.GET_BY_INDEX, 2),
    ..._int(rtype),
    ...idx,
    ...bin
  ],

  getByIndexRangeToEnd: (bin, idx, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_INDEX_RANGE, 2),
    ..._int(rtype),
    ...idx,
    ...bin
  ],

  getByIndexRange: (bin, count, idx, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_INDEX_RANGE, 3),
    ..._int(rtype),
    ...idx,
    ...count,
    ...bin
  ],

  getByRank: (bin, rank, vtype, rtype, ctx = null) => [
    ..._mapRead(vtype, rtype, false),
    ..._mapStart(ctx, maps.opcodes.GET_BY_RANK, 2),
    ..._int(rtype),
    ...rank,
    ...bin
  ],

  getByRankRangeToEnd: (bin, rank, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_RANK_RANGE, 2),
    ..._int(rtype),
    ...rank,
    ...bin
  ],

  getByRankRange: (bin, count, rank, rtype, ctx = null) => [
    ..._mapRead(exp.type.AUTO, rtype, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_RANK_RANGE, 3),
    ..._int(rtype),
    ...rank,
    ...count,
    ...bin
  ]
}

/*********************************************************************************
 * BIT MODIFY EXPRESSIONS
 *********************************************************************************/

const _bitModify = () => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(getContextType(ctx, exp.type.BLOB)),
  ..._int(exp.sys.CALL_BITS | exp.sys.FLAG_MODIFY_LOCAL)
]

const _bitStart = (op, param) => [
  { ..._bitModify(),
    op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

const _bitRead = (returnType) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(returnType),
  ..._int(exp.sys.CALL_BITS)
]

const _bitReadStart = (returnType, op, param) => [
  { ..._bitRead(returnType),
    op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

exports.bit = {

  reSize: (bin, flags, byte_size, policy = null) => [
    ..._bitStart(exp.ops.BIT_RESIZE, 3),
    ...byte_size,
    ..._uint((pol ? pol.flags : 0)),
    ..._uint(flags),
    ...bin
  ],

  insert: (bin, val, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_INSERT, 3),
    ...byte_offset,
    ...val,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  remove: (bin, byte_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_REMOVE, 3),
    ...byte_offset,
    ...byte_size,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  set: (bin, val, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_SET, 4),
    ...byte_offset,
    ...bit_size,
    ...val,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  or: (bin, val, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_OR, 4),
    ...byte_offset,
    ...bit_size,
    ...val,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  xor: (bin, val, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_XOR, 4),
    ...byte_offset,
    ...bit_size,
    ...val,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  and: (bin, val, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_AND, 4),
    ...byte_offset,
    ...bit_size,
    ...val,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  not: (bin, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_NOT, 3),
    ...byte_offset,
    ...bit_size,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  lShift: (bin, shift, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_LSHIFT, 4),
    ...byte_offset,
    ...bit_size,
    ...shift,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  rShift: (bin, shift, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_RSHIFT, 4),
    ...byte_offset,
    ...bit_size,
    ...shift,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  add: (bin, action, val, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_ADD, 5),
    ...byte_offset,
    ...bit_size,
    ...val,
    ..._uint((pol ? pol.flags : 0)),
    ..._uint(action),
    ...bin
  ],

  subtract: (bin, action, val, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_SUBTRACT, 5),
    ...byte_offset,
    ...bit_size,
    ...val,
    ..._uint((pol ? pol.flags : 0)),
    ..._uint(action),
    ...bin
  ],

  setInt: (bin, val, bit_size, byte_offset, policy = null) => [
    ..._bitStart(exp.ops.BIT_SET_INT, 4),
    ...byte_offset,
    ...bit_size,
    ...val,
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

/*********************************************************************************
 * BIT READ EXPRESSIONS
 *********************************************************************************/

  get: (bin, bit_size, byte_offset) => [
    ..._bitReadStart(exp.type.BLOB, exp.ops.BIT_GET, 2),
    ...byte_offset,
    ...bit_size,
    ...bin
  ],

  count: (bin, bit_size, byte_offset) => [
    ..._bitReadStart(exp.type.INT, exp.ops.BIT_COUNT, 2),
    ...byte_offset,
    ...bit_size,
    ...bin
  ],

  lScan: (bin, val, bit_size, byte_offset) => [
    ..._bitReadStart(exp.type.INT, exp.ops.BIT_LSCAN, 3),
    ...byte_offset,
    ...bit_size,
    ...val,
    ...bin
  ],

  rScan: (bin, val, bit_size, byte_offset) => [
    ..._bitReadStart(exp.type.INT, exp.ops.BIT_RSCAN, 3),
    ...byte_offset,
    ...bit_size,
    ...val,
    ...bin
  ],

  getInt: (bin, sign, bit_size, byte_offset) => [
    ..._bitReadStart(exp.type.INT, exp.ops.BIT_GET_INT, 3),
    ...byte_offset,
    ...bit_size,
    ..._int((sign ? 1 : 0)),
    ...bin
  ]
}

/*********************************************************************************
 * HLL MODIFY EXPRESSIONS
 *********************************************************************************/

 const _hllModify = () => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(exp.type.HLL),
  ..._int(exp.sys.CALL_HLL | exp.sys.FLAG_MODIFY_LOCAL)
]

const _hllModifyStart = (op, param) => [
  { ..._hllModify(),
    op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

const _hllRead = (returnType) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(returnType),
  ..._int(exp.sys.CALL_HLL)
]

const _hllReadStart = (returnType, op, param) => [
  { ..._hllRead(returnType),
    op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

exports.hll = {

  initMH: (bin, mh_bit_count, index_bit_count, policy = null) => [
    ..._hllModifyStart(exp.ops.HLL_INIT, 3),
    ..._int(index_bit_count),
    ..._int(mh_bit_count),
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  init: (bin, index_bit_count, policy = null) => [
    ..._hllModifyStart(exp.ops.HLL_INIT, 2),
    ..._int(index_bit_count),
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  addMH: (bin, mh_bit_count, index_bit_count, list, policy = null) => [
    ..._hllModifyStart(exp.ops.HLL_ADD, 4),
    ...list,
    ..._int(index_bit_count),
    ..._int(mh_bit_count),
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  addMH: (bin, index_bit_count, list, policy = null) => [
    ..._hllModifyStart(exp.ops.HLL_ADD, 4),
    ...list,
    ..._int(index_bit_count),
    ..._int(-1),
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

  update: (bin, list, policy = null) => [
    ..._hllModifyStart(exp.ops.HLL_ADD, 4),
    ...list,
    ..._int(-1),
    ..._int(-1),
    ..._uint((pol ? pol.flags : 0)),
    ...bin
  ],

/*********************************************************************************
 * HLL READ EXPRESSIONS
 *********************************************************************************/

  getCount: (bin) => [
  ..._hllReadStart(exp.type.INT, exp.ops.HLL_COUNT, 0),
  ...bin
  ],

  getUnion: (bin, list) => [
    ..._hllReadStart(exp.type.HLL, exp.ops.HLL_GET_UNION, 1),
    ...list,
    ...bin
  ],

  getUnionCount: (bin, list) => [
    ..._hllReadStart(exp.type.INT, exp.ops.HLL_UNION_COUNT, 1),
    ...list,
    ...bin
  ],

  getIntersectCount: (bin, list) => [
    ..._hllReadStart(exp.type.INT, exp.ops.HLL_INTERSECT_COUNT, 1),
    ...list,
    ...bin
  ],

  getSimilarity: (bin, list) => [
    ..._hllReadStart(exp.type.FLOAT, exp.ops.HLL_SIMILARITY, 1),
    ...list,
    ...bin
  ],

  describe: (bin) => [
    ..._hllReadStart(exp.type.LIST, exp.ops.HLL_DESCRIBE, 0),
    ...bin
  ],

  mayContain: (bin, list) => [
    ..._hllReadStart(exp.type.INT, exp.ops.HLL_MAY_CONTAIN, 1),
    ...list,
    ...bin
  ]
}
