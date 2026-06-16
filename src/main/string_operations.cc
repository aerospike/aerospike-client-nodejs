/*******************************************************************************
 * Copyright 2026 Aerospike, Inc.
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

#include <node.h>

#include "conversions.h"
#include "log.h"
#include "operations.h"

extern "C" {
#include <aerospike/as_string_operations.h>
}

using namespace v8;

static int get_optional_string_policy(as_string_policy *policy, bool *has_policy,
									  Local<Object> obj, LogInfo *log)
{
	as_string_policy_init(policy);
	if (has_policy != NULL) {
		*has_policy = false;
	}
	Local<Value> maybe_policy =
		Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (maybe_policy->IsUndefined()) {
		return AS_NODE_PARAM_OK;
	}
	if (!maybe_policy->IsObject()) {
		as_v8_error(log, "Type error: policy should be an Object");
		return AS_NODE_PARAM_ERR;
	}
	if (has_policy != NULL) {
		*has_policy = true;
	}
	Local<Object> policy_obj = maybe_policy.As<Object>();
	Local<Value> wf =
		Nan::Get(policy_obj, Nan::New("writeFlags").ToLocalChecked())
			.ToLocalChecked();
	as_string_write_flags flags = AS_STRING_WRITE_FLAGS_DEFAULT;
	if (wf->IsNumber()) {
		flags = (as_string_write_flags)Nan::To<int>(wf).FromJust();
	}
	else if (!wf->IsUndefined()) {
		as_v8_error(log, "Type error: writeFlags should be integer");
		return AS_NODE_PARAM_ERR;
	}
	as_string_policy_set(policy, flags);
	return AS_NODE_PARAM_OK;
}

typedef enum {
	STRING_OP_STRLEN = 0,
	STRING_OP_SUBSTR,
	STRING_OP_SUBSTR_RANGE,
	STRING_OP_CHAR_AT,
	STRING_OP_FIND,
	STRING_OP_FIND_OCCURRENCE,
	STRING_OP_CONTAINS,
	STRING_OP_STARTS_WITH,
	STRING_OP_ENDS_WITH,
	STRING_OP_TO_INTEGER,
	STRING_OP_TO_DOUBLE,
	STRING_OP_BYTE_LENGTH,
	STRING_OP_IS_NUMERIC,
	STRING_OP_IS_NUMERIC_TYPE,
	STRING_OP_IS_UPPER,
	STRING_OP_IS_LOWER,
	STRING_OP_TO_BLOB,
	STRING_OP_SPLIT,
	STRING_OP_SPLIT_SEPARATOR,
	STRING_OP_B64_DECODE,
	STRING_OP_REGEX_COMPARE,
	STRING_OP_REGEX_COMPARE_FLAGS,
	STRING_OP_INSERT,
	STRING_OP_OVERWRITE,
	STRING_OP_CONCAT,
	STRING_OP_CONCAT_LIST,
	STRING_OP_SNIP,
	STRING_OP_SNIP_RANGE,
	STRING_OP_REPLACE,
	STRING_OP_REPLACE_ALL,
	STRING_OP_UPPER,
	STRING_OP_LOWER,
	STRING_OP_CASE_FOLD,
	STRING_OP_NORMALIZE_NFC,
	STRING_OP_TRIM_START,
	STRING_OP_TRIM_END,
	STRING_OP_TRIM,
	STRING_OP_PAD_START,
	STRING_OP_PAD_END,
	STRING_OP_REPEAT,
	STRING_OP_REGEX_REPLACE,
	STRING_OP_TO_STRING,
	STRING_OP_COUNT
} string_op_index;

static const char *string_op_names[STRING_OP_COUNT] = {
	"STRLEN",
	"SUBSTR",
	"SUBSTR_RANGE",
	"CHAR_AT",
	"FIND",
	"FIND_OCCURRENCE",
	"CONTAINS",
	"STARTS_WITH",
	"ENDS_WITH",
	"TO_INTEGER",
	"TO_DOUBLE",
	"BYTE_LENGTH",
	"IS_NUMERIC",
	"IS_NUMERIC_TYPE",
	"IS_UPPER",
	"IS_LOWER",
	"TO_BLOB",
	"SPLIT",
	"SPLIT_SEPARATOR",
	"B64_DECODE",
	"REGEX_COMPARE",
	"REGEX_COMPARE_FLAGS",
	"INSERT",
	"OVERWRITE",
	"CONCAT",
	"CONCAT_LIST",
	"SNIP",
	"SNIP_RANGE",
	"REPLACE",
	"REPLACE_ALL",
	"UPPER",
	"LOWER",
	"CASE_FOLD",
	"NORMALIZE_NFC",
	"TRIM_START",
	"TRIM_END",
	"TRIM",
	"PAD_START",
	"PAD_END",
	"REPEAT",
	"REGEX_REPLACE",
	"TO_STRING",
};

int add_string_op(as_operations *ops, uint32_t opcode, Local<Object> op,
				  LogInfo *log)
{
	opcode = opcode ^ STRING_OPS_OFFSET;
	if (opcode >= STRING_OP_COUNT) {
		as_v8_error(log, "Invalid string operation opcode %u", opcode);
		return AS_NODE_PARAM_ERR;
	}

	char *bin = NULL;
	if (get_string_property(&bin, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_cdt_ctx context;
	bool with_context = false;
	if (get_optional_cdt_context(&context, &with_context, op, "context", log) !=
		AS_NODE_PARAM_OK) {
		free(bin);
		return AS_NODE_PARAM_ERR;
	}
	as_cdt_ctx *ctx_ptr = with_context ? &context : NULL;

	as_string_policy policy;
	bool has_policy = false;
	if (get_optional_string_policy(&policy, &has_policy, op, log) !=
		AS_NODE_PARAM_OK) {
		if (with_context) {
			as_cdt_ctx_destroy(&context);
		}
		free(bin);
		return AS_NODE_PARAM_ERR;
	}
	as_string_policy *pol_ptr = has_policy ? &policy : NULL;

	bool ok = false;

	switch (opcode) {
	case STRING_OP_STRLEN:
		ok = as_operations_string_strlen(ops, bin, ctx_ptr);
		break;
	case STRING_OP_SUBSTR: {
		int64_t start;
		if (get_int64_property(&start, op, "start", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_substr(ops, bin, ctx_ptr, start);
		break;
	}
	case STRING_OP_SUBSTR_RANGE: {
		int64_t start;
		uint64_t length;
		if (get_int64_property(&start, op, "start", log) != AS_NODE_PARAM_OK) {
			break;
		}
		if (get_uint64_property(&length, op, "length", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_substr_range(ops, bin, ctx_ptr, start, length);
		break;
	}
	case STRING_OP_CHAR_AT: {
		int64_t index;
		if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_char_at(ops, bin, ctx_ptr, index);
		break;
	}
	case STRING_OP_FIND: {
		char *needle = NULL;
		if (get_string_property(&needle, op, "needle", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_find(ops, bin, ctx_ptr, needle);
		free(needle);
		break;
	}
	case STRING_OP_FIND_OCCURRENCE: {
		char *needle = NULL;
		int64_t occurrence;
		if (get_string_property(&needle, op, "needle", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		if (get_int64_property(&occurrence, op, "occurrence", log) !=
			AS_NODE_PARAM_OK) {
			free(needle);
			break;
		}
		ok = as_operations_string_find_occurrence(ops, bin, ctx_ptr, needle,
												  occurrence);
		free(needle);
		break;
	}
	case STRING_OP_CONTAINS: {
		char *needle = NULL;
		if (get_string_property(&needle, op, "needle", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_contains(ops, bin, ctx_ptr, needle);
		free(needle);
		break;
	}
	case STRING_OP_STARTS_WITH: {
		char *prefix = NULL;
		if (get_string_property(&prefix, op, "prefix", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_starts_with(ops, bin, ctx_ptr, prefix);
		free(prefix);
		break;
	}
	case STRING_OP_ENDS_WITH: {
		char *suffix = NULL;
		if (get_string_property(&suffix, op, "suffix", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_ends_with(ops, bin, ctx_ptr, suffix);
		free(suffix);
		break;
	}
	case STRING_OP_TO_INTEGER:
		ok = as_operations_string_to_integer(ops, bin, ctx_ptr);
		break;
	case STRING_OP_TO_DOUBLE:
		ok = as_operations_string_to_double(ops, bin, ctx_ptr);
		break;
	case STRING_OP_BYTE_LENGTH:
		ok = as_operations_string_byte_length(ops, bin, ctx_ptr);
		break;
	case STRING_OP_IS_NUMERIC:
		ok = as_operations_string_is_numeric(ops, bin, ctx_ptr);
		break;
	case STRING_OP_IS_NUMERIC_TYPE: {
		int nt;
		if (get_int_property(&nt, op, "numericType", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_is_numeric_type(
			ops, bin, ctx_ptr, (as_string_numeric_type)nt);
		break;
	}
	case STRING_OP_IS_UPPER:
		ok = as_operations_string_is_upper(ops, bin, ctx_ptr);
		break;
	case STRING_OP_IS_LOWER:
		ok = as_operations_string_is_lower(ops, bin, ctx_ptr);
		break;
	case STRING_OP_TO_BLOB:
		ok = as_operations_string_to_blob(ops, bin, ctx_ptr);
		break;
	case STRING_OP_SPLIT:
		ok = as_operations_string_split(ops, bin, ctx_ptr);
		break;
	case STRING_OP_SPLIT_SEPARATOR: {
		char *sep = NULL;
		if (get_string_property(&sep, op, "separator", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_split_separator(ops, bin, ctx_ptr, sep);
		free(sep);
		break;
	}
	case STRING_OP_B64_DECODE:
		ok = as_operations_string_b64_decode(ops, bin, ctx_ptr);
		break;
	case STRING_OP_REGEX_COMPARE: {
		char *pattern = NULL;
		if (get_string_property(&pattern, op, "pattern", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_regex_compare(ops, bin, ctx_ptr, pattern);
		free(pattern);
		break;
	}
	case STRING_OP_REGEX_COMPARE_FLAGS: {
		char *pattern = NULL;
		int flags;
		if (get_string_property(&pattern, op, "pattern", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		if (get_int_property(&flags, op, "flags", log) != AS_NODE_PARAM_OK) {
			free(pattern);
			break;
		}
		ok = as_operations_string_regex_compare_flags(
			ops, bin, ctx_ptr, pattern, (as_string_regex_flags)flags);
		free(pattern);
		break;
	}
	case STRING_OP_INSERT: {
		int64_t index;
		char *value = NULL;
		if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
			break;
		}
		if (get_string_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_insert(ops, bin, ctx_ptr, pol_ptr, index,
										 value);
		free(value);
		break;
	}
	case STRING_OP_OVERWRITE: {
		int64_t index;
		char *value = NULL;
		if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
			break;
		}
		if (get_string_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_overwrite(ops, bin, ctx_ptr, pol_ptr, index,
											value);
		free(value);
		break;
	}
	case STRING_OP_CONCAT: {
		char *value = NULL;
		if (get_string_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_concat(ops, bin, ctx_ptr, pol_ptr, value);
		free(value);
		break;
	}
	case STRING_OP_CONCAT_LIST: {
		as_list *list = NULL;
		if (get_list_property(&list, op, "values", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_concat_list(ops, bin, ctx_ptr, pol_ptr, list);
		as_list_destroy(list);
		break;
	}
	case STRING_OP_SNIP: {
		int64_t start;
		if (get_int64_property(&start, op, "start", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_snip(ops, bin, ctx_ptr, pol_ptr, start);
		break;
	}
	case STRING_OP_SNIP_RANGE: {
		int64_t start, end;
		if (get_int64_property(&start, op, "start", log) != AS_NODE_PARAM_OK) {
			break;
		}
		if (get_int64_property(&end, op, "end", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_snip_range(ops, bin, ctx_ptr, pol_ptr, start,
											 end);
		break;
	}
	case STRING_OP_REPLACE: {
		char *needle = NULL;
		char *replacement = NULL;
		if (get_string_property(&needle, op, "needle", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		if (get_string_property(&replacement, op, "replacement", log) !=
			AS_NODE_PARAM_OK) {
			free(needle);
			break;
		}
		ok = as_operations_string_replace(ops, bin, ctx_ptr, pol_ptr, needle,
										  replacement);
		free(needle);
		free(replacement);
		break;
	}
	case STRING_OP_REPLACE_ALL: {
		char *needle = NULL;
		char *replacement = NULL;
		if (get_string_property(&needle, op, "needle", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		if (get_string_property(&replacement, op, "replacement", log) !=
			AS_NODE_PARAM_OK) {
			free(needle);
			break;
		}
		ok = as_operations_string_replace_all(ops, bin, ctx_ptr, pol_ptr, needle,
											  replacement);
		free(needle);
		free(replacement);
		break;
	}
	case STRING_OP_UPPER:
		ok = as_operations_string_upper(ops, bin, ctx_ptr, pol_ptr);
		break;
	case STRING_OP_LOWER:
		ok = as_operations_string_lower(ops, bin, ctx_ptr, pol_ptr);
		break;
	case STRING_OP_CASE_FOLD:
		ok = as_operations_string_case_fold(ops, bin, ctx_ptr, pol_ptr);
		break;
	case STRING_OP_NORMALIZE_NFC:
		ok = as_operations_string_normalize_nfc(ops, bin, ctx_ptr, pol_ptr);
		break;
	case STRING_OP_TRIM_START:
		ok = as_operations_string_trim_start(ops, bin, ctx_ptr, pol_ptr);
		break;
	case STRING_OP_TRIM_END:
		ok = as_operations_string_trim_end(ops, bin, ctx_ptr, pol_ptr);
		break;
	case STRING_OP_TRIM:
		ok = as_operations_string_trim(ops, bin, ctx_ptr, pol_ptr);
		break;
	case STRING_OP_PAD_START: {
		uint64_t target_length;
		char *pad = NULL;
		if (get_uint64_property(&target_length, op, "targetLength", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		if (get_string_property(&pad, op, "padString", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_pad_start(ops, bin, ctx_ptr, pol_ptr,
											target_length, pad);
		free(pad);
		break;
	}
	case STRING_OP_PAD_END: {
		uint64_t target_length;
		char *pad = NULL;
		if (get_uint64_property(&target_length, op, "targetLength", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		if (get_string_property(&pad, op, "padString", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_pad_end(ops, bin, ctx_ptr, pol_ptr,
										  target_length, pad);
		free(pad);
		break;
	}
	case STRING_OP_REPEAT: {
		uint64_t count;
		if (get_uint64_property(&count, op, "count", log) != AS_NODE_PARAM_OK) {
			break;
		}
		ok = as_operations_string_repeat(ops, bin, ctx_ptr, pol_ptr, count);
		break;
	}
	case STRING_OP_REGEX_REPLACE: {
		char *pattern = NULL;
		char *replacement = NULL;
		int flags;
		if (get_string_property(&pattern, op, "pattern", log) !=
			AS_NODE_PARAM_OK) {
			break;
		}
		if (get_string_property(&replacement, op, "replacement", log) !=
			AS_NODE_PARAM_OK) {
			free(pattern);
			break;
		}
		if (get_int_property(&flags, op, "flags", log) != AS_NODE_PARAM_OK) {
			free(pattern);
			free(replacement);
			break;
		}
		ok = as_operations_string_regex_replace(ops, bin, ctx_ptr, pattern,
												replacement,
												(as_string_regex_flags)flags);
		free(pattern);
		free(replacement);
		break;
	}
	case STRING_OP_TO_STRING:
		ok = as_operations_to_string(ops, bin);
		break;
	default:
		ok = false;
		break;
	}

	if (with_context) {
		as_cdt_ctx_destroy(&context);
	}
	free(bin);
	return ok ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
}

Local<Object> string_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	for (uint32_t i = 0; i < STRING_OP_COUNT; i++) {
		Nan::Set(obj, Nan::New(string_op_names[i]).ToLocalChecked(),
				 Nan::New(STRING_OPS_OFFSET | i));
	}
	return scope.Escape(obj);
}
