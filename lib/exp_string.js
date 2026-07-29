// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
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
// Wire op integers match as_string_op in aerospike/as_string_operations.h
// (passed to as_exp_int after CALL_VOP_START), not Node stringOperations offsets.
//
// CTX vs CDT: string ops use a flat msgpack envelope [0xFF, ctx_list, sub_op, ...]
// for nested strings; do not reuse CDT nested-array ctx packing.
//
// QUOTED pair: replace / replaceAll / regexReplace expression paths require the
// QUOTED wrapper around needle/replacement pairs (see as_exp.h).
// *****************************************************************************

'use strict'

const as = require('./native')
const exp = as.exp
const { intVal, uintVal, rtypeVal, intOrExp } = require('./internal/exp_val_helpers')

/** @enum {number} as_string_op wire values for string virtual calls */
const OP = {
  STRLEN: 0,
  SUBSTR: 1,
  CHAR_AT: 2,
  FIND: 3,
  CONTAINS: 4,
  STARTS_WITH: 5,
  ENDS_WITH: 6,
  TO_INTEGER: 7,
  TO_DOUBLE: 8,
  BYTE_LENGTH: 9,
  IS_NUMERIC: 10,
  IS_UPPER: 11,
  IS_LOWER: 12,
  TO_BLOB: 13,
  SPLIT: 14,
  B64_DECODE: 15,
  REGEX_COMPARE: 16,
  INSERT: 50,
  OVERWRITE: 51,
  CONCAT: 52,
  SNIP: 53,
  REPLACE: 54,
  REPLACE_ALL: 55,
  UPPER: 56,
  LOWER: 57,
  CASE_FOLD: 58,
  NORMALIZE_NFC: 59,
  TRIM_START: 60,
  TRIM_END: 61,
  TRIM: 62,
  PAD_START: 63,
  PAD_END: 64,
  REPEAT: 65,
  REGEX_REPLACE: 66,
  APPEND: 67,
  PREPEND: 68
}

const _int = intVal
const _uint = uintVal
const _rtype = rtypeVal

const _stringReadStart = (rtype, stringOp, nParams) => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(rtype),
  ..._int(exp.sys.CALL_STRING),
  { op: exp.ops.CALL_VOP_START, count: 1 + nParams },
  ..._int(stringOp)
]

const _stringMod = () => [
  { op: exp.ops.CALL, count: 5 },
  ..._rtype(exp.type.STR),
  ..._int(exp.sys.CALL_STRING | exp.sys.FLAG_MODIFY_LOCAL)
]

const _stringModStart = (stringOp, nParams) => [
  ..._stringMod(),
  { op: exp.ops.CALL_VOP_START, count: 1 + nParams },
  ..._int(stringOp)
]

const _quotedList1 = (valueExp) => [
  { op: exp.ops.QUOTE, count: 2 },
  { op: exp.ops.CALL_VOP_START, count: 1 },
  ...valueExp
]

const _quotedPair = (firstExp, secondExp) => [
  { op: exp.ops.QUOTE, count: 2 },
  { op: exp.ops.CALL_VOP_START, count: 2 },
  ...firstExp,
  ...secondExp
]

const _policyFlags = (policy) =>
  _uint(policy && typeof policy.flags === 'number' ? policy.flags : 0)

/**
 * @module aerospike/exp/string
 * @summary String read/modify expressions (Aerospike Server 8.1.3+)
 *
 * @description Mirrors the C client's `as_exp_string_*` macros (`CALL` +
 * `CALL_STRING`). For `operate()` string bin operation helpers, see
 * {@link module:aerospike/strings|aerospike/strings}.
 *
 * #### Write expressions and missing bins
 *
 * Modify expressions that map to the same server string ops follow the same
 * rules as {@link module:aerospike/strings|aerospike/strings}: additive writes
 * (for example append/prepend/insert-style paths) may create a bin when it is
 * missing; in-place transforms (upper, trim, replace, and similar) no-op when
 * the target string is absent. Policy flags on write expressions use
 * `{ flags }` with the same semantics as
 * {@link module:aerospike/strings.writeFlags|strings.writeFlags} where the
 * server accepts them. Wrong-type errors are not suppressed by
 * {@link module:aerospike/strings.writeFlags.NO_FAIL|NO_FAIL}.
 *
 * #### Errors
 *
 * Expression write failures surfaced through {@link Client#operate} respect
 * {@link BasePolicy#errorDetailVerbosity} on {@link OperatePolicy}; inspect
 * {@link AerospikeError#subcode} and the message per
 * {@link module:aerospike/subcode|subcode}.
 *
 * Nested string targets use a flat ctx envelope, not CDT nested-array layout.
 * Multi-op `operate()` on the same bin may return an ordered list of per-op
 * results when the server sets RESPOND_ALL_OPS (same family as MAP/BIT/HLL).
 */

