// *****************************************************************************
// Copyright 2021-2022 Aerospike, Inc.
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
const as = require('bindings')('aerospike.node')
const exp = as.exp
const lists = as.lists
const cdtCtx = require('./cdt_context')

const _valueExp = (op, valName) => (value) => [{ op, [valName]: value }]
const _int = _valueExp(exp.ops.VAL_INT, 'intVal')
const _rtype = _valueExp(exp.ops.VAL_RTYPE, 'intVal')
/*********************************************************************************
 * LIST READ EXPRESSIONS
 *********************************************************************************/

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
      throw new TypeError('either set the value type as auto or match with return object data type')
  }

  if (type === exp.type.AUTO || type === expected) {
    return expected
  }

  throw new TypeError('either set the value type as auto or match with return object data type')
}

const _listRead = (type, returnType, isMulti) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(getListType(type, returnType, isMulti)),
  ..._int(exp.sys.CALL_CDT)
]

const _listModify = (ctx, policy, op, param, extraParam) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(cdtCtx.getContextType(ctx, exp.type.LIST)),
  ..._int(exp.sys.CALL_CDT | exp.sys.FLAG_MODIFY_LOCAL),
  { op: exp.ops.CALL_VOP_START, count: 1 + param + (policy ? extraParam : 0), ctx },
  ..._int(op)
]

const _listStart = (ctx, op, param) => [
  { op: exp.ops.CALL_VOP_START, count: 1 + param, ctx },
  ..._int(op)
]

/**
 * @module aerospike/exp/lists
 *
 * @description The {@link module:aerospike/exp/lists|aerospike/exp/lists} module defines functions
 * for expressions on the List datatype.
 */
