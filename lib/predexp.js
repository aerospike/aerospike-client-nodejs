// *****************************************************************************
// Copyright 2018 Aerospike, Inc.
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
const predexp = as.predexp

const GeoJSON = require('./geojson')

/**
 * @module aerospike/predexp
 *
 * @description This module defines predicate expression that provide a
 * mechanism for additional filtering on the resultset of a secondary index
 * query or scan operation.
 *
 * Predicate filtering requires Aerospike Server version 3.12 or later.
 *
 * For more information, please refer to the
 * <a href="https://www.aerospike.com/docs/guide/predicate.html">&uArr;Predicate Filtering</a>
 * documentation in the Aerospike Feature Guide.
 *
 * @see {@link Query#where}
 */

/**
 * @class Predicate
 *
 * Predicate expressions can be created using the methods in the {@link
 * module:aerospike/filter} module.
 */
class Predicate {
  constructor (code, arg) {
    this.code = code
    this.arg = arg
  }
}
exports.Predicate = Predicate

/**
 * Create an AND logical predicate expression.
 *
 * The AND predicate expression returns true if all of its children are true.
 *
 * The nexpr parameter specifies how many children to pop off the expression
 * stack. These children must be "logical" expressions and not "value"
 * expressions.
 *
 * @param {number} nexpr - The number of child expressions to AND.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the value of bin "c" is between 11 and 20 inclusive:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.integerBin('c'),
 *   predexp.integerValue(11),
 *   predexp.integerGreaterEq(),
 *   predexp.integerBin('c'),
 *   predexp.integerValue(20),
 *   predexp.integerLessEq(),
 *   predexp.and(2)
 * ]
 */
exports.and = function (nexpr) {
  return new Predicate(predexp.AND, nexpr)
}

/**
 * Create an OR logical predicate expression.
 *
 * The OR predicate expression returns true if any of its children are true.
 *
 * The nexpr parameter specifies how many children to pop off the expression
 * stack. These children must be "logical" expressions and not "value"
 * expressions.
 *
 * @param {number} nexpr - The number of child expressions to OR.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the value of bin "pet" is "cat" or "dog":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringBin('pet'),
 *   predexp.stringEqual(),
 *   predexp.stringValue('dog'),
 *   predexp.stringBin('pet'),
 *   predexp.stringEqual(),
 *   predexp.or(2)
 * ]
 */
exports.or = function (count) {
  return new Predicate(predexp.OR, count)
}

/**
 * Create a NOT logical predicate expression.
 *
 * The NOT predicate expression returns true if its child is false.
 *
 * The NOT expression pops a single child off the expression stack.
 * This child must be a "logical" expression and not a "value"
 * expression.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the value of bin "pet" is not "dog":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('dog'),
 *   predexp.stringBin('pet'),
 *   predexp.stringEqual(),
 *   predexp.not()
 * ]
 */
exports.not = function () {
  return new Predicate(predexp.NOT)
}

/**
 * Create a constant integer value predicate expression.
 *
 * The integer value predicate expression pushes a single constant
 * integer value onto the expression stack.
 *
 * @param {number} value - The integer value.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the value of bin "c" is between 11 and 20 inclusive:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.integerBin('c'),
 *   predexp.integerValue(11),
 *   predexp.integerGreaterEq(),
 *   predexp.integerBin('c'),
 *   predexp.integerValue(20),
 *   predexp.integerLessEq(),
 *   predexp.and(2)
 * ]
 */
exports.integerValue = function (value) {
  return new Predicate(predexp.INT_VALUE, value)
}

/**
 * Create a constant string value predicate expression.
 *
 * The string value predicate expression pushes a single constant
 * string value onto the expression stack.
 *
 * @param {number} value - The string value.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the value of bin "pet" is "cat" or "dog":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringBin('pet'),
 *   predexp.stringEqual(),
 *   predexp.stringValue('dog'),
 *   predexp.stringBin('pet'),
 *   predexp.stringEqual(),
 *   predexp.or(2)
 * ]
 */
exports.stringValue = function (value) {
  return new Predicate(predexp.STR_VALUE, value)
}

