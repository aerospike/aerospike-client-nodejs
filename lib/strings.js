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

/**
 * @summary Target a nested string via context instead of the top-level bin value.
 * @description Nested string targets use a flat string-op ctx envelope (C
 * `as_string_pack_header` with `0xFF` sentinel), not CDT nested-array layout.
 *
 * @param {module:aerospike/cdt~Context|function} contextOrFunction - A
 * {@link module:aerospike/cdt~Context} instance, or a function that receives a
 * new context to configure.
 * @returns {module:aerospike/strings~StringOperation} This operation.
 */
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
 * @summary Attach string policy flags to a modify operation.
 * @description Pass `{ writeFlags }` using {@link module:aerospike/strings.writeFlags}.
 * Applies to string modify operations that support policy on the wire. Does not
 * apply to {@link module:aerospike/strings.regexReplace|regexReplace}, which
 * accepts regex flags as a separate argument instead of string policy flags.
 *
 * @param {object} policy - `{ writeFlags }` bit flags.
 * @returns {module:aerospike/strings~StringOperation} This operation.
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
 *
 * #### When the target bin is missing
 *
 * Modify operations fall into two groups. Missing-bin behavior is defined by the
 * operation, not by {@link module:aerospike/strings.writeFlags.NO_FAIL|NO_FAIL}.
 *
 * * **Creates the bin** (additive; may start from an empty string):
 *   {@link append}, {@link prepend}, {@link concat}, {@link concatList},
 *   {@link insert}, {@link overwrite}, {@link padStart}, {@link padEnd},
 *   {@link repeat} (on a missing bin, {@link repeat} yields an empty string when
 *   the server applies the op).
 * * **No-op** (record unchanged; a following `read` may return `undefined` for
 *   that bin in the record's `bins` map):
 *   {@link snip}, {@link replace}, {@link replaceAll}, {@link upper},
 *   {@link lower}, {@link caseFold}, {@link normalizeNfc}, {@link trimStart},
 *   {@link trimEnd}, {@link trim}, {@link regexReplace}, {@link toString}.
 *
 * **Read operations** ({@link strlen}, {@link find}, and the rest of the read
 * helpers) require an applicable bin/value; the server returns an error if the
 * bin is missing or the type is wrong.
 *
 * #### Policy and errors
 *
 * Use {@link module:aerospike/strings~StringOperation#withPolicy|withPolicy} with
 * {@link module:aerospike/strings.writeFlags|writeFlags} on supported modify ops.
 * {@link module:aerospike/strings.writeFlags.NO_FAIL|NO_FAIL} suppresses an
 * in-operation execution failure and leaves the bin unchanged. It does **not**
 * suppress wrong-type or invalid-bin-type errors; those still fail
 * {@link Client#operate} with an {@link AerospikeError}.
 *
 * For richer failure data on server 8.1.3+, set
 * {@link BasePolicy#errorDetailVerbosity} on {@link OperatePolicy} using
 * {@link module:aerospike/errorDetailVerbosity|errorDetailVerbosity}, then read
 * {@link AerospikeError#subcode} and the error message. Subcodes are paired with
 * parent {@link module:aerospike/status|status} codes; see
 * {@link module:aerospike/subcode|subcode}.
 *
 * @remarks Some server 8.1.3 builds may ignore {@link writeFlags.NO_FAIL} on
 * modify paths that do not pass a context argument. Prefer
 * {@link module:aerospike/strings~StringOperation#withContext|withContext} when
 * relying on `NO_FAIL` until your server version includes the fix.
 *
 * #### Multi-op results
 *
 * Chaining multiple string ops on the same bin in one `operate()` call may return
 * an ordered list of per-op results when the server sets RESPOND_ALL_OPS
 * (STRING_READ / STRING_MODIFY / TO_STRING behave like MAP/BIT/HLL in the C client).
 *
 * @see {@link Client#operate}
 *
 * @example <caption>Append creates a missing bin; upper is a no-op on a missing bin</caption>
 *
 * const Aerospike = require('aerospike')
 * const strings = Aerospike.strings
 * const op = Aerospike.operations
 * const key = new Aerospike.Key('test', 'demo', 'stringsMissingBin')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * const config = {
 *   hosts: '192.168.33.10:3000',
 *   policies: {
 *     operate: new Aerospike.OperatePolicy({ socketTimeout: 0, totalTimeout: 0 })
 *   }
 * }
 * Aerospike.connect(config).then(async client => {
 *   await client.put(key, {}) // no "msg" bin yet
 *   await client.operate(key, [
 *     strings.append('msg', 'hi'),
 *     op.read('msg')
 *   ])
 *   let record = await client.get(key)
 *   console.log(record.bins.msg) // => 'hi'
 *
 *   await client.remove(key)
 *   await client.put(key, {})
 *   await client.operate(key, [
 *     strings.upper('msg'),
 *     op.read('msg')
 *   ])
 *   record = await client.get(key)
 *   console.log(record.bins.msg) // => undefined (bin was never created)
 *   client.close()
 * })
 */

/**
 * @summary String operation policy write bit flags.
 *
 * @type Object
 * @property {number} DEFAULT - Default. Does not suppress an in-operation
 * execution failure.
 * @property {number} NO_FAIL - Suppress an operation failure with the bin
 * unchanged. Does not suppress wrong-type or invalid-bin-type errors.
 *
 * @see {@link module:aerospike/strings~StringOperation#withPolicy}
 */
exports.writeFlags = as.string.writeFlags

/**
 * @summary Regex flags for {@link regexCompareFlags} and {@link regexReplace}.
 *
 * @type Object
 * @property {number} NONE - No flags.
 * @property {number} CASE_INSENSITIVE - Case-insensitive matching.
 * @property {number} MULTILINE - `^` and `$` match line boundaries.
 * @property {number} DOTALL - `.` matches line terminators.
 * @property {number} UNIX_LINES - Only `\n` is a line terminator.
 * @property {number} GLOBAL - Replace all matches ({@link regexReplace} only).
 */
exports.regexFlags = as.string.regexFlags

/**
 * @summary Numeric type filter for {@link isNumericType}.
 *
 * @type Object
 * @property {number} ANY - Integer or floating-point.
 * @property {number} INT - Integer only.
 * @property {number} FLOAT - Floating-point only.
 */
exports.numericType = as.string.numericType

/**
 * @summary Create string length read operation.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.strlen = (bin) => op('STRLEN', bin, {})

/**
 * @summary Create substring read from codepoint index to end.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {number} start - Codepoint index (negative indexes count from the end).
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.substr = (bin, start) => op('SUBSTR', bin, { start })

/**
 * @summary Create substring read for half-open codepoint range `[start, end)`.
 * @description Read-only; does not change the stored bin. Requires an applicable
 * string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {number} start - Start codepoint index.
 * @param {number} end - Exclusive end codepoint index.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.substrRange = (bin, start, end) => op('SUBSTR_RANGE', bin, { start, end })

/**
 * @summary Read one codepoint at index.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {number} index - Codepoint index.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.charAt = (bin, index) => op('CHAR_AT', bin, { index })

/**
 * @summary Find first occurrence of needle; returns index or -1.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {string} needle - Substring to find.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.find = (bin, needle) => op('FIND', bin, { needle })

/**
 * @summary Find nth occurrence of needle.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {string} needle - Substring to find.
 * @param {number} occurrence - Occurrence number (1-based).
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.findOccurrence = (bin, needle, occurrence) =>
  op('FIND_OCCURRENCE', bin, { needle, occurrence })

/**
 * @summary Test whether the bin contains needle.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {string} needle - Substring to test.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.contains = (bin, needle) => op('CONTAINS', bin, { needle })

/**
 * @summary Test whether the bin starts with prefix.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {string} prefix - Prefix to test.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.startsWith = (bin, prefix) => op('STARTS_WITH', bin, { prefix })

/**
 * @summary Test whether the bin ends with suffix.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {string} suffix - Suffix to test.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.endsWith = (bin, suffix) => op('ENDS_WITH', bin, { suffix })

/**
 * @summary Parse bin contents as integer.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.toInteger = (bin) => op('TO_INTEGER', bin, {})

/**
 * @summary Parse bin contents as double.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.toDouble = (bin) => op('TO_DOUBLE', bin, {})

/**
 * @summary Return UTF-8 byte length of the string bin.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.byteLength = (bin) => op('BYTE_LENGTH', bin, {})

/**
 * @summary Test whether the bin is numeric.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.isNumeric = (bin) => op('IS_NUMERIC', bin, {})

/**
 * @summary Test whether the bin matches a numeric type filter.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {number} numericType - {@link numericType} filter value.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.isNumericType = (bin, numericType) => op('IS_NUMERIC_TYPE', bin, { numericType })

/**
 * @summary Test whether all letters in the bin are uppercase.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.isUpper = (bin) => op('IS_UPPER', bin, {})

/**
 * @summary Test whether all letters in the bin are lowercase.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.isLower = (bin) => op('IS_LOWER', bin, {})

/**
 * @summary Convert string bin to blob bytes.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.toBlob = (bin) => op('TO_BLOB', bin, {})

/**
 * @summary Split string into a list of codepoint strings.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * Use {@link splitSeparator} to split on a delimiter.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.split = (bin) => op('SPLIT', bin, {})

/**
 * @summary Split string on separator into a list.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {string} separator - Delimiter string.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.splitSeparator = (bin, separator) => op('SPLIT_SEPARATOR', bin, { separator })

/**
 * @summary Base64-decode string bin to blob.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.b64Decode = (bin) => op('B64_DECODE', bin, {})

/**
 * @summary Regex match test.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {string} pattern - Regex pattern.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.regexCompare = (bin, pattern) => op('REGEX_COMPARE', bin, { pattern })

/**
 * @summary Regex match test with flags.
 * @description Requires an applicable string bin; errors if the bin is missing or not a string.
 * @param {string} bin - Bin name.
 * @param {string} pattern - Regex pattern.
 * @param {number} flags - {@link regexFlags} bit flags.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.regexCompareFlags = (bin, pattern, flags) =>
  op('REGEX_COMPARE_FLAGS', bin, { pattern, flags })

/**
 * @summary Insert value at codepoint index.
 * @description Splices `value` into the bin at `index`. Negative indexes count
 * from the end. If the bin is missing, creates a new bin.
 * @param {string} bin - Bin name.
 * @param {number} index - Codepoint index.
 * @param {string} value - String to insert.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.insert = (bin, index, value) => op('INSERT', bin, { index, value })

/**
 * @summary Overwrite codepoints starting at index.
 * @description Result may grow when `value` extends past the end. If the bin is
 * missing, creates a new bin.
 * @param {string} bin - Bin name.
 * @param {number} index - Codepoint index.
 * @param {string} value - Replacement string.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.overwrite = (bin, index, value) => op('OVERWRITE', bin, { index, value })

/**
 * @summary Append one string to the bin (`AS_STRING_OP_CONCAT` with one value).
 * @description If the bin is missing, creates a new bin.
 * @param {string} bin - Bin name.
 * @param {string} value - String to append.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.concat = (bin, value) => op('CONCAT', bin, { value })

/**
 * @summary Append each list element to the bin in order.
 * @description If the bin is missing, creates a new bin.
 * @param {string} bin - Bin name.
 * @param {string[]} values - Strings to append.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.concatList = (bin, values) => op('CONCAT_LIST', bin, { values })

/**
 * @summary Unicode-aware append to end of string bin.
 * @description Unlike {@link module:aerospike/operations.append}, uses codepoint
 * semantics and supports policy/ctx. If the bin is missing, creates a new bin.
 * @param {string} bin - Bin name.
 * @param {string} value - String to append.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.append = (bin, value) => op('APPEND', bin, { value })

/**
 * @summary Unicode-aware prepend to start of string bin.
 * @description Unlike {@link module:aerospike/operations.prepend}, uses codepoint
 * semantics and supports policy/ctx. If the bin is missing, creates a new bin.
 * @param {string} bin - Bin name.
 * @param {string} value - String to prepend.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.prepend = (bin, value) => op('PREPEND', bin, { value })

/**
 * @summary Remove half-open codepoint range `[start, end)`.
 * @description If the bin is missing, no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @param {number} start - Start codepoint index.
 * @param {number} end - Exclusive end codepoint index.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.snip = (bin, start, end) => op('SNIP', bin, { start, end })

/**
 * @summary Remove half-open codepoint range `[start, end)`.
 * @deprecated Use {@link snip} (same wire opcode).
 * @param {string} bin - Bin name.
 * @param {number} start - Start codepoint index.
 * @param {number} end - Exclusive end codepoint index.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.snipRange = (bin, start, end) => op('SNIP_RANGE', bin, { start, end })

/**
 * @summary Replace first occurrence of needle with replacement.
 * @description If the bin is missing, no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @param {string} needle - Substring to find.
 * @param {string} replacement - Replacement string.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.replace = (bin, needle, replacement) => op('REPLACE', bin, { needle, replacement })

/**
 * @summary Replace every occurrence of needle with replacement.
 * @description If the bin is missing, no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @param {string} needle - Substring to find.
 * @param {string} replacement - Replacement string.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.replaceAll = (bin, needle, replacement) =>
  op('REPLACE_ALL', bin, { needle, replacement })

/**
 * @summary Uppercase string bin in place.
 * @description If the bin is missing, no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.upper = (bin) => op('UPPER', bin, {})

/**
 * @summary Lowercase string bin in place.
 * @description If the bin is missing, no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.lower = (bin) => op('LOWER', bin, {})

/**
 * @summary Apply locale-independent case folding (lowercase) in place.
 * @description Useful for normalized comparison keys. If the bin is missing,
 * no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.caseFold = (bin) => op('CASE_FOLD', bin, {})

/**
 * @summary Normalize string bin to Unicode NFC in place.
 * @description Already-normalized strings are unchanged. If the bin is missing,
 * no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.normalizeNfc = (bin) => op('NORMALIZE_NFC', bin, {})

/**
 * @summary Trim leading whitespace in place.
 * @description If the bin is missing, no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.trimStart = (bin) => op('TRIM_START', bin, {})

/**
 * @summary Trim trailing whitespace in place.
 * @description If the bin is missing, no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.trimEnd = (bin) => op('TRIM_END', bin, {})

/**
 * @summary Trim leading and trailing whitespace in place.
 * @description If the bin is missing, no-op (record unchanged).
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.trim = (bin) => op('TRIM', bin, {})

/**
 * @summary Pad start until bin reaches target codepoint length.
 * @description No-op when already at or above target length. If the bin is
 * missing, creates a new bin.
 * @param {string} bin - Bin name.
 * @param {number} targetLength - Target length in codepoints.
 * @param {string} padString - Pad string (must not be empty).
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.padStart = (bin, targetLength, padString) =>
  op('PAD_START', bin, { targetLength, padString })

/**
 * @summary Pad end until bin reaches target codepoint length.
 * @description No-op when already at or above target length. If the bin is
 * missing, creates a new bin.
 * @param {string} bin - Bin name.
 * @param {number} targetLength - Target length in codepoints.
 * @param {string} padString - Pad string (must not be empty).
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.padEnd = (bin, targetLength, padString) =>
  op('PAD_END', bin, { targetLength, padString })

/**
 * @summary Repeat bin contents `count` times in place.
 * @description If the bin is missing, creates a new bin (empty string when the
 * server applies the op). Invalid `count` may fail unless
 * {@link writeFlags.NO_FAIL} is set on a supported policy path.
 * @param {string} bin - Bin name.
 * @param {number} count - Repeat count.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.repeat = (bin, count) => op('REPEAT', bin, { count })

/**
 * @summary Replace regex matches in the bin.
 * @description Accepts {@link regexFlags} (e.g. GLOBAL for all matches). Does
 * not use {@link writeFlags} string policy flags. If the bin is missing, no-op
 * (record unchanged).
 * @param {string} bin - Bin name.
 * @param {string} pattern - Regex pattern.
 * @param {string} replacement - Replacement string.
 * @param {number} flags - {@link regexFlags} bit flags.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.regexReplace = (bin, pattern, replacement, flags) =>
  op('REGEX_REPLACE', bin, { pattern, replacement, flags })

/**
 * @summary Coerce bin value to string in place.
 * @description If the bin is missing, no-op (record unchanged). Wrong-type bins
 * may error even when other ops use {@link writeFlags.NO_FAIL}.
 * @param {string} bin - Bin name.
 * @returns {module:aerospike/strings~StringOperation} Operation for {@link Client#operate}.
 */
exports.toString = (bin) => op('TO_STRING', bin, {})

exports.StringOperation = StringOperation
