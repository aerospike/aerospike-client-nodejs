/*******************************************************************************
 * Copyright 2013-2021 Aerospike, Inc.
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
#include <aerospike/as_nil.h>
#include <aerospike/as_operations.h>
}

using namespace v8;

bool add_write_op(as_operations *ops, const char *bin, Local<Object> obj,
				  LogInfo *log)
{
	Local<Value> v8val =
		Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked();
	if (is_double_value(v8val)) {
		double val = double_value(v8val);
		as_v8_debug(log, "value=%f", val);
		return as_operations_add_write_double(ops, bin, val);
	}
	else if (v8val->IsNumber()) {
		int64_t val = Nan::To<int64_t>(v8val).FromJust();
		as_v8_debug(log, "value=%i", val);
		return as_operations_add_write_int64(ops, bin, val);
	}
	else if (v8val->IsBoolean()) {
		bool val = Nan::To<bool>(v8val).FromJust();
		as_v8_debug(log, "value=%i", val);
		return as_operations_add_write(
			ops, bin, (as_bin_value *)(val ? &as_true : &as_false));
	}
	else if (v8val->IsString()) {
		char *val = strdup(*Nan::Utf8String(v8val));
		as_v8_debug(log, "value=%s", val);
		return as_operations_add_write_strp(ops, bin, val, true);
	}
	else if (node::Buffer::HasInstance(v8val)) {
		int len = 0;
		uint8_t *data = NULL;
		if (extract_blob_from_jsobject(&data, &len, v8val.As<Object>(), log) !=
			AS_NODE_PARAM_OK) {
			return false;
		}
		as_v8_debug(log, "value=<rawp>, len=%i", len);
		return as_operations_add_write_rawp(ops, bin, data, len, true);
	}
	else if (v8val->IsNull()) {
		as_v8_debug(log, "value=<nil>");
		return as_operations_add_write(ops, bin, (as_bin_value *)&as_nil);
	}
	else if (is_geojson_value(v8val)) {
		char *jsonstr = geojson_as_string(v8val);
		as_v8_debug(log, "value=%s", jsonstr);
		return as_operations_add_write_geojson_strp(ops, bin, jsonstr, true);
	}
	else if (v8val->IsArray()) {
		as_list *list = NULL;
		if (asval_from_jsvalue((as_val **)&list, v8val, log) !=
			AS_NODE_PARAM_OK) {
			return false;
		}
		if (as_v8_debug_enabled(log)) {
			char *list_str = as_val_tostring(list);
			as_v8_debug(log, "value=%s", list_str);
			cf_free(list_str);
		}
		return as_operations_add_write(ops, bin, (as_bin_value *)list);
	}
	else if (v8val->IsObject()) {
		as_map *map = NULL;
		if (asval_from_jsvalue((as_val **)&map, v8val, log) !=
			AS_NODE_PARAM_OK) {
			return false;
		}
		if (as_v8_debug_enabled(log)) {
			char *map_str = as_val_tostring(map);
			as_v8_debug(log, "value=%s", map_str);
			cf_free(map_str);
		}
		return as_operations_add_write(ops, bin, (as_bin_value *)map);
	}
	else {
		as_v8_error(log, "Type error in write operation");
		return false;
	}
}

bool add_read_op(as_operations *ops, const char *bin, Local<Object> obj,
				 LogInfo *log)
{
	return as_operations_add_read(ops, bin);
}

bool add_incr_op(as_operations *ops, const char *bin, Local<Object> obj,
				 LogInfo *log)
{
	Local<Value> v8val =
		Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked();
	if (is_double_value(v8val)) {
		double binValue = double_value(v8val);
		as_v8_debug(log, "value=%f", binValue);
		return as_operations_add_incr_double(ops, bin, binValue);
	}
	else if (v8val->IsNumber()) {
		int64_t binValue = Nan::To<int64_t>(v8val).FromJust();
		as_v8_debug(log, "value=%i", binValue);
		return as_operations_add_incr(ops, bin, binValue);
	}
	else {
		as_v8_error(log, "Type error in incr operation");
		return false;
	}
}

bool add_prepend_op(as_operations *ops, const char *bin, Local<Object> obj,
					LogInfo *log)
{
	Local<Value> v8val =
		Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked();
	if (v8val->IsString()) {
		char *binVal = strdup(*Nan::Utf8String(v8val));
		as_v8_debug(log, "value=%s", binVal);
		return as_operations_add_prepend_strp(ops, bin, binVal, true);
	}
	else if (v8val->IsObject()) {
		Local<Object> binObj = v8val.As<Object>();
		int len = 0;
		uint8_t *data = NULL;
		if (extract_blob_from_jsobject(&data, &len, binObj, log) !=
			AS_NODE_PARAM_OK) {
			return false;
		}
		as_v8_debug(log, "value=<rawp>, len=%i", len);
		return as_operations_add_prepend_rawp(ops, bin, data, len, true);
	}
	else {
		as_v8_error(log, "Type error in prepend operation");
		return false;
	}
}

bool add_append_op(as_operations *ops, const char *bin, Local<Object> obj,
				   LogInfo *log)
{
	Local<Value> v8val =
		Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked();
	if (v8val->IsString()) {
		char *binVal = strdup(*Nan::Utf8String(v8val));
		as_v8_debug(log, "value=%s", binVal);
		return as_operations_add_append_strp(ops, bin, binVal, true);
	}
	else if (v8val->IsObject()) {
		Local<Object> binObj = v8val.As<Object>();
		int len = 0;
		uint8_t *data = NULL;
		if (extract_blob_from_jsobject(&data, &len, binObj, log) !=
			AS_NODE_PARAM_OK) {
			return false;
		}
		as_v8_debug(log, "value=<rawp>, len=%i", len);
		return as_operations_add_append_rawp(ops, bin, data, len, true);
	}
	else {
		as_v8_error(log, "Type error in append operation");
		return false;
	}
}

bool add_touch_op(as_operations *ops, const char *bin, Local<Object> obj,
				  LogInfo *log)
{
	setTTL(obj, &ops->ttl, log);
	as_v8_debug(log, "<touch>");
	return as_operations_add_touch(ops);
}

bool add_delete_op(as_operations *ops, const char *bin, Local<Object> obj,
				   LogInfo *log)
{
	as_v8_debug(log, "<delete>");
	return as_operations_add_delete(ops);
}

typedef bool (*Operation)(as_operations *ops, const char *bin, Local<Object> op,
						  LogInfo *log);

typedef struct {
	const char *op_name;
	Operation op_function;
	bool needs_bin;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{"WRITE", add_write_op, true},	 {"READ", add_read_op, true},
	{"INCR", add_incr_op, true},	 {"PREPEND", add_prepend_op, true},
	{"APPEND", add_append_op, true}, {"TOUCH", add_touch_op, false},
	{"DELETE", add_delete_op, false}};

int add_scalar_op(as_operations *ops, uint32_t opcode, Local<Object> op,
				  LogInfo *log)
{
	opcode = opcode ^ SCALAR_OPS_OFFSET;
	const ops_table_entry *entry = &ops_table[opcode];
	if (!entry) {
		return AS_NODE_PARAM_ERR;
	}

	char *bin = NULL;
	if (entry->needs_bin) {
		if (get_string_property(&bin, op, "bin", log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}
	else {
		bin = (char *)"n/a";
	}

	as_v8_debug(
		log,
		"Adding scalar operation %s (opcode %i) on bin %s to operations list",
		entry->op_name, opcode, bin);
	bool success = (entry->op_function)(ops, bin, op, log);

	if (entry->needs_bin)
		free(bin);

	return success ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
}

Local<Object> scalar_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(),
				 Nan::New(SCALAR_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}
