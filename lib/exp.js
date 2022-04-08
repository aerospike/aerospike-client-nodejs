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

'use strict'

const as = require('bindings')('aerospike.node')
const exp = as.exp
const lists = as.lists
const maps = as.maps
const bits = as.bitwise
const hlls = as.hll
const cdtCtx = require('./cdt_context')

const BIN_TYPE_UNDEF = 0

/**
 * @module aerospike/exp
 * @summary {@link module:aerospike/exp|aerospike/exp} module
 *
 * @description This module defines a filter expression that provide
 * a mechanism for additional filtering. 
 * The resultset of a secondary index query or primary index 
 * query (scan) operation can be filtered through the QueryPolicy 
 * and ScanPolicy classes. 
 * It can also be used to filter single key operations and 
 * batch operations through the filterExpression field of their policy class.
 * 
 * Filter Expressions replace PredicateExpression filtering, 
 * which was deprecated in Aerospike Server version 5.2 and 
 * removed in Aerospike Server version 6.0.
 *
 * @see {@link ReadPolicy#filterExpression}
 * @see {@link OperatePolicy#filterExpression}
 * @see {@link RemovePolicy#filterExpression}
 * @see {@link WritePolicy#filterExpression}
 * @see {@link BatchPolicy#filterExpression}
 * @see {@link ScanPolicy#filterExpression}
 * @see {@link QueryPolicy#filterExpression}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * const exp = Aerospike.exp
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * const tempBin = 'ExpVar' // this bin is to hold expression read operation output
 *
 * var ops = [
 *   op.append('a', 'xyz'),
 *   op.incr('b', 10),
 *   exp.operations.read(tempBin,
 *           exp.add(exp.binInt('b'), exp.binInt('b')),
 *          0),
 *   op.read('b')
 * ]
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   client.put(key, { a: 'abc', b: 42 }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error, record) => {
 *       if (error) throw error
 *       console.log(record) // => { b: 52, ExpVar: 104 }
 *       client.close()
 *     })
 *   })
 * })
 */

/*********************************************************************************
 * VALUE EXPRESSIONS
 *********************************************************************************/

const _valueExp = (op, valName) => (value) => [{ op, [valName]: value }]

const _valueExpBytes = (op, valName, sizeName) => (value, size) => [{ op, [valName]: value, [sizeName]: size }]

/**
 * Create boolean value.
 *
 * @param {boolean} value boolean value.
 * @return {AerospikeExp}
*/
exports.bool = _valueExp(exp.ops.VAL_BOOL, 'boolVal')

/**
 * Create 64 bit signed integer value.
 *
 * @param {number} number value integer value.
 * @return {AerospikeExp}
 */
exports.int = _valueExp(exp.ops.VAL_INT, 'intVal')
const _int = exports.int

/**
 * Create 64 bit unsigned integer value.
 *
 * @param {number} number value unsigned integer value.
 * @return {AerospikeExp}
 */
exports.uint = _valueExp(exp.ops.VAL_UINT, 'uintVal')
const _uint = exports.uint

/**
 * Create 64 bit floating point value.
 *
 * @param {number} value floating point value.
  * @return {AerospikeExp}
*/
exports.float = _valueExp(exp.ops.VAL_FLOAT, 'floatVal')

/**
 * Create string value.
 *
 * @param {string} value string value.
 * @return {AerospikeExp}
 */
exports.str = _valueExp(exp.ops.VAL_STR, 'strVal')

/**
 * Create byte array value.
 *
 * @param {string[]} value byte array value.
 * @param {number} size number of bytes.
 * @return {AerospikeExp}
 */
exports.bytes = _valueExpBytes(exp.ops.VAL_BYTES, 'bytesVal', 'sz')

/**
 * Create geojson value.
 *
 * @param {Object} value geojson value.
 * @return {AerospikeExp}
 */
exports.geo = _valueExp(exp.ops.VAL_GEO, 'value')

/**
 * Create 'nil' value.
 */
exports.nil = () => [{ op: exp.ops.AS_VAL, value: null }]

const _val = _valueExp(exp.ops.AS_VAL, 'value')
exports.list = _val
exports.map = _val

/*********************************************************************************
 * KEY EXPRESSIONS
 *********************************************************************************/

const _keyTypeExp = (type) => () => [
  { op: exp.ops.KEY, count: 2 },
  ..._int(type)
]

