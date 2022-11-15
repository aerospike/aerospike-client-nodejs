const as = require('bindings')('aerospike.node')
const exp = as.exp
const maps = as.maps
const cdtCtx = require('./cdt_context')

const _valueExp = (op, valName) => (value) => [{ op, [valName]: value }]
const _int = _valueExp(exp.ops.VAL_INT, 'intVal')
const _rtype = _valueExp(exp.ops.VAL_RTYPE, 'intVal')
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
      throw new TypeError('either set the value type as auto or match with return object data type')
  }

  if (type === exp.type.AUTO || type === expected) {
    return expected
  }

  throw new TypeError('either set the value type as auto or match with return object data type')
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

const _mapModify = (ctx, policy, op, param, extraParam) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(cdtCtx.getContextType(ctx, exp.type.MAP)),
  ..._int(exp.sys.CALL_CDT | exp.sys.FLAG_MODIFY_LOCAL),
  { op: exp.ops.CALL_VOP_START, count: 1 + param + (policy ? extraParam : 0), ctx },
  ..._int(op)
]

/**
 * @module aerospike/exp/maps
 *
 * @description The {@link module:aerospike/exp/maps|aerospike/exp/maps} module defines functions
 * for expressions on the Map datatype.
 */
module.exports = {

  /**
 * Create expression that writes key/val item to map bin.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional map write policy.
 * @param {AerospikeExp} key Key expression.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  put: (bin, value, key, policy = null, ctx = null) => [
    ..._mapModify(ctx, policy, maps.opcodes.PUT, 2, 2),
    ...key,
    ...value,
    { op: exp.ops.CDT_MAP_CRMOD, mapPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that writes each map item to map bin.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional map write policy.
 * @param {AerospikeExp} map Source map expression.
 * @param {AerospikeExp} bin Target map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  putItems: (bin, map, policy = null, ctx = null) => [
    ..._mapModify(ctx, policy, maps.opcodes.PUT_ITEMS, 1, 2),
    ...map,
    { op: exp.ops.CDT_MAP_CRMOD, mapPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that increments values by incr for all items identified by key.
 * Valid only for numbers.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional map write policy.
 * @param {AerospikeExp} key Key expression.
 * @param {AerospikeExp} value Increment value number expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  increment: (bin, value, key, policy = null, ctx = null) => [
    ..._mapModify(ctx, policy, maps.opcodes.INCREMENT, 2, 1),
    ...key,
    ...value,
    { op: exp.ops.CDT_MAP_CRMOD, mapPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that removes all items in map.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  clear: (bin, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.CLEAR, 0, 0),
    ...bin
  ],

  /**
 * Create expression that removes map item identified by key.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} key Key expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByKey: (bin, key, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...key,
    ...bin
  ],

  /**
 * Create expression that removes map items identified by keys.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} keys List expression of keys to remove.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByKeyList: (bin, keys, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY_LIST, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...keys,
    ...bin
  ],

  /**
 * Create expression that removes map items identified by key range
 * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
 * If end is infinity, the range is greater than equal to begin.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} begin Begin value expression.
 * @param {AerospikeExp} end End value expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByKeyRange: (bin, end, begin, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY_INTERVAL, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...begin,
    ...end,
    ...bin
  ],

  /**
 * Create expression that removes map items nearest to key and greater by index.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} key Key expression.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByKeyRelIndexRangeToEnd: (bin, idx, key, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY_REL_INDEX_RANGE, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...key,
    ...idx,
    ...bin
  ],

  /**
 * Create expression that removes map items nearest to key and greater by index with a count limit.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} key Key expression.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByKeyRelIndexRange: (bin, count, idx, key, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_KEY_REL_INDEX_RANGE, 4, 0),
    ..._int(maps.RETURN_NONE),
    ...key,
    ...idx,
    ...count,
    ...bin
  ],

  /**
 * Create expression that removes map items identified by value.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByValue: (bin, value, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_ALL_BY_VALUE, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...value,
    ...bin
  ],

  /**
 * Create expression that removes map items identified by values.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} values Values list expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByValueList: (bin, values, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_VALUE_LIST, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...values,
    ...bin
  ],

  /**
 * Create expression that removes map items identified by value range
 * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
 * If end is infinity, the range is greater than equal to begin.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} begin Begin value expression.
 * @param {AerospikeExp} end End value expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByValueRange: (bin, end, begin, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_VALUE_INTERVAL, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...begin,
    ...end,
    ...bin
  ],

  /**
 * Create expression that removes map items nearest to value and greater by relative rank.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByValueRelRankRangeToEnd: (bin, rank, value, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_VALUE_REL_RANK_RANGE, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...value,
    ...rank,
    ...bin
  ],

  /**
 * Create expression that removes map items nearest to value and greater by relative rank with a
 * count limit.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByValueRelRankRange: (bin, count, rank, value, key, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_VALUE_REL_RANK_RANGE, 4, 0),
    ..._int(maps.RETURN_NONE),
    ...value,
    ...rank,
    ...count,
    ...bin
  ],

  /**
 * Create expression that removes map item identified by index.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByIndex: (bin, idx, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_INDEX, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...idx,
    ...bin
  ],

  /**
 * Create expression that removes map items starting at specified index to the end of map.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByIndexRangeToEnd: (bin, idx, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_INDEX_RANGE, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...idx,
    ...bin
  ],

  /**
 * Create expression that removes "count" map items starting at specified index.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByIndexRange: (bin, count, idx, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.PUT, 3, 0),
    ..._int(maps.RETURN_NONE),
    ...idx,
    ...count,
    ...bin
  ],

  /**
 * Create expression that removes map item identified by rank.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByRank: (bin, rank, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_RANK, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...rank,
    ...bin
  ],

  /**
 * Create expression that removes map items starting at specified rank to the last ranked item.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
  removeByRankRangeToEnd: (bin, rank, ctx = null) => [
    ..._mapModify(ctx, null, maps.opcodes.REMOVE_BY_RANK_RANGE, 2, 0),
    ..._int(maps.RETURN_NONE),
    ...rank,
    ...bin
  ],

  /**
 * Create expression that removes "count" map items starting at specified rank.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (map expression)
 */
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

  /**
 * Create expression that returns map size.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (integer expression)
 */
  size: (bin, ctx = null) => [
    ..._mapRead(exp.type.AUTO, maps.returnType.COUNT, false),
    ..._mapStart(ctx, maps.opcodes.SIZE, 0),
    ...bin
  ],

  /**
 * Create expression that selects map item identified by key
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} valueType expression value type.
 * @param {AerospikeExp} key Key expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByKey: (bin, key, valueType, returnType, ctx = null) => [
    ..._mapRead(valueType, returnType, false),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY, 2),
    ..._int(returnType),
    ...key,
    ...bin
  ],

  /**
 * Create expression that selects map items identified by key range
 * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
 * If end is infinity, the range is greater than equal to begin.
 * Expression returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} begin Begin key expression.
 * @param {AerospikeExp} end End key expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByKeyRange: (bin, end, begin, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY_INTERVAL, 3),
    ..._int(returnType),
    ...begin,
    ...end,
    ...bin
  ],

  /**
 * Create expression that selects map items identified by keys
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} keys Keys list expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByKeyList: (bin, keys, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY_INTERVAL, 2),
    ..._int(returnType),
    ...keys,
    ...bin
  ],

  /**
 * Create expression that selects map items nearest to key and greater by index
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} key Key expression.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByKeyRelIndexRangeToEnd: (bin, idx, key, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY_INTERVAL, 3),
    ..._int(returnType),
    ...key,
    ...idx,
    ...bin
  ],

  /**
 * Create expression that selects map items nearest to key and greater by index with a count limit.
 * Expression returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} key Key expression.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByKeyRelIndexRange: (bin, count, idx, key, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_KEY_REL_INDEX_RANGE, 4),
    ..._int(returnType),
    ...key,
    ...idx,
    ...count,
    ...bin
  ],

  /**
 * Create expression that selects map items identified by value
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByValue: (bin, value, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_ALL_BY_VALUE, 2),
    ..._int(returnType),
    ...value,
    ...bin
  ],

  /**
 * Create expression that selects map items identified by value range
 * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
 * If end is infinity, the range is greater than equal to begin.
 * Expression returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} begin Begin value expression.
 * @param {AerospikeExp} end End value expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByValueRange: (bin, end, begin, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_VALUE_INTERVAL, 3),
    ..._int(returnType),
    ...begin,
    ...end,
    ...bin
  ],

  /**
 * Create expression that selects map items identified by values
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} values Values list expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByValueList: (bin, values, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_VALUE_INTERVAL, 2),
    ..._int(returnType),
    ...values,
    ...bin
  ],

  /**
 * Create expression that selects map items nearest to value and greater by relative rank.
 * Expression returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByValueRelRankRangeToEnd: (bin, rank, value, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_VALUE_REL_RANK_RANGE, 3),
    ..._int(returnType),
    ...value,
    ...rank,
    ...bin
  ],

  /**
 * Create expression that selects map items nearest to value and greater by relative rank with a
 * count limit. Expression returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByValueRelRankRange: (bin, count, rank, value, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_VALUE_REL_RANK_RANGE, 4),
    ..._int(returnType),
    ...value,
    ...rank,
    ...count,
    ...bin
  ],

  /**
 * Create expression that selects map item identified by index
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} valueType expression value type.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByIndex: (bin, idx, valueType, returnType, ctx = null) => [
    ..._mapRead(valueType, returnType, false),
    ..._mapStart(ctx, maps.opcodes.GET_BY_INDEX, 2),
    ..._int(returnType),
    ...idx,
    ...bin
  ],

  /**
 * Create expression that selects map items starting at specified index to the end of map
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByIndexRangeToEnd: (bin, idx, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_INDEX_RANGE, 2),
    ..._int(returnType),
    ...idx,
    ...bin
  ],

  /**
 * Create expression that selects "count" map items starting at specified index
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByIndexRange: (bin, count, idx, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_INDEX_RANGE, 3),
    ..._int(returnType),
    ...idx,
    ...count,
    ...bin
  ],

  /**
 * Create expression that selects map item identified by rank
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} valueType expression value type.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByRank: (bin, rank, valueType, returnType, ctx = null) => [
    ..._mapRead(valueType, returnType, false),
    ..._mapStart(ctx, maps.opcodes.GET_BY_RANK, 2),
    ..._int(returnType),
    ...rank,
    ...bin
  ],

  /**
 * Create expression that selects map items starting at specified rank to the last ranked item
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByRankRangeToEnd: (bin, rank, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_RANK_RANGE, 2),
    ..._int(returnType),
    ...rank,
    ...bin
  ],

  /**
 * Create expression that selects "count" map items starting at specified rank
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin Map bin or map value expression.
 * @return {AerospikeExp} (expression)
 */
  getByRankRange: (bin, count, rank, returnType, ctx = null) => [
    ..._mapRead(exp.type.AUTO, returnType, true),
    ..._mapStart(ctx, maps.opcodes.GET_BY_RANK_RANGE, 3),
    ..._int(returnType),
    ...rank,
    ...count,
    ...bin
  ]
}
