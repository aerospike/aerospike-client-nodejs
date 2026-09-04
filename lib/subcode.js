// *****************************************************************************
// Copyright 2013-2026 Aerospike, Inc.
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

/**
 * @module aerospike/subcode
 *
 * @description Server error subcode constants.
 *
 * Subcodes are organized by parent status code. A subcode integer is only
 * meaningful paired with its parent {@link module:aerospike/status|status code}.
 * Always dispatch on the `(code, subcode)` pair.
 *
 * For error detail verbosity levels see {@link module:aerospike/errorDetailVerbosity}.
 */

/**
 * No dispatchable subcode. Used when the parent status alone fully identifies
 * the condition. Reserved as 0 across all status families.
 * @const {number}
 */
exports.NONE = as.subcode.AEROSPIKE_SUB_NONE

/**
 * Per-record TTL exceeds the namespace's max-ttl.
 * Paired with {@link module:aerospike/status.ERR_PARAM|ERR_PARAM}.
 * @const {number}
 */
exports.PARAM_TTL_INVALID = as.subcode.AEROSPIKE_SUB_PARAM_TTL_INVALID

/**
 * Bit op offset lands past the blob (or above the proto cap).
 * Paired with {@link module:aerospike/status.ERR_PARAM|ERR_PARAM}.
 * @const {number}
 */
exports.PARAM_BITS_OFFSET_OUT_OF_RANGE =
  as.subcode.AEROSPIKE_SUB_PARAM_BITS_OFFSET_OUT_OF_RANGE

/**
 * Bit op size is out of range (e.g. zero, or too large).
 * Paired with {@link module:aerospike/status.ERR_PARAM|ERR_PARAM}.
 * @const {number}
 */
exports.PARAM_BITS_SIZE_OUT_OF_RANGE =
  as.subcode.AEROSPIKE_SUB_PARAM_BITS_SIZE_OUT_OF_RANGE

/**
 * Blob resize would exceed RECORD_MAX_BLOB_SIZE.
 * Paired with {@link module:aerospike/status.ERR_PARAM|ERR_PARAM}.
 * @const {number}
 */
exports.PARAM_BITS_RESIZE_EXCEEDED =
  as.subcode.AEROSPIKE_SUB_PARAM_BITS_RESIZE_EXCEEDED

/**
 * Write would exceed the per-record bin-count limit.
 * Paired with {@link module:aerospike/status.ERR_PARAM|ERR_PARAM}.
 * @const {number}
 */
exports.PARAM_BIN_COUNT_TOO_LARGE =
  as.subcode.AEROSPIKE_SUB_PARAM_BIN_COUNT_TOO_LARGE

/**
 * String op CTX envelope is malformed (nested `[0xFF, ctx, [sub_op, args…]]` shape).
 * Paired with {@link module:aerospike/status.ERR_PARAM|ERR_PARAM}.
 * @const {number}
 */
exports.PARAM_STRING_CTX_MALFORMED =
  as.subcode.AEROSPIKE_SUB_PARAM_STRING_CTX_MALFORMED

/**
 * Cluster is still resolving initial partition balance at startup.
 * Paired with {@link module:aerospike/status.ERR_CLUSTER|ERR_CLUSTER}.
 * @const {number}
 */
exports.UNAVAIL_INITIAL_BALANCE_UNRESOLVED =
  as.subcode.AEROSPIKE_SUB_UNAVAIL_INITIAL_BALANCE_UNRESOLVED

/**
 * A needed replica is unavailable (likely a partition split).
 * Paired with {@link module:aerospike/status.ERR_CLUSTER|ERR_CLUSTER}.
 * @const {number}
 */
exports.UNAVAIL_REPLICA_UNAVAILABLE =
  as.subcode.AEROSPIKE_SUB_UNAVAIL_REPLICA_UNAVAILABLE

/**
 * MRT attempted against a non-SC (AP) namespace.
 * Paired with {@link module:aerospike/status.ERR_UNSUPPORTED_FEATURE|ERR_UNSUPPORTED_FEATURE}.
 * @const {number}
 */
exports.UNSUPP_FEAT_MRT_REQUIRES_STRONG_CONSISTENCY =
  as.subcode.AEROSPIKE_SUB_UNSUPP_FEAT_MRT_REQUIRES_STRONG_CONSISTENCY

