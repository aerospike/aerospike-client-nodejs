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
	as_v8_debug(log, "Setting bit policy");
	return AS_NODE_PARAM_OK;
}

bool
add_bit_resize_op(as_operations* ops, char* bin, as_cdt_ctx* context, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	uint32_t size;
	if (get_uint32_property(&size, op, "size", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_bit_resize_flags flags = AS_BIT_RESIZE_DEFAULT;
	if (get_int_property((int*) &flags, op, "flags", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, size=%i, flags=%i", bin, size, flags);
	return as_operations_bit_resize(ops, bin, context, policy, size, flags);
}

bool
add_bit_insert_op(as_operations* ops, char* bin, as_cdt_ctx* context, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	int offset;
	if (get_int_property(&offset, op, "offset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint8_t* value;
	int size;
	if (get_bytes_property(&value, &size, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, offset=%i, size=%i", bin, offset, size);
	bool success = as_operations_bit_insert(ops, bin, context, policy, offset, size, value);

	free(value);
	return success;
}

bool
add_bit_remove_op(as_operations* ops, char* bin, as_cdt_ctx* context, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	int offset;
	if (get_int_property(&offset, op, "offset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t size;
	if (get_uint32_property(&size, op, "size", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, offset=%i, size=%i", bin, offset, size);
	return as_operations_bit_remove(ops, bin, context, policy, offset, size);
}

typedef bool (*BitOperation) (as_operations* ops, char* bin, as_cdt_ctx* context, as_bit_policy* policy, Local<Object> op, LogInfo* log);

typedef struct {
	const char* op_name;
	BitOperation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{ "BIT_RESIZE", add_bit_resize_op },
	{ "BIT_INSERT", add_bit_insert_op },
	{ "BIT_REMOVE", add_bit_remove_op }
};

int
add_bit_op(as_operations* ops, int64_t opcode, Local<Object> op, LogInfo* log)
{
	opcode = opcode ^ BIT_OPS_OFFSET;
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

	as_v8_debug(log, "Adding bitwise operation %s (opcode %i) on bin %s to operations list - context? %i, policy? %i",
			entry->op_name, opcode, binName, with_context, with_policy);
	bool success = (entry->op_function)(ops, binName, with_context ? &context : NULL, with_policy ? &policy : NULL, op, log);

	free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);

	return success ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
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
