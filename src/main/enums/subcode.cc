/*******************************************************************************
 * Copyright 2013-2026 Aerospike, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/

#include <nan.h>
#include <node.h>

extern "C" {
#include <aerospike/as_subcode.h>
}

using namespace v8;

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

// One identifier supplies both the exported name and the C constant.
// "AEROSPIKE_" #__name must stay paired with AS_##__name; a typo fails to compile.
// Public Aerospike.subcode.* short names are assigned in lib/subcode.js.
#define set_code(__obj, __name) set(__obj, "AEROSPIKE_" #__name, AS_##__name)

Local<Object> subcode()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	set_code(obj, ERROR_DETAIL_NONE);
	set_code(obj, ERROR_DETAIL_SUBCODE);
	set_code(obj, ERROR_DETAIL_MESSAGE);
	set_code(obj, ERROR_DETAIL_EXP_TRACE);

	set_code(obj, SUB_NONE);

	set_code(obj, SUB_PARAM_TTL_INVALID);
	set_code(obj, SUB_PARAM_BITS_OFFSET_OUT_OF_RANGE);
	set_code(obj, SUB_PARAM_BITS_SIZE_OUT_OF_RANGE);
	set_code(obj, SUB_PARAM_BITS_RESIZE_EXCEEDED);
	set_code(obj, SUB_PARAM_BIN_COUNT_TOO_LARGE);
	set_code(obj, SUB_PARAM_STRING_CTX_MALFORMED);

	set_code(obj, SUB_UNAVAIL_INITIAL_BALANCE_UNRESOLVED);
	set_code(obj, SUB_UNAVAIL_REPLICA_UNAVAILABLE);

	set_code(obj, SUB_UNSUPP_FEAT_MRT_REQUIRES_STRONG_CONSISTENCY);
	set_code(obj, SUB_UNSUPP_FEAT_GENERIC);

	set_code(obj, SUB_BIN_NOT_FOUND_HLL_CANNOT_CREATE_WITH_OP);

	set_code(obj, SUB_BIN_NAME_COUNT_TOO_LARGE);

	set_code(obj, SUB_FORBID_XDR_FILTER_BLOCKED);
	set_code(obj, SUB_FORBID_SET_COUNT_STOP_WRITES);
	set_code(obj, SUB_FORBID_SET_SIZE_STOP_WRITES);
	set_code(obj, SUB_FORBID_CLOCK_SKEW_STOP_WRITES);
	set_code(obj, SUB_FORBID_REPLACE_CONFLICT_RESOLVING);
	set_code(obj, SUB_FORBID_TRUNCATED);
	set_code(obj, SUB_FORBID_MASKING_POLICY_BLOCKED);
	set_code(obj, SUB_FORBID_DURABILITY_VIOLATION);
	set_code(obj, SUB_FORBID_MASKING_ROLE_VIOLATION);

	set_code(obj, SUB_OPNOT_CDT_INDEX_OUT_OF_BOUNDS);
	set_code(obj, SUB_OPNOT_CDT_RANK_OUT_OF_BOUNDS);
	set_code(obj, SUB_OPNOT_CDT_BOUNDED_LIST_OVERFLOW);
	set_code(obj, SUB_OPNOT_HLL_INDEX_BITS_UNSET);
	set_code(obj, SUB_OPNOT_HLL_CANNOT_REDUCE_INDEX_BITS);
	set_code(obj, SUB_OPNOT_HLL_CANNOT_REDUCE_MINHASH_BITS);
	set_code(obj, SUB_OPNOT_HLL_CANNOT_FOLD_MINHASH);
	set_code(obj, SUB_OPNOT_HLL_FOLD_INDEX_BITS_TOO_LARGE);
	set_code(obj, SUB_OPNOT_HLL_INTERSECT_MINHASH_MISMATCH);
	set_code(obj, SUB_OPNOT_STRING_CONVERSION_FAILED);
	set_code(obj, SUB_OPNOT_STRING_UTF8_INVALID);
	set_code(obj, SUB_OPNOT_STRING_REGEX_LIMIT_EXCEEDED);
	set_code(obj, SUB_OPNOT_STRING_B64_INVALID);

	set_code(obj, SUB_FILTERED_META);
	set_code(obj, SUB_FILTERED_BINS);
	set_code(obj, SUB_FILTERED_META_EVAL_FAILED);
	set_code(obj, SUB_FILTERED_BINS_EVAL_FAILED);

	set_code(obj, SUB_MRT_BLOCKED_RECORD_LOCKED);
	set_code(obj, SUB_MRT_BLOCKED_ID_MISMATCH);

	return scope.Escape(obj);
}