/**
 * Create expression that returns the key as an integer. Returns 'unknown' if
 * the key is not an integer.
 *
 * @param {number} integer value Integer value of the key if the key is an integer.
 * @return {AerospikeExp}
*/
exports.keyInt = _keyTypeExp(exp.type.INT)

/**
 * Create expression that returns the key as an string. Returns 'unknown' if
 * the key is not a string.
 *
 * @param {string} string value String value of the key if the key is a string.
 * @return {AerospikeExp}
 */
exports.keyStr = _keyTypeExp(exp.type.STR)

/**
 * Create expression that returns the key as an blob. Returns 'unknown' if
 * the key is not an blob.
 *
 * @param {Object} blob Blob value of the key if the key is a blob.
 * @return {AerospikeExp}
 */
exports.keyBlob = _keyTypeExp(exp.type.BLOB)

/**
 * Create expression that returns if the primary key is stored in the record meta
 * data as a boolean expression. This would occur when "policy write key" is
 * SEND on record write.
 *
 * @param {boolean} - value True if the record has a stored key, false otherwise.
 * @return {AerospikeExp}
 */
exports.keyExist = () => [{ op: exp.ops.KEY_EXIST, count: 1 }]

/*********************************************************************************
 * BIN EXPRESSIONS
 *********************************************************************************/

const _rawStr = (value) => [{ op: exp.ops.VAL_RAWSTR, strVal: value }]

const _binTypeExp = (type) => (binName) => [
  { op: exp.ops.BIN, count: 3 },
  ..._int(type),
  ..._rawStr(binName)
]

/**
 * Create expression that returns a bin as a boolean value. Returns 'unknown'
 * if the bin is not a boolean.
 *
 * @param {string }binName Bin name.
 * @return {AerospikeExp} boolean bin
 */
exports.binBool = _binTypeExp(exp.type.BOOL)

/**
 * Create expression that returns a bin as a signed integer. Returns 'unknown'
 * if the bin is not an integer.
 *
 * @param {string} binName Bin name.
 * @return {AerospikeExp} integer bin
 */
exports.binInt = _binTypeExp(exp.type.INT)

/**
 * Create expression that returns a bin as a float. Returns 'unknown' if the bin
 * is not an float.
 *
 * @param {string} binName Bin name.
 * @return {AerospikeExp} float bin
 */
exports.binFloat = _binTypeExp(exp.type.FLOAT)

/**
 * Create expression that returns a bin as a string. Returns 'unknown' if the
 * bin is not an string.
 *
 * @param {string} binName Bin name.
 * @return {AerospikeExp} string bin
 */
exports.binStr = _binTypeExp(exp.type.STR)

/**
 * Create expression that returns a bin as a blob. Returns 'unknown' if the bin
 * is not an blob.
 *
 * @param {string} binName Bin name.
 * @return {AerospikeExp} blob bin
 */
exports.binBlob = _binTypeExp(exp.type.BLOB)

/**
 * Create expression that returns a bin as a geojson. Returns 'unknown' if the
 * bin is not geojson.
 *
 * @param {string} binName Bin name.
 * @return {AerospikeExp} geojson bin
 */
exports.binGeo = _binTypeExp(exp.type.GEOJSON)

/**
 * Create expression that returns a bin as a list. Returns 'unknown' if the bin
 * is not an list.
 *
 * @param {string} binName Bin name.
 * @return {AerospikeExp} list bin
 */
exports.binList = _binTypeExp(exp.type.LIST)

/**
 * Create expression that returns a bin as a map. Returns 'unknown' if the bin
 * is not an map.
 *
 * @param {string} binName Bin name.
 * @return {AerospikeExp} map bin
 */
exports.binMap = _binTypeExp(exp.type.MAP)

/**
 * Create expression that returns a bin as a HyperLogLog (hll). Returns
 * 'unknown' if the bin is not a HyperLogLog (hll).
 *
 * @param {string} binName Bin name.
 * @return {AerospikeExp} hll bin
 */
exports.binHll = _binTypeExp(exp.type.HLL)

exports.binType = (binName) => [
  { op: exp.ops.BIN_TYPE, count: 2 },
  ..._rawStr(binName)
]
const _binType = exports.binType