module.exports = {
/**
 * Create expression that returns list size.
 *
 * @param {Object} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (integer expression)
 */
  size: (bin, ctx = null) => [
    ..._listRead(exp.type.AUTO, lists.returnType.COUNT, false),
    ..._listStart(ctx, lists.opcodes.SIZE, 0),
    ...bin
  ],

  /**
 * Create expression that selects list items identified by value and returns selected
 * data specified by returnType.
 *
 * @param {Object} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
  getByValue: (bin, value, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_ALL_BY_VALUE, 2),
    ..._int(returnType),
    ...value,
    ...bin
  ],

  /**
 * Create expression that selects list items identified by value range and returns selected
 * data specified by returnType.
 *
 * @param {Object} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} begin Begin value expression.
 * @param {AerospikeExp} end End value expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
  getByValueRange: (bin, begin, end, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_VALUE_INTERVAL, 3),
    ..._int(returnType),
    ...begin,
    ...end,
    ...bin
  ],

  /**
 * Create expression that selects list items identified by values and returns selected
 * data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} value Values list expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
  getByValueList: (bin, value, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_VALUE_LIST, 2),
    ..._int(returnType),
    ...value,
    ...bin
  ],

  /**
 * Create expression that selects list items nearest to value and greater by relative rank
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} value Values list expression.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
  getByRelRankRangeToEnd: (bin, value, rank, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_VALUE_REL_RANK_RANGE, 3),
    ..._int(returnType),
    ...value,
    ...rank,
    ...bin
  ],

  /**
 * Create expression that selects list items nearest to value and greater by relative rank with a
 * count limit and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} value Values list expression.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
  getByRelRankRange: (bin, value, rank, count, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_VALUE_REL_RANK_RANGE, 4),
    ..._int(returnType),
    ...value,
    ...rank,
    ...count,
    ...bin
  ],

  /**
 * Create expression that selects list item identified by index
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} valueType expression value type.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (valueType expression)
 */
  getByIndex: (bin, index, valueType, returnType, ctx = null) => [
    ..._listRead(valueType, returnType, false),
    ..._listStart(ctx, lists.opcodes.GET_BY_INDEX, 2),
    ..._int(returnType),
    ...index,
    ...bin
  ],

  /**
 * Create expression that selects list items starting at specified index to the end of list
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
  getByIndexRangeToEnd: (bin, index, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_INDEX_RANGE, 2),
    ..._int(returnType),
    ...index,
    ...bin
  ],

  /**
 * Create expression that selects "count" list items starting at specified index
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
  getByIndexRange: (bin, index, count, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_INDEX_RANGE, 3),
    ..._int(returnType),
    ...index,
    ...count,
    ...bin
  ],

  /**
 * Create expression that selects list item identified by rank
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} valueType expression value type.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (valueType expression)
 */
  getByRank: (bin, rank, valueType, returnType, ctx = null) => [
    ..._listRead(valueType, returnType, false),
    ..._listStart(ctx, lists.opcodes.GET_BY_RANK, 2),
    ..._int(returnType),
    ...rank,
    ...bin
  ],

  /**
 * Create expression that selects list items starting at specified rank to the last ranked item
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
  getByRankRangeToEnd: (bin, rank, returnType, ctx = null) => [
    ..._listRead(exp.type.AUTO, returnType, true),
    ..._listStart(ctx, lists.opcodes.GET_BY_RANK_RANGE, 2),
    ..._int(returnType),
    ...rank,
    ...bin
  ],

  /**
 * Create expression that selects "count" list items starting at specified rank
 * and returns selected data specified by returnType.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} returnType Return type.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (expression)
 */
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

  /**
 * Create expression that appends value to end of list.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional list write policy.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  append: (bin, value, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.APPEND, 1, 2),
    ...value,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that appends list items to end of list.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional list write policy.
 * @param {AerospikeExp} value List items expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  appendItems: (bin, value, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.APPEND_ITEMS, 1, 2),
    ...value,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that inserts value to specified index of list.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional list write policy.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  insert: (bin, value, idx, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.INSERT, 2, 1),
    ...idx,
    ...value,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that inserts each input list item starting at specified index of list.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional list write policy.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} value List items expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  insertItems: (bin, value, idx, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.INSERT_ITEMS, 2, 1),
    ...idx,
    ...value,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that increments list[index] by value.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional list write policy.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  increment: (bin, value, idx, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.INCREMENT, 2, 2),
    ...idx,
    ...value,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that sets item value at specified index in list.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {Object} policy Optional list write policy.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  set: (bin, value, idx, policy = null, ctx = null) => [
    ..._listModify(ctx, policy, lists.opcodes.SET, 2, 1),
    ...idx,
    ...value,
    { op: exp.ops.CDT_LIST_CRMOD, listPolicy: policy },
    ...bin
  ],

  /**
 * Create expression that removes all items in list.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  clear: (bin, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.CLEAR, 0, 0),
    ...bin
  ],

  /**
 * Create expression that sorts list.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {number} order Sort order flags.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  sort: (bin, order, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.SORT, 1, 0),
    ..._int(order),
    ...bin
  ],

  /**
 * Create expression that removes list items identified by value.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByValue: (bin, value, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_ALL_BY_VALUE, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...value,
    ...bin
  ],

  /**
 * Create expression that removes list items identified by values.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} values Values list expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByValueList: (bin, values, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_VALUE_LIST, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...values,
    ...bin
  ],

  /**
 * Create expression that removes list items identified by value range
 * (begin inclusive, end exclusive). If begin is nil, the range is less than end.
 * If end is infinity, the range is greater than equal to begin.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} begin Begin value expression.
 * @param {AerospikeExp} end End value expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByValueRange: (bin, end, begin, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_VALUE_INTERVAL, 3, 0),
    ..._int(lists.RETURN_NONE),
    ...begin,
    ...end,
    ...bin
  ],

  /**
 * Create expression that removes list items nearest to value and greater by relative rank.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByRelRankRangeToEnd: (bin, rank, value, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_VALUE_REL_RANK_RANGE, 3, 0),
    ..._int(lists.RETURN_NONE),
    ...value,
    ...rank,
    ...bin
  ],

  /**
 * Create expression that removes list items nearest to value and greater by relative rank with a
 * count limit.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} value Value expression.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByRelRankRange: (bin, count, rank, value, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_VALUE_REL_RANK_RANGE, 4, 0),
    ..._int(lists.RETURN_NONE),
    ...value,
    ...rank,
    ...count,
    ...bin
  ],

  /**
 * Create expression that removes list item identified by index.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByIndex: (bin, idx, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_INDEX, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...idx,
    ...bin
  ],

  /**
 * Create expression that removes list items starting at specified index to the end of list.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByIndexRangeToEnd: (bin, idx, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_INDEX_RANGE, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...idx,
    ...bin
  ],

  /**
 * Create expression that removes "count" list items starting at specified index.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} idx Index integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByIndexRange: (bin, count, idx, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_INDEX_RANGE, 3, 0),
    ..._int(lists.RETURN_NONE),
    ...idx,
    ...count,
    ...bin
  ],

  /**
 * Create expression that removes list item identified by rank.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByRank: (bin, rank, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_RANK, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...rank,
    ...bin
  ],

  /**
 * Create expression that removes list items starting at specified rank to the last ranked item.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByRankRangeToEnd: (bin, rank, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_RANK_RANGE, 2, 0),
    ..._int(lists.RETURN_NONE),
    ...rank,
    ...bin
  ],

  /**
 * Create expression that removes "count" list items starting at specified rank.
 *
 * @param {AerospikeExp} ctx Optional context path for nested CDT.
 * @param {AerospikeExp} rank Rank integer expression.
 * @param {AerospikeExp} count Count integer expression.
 * @param {AerospikeExp} bin List bin or list value expression.
 * @return {AerospikeExp} (list expression)
 */
  removeByRankRange: (bin, count, rank, ctx = null) => [
    ..._listModify(ctx, null, lists.opcodes.REMOVE_BY_RANK_RANGE, 3, 0),
    ..._int(lists.RETURN_NONE),
    ...rank,
    ...count,
    ...bin
  ]
}
