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
const BIN_TYPE_UNDEF = 0

/**
 * @module aerospike/exp
 * @summary {@link module:aerospike/exp|aerospike/exp} module
 *
 * @description This module defines a filter expression that is
 * a mechanism for additional filtering.
 *
 * The resultset of a primary index (PI) query (scan) or secondary
 * index (SI) query operation can be filtered through the QueryPolicy
 * and ScanPolicy classes. It can also filter single key operations and
 * batch operations through the filterExpression field of their policy class.
 *
 * Filter Expressions replace PredicateExpression filtering,
 * which was deprecated in server 5.2 and
 * removed in server 6.0.
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
 * <caption>Expressions using the operate API</caption>
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * const exp = Aerospike.exp
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * const tempBin = 'ExpVar' // this bin is to hold expression read operation output
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * const config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 *
 * var ops = [
 *   op.append('a', 'xyz'),
 *   op.incr('b', 10),
 *   exp.operations.read(tempBin,
 *           exp.add(exp.binInt('b'), exp.binInt('b')),
 *          0),
 *   op.read('a'),
 *   op.read('b')
 * ]
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, { a: 'abc', b: 42 }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error, record) => {
 *       if (error) throw error
 *       console.log(record.bins) // => { a: 'abcxyz', b: 52, ExpVar: 104 }
 *       client.close()
 *     })
 *   })
 * })
 *
 * @example
 *
 * <caption>Expressions using the query API</caption>
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * const exp = Aerospike.exp
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * const tempBin = 'ExpVar' // this bin is to hold expression read operation output
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * const config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     query : new Aerospike.QueryPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0, exists : Aerospike.policy.exists.REPLACE})
 *   }
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, { a: 'abc', b: 42 }, (error) => {
 *     if (error) throw error
 *     var query = client.query('test', 'demo')
 *     const queryPolicy = { filterExpression:  exp.eq(exp.binInt('b'), exp.int(42))}
 *     query.nobins = false
 *     const stream = query.foreach(queryPolicy)
 *     stream.on('error', (error) => {
 *       console.error(error)
 *       throw error
 *     })
 *     stream.on('data', (record) => {
 *       console.info(record.bins) // => { a: 'abc', b: 42}
 *     })
 *     stream.on('end', () => {
 *       client.close()
 *     })
 *   })
 * })
 *
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

/**
 * The {@link module:aerospike/exp/lists|aerospike/exp/lists} module defines functions
 * for expressions on the List datatype.
 *
 * @summary List expressions.
 */
exports.lists = require('./exp_lists')

/**
 * The {@link module:aerospike/exp/maps|aerospike/exp/maps} module defines functions
 * for expressions on the Map datatype.
 *
 * @summary Map expressions.
 */
exports.maps = require('./exp_maps')

/**
 * The {@link module:aerospike/exp/bit|aerospike/exp/bit} module defines functions
 * for expressions on the Blob datatype
 *
 * @summary Blob expressions.
 */
exports.bit = require('./exp_bit')

/**
 * The {@link module:aerospike/exp/hll|aerospike/exp/hll} module defines functions
 * for expressions on the HyperLogLog datatype
 *
 * @summary HyperLogLog expressions.
 */
exports.hll = require('./exp_hll')
