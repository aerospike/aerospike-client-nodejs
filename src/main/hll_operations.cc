/*******************************************************************************
 * Copyright 2020 Aerospike, Inc.
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
#include <aerospike/as_hll_operations.h>
}

using namespace v8;

bool
get_optional_hll_policy(as_hll_policy* policy, bool* has_policy, Local<Object> obj, LogInfo* log)
{
	Nan::HandleScope scope;
	as_hll_policy_init(policy);

	Local<Value> maybe_policy_obj = Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (maybe_policy_obj->IsUndefined()) {
		if (has_policy != NULL) (*has_policy) = false;
		as_v8_detail(log, "No list policy set - using default policy");
		return true;
	} else if (!maybe_policy_obj->IsObject()) {
		as_v8_error(log, "Type error: policy should be an Object");
		return false;
	}
	if (has_policy != NULL) (*has_policy) = true;
	Local<Object> policy_obj = maybe_policy_obj.As<Object>();

	as_v8_detail(log, "Setting HLL policy");
	return true;
}

bool
add_hll_init_op(as_operations* ops, char* bin, as_cdt_ctx* context, Local<Object> op, LogInfo* log)
{
	int index_bit_count;
	if (get_int_property(&index_bit_count, op, "indexBitCount", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int mh_bit_count;
	if (get_int_property(&mh_bit_count, op, "mhBitCount", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool has_policy = false;
	as_hll_policy policy;
	if (!get_optional_hll_policy(&policy, &has_policy, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, index_bit_count=%i, mh_bit_count=%i, has_policy=%s",
			bin, index_bit_count, mh_bit_count, has_policy ?  "true" : "false");
	return as_operations_hll_init_mh(ops, bin, context, &policy, index_bit_count, mh_bit_count);
}

bool
add_hll_add_op(as_operations* ops, char* bin, as_cdt_ctx* context, Local<Object> op, LogInfo* log)
{
	int index_bit_count;
	if (get_int_property(&index_bit_count, op, "indexBitCount", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int mh_bit_count;
	if (get_int_property(&mh_bit_count, op, "mhBitCount", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool has_policy = false;
	as_hll_policy policy;
	if (!get_optional_hll_policy(&policy, &has_policy, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list* list = NULL;
	if (get_list_property(&list, op, "list", log) != AS_NODE_PARAM_OK) {
		if (list) as_list_destroy(list);
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char* list_str = as_val_tostring(list);
		as_v8_debug(log, "bin=%s, list=%s, index_bit_count=%i, mh_bit_count=%i, has_policy=%s",
				bin, list_str, index_bit_count, mh_bit_count, has_policy ?  "true" : "false");
		cf_free(list_str);
	}
	return as_operations_hll_add_mh(ops, bin, context, &policy, list, index_bit_count, mh_bit_count);
}

bool
add_hll_refresh_count_op(as_operations* ops, char* bin, as_cdt_ctx* context, Local<Object> op, LogInfo* log)
{
	return as_operations_hll_refresh_count(ops, bin, context);
}

bool
add_hll_fold_op(as_operations* ops, char* bin, as_cdt_ctx* context, Local<Object> op, LogInfo* log)
{
	int index_bit_count;
	if (get_int_property(&index_bit_count, op, "indexBitCount", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, index_bit_count=%i", bin, index_bit_count);
	return as_operations_hll_fold(ops, bin, context, index_bit_count);
}

bool
add_hll_get_count_op(as_operations* ops, char* bin, as_cdt_ctx* context, Local<Object> op, LogInfo* log)
{
	return as_operations_hll_get_count(ops, bin, context);
}

bool
add_hll_describe_op(as_operations* ops, char* bin, as_cdt_ctx* context, Local<Object> op, LogInfo* log)
{
	return as_operations_hll_describe(ops, bin, context);
}

typedef bool (*HLLOperation) (as_operations* ops, char* bin, as_cdt_ctx* context, Local<Object> op, LogInfo* log);

typedef struct {
	const char* op_name;
	HLLOperation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{ "INIT", add_hll_init_op },
	{ "ADD", add_hll_add_op },
	{ "REFRESH_COUNT", add_hll_refresh_count_op },
	{ "FOLD", add_hll_fold_op },
	{ "GET_COUNT", add_hll_get_count_op },
	{ "DESCRIBE", add_hll_describe_op }
};

int
add_hll_op(as_operations* ops, uint32_t opcode, Local<Object> op, LogInfo* log)
{
	opcode = opcode ^ HLL_OPS_OFFSET;
	const ops_table_entry *entry = &ops_table[opcode];
	if (!entry) {
		return AS_NODE_PARAM_ERR;
	}

	char* bin = NULL;
	if (get_string_property(&bin, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		free(bin);
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "Adding HyperLogLog operation %s (opcode %i) on bin %s to operations list, %s CDT context",
			entry->op_name, opcode, bin, with_context ? "with" : "without");
	bool success = (entry->op_function)(ops, bin, with_context ? &context : NULL, op, log);

	free(bin);

	return success ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
}

Local<Object>
hll_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(), Nan::New(HLL_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}
