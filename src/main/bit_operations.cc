/*******************************************************************************
 * Copyright 2019 Aerospike, Inc.
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
#include <aerospike/as_bit_operations.h>
}

using namespace v8;

int
get_optional_bit_policy(as_bit_policy* policy, bool* has_policy, Local<Object> obj, LogInfo* log)
{
	Nan::HandleScope scope;
	as_bit_policy_init(policy);
	if (has_policy != NULL) (*has_policy) = false;
	// FIXME: convert bit policy
	return AS_NODE_PARAM_OK;
}

int
add_bit_resize_op(as_operations* ops, char* bin, as_cdt_ctx* context, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	uint32_t byte_size;
	if (get_uint32_property(&byte_size, op, "byteSize", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_bit_resize_flags flags = AS_BIT_RESIZE_DEFAULT;
	if (get_int_property((int*) &flags, op, "flags", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, byte_size=%i, flags=%i", bin, byte_size, flags);
	as_operations_bit_resize(ops, bin, context, policy, byte_size, flags);
	return AS_NODE_PARAM_OK;
}

typedef int (*BitOperation) (as_operations* ops, char* bin, as_cdt_ctx* context, as_bit_policy* policy, Local<Object> op, LogInfo* log);

typedef struct {
	const char* op_name;
	BitOperation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{ "BIT_RESIZE", add_bit_resize_op },
};

int
add_bit_op(as_operations* ops, int64_t opcode, Local<Object> op, LogInfo* log)
{
	const ops_table_entry *entry = &ops_table[opcode];
	if (!entry) {
		return AS_NODE_PARAM_ERR;
	}

	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context = false;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_policy = false;
	as_bit_policy policy;
	if (get_optional_bit_policy(&policy, &with_policy, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int result = (entry->op_function)(ops, binName, with_context ? &context : NULL, with_policy ? &policy : NULL, op, log);

	free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);

	return result;
}

Local<Object>
bit_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		obj->Set(Nan::New(entry.op_name).ToLocalChecked(), Nan::New(BIT_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}