/**
 * Create expression that returns if bin of specified name exists.
 *
 * @param {string} binName Bin name.
 * @return {boolean} - value True if the bin exists, false otherwise.
 */
exports.binExists = (binName) => _ne(_binType(binName), _int(BIN_TYPE_UNDEF))

/*********************************************************************************
 * METADATA EXPRESSIONS
 *********************************************************************************/

const _metaExp = (op) => () => [{ op, count: 1 }]

/**
 * Create expression that returns record set name string. This expression usually
 * evaluates quickly because record meta data is cached in memory.
 *
 * @return {AerospikeExp} string value Name of the set this record belongs to.
 */
exports.setName = _metaExp(exp.ops.SET_NAME)

/**
 * Create expression that returns record size on disk. If server storage-engine is
 * memory, then zero is returned. This expression usually evaluates quickly
 * because record meta data is cached in memory.
 *
 * @return {AerospikeExp} integer value Uncompressed storage size of the record.
 */
exports.deviceSize = _metaExp(exp.ops.DEVICE_SIZE)

/**
 * Create expression that returns record last update time expressed as 64 bit
 * integer nanoseconds since 1970-01-01 epoch.
 *
 * @return {AerospikeExp} integer value When the record was last updated.
 */
exports.lastUpdate = _metaExp(exp.ops.LAST_UPDATE)

/**
 * Create expression that returns milliseconds since the record was last updated.
 * This expression usually evaluates quickly because record meta data is cached
 * in memory.
 *
 * @return {AerospikeExp} integer value Number of milliseconds since last updated.
 */
exports.sinceUpdate = _metaExp(exp.ops.SINCE_UPDATE)

/**
 * Create expression that returns record expiration time expressed as 64 bit
 * integer nanoseconds since 1970-01-01 epoch.
 *
 * @return {AerospikeExp} integer value Expiration time in nanoseconds since 1970-01-01.
 */
exports.voidTime = _metaExp(exp.ops.VOID_TIME)

/**
 * Create expression that returns record expiration time (time to live) in integer
 * seconds.
 *
 * @return {AerospikeExp} integer value Number of seconds till the record will expire,
 *                         returns -1 if the record never expires.
 */
exports.ttl = _metaExp(exp.ops.TTL)

/**
 * Create expression that returns if record has been deleted and is still in
 * tombstone state. This expression usually evaluates quickly because record
 * meta data is cached in memory.
 *
 * @return {AerospikeExp} - value True if the record is a tombstone, false otherwise.
 */
exports.isTombstone = _metaExp(exp.ops.IS_TOMBSTONE)

/**
 * Create expression that returns record size in memory when either the
 * storage-engine is memory or data-in-memory is true, otherwise returns 0.
 * This expression usually evaluates quickly because record meta data is cached
 * in memory.
 * Requires server version 5.3.0+.
 *
 * @return {AerospikeExp} integer value memory size of the record.
 */
exports.memorySize = _metaExp(exp.ops.MEMORY_SIZE)

/**
 * Create expression that returns record digest modulo as integer.
 *
 * @param {number} mod Divisor used to divide the digest to get a remainder.
 * @return {AerospikeExp} integer value Value in range 0 and mod (exclusive)..
 */
exports.digestModulo = _metaExp(exp.ops.DIGEST_MODULO)

/*********************************************************************************
 * COMPARISON EXPRESSIONS
 *********************************************************************************/

const _cmpExp = (op) => (left, right) => [{ op, count: 3 }].concat(left, right)

/**
 * Create equals (==) expression.
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {AerospikeExp} - boolean value
 */
exports.eq = _cmpExp(exp.ops.CMP_EQ)

/**
 * Create not equal (!=) expression.
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {AerospikeExp} - boolean value
 */
exports.ne = _cmpExp(exp.ops.CMP_NE)
const _ne = exports.ne

/**
 * Create a greater than (>) expression.
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {AerospikeExp} - boolean value
 */
exports.gt = _cmpExp(exp.ops.CMP_GT)

/**
 * Create a greater than or equals (>=) expression.
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {AerospikeExp} - boolean value
 */
exports.ge = _cmpExp(exp.ops.CMP_GE)

/**
 * Create a less than (<) expression.
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {AerospikeExp} - boolean value
 */
exports.lt = _cmpExp(exp.ops.CMP_LT)

