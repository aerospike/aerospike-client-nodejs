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
#define SET_CODE(__obj, __name) set(__obj, "AEROSPIKE_" #__name, AS_##__name)

Local<Object> subcode()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	SET_CODE(obj, ERROR_DETAIL_NONE);
	SET_CODE(obj, ERROR_DETAIL_SUBCODE);
	SET_CODE(obj, ERROR_DETAIL_MESSAGE);
	SET_CODE(obj, ERROR_DETAIL_EXP_TRACE);

	SET_CODE(obj, SUB_NONE);

	SET_CODE(obj, SUB_PARAM_TTL_INVALID);
	SET_CODE(obj, SUB_PARAM_BITS_OFFSET_OUT_OF_RANGE);
	SET_CODE(obj, SUB_PARAM_BITS_SIZE_OUT_OF_RANGE);
	SET_CODE(obj, SUB_PARAM_BITS_RESIZE_EXCEEDED);
	SET_CODE(obj, SUB_PARAM_BIN_COUNT_TOO_LARGE);
	SET_CODE(obj, SUB_PARAM_STRING_CTX_MALFORMED);

	SET_CODE(obj, SUB_UNAVAIL_INITIAL_BALANCE_UNRESOLVED);
	SET_CODE(obj, SUB_UNAVAIL_REPLICA_UNAVAILABLE);

	SET_CODE(obj, SUB_UNSUPP_FEAT_MRT_REQUIRES_STRONG_CONSISTENCY);
	SET_CODE(obj, SUB_UNSUPP_FEAT_GENERIC);

	SET_CODE(obj, SUB_BIN_NOT_FOUND_HLL_CANNOT_CREATE_WITH_OP);

	SET_CODE(obj, SUB_BIN_NAME_COUNT_TOO_LARGE);

	SET_CODE(obj, SUB_FORBID_XDR_FILTER_BLOCKED);
	SET_CODE(obj, SUB_FORBID_SET_COUNT_STOP_WRITES);
	SET_CODE(obj, SUB_FORBID_SET_SIZE_STOP_WRITES);
	SET_CODE(obj, SUB_FORBID_CLOCK_SKEW_STOP_WRITES);
	SET_CODE(obj, SUB_FORBID_REPLACE_CONFLICT_RESOLVING);
	SET_CODE(obj, SUB_FORBID_TRUNCATED);
	SET_CODE(obj, SUB_FORBID_MASKING_POLICY_BLOCKED);
	SET_CODE(obj, SUB_FORBID_DURABILITY_VIOLATION);
	SET_CODE(obj, SUB_FORBID_MASKING_ROLE_VIOLATION);

	SET_CODE(obj, SUB_OPNOT_CDT_INDEX_OUT_OF_BOUNDS);
	SET_CODE(obj, SUB_OPNOT_CDT_RANK_OUT_OF_BOUNDS);
	SET_CODE(obj, SUB_OPNOT_CDT_BOUNDED_LIST_OVERFLOW);
	SET_CODE(obj, SUB_OPNOT_HLL_INDEX_BITS_UNSET);
	SET_CODE(obj, SUB_OPNOT_HLL_CANNOT_REDUCE_INDEX_BITS);
	SET_CODE(obj, SUB_OPNOT_HLL_CANNOT_REDUCE_MINHASH_BITS);
	SET_CODE(obj, SUB_OPNOT_HLL_CANNOT_FOLD_MINHASH);
	SET_CODE(obj, SUB_OPNOT_HLL_FOLD_INDEX_BITS_TOO_LARGE);
	SET_CODE(obj, SUB_OPNOT_HLL_INTERSECT_MINHASH_MISMATCH);
	SET_CODE(obj, SUB_OPNOT_STRING_CONVERSION_FAILED);
	SET_CODE(obj, SUB_OPNOT_STRING_UTF8_INVALID);
	SET_CODE(obj, SUB_OPNOT_STRING_REGEX_LIMIT_EXCEEDED);
	SET_CODE(obj, SUB_OPNOT_STRING_B64_INVALID);

	SET_CODE(obj, SUB_FILTERED_META);
	SET_CODE(obj, SUB_FILTERED_BINS);
	SET_CODE(obj, SUB_FILTERED_META_EVAL_FAILED);
	SET_CODE(obj, SUB_FILTERED_BINS_EVAL_FAILED);

	SET_CODE(obj, SUB_MRT_BLOCKED_RECORD_LOCKED);
	SET_CODE(obj, SUB_MRT_BLOCKED_ID_MISMATCH);

	return scope.Escape(obj);
}