/** @param {import('./exp').AerospikeExp} bin */
const strlen = (bin) => [
  ..._stringReadStart(exp.type.INT, OP.STRLEN, 0),
  ...bin
]

/**
 * Substring read: either from `start` to end of string, or half-open range
 * `[start, end)` in Unicode codepoints (matches `as_exp_string_substr` /
 * `as_exp_string_substr_range`).
 *
 * @param {number|import('./exp').AerospikeExp} start
 * @param {number|import('./exp').AerospikeExp|import('./exp').AerospikeExp} endOrBin
 * @param {import('./exp').AerospikeExp} [bin]
 */
const substr = (start, endOrBin, bin) => {
  if (bin !== undefined) {
    return [
      ..._stringReadStart(exp.type.STR, OP.SUBSTR, 2),
      ...intOrExp(start),
      ...intOrExp(endOrBin),
      ...bin
    ]
  }
  return [
    ..._stringReadStart(exp.type.STR, OP.SUBSTR, 1),
    ...intOrExp(start),
    ...endOrBin
  ]
}

/** @deprecated Use {@link #substr} with three arguments `(start, end, bin)`. */
const substrRange = (start, end, bin) => substr(start, end, bin)

/** @param {number|import('./exp').AerospikeExp} index @param {import('./exp').AerospikeExp} bin */
const charAt = (index, bin) => [
  ..._stringReadStart(exp.type.STR, OP.CHAR_AT, 1),
  ...intOrExp(index),
  ...bin
]

/** @param {string} needle @param {import('./exp').AerospikeExp} bin */
const find = (needle, bin) => [
  ..._stringReadStart(exp.type.INT, OP.FIND, 1),
  { op: exp.ops.VAL_STR, strVal: needle },
  ...bin
]

/** @param {string} needle @param {number|import('./exp').AerospikeExp} occurrence @param {import('./exp').AerospikeExp} bin */
const findOccurrence = (needle, occurrence, bin) => [
  ..._stringReadStart(exp.type.INT, OP.FIND, 2),
  { op: exp.ops.VAL_STR, strVal: needle },
  ...intOrExp(occurrence),
  ...bin
]

/** @param {string} needle @param {import('./exp').AerospikeExp} bin */
const contains = (needle, bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.CONTAINS, 1),
  { op: exp.ops.VAL_STR, strVal: needle },
  ...bin
]

/** @param {string} prefix @param {import('./exp').AerospikeExp} bin */
const startsWith = (prefix, bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.STARTS_WITH, 1),
  { op: exp.ops.VAL_STR, strVal: prefix },
  ...bin
]

/** @param {string} suffix @param {import('./exp').AerospikeExp} bin */
const endsWith = (suffix, bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.ENDS_WITH, 1),
  { op: exp.ops.VAL_STR, strVal: suffix },
  ...bin
]

/** @param {import('./exp').AerospikeExp} bin */
const toInteger = (bin) => [
  ..._stringReadStart(exp.type.INT, OP.TO_INTEGER, 0),
  ...bin
]

/** @param {import('./exp').AerospikeExp} bin */
const toDouble = (bin) => [
  ..._stringReadStart(exp.type.FLOAT, OP.TO_DOUBLE, 0),
  ...bin
]

/** @param {import('./exp').AerospikeExp} bin */
const byteLength = (bin) => [
  ..._stringReadStart(exp.type.INT, OP.BYTE_LENGTH, 0),
  ...bin
]

/** @param {import('./exp').AerospikeExp} bin */
const isNumeric = (bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.IS_NUMERIC, 0),
  ...bin
]

/** @param {number} numericType {@link module:aerospike/strings~strings.numericType} @param {import('./exp').AerospikeExp} bin */
const isNumericType = (numericType, bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.IS_NUMERIC, 1),
  ..._int(numericType),
  ...bin
]

/** @param {import('./exp').AerospikeExp} bin */
const isUpper = (bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.IS_UPPER, 0),
  ...bin
]

/** @param {import('./exp').AerospikeExp} bin */
const isLower = (bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.IS_LOWER, 0),
  ...bin
]

/** @param {import('./exp').AerospikeExp} bin */
const toBlob = (bin) => [
  ..._stringReadStart(exp.type.BLOB, OP.TO_BLOB, 0),
  ...bin
]