/**
 * Create a constant GeoJSON value predicate expression.
 *
 * The GeoJSON value predicate expression pushes a single constant
 * string value onto the expression stack.
 *
 * @param {GeoJSON} value - The GeoJSON value.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where a point in bin "loc" is inside the specified polygon:</caption>
 *
 * const Aerospike = require('aerospike')
 * const GeoJSON = Aerospike.GeoJSON
 * const predexp = Aerospike.predexp
 *
 * let region = GeoJSON.Polygon(
 *   [-122.500000, 37.000000], [-121.000000, 37.000000],
 *   [-121.000000, 38.080000], [-122.500000, 38.080000],
 *   [-122.500000, 37.000000])
 *
 * let exp = [
 *   predexp.geojsonBin('loc'),
 *   predexp.geojsonValue(region),
 *   predexp.geoWithin()
 * ]
 */
exports.geojsonValue = function (value) {
  value = new GeoJSON(value)
  return new Predicate(predexp.GEO_VALUE, value.toString())
}

/**
 * Create a integer bin value predicate expression.
 *
 * The integer bin predicate expression pushes a single integer bin value
 * extractor onto the expression stack.
 *
 * @param {String} bin - The name of the bin.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the value of bin "c" is between 11 and 20 inclusive:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.integerBin('c'),
 *   predexp.integerValue(11),
 *   predexp.integerGreaterEq(),
 *   predexp.integerBin('c'),
 *   predexp.integerValue(20),
 *   predexp.integerLessEq(),
 *   predexp.and(2)
 * ]
 */
exports.integerBin = function (bin) {
  return new Predicate(predexp.INT_BIN, bin)
}

/**
 * Create a string bin value predicate expression.
 *
 * The string bin predicate expression pushes a single string bin value onto
 * the expression stack.
 *
 * @param {number} bin - The name of the bin.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the value of bin "pet" is "cat" or "dog":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringBin('pet'),
 *   predexp.stringEqual(),
 *   predexp.stringValue('dog'),
 *   predexp.stringBin('pet'),
 *   predexp.stringEqual(),
 *   predexp.or(2)
 * ]
 */
exports.stringBin = function (bin) {
  return new Predicate(predexp.STR_BIN, bin)
}

/**
 * Create a GeoJSON bin value predicate expression.
 *
 * The GeoJSON bin predicate expression pushes a single GeoJSON bin value onto
 * the expression stack.
 *
 * @param {GeoJSON} bin - The name of the bin.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where a point in bin "loc" is inside the specified polygon:</caption>
 *
 * const Aerospike = require('aerospike')
 * const GeoJSON = Aerospike.GeoJSON
 * const predexp = Aerospike.predexp
 *
 * let region = GeoJSON.Polygon(
 *   [-122.500000, 37.000000], [-121.000000, 37.000000],
 *   [-121.000000, 38.080000], [-122.500000, 38.080000],
 *   [-122.500000, 37.000000])
 *
 * let exp = [
 *   predexp.geojsonBin('loc'),
 *   predexp.geojsonValue(region),
 *   predexp.geoWithin()
 * ]
 */
exports.geojsonBin = function (bin) {
  return new Predicate(predexp.GEO_BIN, bin)
}

/**
 * Create a list bin value predicate expression.
 *
 * The list bin predicate expression pushes a single list bin value extractor
 * onto the expression stack. List bin values may be used with list iteration
 * expressions to evaluate a subexpression for each of the elements of the
 * list.
 *
 * @param {GeoJSON} bin - The name of the bin.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where one of the list items is cat:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringVar('item'),
 *   predexp.stringEqual(),
 *   predexp.listBin('pets')
 *   predexp.listIterateOr('item')
 * ]
 */
exports.listBin = function (bin) {
  return new Predicate(predexp.LIST_BIN, bin)
}

/**
 * Create a map bin value predicate expression.
 *
 * The map bin predicate expression pushes a single map bin value extractor
 * onto the expression stack. Map bin values may be used with map iteration
 * expressions to evaluate a subexpression for each of the elements of the
 * map.
 *
 * @param {GeoJSON} bin - The name of the bin.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the map contains a key of "cat":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringVar('key'),
 *   predexp.stringEqual(),
 *   predexp.mapBin('pets')
 *   predexp.mapkeyIterateOr('key')
 * ]
 */
