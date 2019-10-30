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

	Local<Value> maybe_policy_obj = Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (maybe_policy_obj->IsUndefined()) {
		if (has_policy != NULL) (*has_policy) = false;
		as_v8_detail(log, "No bitwise policy set - using default policy");
		return AS_NODE_PARAM_OK;
	} else if (!maybe_policy_obj->IsObject()) {
		as_v8_error(log, "Type error: policy should be an Object");
		return AS_NODE_PARAM_ERR;
	}
	if (has_policy != NULL) (*has_policy) = true;
	Local<Object> policy_obj = maybe_policy_obj.As<Object>();

	as_bit_write_flags write_flags;
	Local<Value> value = Nan::Get(policy_obj, Nan::New("writeFlags").ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		write_flags = (as_bit_write_flags) Nan::To<int>(value).FromJust();
	} else if (value->IsUndefined()) {
		write_flags = AS_BIT_WRITE_DEFAULT;
	} else {
		as_v8_error(log, "Type error: writeFlags should be integer");
		return AS_NODE_PARAM_ERR;
	}
	as_bit_policy_set_write_flags(policy, write_flags);

	as_v8_debug(log, "Setting bitwise policy");
	return AS_NODE_PARAM_OK;
}

bool
add_bit_resize_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
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
	return as_operations_bit_resize(ops, bin, NULL, policy, size, flags);
}

bool
add_bit_insert_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
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
	bool success = as_operations_bit_insert(ops, bin, NULL, policy, offset, size, value);

	free(value);
	return success;
}

typedef bool (*AsBitWrite) (as_operations* ops, const char* bin, as_cdt_ctx* ctx, as_bit_policy* policy,
		int byte_offset, uint32_t byte_size);

bool
add_bit_write_op(as_operations* ops, AsBitWrite write_op, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
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
	return (*write_op)(ops, bin, NULL, policy, offset, size);
}

bool
add_bit_remove_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_write_op(ops, as_operations_bit_remove, bin, policy, op, log);
}

typedef bool (*AsBitByteMath) (as_operations* ops, const char* bin, as_cdt_ctx* ctx, as_bit_policy* policy,
		int bit_offset, uint32_t bit_size, uint32_t value_byte_size, uint8_t* value);