/** Splits by Unicode codepoint (one list element per codepoint). Use {@link splitSeparator} for a delimiter. @param {import('./exp').AerospikeExp} bin */
const split = (bin) => [
  ..._stringReadStart(exp.type.LIST, OP.SPLIT, 0),
  ...bin
]

/** @param {string} separator @param {import('./exp').AerospikeExp} bin */
const splitSeparator = (separator, bin) => [
  ..._stringReadStart(exp.type.LIST, OP.SPLIT, 1),
  { op: exp.ops.VAL_STR, strVal: separator },
  ...bin
]

/** @param {import('./exp').AerospikeExp} bin */
const b64Decode = (bin) => [
  ..._stringReadStart(exp.type.BLOB, OP.B64_DECODE, 0),
  ...bin
]

/** @param {string} pattern @param {import('./exp').AerospikeExp} bin */
const regexCompare = (pattern, bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.REGEX_COMPARE, 1),
  { op: exp.ops.VAL_STR, strVal: pattern },
  ...bin
]

/** @param {string} pattern @param {number} flags {@link module:aerospike/strings~strings.regexFlags} @param {import('./exp').AerospikeExp} bin */
const regexCompareFlags = (pattern, flags, bin) => [
  ..._stringReadStart(exp.type.BOOL, OP.REGEX_COMPARE, 2),
  { op: exp.ops.VAL_STR, strVal: pattern },
  ..._int(flags),
  ...bin
]

/**
 * @param {object|null} policy `{ flags }` using {@link module:aerospike/strings~strings.writeFlags}
 * @param {number|import('./exp').AerospikeExp} index
 * @param {string} value
 * @param {import('./exp').AerospikeExp} bin
 */
const insert = (policy, index, value, bin) => [
  ..._stringModStart(OP.INSERT, 3),
  ...intOrExp(index),
  { op: exp.ops.VAL_STR, strVal: value },
  ..._policyFlags(policy),
  ...bin
]

const overwrite = (policy, index, value, bin) => [
  ..._stringModStart(OP.OVERWRITE, 3),
  ...intOrExp(index),
  { op: exp.ops.VAL_STR, strVal: value },
  ..._policyFlags(policy),
  ...bin
]

/**
 * `as_exp_string_concat_list` — second argument is an expression that evaluates
 * to a list of strings (e.g. {@link module:aerospike/exp#list|exp.list}).
 *
 * @param {object|null} policy
 * @param {import('./exp').AerospikeExp} values
 * @param {import('./exp').AerospikeExp} bin
 */
const concatList = (policy, values, bin) => [
  ..._stringModStart(OP.CONCAT, 2),
  ...values,
  ..._policyFlags(policy),
  ...bin
]

/**
 * `as_exp_string_concat` — literal string is auto-wrapped as a quoted list of one
 * string (C `_AS_EXP_QUOTED_LIST_1`). For a list-valued operand use {@link #concatList}.
 *
 * @param {object|null} policy
 * @param {string} value
 * @param {import('./exp').AerospikeExp} bin
 */
const concat = (policy, value, bin) => [
  ..._stringModStart(OP.CONCAT, 2),
  ..._quotedList1([{ op: exp.ops.VAL_STR, strVal: value }]),
  ..._policyFlags(policy),
  ...bin
]

/**
 * Append a single string (Unicode-aware `AS_STRING_OP_APPEND`). Prefer this over
 * {@link #concat} when appending one literal; `concat` is for list-valued payloads.
 *
 * @param {object|null} policy
 * @param {string} value
 * @param {import('./exp').AerospikeExp} bin
 */
const append = (policy, value, bin) => [
  ..._stringModStart(OP.APPEND, 2),
  { op: exp.ops.VAL_STR, strVal: value },
  ..._policyFlags(policy),
  ...bin
]

/**
 * @param {object|null} policy
 * @param {string} value
 * @param {import('./exp').AerospikeExp} bin
 */
const prepend = (policy, value, bin) => [
  ..._stringModStart(OP.PREPEND, 2),
  { op: exp.ops.VAL_STR, strVal: value },
  ..._policyFlags(policy),
  ...bin
]

/**
 * Remove half-open codepoint range `[start, end)` (same as C
 * `as_exp_string_snip`).
 *
 * @param {object|null} policy
 * @param {number|import('./exp').AerospikeExp} start
 * @param {number|import('./exp').AerospikeExp} end
 * @param {import('./exp').AerospikeExp} bin
 */
const snip = (policy, start, end, bin) => [
  ..._stringModStart(OP.SNIP, 3),
  ...intOrExp(start),
  ...intOrExp(end),
  ..._policyFlags(policy),
  ...bin
]