exports.mapBin = function (bin) {
  return new Predicate(predexp.MAP_BIN, bin)
}

/**
 * Create an integer iteration variable (value) predicate expression.
 *
 * The integer iteration variable is used in the subexpression child of a list
 * or map iterator and takes the value of each element in the collection as it
 * is traversed.
 *
 * @param {string} name - The name of the iteration variable.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where the list contains a value of 42:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.integerVar('item'),
 *   predexp.integerValue(42),
 *   predexp.integerEqual(),
 *   predexp.listBin('numbers'),
 *   predexp.listIterateOr('item')
 * ]
 */
exports.integerVar = function (name) {
  return new Predicate(predexp.INT_VAR, name)
}

/**
 * Create a string iteration variable (value) predicate expression.
 *
 * The string iteration variable is used in the subexpression child of a list
 * or map iterator and takes the value of each element in the collection as it
 * is traversed.
 *
 * @param {string} name - The name of the iteration variable.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where one of the list items is "cat":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringVar('item'),
 *   predexp.stringValue('cat'),
 *   predexp.stringEqual(),
 *   predexp.listBin('pets'),
 *   predexp.listIterateOr('item')
 * ]
 */
exports.stringVar = function (name) {
  return new Predicate(predexp.STR_VAR, name)
}

/**
 * Create a GeoJSON iteration variable (value) predicate expression.
 *
 * The GeoJSON iteration variable is used in the subexpression child of a list
 * or map iterator and takes the value of each element in the collection as it
 * is traversed.
 *
 * @param {string} name - The name of the iteration variable.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 */
exports.geojsonVar = function (name) {
  return new Predicate(predexp.GEO_VAR, name)
}

/**
 * Create a record device size metadata value predicate expression.
 *
 * The record device size expression assumes the value of the size in bytes
 * that the record occupies on device storage. For non-persisted records, this
 * value is 0.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions
 * selects records whose device storage size is larger than 65K:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.recDeviceSize(),
 *   predexp.integerValue(65 * 1024),
 *   predexp.integerGreater()
 * ]
 */
exports.recDeviceSize = function () {
  return new Predicate(predexp.REC_DEVICE_SIZE)
}

/**
 * Create a last update record metadata value predicate expression.
 *
 * The record last update expression assumes the value of the number of
 * nanoseconds since the unix epoch that the record was last updated.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions
 * selects records that have been updated after a given timestamp:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let timestampNS = ... # cut-off time in ns since Unix epoch
 *
 * let exp = [
 *   predexp.recLastUpdate(),
 *   predexp.integerValue(timestampNS),
 *   predexp.integerGreater()
 * ]
 */
exports.recLastUpdate = function () {
  return new Predicate(predexp.REC_LAST_UPDATE)
}

/**
 * Create a void time record metadata value predicate expression.
 *
 * The record void time expression assumes the value of the number of
 * nanoseconds since the unix epoch when the record will expire. The special
 * value of 0 means the record will not expire.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions
 * selects records that have void time set to 0 (no expiration):</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.recVoidTime(),
 *   predexp.integerValue(0),
 *   predexp.integerEqual()
 * ]
 */
exports.recVoidTime = function () {
  return new Predicate(predexp.REC_VOID_TIME)
}

/**
 * Create a digest modulo record metadata value predicate expression.
 *
 * The digest modulo expression assumes the value of 4 bytes of the
 * record's key digest modulo it's modulus argument.
 *
 * @param {number} mod - The modulus argument.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions
 * selects records where digest(key) % 3 == 1:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.recDigestModulo(3),
 *   predexp.integerValue(1),
 *   predexp.integerEqual()
 * ]
 */
exports.recDigestModulo = function (mod) {
  return new Predicate(predexp.REC_DIGEST_MODULO, mod)
}

