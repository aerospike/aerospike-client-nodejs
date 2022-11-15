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
const hlls = as.hll

const _valueExp = (op, valName) => (value) => [{ op, [valName]: value }]
const _int = _valueExp(exp.ops.VAL_INT, 'intVal')
const _rtype = _valueExp(exp.ops.VAL_RTYPE, 'intVal')
/*********************************************************************************
 * HLL MODIFY EXPRESSIONS
 *********************************************************************************/

const _hllModify = () => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(exp.type.HLL),
  ..._int(exp.sys.CALL_HLL | exp.sys.FLAG_MODIFY_LOCAL)
]

const _hllModifyStart = (op, param) => [
  ..._hllModify(),
  { op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

const _hllRead = (returnType) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(returnType),
  ..._int(exp.sys.CALL_HLL)
]

const _hllReadStart = (returnType, op, param) => [
  ..._hllRead(returnType),
  { op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]
/**
 * @module aerospike/exp/hll
 *
 * @description The {@link module:aerospike/exp/hll|aerospike/exp/hll} module defines functions
 * for expressions on the HyperLogLog datatype.
 */
module.exports = {
  /**
 * Create expression that creates a new HLL or resets an existing HLL with minhash bits.
 *
 * @param {Object} policy hll policy value.
 * @param {number} indexBitCount Number of index bits. Must be between 4 and 16 inclusive.
 * @param {number} mhBitCount Number of min hash bits. Must be between 4 and 51 inclusive.
 * @param {AerospikeExp} bin  A bin expression to apply this function to.
 * @return {AerospikeExp} hll bin Returns the resulting hll bin.
 */
  initMH: (bin, mhBitCount, indexBitCount, policy = null) => [
    ..._hllModifyStart(hlls.opcodes.INIT, 3),
    ..._int(indexBitCount),
    ..._int(mhBitCount),
    ..._int((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create expression that creates a new HLL or resets an existing HLL.
 *
 * @param {Object} policy hll policy value.
 * @param {number} indexBitCount Number of index bits. Must be between 4 and 16 inclusive.
 * @param {AerospikeExp} bin  A bin expression to apply this function to.
 * @return {AerospikeExp} hll bin Returns the resulting hll bin.
 */
  init: (bin, indexBitCount, policy = null) => [
    ..._hllModifyStart(hlls.opcodes.INIT, 2),
    ..._int(indexBitCount),
    ..._int((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs operations hll addMh.
 *
 * @param {Object} policy hll policy value.
 * @param {AerospikeExp} list A list expression of elements to add to the HLL.
 * @param {number} indexBitCount Number of index bits. Must be between 4 and 16 inclusive.
 * @param {number} mhBitCount Number of min hash bits. Must be between 4 and 51 inclusive.
 * @param {AerospikeExp} bin  A bin expression to apply this function to.
 * @return {AerospikeExp} hll bin Returns the resulting hll bin after adding elements from list.
 */
  addMH: (bin, mhBitCount, indexBitCount, list, policy = null) => [
    ..._hllModifyStart(hlls.opcodes.ADD, 4),
    ...list,
    ..._int(indexBitCount),
    ..._int(mhBitCount),
    ..._int((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs operations hll add.
 *
 * @param {Object} policy hll policy value.
 * @param {AerospikeExp} list A list expression of elements to add to the HLL.
 * @param {number} indexBitCount Number of index bits. Must be between 4 and 16 inclusive.
 * @param {AerospikeExp} bin  A bin expression to apply this function to.
 * @return {AerospikeExp} hll bin Returns the resulting hll bin after adding elements from list.
 */
  add: (bin, indexBitCount, list, policy = null) => [
    ..._hllModifyStart(hlls.opcodes.ADD, 4),
    ...list,
    ..._int(indexBitCount),
    ..._int(-1),
    ..._int((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs operations hll update.
 *
 * @param {Object} policy hll policy value.
 * @param {AerospikeExp} list A list expression of elements to add to the HLL.
 * @param {AerospikeExp} bin A bin expression to apply this function to.
 * @return {AerospikeExp} hll bin Returns the resulting hll bin after adding elements from list.
 */
  update: (bin, list, policy = null) => [
    ..._hllModifyStart(hlls.opcodes.ADD, 4),
    ...list,
    ..._int(-1),
    ..._int(-1),
    ..._int((policy ? policy.flags : 0)),
    ...bin
  ],

  /*********************************************************************************
 * HLL READ EXPRESSIONS
 *********************************************************************************/

  /**
 * Create an expression that performs operations hll get count.
 *
 * @param {AerospikeExp} bin A bin expression to apply this function to.
 * @return {AerospikeExp} integer bin The estimated number of unique elements in an HLL.
 */
  getCount: (bin) => [
    ..._hllReadStart(exp.type.INT, hlls.opcodes.COUNT, 0),
    ...bin
  ],

  /**
 * Create an expression that performs operations hll get union.
 *
 * @param {AerospikeExp} list A list expression of HLLs to union with.
 * @param {AerospikeExp} bin A bin expression to apply this function to.
 * @return {AerospikeExp} hll bin HLL bin representing the set union.
 */
  getUnion: (bin, list) => [
    ..._hllReadStart(exp.type.HLL, hlls.opcodes.GET_UNION, 1),
    ...list,
    ...bin
  ],

  /**
 * Create an expression that performs operations hll get union count.
 *
 * @param {AerospikeExp} list A list expression of HLLs to union with.
 * @param {AerospikeExp} bin A bin expression to apply this function to.
 * @return {AerospikeExp} integer bin Estimated number of elements in the set union.
 */
  getUnionCount: (bin, list) => [
    ..._hllReadStart(exp.type.INT, hlls.opcodes.UNION_COUNT, 1),
    ...list,
    ...bin
  ],

  /**
 * Create an expression that performs operations hll get inersect count.
 *
 * @param {AerospikeExp} list A list expression of HLLs to intersect with.
 * @param {AerospikeExp} bin A bin expression to apply this function to.
 * @return {AerospikeExp} integer bin Estimated number of elements in the set intersection.
 */
  getIntersectCount: (bin, list) => [
    ..._hllReadStart(exp.type.INT, hlls.opcodes.INTERSECT_COUNT, 1),
    ...list,
    ...bin
  ],

  /**
 * Create an expression that performs operations hll get similarity.
 *
 * @param {AerospikeExp} list A list expression of HLLs to calculate similarity with..
 * @param {AerospikeExp} bin A bin expression to apply this function to.
 * @return (float bin) Estimated similarity between 0.0 and 1.0.
 */
  getSimilarity: (bin, list) => [
    ..._hllReadStart(exp.type.FLOAT, hlls.opcodes.SIMILARITY, 1),
    ...list,
    ...bin
  ],

  /**
 * Create an expression that performs operations hll describe.
 *
 * @param {AerospikeExp} bin A bin expression to apply this function to.
 * @return {AerospikeExp} list bin A list containing the index_bit_count and minhash bit count.
 */
  describe: (bin) => [
    ..._hllReadStart(exp.type.LIST, hlls.opcodes.DESCRIBE, 0),
    ...bin
  ],

  /**
 * Create an expression that checks if the HLL bin contains all keys in
 *  list..
 *
 * @param {AerospikeExp} list A list expression of keys to check if the HLL may contain them.
 * @param {AerospikeExp} bin A bin expression to apply this function to.
 * @return {AerospikeExp} integer bin 1 bin contains all of list, 0 otherwise.
 */
  mayContain: (bin, list) => [
    ..._hllReadStart(exp.type.INT, hlls.opcodes.MAY_CONTAIN, 1),
    ...list,
    ...bin
  ]
}