/**
 * Create a less than or equals (<=) expression.
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {AerospikeExp} - boolean value
 */
exports.le = _cmpExp(exp.ops.CMP_LE)

/**
 * Create expression that performs a regex match on a string bin or value
 * expression.
 *
 * @param {number} options POSIX regex flags defined in regex.h.
 * @param {string} regex POSIX regex string.
 * @param {AerospikeExp} cmpStr String expression to compare against.
 * @return {AerospikeExp} - boolean value
 */
exports.cmpRegex = (options, regex, cmpStr) => [
  { op: exp.ops.CMP_REGEX, count: 4 },
  ..._int(options),
  ..._rawStr(regex),
  ...cmpStr
]

/**
 * Create a point within region or region contains point expression.
 *
 * @param {number} left left expression in comparison.
 * @param {number} right right expression in comparison.
 * @return {AerospikeExp} - boolean value
 */
exports.cmpGeo = _cmpExp(exp.ops.CMP_GEO)

/*********************************************************************************
 * LOGICAL EXPRESSIONS
 *********************************************************************************/

/**
 * Create "not" (!) operator expression.
 *
 * @param {AerospikeExp} expr Boolean expression to negate.
 * @return {AerospikeExp} - boolean value
 */
exports.not = (expr) => [
  { op: exp.ops.NOT, count: 2 },
  ...expr
]

const _VAExp = (op) => (...expr) => [].concat(
  { op },
  ...expr,
  { op: exp.ops.END_OF_VA_ARGS }
)

/**
 * Create "and" (&&) operator that applies to a variable number of expressions.
 *
 * @param {AerospikeExp} ... Variable number of boolean expressions.
 * @return {AerospikeExp} - boolean value
 */
exports.and = _VAExp(exp.ops.AND)

/**
 * Create "or" (||) operator that applies to a variable number of expressions.
 *
 * @param {AerospikeExp} ... Variable number of boolean expressions.
 * @return {AerospikeExp} - boolean value
 */
exports.or = _VAExp(exp.ops.OR)

/**
 * Create expression that returns true if only one of the expressions are true.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} ... Variable number of boolean expressions.
 * @return {AerospikeExp} - boolean value
 */
exports.exclusive = _VAExp(exp.ops.EXCLUSIVE)

/*********************************************************************************
 * ARITHMETIC EXPRESSIONS
 *********************************************************************************/

/**
 * Create "add" (+) operator that applies to a variable number of expressions.
 * Return the sum of all arguments.
 * All arguments must be the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 * @param {number[]} ... Variable number of integer or float expressions.
 * @return {AerospikeExp} integer or float value
 */
exports.add = _VAExp(exp.ops.ADD)

/**
 * Create "subtract" (-) operator that applies to a variable number of expressions.
 * If only one argument is provided, return the negation of that argument.
 * Otherwise, return the sum of the 2nd to Nth argument subtracted from the 1st
 * argument. All arguments must resolve to the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 * @param {number[]} ... Variable number of integer or float expressions.
 * @return {AerospikeExp} integer or float value
 */
exports.sub = _VAExp(exp.ops.SUB)

/**
 * Create "multiply" (*) operator that applies to a variable number of expressions.
 * Return the product of all arguments. If only one argument is supplied, return
 * that argument. All arguments must resolve to the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 * @param {number[]} ... Variable number of integer or float expressions.
 * @return {AerospikeExp} integer or float value
 */
exports.mul = _VAExp(exp.ops.MUL)

/**
 * Create "divide" (/) operator that applies to a variable number of expressions.
 * If there is only one argument, returns the reciprocal for that argument.
 * Otherwise, return the first argument divided by the product of the rest.
 * All arguments must resolve to the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 * @param {number[]} ... Variable number of integer or float expressions.
 * @return {AerospikeExp} integer or float value
 */
exports.div = _VAExp(exp.ops.DIV)

const _paramsExp = (op) => (...params) => [
  { op: op, count: params.length + 1 },
  ...params
]

/**
 * Create "pow" operator that raises a "base" to the "exponent" power.
 * All arguments must resolve to floats.
 * Requires server version 5.6.0+.
 *
 * @param {number} base Base value.
 * @param {number} exponent Exponent value.
 * @return {AerospikeExp} float value
 */
exports.pow = _paramsExp(exp.ops.POW)