/**
 * Create an integer comparison logical predicate expression.
 *
 * The integer comparison expressions pop a pair of value expressions off the
 * expression stack and compare them. The deeper of the two child expressions
 * (pushed earlier) is considered the left side of the expression and the
 * shallower (pushed later) is considered the right side.
 *
 * If the value of either of the child expressions is unknown because a
 * specified bin does not exist or contains a value of the wrong type the
 * result of the comparison is false. If a true outcome is desirable in this
 * situation use the complimentary comparison and enclose in a logical NOT.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records that have bin "foo" equal to 42:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.integerBin('foo'),
 *   predexp.integerValue(42),
 *   predexp.integerEqual()
 * ]
 */
exports.integerEqual = function () {
  return new Predicate(predexp.INT_EQUAL)
}

/**
 * Create an integer comparison logical predicate expression.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @see {@link module:aerospike/predexp.integerEqual|integerEqual}
 */
exports.integerUnequal = function () {
  return new Predicate(predexp.INT_UNEQUAL)
}

/**
 * Create an integer comparison logical predicate expression.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @see {@link module:aerospike/predexp.integerEqual|integerEqual}
 */
exports.integerGreater = function () {
  return new Predicate(predexp.INT_GREATER)
}

/**
 * Create an integer comparison logical predicate expression.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @see {@link module:aerospike/predexp.integerEqual|integerEqual}
 */
exports.integerGreaterEq = function () {
  return new Predicate(predexp.INT_GREATEREQ)
}

/**
 * Create an integer comparison logical predicate expression.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @see {@link module:aerospike/predexp.integerEqual|integerEqual}
 */
exports.integerLess = function () {
  return new Predicate(predexp.INT_LESS)
}

/**
 * Create an integer comparison logical predicate expression.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @see {@link module:aerospike/predexp.integerEqual|integerEqual}
 */
exports.integerLessEq = function () {
  return new Predicate(predexp.INT_LESSEQ)
}

/**
 * Create a string comparison logical predicate expression.
 *
 * The string comparison expressions pop a pair of value expressions off the
 * expression stack and compare them. The deeper of the two child expressions
 * (pushed earlier) is considered the left side of the expression and the
 * shallower (pushed later) is considered the right side.
 *
 * If the value of either of the child expressions is unknown because a
 * specified bin does not exist or contains a value of the wrong type the
 * result of the comparison is false. If a true outcome is desirable in this
 * situation use the complimentary comparison and enclose in a logical NOT.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records that have bin "pet" equal to "cat":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringBin('pet'),
 *   predexp.stringValue('cat'),
 *   predexp.stringEqual()
 * ]
 */
exports.stringEqual = function () {
  return new Predicate(predexp.STR_EQUAL)
}

/**
 * Create a string comparison logical predicate expression.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @see {@link module:aerospike/predexp.stringEqual|stringEqual}
 */
exports.stringUnequal = function () {
  return new Predicate(predexp.STR_UNEQUAL)
}

/**
 * Create a string regular expression logical predicate expression.
 *
 * The string regex expression pops two children off the expression stack and
 * compares a child value expression to a regular expression. The left child
 * (pushed earlier) must contain the string value to be matched. The right
 * child (pushed later) must be a string value containing a valid regular
 * expression.
 *
 * If the value of the left child is unknown because a specified bin does not
 * exist or contains a value of the wrong type the result of the regex match is
 * false.
 *
 * The <code>flags</code> argument is passed to the regcomp library routine on
 * the server. The supported flags are defined in the {@link
 * module:aerospike.regex} enum and can be used to toggle between
 * [basic and extended POSIX regular expression syntax]{@link https://en.wikipedia.org/wiki/Regular_expression#Standards},
 * enable case-insensitive matching, etc.
 *
 * @param {number} [flags=Aerospike.regex.BASIC] - POSIX regex compilation flags.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @see {@link module:aerospike.regex} for supported compilation flags.
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records that have bin "hex" value ending in '1' or '2':</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringBin('hex'),
 *   predexp.stringValue('0x00.[12]'),
 *   predexp.stringRegex(Aerospike.regex.ICASE)
 * ]
 */
exports.stringRegex = function (flags) {
  flags |= 0
  return new Predicate(predexp.STR_REGEX, flags)
}