bool
add_bit_byte_math_op(as_operations* ops, AsBitByteMath byte_math_op, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	int bit_offset;
	if (get_int_property(&bit_offset, op, "bitOffset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t bit_size;
	if (get_uint32_property(&bit_size, op, "bitSize", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint8_t* value;
	int value_byte_size;
	if (get_bytes_property(&value, &value_byte_size, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, bit_offset=%i, bit_size=%i", bin, bit_offset, bit_size);
	bool success = (*byte_math_op)(ops, bin, NULL, policy, bit_offset, bit_size, value_byte_size, value);

	free(value);
	return success;
}

bool
add_bit_set_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_byte_math_op(ops, as_operations_bit_set, bin, policy, op, log);
}

bool
add_bit_or_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_byte_math_op(ops, as_operations_bit_or, bin, policy, op, log);
}

bool
add_bit_xor_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_byte_math_op(ops, as_operations_bit_xor, bin, policy, op, log);
}

bool
add_bit_and_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_byte_math_op(ops, as_operations_bit_and, bin, policy, op, log);
}

bool
add_bit_not_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_write_op(ops, as_operations_bit_not, bin, policy, op, log);
}

typedef bool (*AsBitShift) (as_operations* ops, const char* bin, as_cdt_ctx* ctx, as_bit_policy* policy,
		int bit_offset, uint32_t bit_size, uint32_t shift);

bool
add_bit_shift_op(as_operations* ops, AsBitShift shift_op, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	int bit_offset;
	if (get_int_property(&bit_offset, op, "bitOffset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t bit_size;
	if (get_uint32_property(&bit_size, op, "bitSize", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t shift;
	if (get_uint32_property(&shift, op, "shift", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, bit_offset=%i, bit_size=%i, shift=%i", bin, bit_offset, bit_size, shift);
	return (*shift_op)(ops, bin, NULL, policy, bit_offset, bit_size, shift);
}


bool
add_bit_lshift_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_shift_op(ops, as_operations_bit_lshift, bin, policy, op, log);
}

bool
add_bit_rshift_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_shift_op(ops, as_operations_bit_rshift, bin, policy, op, log);
}

typedef bool (*AsBitMath) (as_operations* ops, const char* bin, as_cdt_ctx* ctx, as_bit_policy* policy,
		int bit_offset, uint32_t bit_size, int64_t value, bool sign, as_bit_overflow_action action);

bool
add_bit_math_op(as_operations* ops, AsBitMath math_op, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	int bit_offset;
	if (get_int_property(&bit_offset, op, "bitOffset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t bit_size;
	if (get_uint32_property(&bit_size, op, "bitSize", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int64_t value;
	if (get_int64_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool sign;
	if (get_bool_property(&sign, op, "sign", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_bit_overflow_action action = AS_BIT_OVERFLOW_FAIL;
	if (get_int_property((int*) &action, op, "overflowAction", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, bit_offset=%i, bit_size=%i, value=%i, sign=%i, action=%i", bin, bit_offset, bit_size, value, sign, action);
	return (*math_op)(ops, bin, NULL, policy, bit_offset, bit_size, value, sign, action);
}

bool
add_bit_add_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_math_op(ops, as_operations_bit_add, bin, policy, op, log);
}

bool
add_bit_subtract_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_math_op(ops, as_operations_bit_subtract, bin, policy, op, log);
}

bool
add_bit_set_int_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	int bit_offset;
	if (get_int_property(&bit_offset, op, "bitOffset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t bit_size;
	if (get_uint32_property(&bit_size, op, "bitSize", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int64_t value;
	if (get_int64_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, bit_offset=%i, bit_size=%i, value=%i", bin, bit_offset, bit_size, value);
	return as_operations_bit_set_int(ops, bin, NULL, policy, bit_offset, bit_size, value);
}

typedef bool (*AsBitRead) (as_operations* ops, const char* bin, as_cdt_ctx* ctx,
		int bit_offset, uint32_t bit_size);

bool
add_bit_read_op(as_operations* ops, AsBitRead read_op, char* bin, Local<Object> op, LogInfo* log)
{
	int bit_offset;
	if (get_int_property(&bit_offset, op, "bitOffset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t bit_size;
	if (get_uint32_property(&bit_size, op, "bitSize", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, bit_offset=%i, bit_size=%i", bin, bit_offset, bit_size);
	return (*read_op)(ops, bin, NULL, bit_offset, bit_size);
}

bool
add_bit_get_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_read_op(ops, as_operations_bit_get, bin, op, log);
}

bool
add_bit_count_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_read_op(ops, as_operations_bit_count, bin, op, log);
}

typedef bool (*AsBitScan) (as_operations* ops, const char* bin, as_cdt_ctx* ctx,
		int bit_offset, uint32_t bit_size, bool value);

bool
add_bit_scan_op(as_operations* ops, AsBitScan scan_op, char* bin, Local<Object> op, LogInfo* log)
{
	int bit_offset;
	if (get_int_property(&bit_offset, op, "bitOffset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t bit_size;
	if (get_uint32_property(&bit_size, op, "bitSize", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool value;
	if (get_bool_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, bit_offset=%i, bit_size=%i, value=%i", bin, bit_offset, bit_size, value);
	return (*scan_op)(ops, bin, NULL, bit_offset, bit_size, value);
}

bool
add_bit_lscan_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_scan_op(ops, as_operations_bit_rscan, bin, op, log);
}

bool
add_bit_rscan_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	return add_bit_scan_op(ops, as_operations_bit_rscan, bin, op, log);
}

bool
add_bit_get_int_op(as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log)
{
	int bit_offset;
	if (get_int_property(&bit_offset, op, "bitOffset", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t bit_size;
	if (get_uint32_property(&bit_size, op, "bitSize", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool sign;
	if (get_bool_property(&sign, op, "sign", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "bin=%s, bit_offset=%i, bit_size=%i, sign=%i", bin, bit_offset, bit_size, sign);
	return as_operations_bit_get_int(ops, bin, NULL, bit_offset, bit_size, sign);
}

typedef bool (*BitOperation) (as_operations* ops, char* bin, as_bit_policy* policy, Local<Object> op, LogInfo* log);

typedef struct {
	const char* op_name;
	BitOperation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{ "BIT_RESIZE", add_bit_resize_op },
	{ "BIT_INSERT", add_bit_insert_op },
	{ "BIT_REMOVE", add_bit_remove_op },
	{ "BIT_SET", add_bit_set_op },
	{ "BIT_OR", add_bit_or_op },
	{ "BIT_XOR", add_bit_xor_op },
	{ "BIT_AND", add_bit_and_op },
	{ "BIT_NOT", add_bit_not_op },
	{ "BIT_LSHIFT", add_bit_lshift_op },
	{ "BIT_RSHIFT", add_bit_rshift_op },
	{ "BIT_ADD", add_bit_add_op },
	{ "BIT_SUBTRACT", add_bit_subtract_op },
	{ "BIT_SET_INT", add_bit_set_int_op },
	{ "BIT_GET", add_bit_get_op },
	{ "BIT_LSCAN", add_bit_lscan_op },
	{ "BIT_RSCAN", add_bit_rscan_op },
	{ "BIT_GET_INT", add_bit_get_int_op }
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

	bool with_policy = false;
	as_bit_policy policy;
	if (get_optional_bit_policy(&policy, &with_policy, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "Adding bitwise operation %s (opcode %i) on bin %s to operations list - policy? %i",
			entry->op_name, opcode, binName, with_policy);
	bool success = (entry->op_function)(ops, binName, with_policy ? &policy : NULL, op, log);

	free(binName);

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
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(), Nan::New(BIT_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}