/**
 * Create "log" operator for logarithm of "num" with base "base".
 * All arguments must resolve to floats.
 * Requires server version 5.6.0+.
 *
 * @param {number} num Number.
 * @param {number}base Base value.
 * @return {AerospikeExp} float value
 */
exports.log = _paramsExp(exp.ops.LOG)

/**
 * Create "modulo" (%) operator that determines the remainder of "numerator"
 * divided by "denominator". All arguments must resolve to integers.
 * Requires server version 5.6.0+.
 *
 * @return {AerospikeExp} integer value
 */
exports.mod = _paramsExp(exp.ops.MOD)

/**
 * Create operator that returns absolute value of a number.
 * All arguments must resolve to integer or float.
 * Requires server version 5.6.0+.
 *
 * @return {AerospikeExp} number value
 */
exports.abs = _paramsExp(exp.ops.ABS)

/**
 * Create expression that rounds a floating point number down to the closest integer value.
 * Requires server version 5.6.0+.
 *
 * @param {number} num Floating point value to round down.
 * @return {AerospikeExp} float-value
 */
exports.floor = _paramsExp(exp.ops.FLOOR)

/**
 * Create expression that rounds a floating point number up to the closest integer value.
 * Requires server version 5.6.0+.
 *
 * @param {number} num Floating point value to round up.
 * @return {AerospikeExp} integer-value
 */
exports.ceil = _paramsExp(exp.ops.CEIL)

/**
 * Create expression that converts a float to an integer.
 * Requires server version 5.6.0+.
 *
 * @param {number} num Integer to convert to a float
 * @return {AerospikeExp} float value
 */
exports.toInt = _paramsExp(exp.ops.TO_INT)

/**
 * Create expression that converts an integer to a float.
 * Requires server version 5.6.0+.
 *
 * @param {number} num Integer to convert to a float
 * @return {AerospikeExp} float value
 */
exports.toFloat = _paramsExp(exp.ops.TO_FLOAT)

/**
 * Create integer "and" (&) operator that is applied to two or more integers.
 * All arguments must resolve to integers.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} ... Variable number of integer expressions.
 * @return {AerospikeExp} integer value
 */
exports.intAnd = _VAExp(exp.ops.INT_AND)

/**
 * Create integer "or" (|) operator that is applied to two or more integers.
 * All arguments must resolve to integers.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} ... Variable number of integer expressions.
 * @return {AerospikeExp} integer value
 */
exports.intOr = _VAExp(exp.ops.INT_OR)

/**
 * Create integer "xor" (^) operator that is applied to two or more integers.
 * All arguments must resolve to integers.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} ... Variable number of integer expressions.
 * @return {AerospikeExp} integer value
 */
exports.intXor = _VAExp(exp.ops.INT_XOR)

/**
 * Create integer "not" (~) operator.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} expr Integer expression.
 * @return {AerospikeExp} integer value
 */
exports.intNot = _paramsExp(exp.ops.INT_NOT)

/**
 * Create integer "left shift" (<<) operator.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} value Integer expression.
 * @param {number} shift Number of bits to shift by.
 * @return {AerospikeExp} integer value
 */
exports.intLshift = _paramsExp(exp.ops.INT_LSHIFT)

/**
 * Create integer "logical right shift" (>>>) operator.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} value Integer expression.
 * @param {number} shift Number of bits to shift by.
 * @return {AerospikeExp} integer value
 */
exports.intRshift = _paramsExp(exp.ops.INT_RSHIFT)

/**
 * Create integer "arithmetic right shift" (>>) operator.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} value Integer expression.
 * @param {number} shift Number of bits to shift by.
 * @return {AerospikeExp} integer value
 */
exports.intArshift = _paramsExp(exp.ops.INT_ARSHIFT)

/**
 * Create expression that returns count of integer bits that are set to 1.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp}
 * @return {AerospikeExp} integer value
 */
exports.intCount = _paramsExp(exp.ops.INT_COUNT)

/**
 * Create expression that scans integer bits from left (most significant bit) to
 * right (least significant bit), looking for a search bit value. When the
 * search value is found, the index of that bit (where the most significant bit is
 * index 0) is returned. If "search" is true, the scan will search for the bit
 * value 1. If "search" is false it will search for bit value 0.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp}
 * @return {AerospikeExp} integer value
 */