/**
 * Requested feature is unsupported in this context (generic).
 * Paired with {@link module:aerospike/status.ERR_UNSUPPORTED_FEATURE|ERR_UNSUPPORTED_FEATURE}.
 * @const {number}
 */
exports.UNSUPP_FEAT_GENERIC = as.subcode.AEROSPIKE_SUB_UNSUPP_FEAT_GENERIC

/**
 * HLL op needs an existing bin and can't auto-create one.
 * Paired with {@link module:aerospike/status.ERR_BIN_NOT_FOUND|ERR_BIN_NOT_FOUND}.
 * @const {number}
 */
exports.BIN_NOT_FOUND_HLL_CANNOT_CREATE_WITH_OP =
  as.subcode.AEROSPIKE_SUB_BIN_NOT_FOUND_HLL_CANNOT_CREATE_WITH_OP

/**
 * Write would exceed the per-record bin-count limit (UDF path).
 * Paired with {@link module:aerospike/status.ERR_BIN_NAME|ERR_BIN_NAME}.
 * @const {number}
 */
exports.BIN_NAME_COUNT_TOO_LARGE =
  as.subcode.AEROSPIKE_SUB_BIN_NAME_COUNT_TOO_LARGE

/**
 * Write bounced by an XDR ship filter at the destination.
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_XDR_FILTER_BLOCKED =
  as.subcode.AEROSPIKE_SUB_FORBID_XDR_FILTER_BLOCKED

/**
 * Set-level record-count stop-writes limit reached.
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_SET_COUNT_STOP_WRITES =
  as.subcode.AEROSPIKE_SUB_FORBID_SET_COUNT_STOP_WRITES

/**
 * Set-level size stop-writes limit reached.
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_SET_SIZE_STOP_WRITES =
  as.subcode.AEROSPIKE_SUB_FORBID_SET_SIZE_STOP_WRITES

/**
 * Writes stopped due to cluster clock skew.
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_CLOCK_SKEW_STOP_WRITES =
  as.subcode.AEROSPIKE_SUB_FORBID_CLOCK_SKEW_STOP_WRITES

/**
 * REPLACE / CREATE_OR_REPLACE forbidden while resolving conflicts.
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_REPLACE_CONFLICT_RESOLVING =
  as.subcode.AEROSPIKE_SUB_FORBID_REPLACE_CONFLICT_RESOLVING

/**
 * Write forbidden because the set/namespace is mid-truncate.
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_TRUNCATED = as.subcode.AEROSPIKE_SUB_FORBID_TRUNCATED

/**
 * Access blocked by a data-masking policy.
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_MASKING_POLICY_BLOCKED =
  as.subcode.AEROSPIKE_SUB_FORBID_MASKING_POLICY_BLOCKED

/**
 * Non-durable delete forbidden (would violate durability).
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_DURABILITY_VIOLATION =
  as.subcode.AEROSPIKE_SUB_FORBID_DURABILITY_VIOLATION

/**
 * Caller's role lacks unmasked access.
 * Paired with {@link module:aerospike/status.ERR_FAIL_FORBIDDEN|ERR_FAIL_FORBIDDEN}.
 * @const {number}
 */
exports.FORBID_MASKING_ROLE_VIOLATION =
  as.subcode.AEROSPIKE_SUB_FORBID_MASKING_ROLE_VIOLATION