/**
 * Create a GeoJSON Points-in-Region logical predicate expression.
 *
 * The Points-in-Region (within) expression pops two children off the
 * expression stack and checks to see if a child GeoJSON point is inside a
 * specified GeoJSON region. The left child (pushed earlier) must contain a
 * GeoJSON value specifying a point. The right child (pushed later) must be a
 * GeoJSON value containing a region.
 *
 * If the value of the left child is unknown because a specified bin does not
 * exist or contains a value of the wrong type the result of the within
 * expression is false.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where a point in bin "loc" is inside the specified polygon:</caption>
 *
 * const Aerospike = require('aerospike')
 * const GeoJSON = Aerospike.GeoJSON
 * const predexp = Aerospike.predexp
 *
 * let region = GeoJSON.Polygon(
 *   [-122.500000, 37.000000], [-121.000000, 37.000000],
 *   [-121.000000, 38.080000], [-122.500000, 38.080000],
 *   [-122.500000, 37.000000])
 *
 * let exp = [
 *   predexp.geojsonBin('loc'),
 *   predexp.geojsonValue(region),
 *   predexp.geoWithin()
 * ]
 */
exports.geojsonWithin = function () {
  return new Predicate(predexp.GEO_WITHIN)
}

/**
 * Create an GeoJSON Regions-Containing-Point logical predicate expression.
 *
 * The Regions-Containing-Point (contains) expression pops two children off the
 * expression stack and checks to see if a child GeoJSON region contains a
 * specified GeoJSON point. The left child (pushed earlier) must contain a
 * GeoJSON value specifying a possibly enclosing region. The right child
 * (pushed later) must be a GeoJSON value containing a point.
 *
 * If the value of the left child is unknown because a specified bin does not
 * exist or contains a value of the wrong type the result of the contains
 * expression is false.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where a point in bin "rgn" contains the specified query point:</caption>
 *
 * const Aerospike = require('aerospike')
 * const GeoJSON = Aerospike.GeoJSON
 * const predexp = Aerospike.predexp
 *
 * let point = GeoJSON.Point(-122.0986857, 37.4214209)
 *
 * let exp = [
 *   predexp.geojsonBin('rgn'),
 *   predexp.geojsonValue(point),
 *   predexp.geoContains()
 * ]
 */
exports.geojsonContains = function () {
  return new Predicate(predexp.GEO_CONTAINS)
}

/**
 * Create a list iteration OR logical predicate expression.
 *
 * The list iteration expression pops two children off the expression stack.
 * The left child (pushed earlier) must contain a logical subexpression
 * containing one or more matching iteration variable expressions. The right
 * child (pushed later) must specify a list bin. The list iteration traverses
 * the list and repeatedly evaluates the subexpression substituting each list
 * element's value into the matching iteration variable. The result of the
 * iteration expression is a logical OR of all of the individual element
 * evaluations.
 *
 * If the list bin contains zero elements, the list iterate OR expression will
 * return false.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where one of the list items is "cat":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringVar('item'),
 *   predexp.stringEqual(),
 *   predexp.listBin('pets')
 *   predexp.listIterateOr('item')
 * ]
 */
exports.listIterateOr = function (name) {
  return new Predicate(predexp.LIST_ITERATE_OR, name)
}

/**
 * Create a list iteration AND logical predicate expression.
 *
 * The list iteration expression pops two children off the expression stack.
 * The left child (pushed earlier) must contain a logical subexpression
 * containing one or more matching iteration variable expressions. The right
 * child (pushed later) must specify a list bin. The list iteration traverses
 * the list and repeatedly evaluates the subexpression substituting each list
 * element's value into the matching iteration variable. The result of the
 * iteration expression is a logical AND of all of the individual element
 * evaluations.
 *
 * If the list bin contains zero elements, the list iterate AND expression will
 * return true. This is useful when testing for exclusion (see example).
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where none of the list items is "cat":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringVar('item'),
 *   predexp.stringEqual(),
 *   predexp.not(),
 *   predexp.listBin('pets')
 *   predexp.listIterateAnd('item')
 * ]
 */
exports.listIterateAnd = function (name) {
  return new Predicate(predexp.LIST_ITERATE_AND, name)
}