exports.intLscan = _paramsExp(exp.ops.INT_LSCAN)

/**
 * Create expression that scans integer bits from right (least significant bit) to
 * left (most significant bit), looking for a search bit value. When the
 * search value is found, the index of that bit (where the most significant bit is
 * index 0) is returned. If "search" is true, the scan will search for the bit
 * value 1. If "search" is false it will search for bit value 0.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp}
 * @return {AerospikeExp} integer value
 */
exports.intRscan = _paramsExp(exp.ops.INT_RSCAN)

/**
 * Create expression that returns the minimum value in a variable number of expressions.
 * All arguments must be the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} ... Variable number of integer or float expressions.
 * @return {AerospikeExp} integer or float value
 */
exports.min = _VAExp(exp.ops.MIN)

/**
 * Create expression that returns the maximum value in a variable number of expressions.
 * All arguments must be the same type (integer or float).
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} ... Variable number of integer or float expressions.
 * @return {AerospikeExp} integer or float value
 */
exports.max = _VAExp(exp.ops.MAX)

/*********************************************************************************
 * FLOW CONTROL AND VARIABLE EXPRESSIONS
 *********************************************************************************/
/**
 * Conditionally select an expression from a variable number of expression pairs
 * followed by default expression action. Requires server version 5.6.0+.
 *
 * @param {AerospikeExp}
 * @return {AerospikeExp} first action expression where bool expression is true or action-default.
 */
exports.cond = _VAExp(exp.ops.COND)

/**
 * Define variables and expressions in scope.
 * Requires server version 5.6.0+.
 *
 * @param {AerospikeExp} ... Variable number of expression def followed by a scoped
 *  expression.
 * @return {AerospikeExp} result of scoped expression.
 */
exports.let = _VAExp(exp.ops.LET)

/**
 * Assign variable to an expression that can be accessed later.
 * Requires server version 5.6.0+.
 *
 * @param {string} varName Variable name.
 * @param {AerospikeExp} expr The variable is set to the result of expr.
 * @return {AerospikeExp} A variable name expression pair.
 */
exports.def = (varName, expr) => [
  ..._rawStr(varName),
  ...expr
]

/**
 * Retrieve expression value from a variable.
 * Requires server version 5.6.0+.
 *
 * @param {string} varName Variable name.
 * @return {AerospikeExp} value stored in variable.
 */
exports.var = (varName) => [
  { op: exp.ops.VAR, count: 2 },
  ..._rawStr(varName)
]

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

const _rtype = _valueExp(exp.ops.VAL_RTYPE, 'intVal')

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

