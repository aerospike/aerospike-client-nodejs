// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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
//
// CTX vs CDT: nested string targets use a flat string-op ctx envelope; see
// server docs / C `as_string_pack_header` with 0xFF sentinel — not CDT nested
// array layout.
//
// Multi-op `operate()` on the same bin may return an ordered list of per-op
// results when the server sets RESPOND_ALL_OPS (STRING_READ / STRING_MODIFY /
// TO_STRING participate like MAP/BIT/HLL in the C client).
// *****************************************************************************

'use strict'

const as = require('./native')
const opcodes = as.stringOperations
const Operation = require('./operations').Operation
const Context = require('./cdt_context')

/**
 * @class module:aerospike/strings~StringOperation
 * @extends module:aerospike/operations~Operation
 * @classdesc String bin operation for {@link Client#operate} (server 8.1.3+).
 */
class StringOperation extends Operation {}

StringOperation.prototype.withContext = function (contextOrFunction) {
  if (typeof contextOrFunction === 'object') {
    this.context = contextOrFunction
  } else if (typeof contextOrFunction === 'function') {
    this.context = new Context()
    contextOrFunction(this.context)
  }
  return this
}

/**
 * @param {object} policy `{ writeFlags }` — see {@link module:aerospike/strings.writeFlags}
 */
StringOperation.prototype.withPolicy = function (policy) {
  this.policy = policy
  return this
}

function op (name, bin, props) {
  return new StringOperation(opcodes[name], bin, props)
}

/**
 * @module aerospike/strings
 * @summary String bin operations for {@link Client#operate}
 * @description Requires Aerospike Server 8.1.3 or later. See also
 * {@link module:aerospike/exp/string|exp.string} for filter/write expressions.
 *
 * For raw byte append/prepend on **blob** bins, use {@link module:aerospike/operations}
 * `append` / `prepend`. Use {@link module:aerospike/strings.append} /
 * {@link module:aerospike/strings.prepend} for Unicode-aware string bins.
 */

exports.strlen = (bin) => op('STRLEN', bin, {})
exports.substr = (bin, start) => op('SUBSTR', bin, { start })
/** Half-open codepoint range `[start, end)` (exclusive `end`). */
exports.substrRange = (bin, start, end) => op('SUBSTR_RANGE', bin, { start, end })
exports.charAt = (bin, index) => op('CHAR_AT', bin, { index })
exports.find = (bin, needle) => op('FIND', bin, { needle })
exports.findOccurrence = (bin, needle, occurrence) =>
  op('FIND_OCCURRENCE', bin, { needle, occurrence })
exports.contains = (bin, needle) => op('CONTAINS', bin, { needle })
exports.startsWith = (bin, prefix) => op('STARTS_WITH', bin, { prefix })
exports.endsWith = (bin, suffix) => op('ENDS_WITH', bin, { suffix })
exports.toInteger = (bin) => op('TO_INTEGER', bin, {})
exports.toDouble = (bin) => op('TO_DOUBLE', bin, {})
exports.byteLength = (bin) => op('BYTE_LENGTH', bin, {})
exports.isNumeric = (bin) => op('IS_NUMERIC', bin, {})
exports.isNumericType = (bin, numericType) => op('IS_NUMERIC_TYPE', bin, { numericType })
exports.isUpper = (bin) => op('IS_UPPER', bin, {})
exports.isLower = (bin) => op('IS_LOWER', bin, {})
exports.toBlob = (bin) => op('TO_BLOB', bin, {})
/** Splits by Unicode codepoint (one list element per codepoint). Use {@link splitSeparator} to split on a delimiter. */
exports.split = (bin) => op('SPLIT', bin, {})
exports.splitSeparator = (bin, separator) => op('SPLIT_SEPARATOR', bin, { separator })
exports.b64Decode = (bin) => op('B64_DECODE', bin, {})
exports.regexCompare = (bin, pattern) => op('REGEX_COMPARE', bin, { pattern })
exports.regexCompareFlags = (bin, pattern, flags) =>
  op('REGEX_COMPARE_FLAGS', bin, { pattern, flags })

exports.insert = (bin, index, value) => op('INSERT', bin, { index, value })
exports.overwrite = (bin, index, value) => op('OVERWRITE', bin, { index, value })
/** `AS_STRING_OP_CONCAT` with a single-element list on the wire (see C client). */
exports.concat = (bin, value) => op('CONCAT', bin, { value })
exports.concatList = (bin, values) => op('CONCAT_LIST', bin, { values })
/** Unicode-aware append (`AS_STRING_OP_APPEND`). */
exports.append = (bin, value) => op('APPEND', bin, { value })
/** Unicode-aware prepend (`AS_STRING_OP_PREPEND`). */
exports.prepend = (bin, value) => op('PREPEND', bin, { value })
/** Removes half-open codepoint range `[start, end)`. */
exports.snip = (bin, start, end) => op('SNIP', bin, { start, end })
/** @deprecated Use {@link #snip} (same wire; opcode alias). */
exports.snipRange = (bin, start, end) => op('SNIP_RANGE', bin, { start, end })
exports.replace = (bin, needle, replacement) => op('REPLACE', bin, { needle, replacement })
exports.replaceAll = (bin, needle, replacement) =>
  op('REPLACE_ALL', bin, { needle, replacement })
exports.upper = (bin) => op('UPPER', bin, {})
exports.lower = (bin) => op('LOWER', bin, {})
exports.caseFold = (bin) => op('CASE_FOLD', bin, {})
exports.normalizeNfc = (bin) => op('NORMALIZE_NFC', bin, {})
exports.trimStart = (bin) => op('TRIM_START', bin, {})
exports.trimEnd = (bin) => op('TRIM_END', bin, {})
exports.trim = (bin) => op('TRIM', bin, {})
exports.padStart = (bin, targetLength, padString) =>
  op('PAD_START', bin, { targetLength, padString })
exports.padEnd = (bin, targetLength, padString) =>
  op('PAD_END', bin, { targetLength, padString })
exports.repeat = (bin, count) => op('REPEAT', bin, { count })
exports.regexReplace = (bin, pattern, replacement, flags) =>
  op('REGEX_REPLACE', bin, { pattern, replacement, flags })
exports.toString = (bin) => op('TO_STRING', bin, {})

exports.StringOperation = StringOperation