/**
 * Create a map key iteration OR logical predicate expression.
 *
 * The map key iteration expression pops two children off the expression stack.
 * The left child (pushed earlier) must contain a logical subexpression
 * containing one or more matching iteration variable expressions. The right
 * child (pushed later) must specify a map bin. The map key iteration traverses
 * the map and repeatedly evaluates the subexpression substituting each map key
 * value into the matching iteration variable. The result of the iteration
 * expression is a logical OR of all of the individual element evaluations.
 *
 * If the map bin contains zero elements, the map key iterate OR expression
 * will return false.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where one of the map keys is "cat":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringVar('item'),
 *   predexp.stringEqual(),
 *   predexp.mapBin('pets')
 *   predexp.mapkeyIterateOr('item')
 * ]
 */
exports.mapKeyIterateOr = function (name) {
  return new Predicate(predexp.MAPKEY_ITERATE_OR, name)
}

/**
 * Create a map key iteration AND logical predicate expression.
 *
 * The map key iteration expression pops two children off the expression stack.
 * The left child (pushed earlier) must contain a logical subexpression
 * containing one or more matching iteration variable expressions. The right
 * child (pushed later) must specify a map bin. The map key iteration traverses
 * the map and repeatedly evaluates the subexpression substituting each map key
 * value into the matching iteration variable. The result of the iteration
 * expression is a logical AND of all of the individual element evaluations.
 *
 * If the map bin contains zero elements, the map key iterate AND expression
 * will return true. This is useful when testing for exclusion (see example).
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where none of the map keys is "cat":</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.stringValue('cat'),
 *   predexp.stringVar('item'),
 *   predexp.stringEqual(),
 *   predexp.not(),
 *   predexp.mapBin('pets')
 *   predexp.mapkeyIterateAnd('item')
 * ]
 */
exports.mapKeyIterateAnd = function (name) {
  return new Predicate(predexp.MAPKEY_ITERATE_AND, name)
}

/**
 * Create a map value iteration OR logical predicate expression.
 *
 * The map value iteration expression pops two children off the expression
 * stack. The left child (pushed earlier) must contain a logical subexpression
 * containing one or more matching iteration variable expressions. The right
 * child (pushed later) must specify a map bin. The map value iteration
 * traverses the map and repeatedly evaluates the subexpression substituting
 * each map value into the matching iteration variable. The result of the
 * iteration expression is a logical OR of all of the individual element
 * evaluations.
 *
 * If the map bin contains zero elements, the map value iterate OR expression
 * will return false.
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where one of the map values is 0:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.integerValue(0),
 *   predexp.integerVar('count'),
 *   predexp.integerEqual(),
 *   predexp.mapBin('petcount')
 *   predexp.mapvalue('count')
 * ]
 */
exports.mapValIterateOr = function (name) {
  return new Predicate(predexp.MAPVAL_ITERATE_OR, name)
}

/**
 * Create a map value iteration AND logical predicate expression.
 *
 * The map value iteration expression pops two children off the expression
 * stack. The left child (pushed earlier) must contain a logical subexpression
 * containing one or more matching iteration variable expressions. The right
 * child (pushed later) must specify a map bin. The map value iteration
 * traverses the map and repeatedly evaluates the subexpression substituting
 * each map value into the matching iteration variable. The result of the
 * iteration expression is a logical AND of all of the individual element
 * evaluations.
 *
 * If the map bin contains zero elements, the map value iterate OR expression
 * will return true. This is useful when testing for exclusion (see example).
 *
 * @returns {Object} A predicate expression to be used with {@link Query#where}
 *
 * @example <caption>The following sequence of predicate expressions selects
 * records where none of the map values is 0:</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * let exp = [
 *   predexp.integerValue(0),
 *   predexp.integerVar('count'),
 *   predexp.integerEqual(),
 *   predexp.not(),
 *   predexp.mapBin('petcount')
 *   predexp.mapvalue('count')
 * ]
 */
exports.mapValIterateAnd = function (name) {
  return new Predicate(predexp.MAPVAL_ITERATE_AND, name)
}