exports.lists = {
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

exports.maps = {

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

/*********************************************************************************
 * BIT MODIFY EXPRESSIONS
 *********************************************************************************/

const _bitModify = () => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(exp.type.BLOB),
  ..._int(exp.sys.CALL_BITS | exp.sys.FLAG_MODIFY_LOCAL)
]

const _bitModStart = (op, param) => [
  ..._bitModify(),
  { op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

const _bitRead = (returnType) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(returnType),
  ..._int(exp.sys.CALL_BITS)
]

const _bitReadStart = (returnType, op, param) => [
  ..._bitRead(returnType),
  { op: exp.ops.CALL_VOP_START, count: 1 + param },
  ..._int(op)
]

exports.bit = {

  /**
 * Create an expression that performs bit resize operation.
 *
 * @param {Object} policy bit policy value.
 * @param {number} byteSize Number of bytes the resulting blob should occupy.
 * @param {number} flags bit resize flags value.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin byteSize bytes.
 */
  reSize: (bin, flags, byteSize, policy = null) => [
    ..._bitModStart(bits.opcodes.RESIZE, 3),
    ...byteSize,
    ..._uint((policy ? policy.flags : 0)),
    ..._uint(flags),
    ...bin
  ],

  /**
 * Create an expression that performs bit insert operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} byteOffset Byte index of where to insert the value.
 * @param {AerospikeExp} value Blob expression containing the bytes to insert.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob containing the inserted bytes.
 */
  insert: (bin, value, byteOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.INSERT, 3),
    ...byteOffset,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit remove operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} byteOffset Byte index of where to remove from.
 * @param {number} byteSize Number of bytes to remove.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes removed.
 */
  remove: (bin, byteSize, byteOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.REMOVE, 3),
    ...byteOffset,
    ...byteSize,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit set operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start writing.
 * @param {AerospikeExp} bitSize Number of bytes to overwrite.
 * @param {AerospikeExp} value Blob expression containing bytes to write.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes overwritten.
 */
  set: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.SET, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit or operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bytes to be operated on.
 * @param {AerospikeExp} value Blob expression containing bytes to write.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  or: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.OR, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit xor operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Blob expression containing bytes to write.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  xor: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.XOR, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit and operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Blob expression containing bytes to write.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  and: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.AND, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit not operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  not: (bin, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.NOT, 3),
    ...bitOffset,
    ...bitSize,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs an bit lshift operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {number} shift Number of bits to shift by.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  lShift: (bin, shift, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.LSHIFT, 4),
    ...bitOffset,
    ...bitSize,
    ...shift,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit rshift operation.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {number} shift Number of bits to shift by.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  rShift: (bin, shift, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.RSHIFT, 4),
    ...bitOffset,
    ...bitSize,
    ...shift,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /**
 * Create an expression that performs bit add operation.
 * Note: integers are stored big-endian.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Integer expression for value to add.
 * @param {number} action bit overflow action value.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  add: (bin, action, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.ADD, 5),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ..._uint(action),
    ...bin
  ],

  /**
 * Create an expression that performs bit add operation.
 * Note: integers are stored big-endian.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Integer expression for value to subtract.
 * @param {number} action bit overflow action value.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  subtract: (bin, action, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.SUBTRACT, 5),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ..._uint(action),
    ...bin
  ],

  /**
 * Create an expression that performs bit add operation.
 * Note: integers are stored big-endian.
 *
 * @param {Object} policy bit policy value.
 * @param {AerospikeExp} bitOffset Bit index of where to start operation.
 * @param {AerospikeExp} bitSize Number of bits to be operated on.
 * @param {AerospikeExp} value Integer expression for value to set.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin resulting blob with the bytes operated on.
 */
  setInt: (bin, value, bitSize, bitOffset, policy = null) => [
    ..._bitModStart(bits.opcodes.SET_INT, 4),
    ...bitOffset,
    ...bitSize,
    ...value,
    ..._uint((policy ? policy.flags : 0)),
    ...bin
  ],

  /*********************************************************************************
 * BIT READ EXPRESSIONS
 *********************************************************************************/

  /**
 * Create an expression that performs bit get operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} blob bin bit_size bits rounded up to the nearest byte size.
 */
  get: (bin, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.BLOB, bits.opcodes.GET, 2),
    ...bitOffset,
    ...bitSize,
    ...bin
  ],

  /**
 * Create an expression that performs bit count operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {number} integer value number of bits set to 1 in the bit_size region.
 */
  count: (bin, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.INT, bits.opcodes.COUNT, 2),
    ...bitOffset,
    ...bitSize,
    ...bin
  ],

  /**
 * Create an expression that performs bit lscan operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {AerospikeExp} value Boolean expression, true searches for 1, false for 0.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {number} integer value Index of the left most bit starting from __offset set to value.
 */
  lScan: (bin, value, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.INT, bits.opcodes.LSCAN, 3),
    ...bitOffset,
    ...bitSize,
    ...value,
    ...bin
  ],

  /**
 * Create an expression that performs bit rscan operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {AerospikeExp} value Boolean expression, true searches for 1, false for 0.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {number} integer value Index of the right most bit starting from __offset set to value.
 */
  rScan: (bin, value, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.INT, bits.opcodes.RSCAN, 3),
    ...bitOffset,
    ...bitSize,
    ...value,
    ...bin
  ],

  /**
 * Create an expression that performs bit get_int operation.
 *
 * @param {AerospikeExp} bitOffset The bit index of where to start reading from.
 * @param {AerospikeExp} bitSize Number of bits to read from the blob bin.
 * @param {boolean} sign Boolean value, true for signed, false for unsigned.
 * @param {AerospikeExp} bin A blob bin expression to apply this function to.
 * @return {AerospikeExp} integer value Index of the left most bit starting from offset set to value.
 */
  getInt: (bin, sign, bitSize, bitOffset) => [
    ..._bitReadStart(exp.type.INT, bits.opcodes.GET_INT, 3),
    ...bitOffset,
    ...bitSize,
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

exports.hll = {

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