/** @deprecated Use {@link #snip}. */
const snipRange = (policy, start, end, bin) => snip(policy, start, end, bin)

const replace = (policy, needle, replacement, bin) => [
  ..._stringModStart(OP.REPLACE, 2),
  ..._quotedPair(
    [{ op: exp.ops.VAL_STR, strVal: needle }],
    [{ op: exp.ops.VAL_STR, strVal: replacement }]
  ),
  ..._policyFlags(policy),
  ...bin
]

const replaceAll = (policy, needle, replacement, bin) => [
  ..._stringModStart(OP.REPLACE_ALL, 2),
  ..._quotedPair(
    [{ op: exp.ops.VAL_STR, strVal: needle }],
    [{ op: exp.ops.VAL_STR, strVal: replacement }]
  ),
  ..._policyFlags(policy),
  ...bin
]

const upper = (policy, bin) => [
  ..._stringModStart(OP.UPPER, 1),
  ..._policyFlags(policy),
  ...bin
]

const lower = (policy, bin) => [
  ..._stringModStart(OP.LOWER, 1),
  ..._policyFlags(policy),
  ...bin
]

const caseFold = (policy, bin) => [
  ..._stringModStart(OP.CASE_FOLD, 1),
  ..._policyFlags(policy),
  ...bin
]

const normalizeNfc = (policy, bin) => [
  ..._stringModStart(OP.NORMALIZE_NFC, 1),
  ..._policyFlags(policy),
  ...bin
]

const trimStart = (policy, bin) => [
  ..._stringModStart(OP.TRIM_START, 1),
  ..._policyFlags(policy),
  ...bin
]

const trimEnd = (policy, bin) => [
  ..._stringModStart(OP.TRIM_END, 1),
  ..._policyFlags(policy),
  ...bin
]

const trim = (policy, bin) => [
  ..._stringModStart(OP.TRIM, 1),
  ..._policyFlags(policy),
  ...bin
]

const padStart = (policy, targetLength, padString, bin) => [
  ..._stringModStart(OP.PAD_START, 3),
  ...intOrExp(targetLength),
  { op: exp.ops.VAL_STR, strVal: padString },
  ..._policyFlags(policy),
  ...bin
]

const padEnd = (policy, targetLength, padString, bin) => [
  ..._stringModStart(OP.PAD_END, 3),
  ...intOrExp(targetLength),
  { op: exp.ops.VAL_STR, strVal: padString },
  ..._policyFlags(policy),
  ...bin
]

const repeat = (policy, count, bin) => [
  ..._stringModStart(OP.REPEAT, 2),
  ...intOrExp(count),
  ..._policyFlags(policy),
  ...bin
]

/**
 * Matches `as_exp_string_regex_replace` expansion in as_exp.h (policy flags
 * uint after the quoted pair). `flags` is part of the public signature for
 * API symmetry with the C macro parameters; wire layout follows the C client.
 *
 * @param {object|null} policy
 * @param {string} pattern
 * @param {string} replacement
 * @param {number} _flags regex flags ({@link module:aerospike/strings~strings.regexFlags}) — reserved; wire follows C `as_exp_string_regex_replace`
 * @param {import('./exp').AerospikeExp} bin
 */
const regexReplace = (policy, pattern, replacement, _flags, bin) => [
  ..._stringModStart(OP.REGEX_REPLACE, 2),
  ..._quotedPair(
    [{ op: exp.ops.VAL_STR, strVal: pattern }],
    [{ op: exp.ops.VAL_STR, strVal: replacement }]
  ),
  ..._policyFlags(policy),
  ...bin
]

/** Matches `as_exp_to_string` in as_exp.h (opcode TO_STRING, count 2). */
const toString = (bin) => [
  { op: exp.ops.TO_STRING, count: 2 },
  ...bin
]

module.exports = {
  strlen,
  substr,
  substrRange,
  charAt,
  find,
  findOccurrence,
  contains,
  startsWith,
  endsWith,
  toInteger,
  toDouble,
  byteLength,
  isNumeric,
  isNumericType,
  isUpper,
  isLower,
  toBlob,
  split,
  splitSeparator,
  b64Decode,
  regexCompare,
  regexCompareFlags,
  insert,
  overwrite,
  concat,
  concatList,
  append,
  prepend,
  snip,
  snipRange,
  replace,
  replaceAll,
  upper,
  lower,
  caseFold,
  normalizeNfc,
  trimStart,
  trimEnd,
  trim,
  padStart,
  padEnd,
  repeat,
  regexReplace,
  toString
}