/**
 * List index is outside the current element range.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_CDT_INDEX_OUT_OF_BOUNDS =
  as.subcode.AEROSPIKE_SUB_OPNOT_CDT_INDEX_OUT_OF_BOUNDS

/**
 * Requested rank is past the current population.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_CDT_RANK_OUT_OF_BOUNDS =
  as.subcode.AEROSPIKE_SUB_OPNOT_CDT_RANK_OUT_OF_BOUNDS

/**
 * Insert would exceed an ordered+bounded list's cap.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_CDT_BOUNDED_LIST_OVERFLOW =
  as.subcode.AEROSPIKE_SUB_OPNOT_CDT_BOUNDED_LIST_OVERFLOW

/**
 * HLL op needs index_bits but the sketch has none set.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_HLL_INDEX_BITS_UNSET =
  as.subcode.AEROSPIKE_SUB_OPNOT_HLL_INDEX_BITS_UNSET

/**
 * Union needs to reduce index_bits but folding isn't allowed.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_HLL_CANNOT_REDUCE_INDEX_BITS =
  as.subcode.AEROSPIKE_SUB_OPNOT_HLL_CANNOT_REDUCE_INDEX_BITS

/**
 * Union needs to reduce minhash bits but folding isn't allowed.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_HLL_CANNOT_REDUCE_MINHASH_BITS =
  as.subcode.AEROSPIKE_SUB_OPNOT_HLL_CANNOT_REDUCE_MINHASH_BITS

/**
 * Fold blocked because the sketch carries minhash bits.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_HLL_CANNOT_FOLD_MINHASH =
  as.subcode.AEROSPIKE_SUB_OPNOT_HLL_CANNOT_FOLD_MINHASH

/**
 * Fold target index_bits >= current (fold can only reduce).
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_HLL_FOLD_INDEX_BITS_TOO_LARGE =
  as.subcode.AEROSPIKE_SUB_OPNOT_HLL_FOLD_INDEX_BITS_TOO_LARGE

/**
 * Intersect inputs have mismatched minhash parameters.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_HLL_INTERSECT_MINHASH_MISMATCH =
  as.subcode.AEROSPIKE_SUB_OPNOT_HLL_INTERSECT_MINHASH_MISMATCH

/**
 * String conversion failed.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_STRING_CONVERSION_FAILED =
  as.subcode.AEROSPIKE_SUB_OPNOT_STRING_CONVERSION_FAILED

/**
 * Source blob/string is not valid UTF-8.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_STRING_UTF8_INVALID =
  as.subcode.AEROSPIKE_SUB_OPNOT_STRING_UTF8_INVALID

/**
 * Regex pattern exceeded a server limit.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_STRING_REGEX_LIMIT_EXCEEDED =
  as.subcode.AEROSPIKE_SUB_OPNOT_STRING_REGEX_LIMIT_EXCEEDED

/**
 * Base64 input is malformed.
 * Paired with {@link module:aerospike/status.ERR_OP_NOT_APPLICABLE|ERR_OP_NOT_APPLICABLE}.
 * @const {number}
 */
exports.OPNOT_STRING_B64_INVALID =
  as.subcode.AEROSPIKE_SUB_OPNOT_STRING_B64_INVALID

/**
 * Record filtered out by a metadata-only filter expression.
 * Paired with {@link module:aerospike/status.ERR_FILTERED_OUT|ERR_FILTERED_OUT}.
 * @const {number}
 */
exports.FILTERED_META = as.subcode.AEROSPIKE_SUB_FILTERED_META

/**
 * Record filtered out by a bin-reading filter expression.
 * Paired with {@link module:aerospike/status.ERR_FILTERED_OUT|ERR_FILTERED_OUT}.
 * @const {number}
 */
exports.FILTERED_BINS = as.subcode.AEROSPIKE_SUB_FILTERED_BINS

/**
 * A metadata filter expression failed to evaluate.
 * Paired with {@link module:aerospike/status.ERR_FILTERED_OUT|ERR_FILTERED_OUT}.
 * @const {number}
 */
exports.FILTERED_META_EVAL_FAILED =
  as.subcode.AEROSPIKE_SUB_FILTERED_META_EVAL_FAILED

/**
 * A bin filter expression failed to evaluate.
 * Paired with {@link module:aerospike/status.ERR_FILTERED_OUT|ERR_FILTERED_OUT}.
 * @const {number}
 */
exports.FILTERED_BINS_EVAL_FAILED =
  as.subcode.AEROSPIKE_SUB_FILTERED_BINS_EVAL_FAILED

/**
 * Record is provisionally locked by another MRT.
 * Paired with {@link module:aerospike/status.ERR_MRT_BLOCKED|ERR_MRT_BLOCKED}.
 * @const {number}
 */
exports.MRT_BLOCKED_RECORD_LOCKED =
  as.subcode.AEROSPIKE_SUB_MRT_BLOCKED_RECORD_LOCKED

/**
 * Op belongs to a different MRT than the one holding the lock.
 * Paired with {@link module:aerospike/status.ERR_MRT_BLOCKED|ERR_MRT_BLOCKED}.
 * @const {number}
 */
exports.MRT_BLOCKED_ID_MISMATCH =
  as.subcode.AEROSPIKE_SUB_MRT_BLOCKED_ID_MISMATCH
