/*******************************************************************************
 * Copyright 2013-2020 Aerospike, Inc.
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

#include <cstdint>
#include <node.h>

#include "operations.h"
#include "conversions.h"
#include "log.h"

extern "C" {
#include <aerospike/as_nil.h>
#include <aerospike/as_operations.h>
}

using namespace v8;

int add_write_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int rc = AS_NODE_PARAM_OK;
	Local<Value> v8val = Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked();
	if (is_double_value(v8val)) {
		double val = double_value(v8val);
		as_v8_debug(log, "bin=%s, value=%f", binName, val);
		if (!as_operations_add_write_double(ops, binName, val)) {
			rc = AS_NODE_PARAM_ERR;
		}
	} else if (v8val->IsNumber()) {
		int64_t val = Nan::To<int64_t>(v8val).FromJust();
		as_v8_debug(log, "bin=%s, value=%i", binName, val);
		if (!as_operations_add_write_int64(ops, binName, val)) {
			rc = AS_NODE_PARAM_ERR;
		}
	} else if (v8val->IsString()) {
		char* binVal = strdup(*Nan::Utf8String(v8val));
		as_v8_debug(log, "bin=%s, value=%s", binName, binVal);
		if (!as_operations_add_write_strp(ops, binName, binVal, true)) {
			rc = AS_NODE_PARAM_ERR;
		}
	} else if (node::Buffer::HasInstance(v8val)) {
		int len ;
		uint8_t* data ;
		if ((rc = extract_blob_from_jsobject(&data, &len, v8val.As<Object>(), log)) == AS_NODE_PARAM_OK) {
			as_v8_debug(log, "bin=%s, value=<rawp>, len=%i", binName, len);
			if (!as_operations_add_write_rawp(ops, binName, data, len, true)) {
				rc = AS_NODE_PARAM_ERR;
			}
		}
	} else if (v8val->IsNull()) {
		as_v8_debug(log, "bin=%s, value=<nil>", binName);
		if (!as_operations_add_write(ops, binName, (as_bin_value*) &as_nil)) {
			rc = AS_NODE_PARAM_ERR;
		}
	} else if (is_geojson_value(v8val)) {
		char* jsonstr = geojson_as_string(v8val);
		as_v8_debug(log, "bin=%s, value=%s", binName, jsonstr);
		if (!as_operations_add_write_geojson_strp(ops, binName, jsonstr, true)) {
			rc = AS_NODE_PARAM_ERR;
		}
	} else if (v8val->IsArray()) {
		as_list* list = NULL;
		if ((rc = asval_from_jsvalue((as_val**) &list, v8val, log)) == AS_NODE_PARAM_OK) {
			if (as_v8_debug_enabled(log)) {
				char* list_str = as_val_tostring(list);
				as_v8_debug(log, "bin=%s, value=%s", binName, list_str);
				cf_free(list_str);
			}
			if (!as_operations_add_write(ops, binName, (as_bin_value*) list)) {
				rc = AS_NODE_PARAM_ERR;
			}
		}
	} else if (v8val->IsObject()) {
		as_map* map = NULL;
		if ((rc = asval_from_jsvalue((as_val**) &map, v8val, log)) == AS_NODE_PARAM_OK) {
			if (as_v8_debug_enabled(log)) {
				char* map_str = as_val_tostring(map);
				as_v8_debug(log, "bin=%s, value=%s", binName, map_str);
				cf_free(map_str);
			}
			if (!as_operations_add_write(ops, binName, (as_bin_value*) map)) {
				rc = AS_NODE_PARAM_ERR;
			}
		}
	} else {
		as_v8_debug(log, "Type error in write operation");
		rc = AS_NODE_PARAM_ERR;
	}

	if (binName) free(binName);
	return rc;
}

int add_read_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s", binName);
	as_operations_add_read(ops, binName);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_incr_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> v8val = Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked();
	if (is_double_value(v8val)) {
		double binValue = double_value(v8val);
		as_v8_debug(log, "bin=%s, value=%f", binName, binValue);
		as_operations_add_incr_double(ops, binName, binValue);
		if (binName != NULL) free (binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsNumber()) {
		int64_t binValue = Nan::To<int64_t>(v8val).FromJust();
		as_v8_debug(log, "bin=%s, value=%i", binName, binValue);
		as_operations_add_incr(ops, binName, binValue);
		if (binName != NULL) free (binName);
		return AS_NODE_PARAM_OK;
	} else {
		as_v8_debug(log, "Type error in incr operation");
		if (binName != NULL) free (binName);
		return AS_NODE_PARAM_ERR;
	}
}

int add_prepend_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> v8val = Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked();
	if (v8val->IsString()) {
		char* binVal = strdup(*Nan::Utf8String(v8val));
		as_v8_debug(log, "bin=%s, value=%s", binName, binVal);
		as_operations_add_prepend_strp(ops, binName, binVal, true);
		if (binName) free(binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsObject()) {
		Local<Object> binObj = v8val.As<Object>();
		int len;
		uint8_t* data;
		if (extract_blob_from_jsobject(&data, &len, binObj, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_v8_debug(log, "bin=%s, value=<rawp>, len=%i", binName, len);
		as_operations_add_prepend_rawp(ops, binName, data, len, true);
		if (binName) free(binName);
		return AS_NODE_PARAM_OK;
	} else {
		as_v8_debug(log, "Type error in prepend operation");
		if (binName) free(binName);
		return AS_NODE_PARAM_ERR;
	}
}

int add_append_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> v8val = Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked();
	if (v8val->IsString()) {
		char* binVal = strdup(*Nan::Utf8String(v8val));
		as_v8_debug(log, "bin=%s, value=%s", binName, binVal);
		as_operations_add_append_strp(ops, binName, binVal,true);
		if (binName) free(binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsObject()) {
		Local<Object> binObj = v8val.As<Object>();
		int len ;
		uint8_t* data ;
		if (extract_blob_from_jsobject(&data, &len, binObj, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_v8_debug(log, "bin=%s, value=<rawp>, len=%i", binName, len);
		as_operations_add_append_rawp(ops, binName, data, len, true);
		if (binName) free(binName);
		return AS_NODE_PARAM_OK;
	} else {
		as_v8_debug(log, "Type error in append operation");
		if (binName) free(binName);
		return AS_NODE_PARAM_ERR;
	}
}

int add_touch_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	as_v8_debug(log, "<touch>");
	as_operations_add_touch(ops);
	return AS_NODE_PARAM_OK;
}

int add_delete_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	as_v8_debug(log, "<delete>");
	as_operations_add_delete(ops);
	return AS_NODE_PARAM_OK;
}

typedef int (*Operation) (as_operations* ops, Local<Object> op, LogInfo* log);

typedef struct {
	const char* op_name;
	Operation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{ "WRITE", add_write_op },
	{ "READ", add_read_op },
	{ "INCR", add_incr_op },
	{ "PREPEND", add_prepend_op },
	{ "APPEND", add_append_op },
	{ "TOUCH", add_touch_op },
	{ "DELETE", add_delete_op }
};

int
add_operation(as_operations* ops, int64_t opcode, Local<Object> params, LogInfo* log)
{
	switch (opcode & OPS_MASK) {
		case LIST_OPS_OFFSET:
			return add_list_op(ops, opcode, params, log);
		case MAP_OPS_OFFSET:
			return add_map_op(ops, opcode, params, log);
		case BIT_OPS_OFFSET:
			return add_bit_op(ops, opcode, params, log);
	}

	const ops_table_entry *entry = &ops_table[opcode];
	if (entry) {
		return (entry->op_function)(ops, params, log);
	}
	return AS_NODE_PARAM_ERR;
}

int operations_from_jsarray(as_operations* ops, Local<Array> arr, LogInfo* log)
{
	uint32_t capacity = arr->Length();
	if (capacity == 0) {
		as_v8_error(log, "Operations list is empty");
		return AS_NODE_PARAM_ERR;
	}
	as_v8_detail(log, "Converting operations list: size=%d", capacity);

	int result = AS_NODE_PARAM_OK;
	int64_t op;
	for (uint32_t i = 0; i < capacity; i++) {
		Local<Object> obj = Nan::Get(arr, i).ToLocalChecked().As<Object>();
		setTTL(obj, &ops->ttl, log);
		result = get_int64_property(&op, obj, "op", log);
		if (result == AS_NODE_PARAM_OK) {
			result = add_operation(ops, op, obj, log);
		}
		if (result != AS_NODE_PARAM_OK) {
			as_v8_error(log, "invalid operation [%i] - result: %i", op, result);
			break;
		}
	}

	return result;
}

Local<Object> opcode_values() {
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(), Nan::New(i));
	}

	return scope.Escape(obj);
}
