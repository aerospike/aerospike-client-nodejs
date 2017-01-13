/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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

extern "C" {
	#include <aerospike/as_operations.h>
	#include <aerospike/as_list_operations.h>
	#include <aerospike/as_map_operations.h>
	#include <aerospike/as_nil.h>
}

#include <node.h>

#include "operations.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

int get_map_policy(as_map_policy* policy, Local<Object> obj, LogInfo* log)
{
	Nan::HandleScope scope;
	as_map_policy_init(policy);
	Local<Value> maybe_policy_obj = obj->Get(Nan::New("policy").ToLocalChecked());
	if (maybe_policy_obj->IsUndefined()) {
		as_v8_detail(log, "No map policy set - using default policy");
		return AS_NODE_PARAM_OK;
	} else if (!maybe_policy_obj->IsObject()) {
		as_v8_error(log, "Type error: policy should be an Object");
		return AS_NODE_PARAM_ERR;
	}
	Local<Object> policy_obj = maybe_policy_obj->ToObject();

	as_map_order order;
	Local<Value> value = policy_obj->Get(Nan::New("order").ToLocalChecked());
	if (value->IsNumber()) {
		order = (as_map_order) value->NumberValue();
	} else if (value->IsUndefined()) {
		order = AS_MAP_UNORDERED;
	} else {
		as_v8_error(log, "Type error: order should be integer");
		return AS_NODE_PARAM_ERR;
	}

	as_map_write_mode write_mode;
	value = policy_obj->Get(Nan::New("writeMode").ToLocalChecked());
	if (value->IsNumber()) {
		write_mode = (as_map_write_mode) value->NumberValue();
	} else if (value->IsUndefined()) {
		write_mode = AS_MAP_UPDATE;
	} else {
		as_v8_error(log, "Type error: write_mode should be integer");
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy_set(policy, order, write_mode);
	return AS_NODE_PARAM_OK;
}

int get_map_return_type(as_map_return_type* return_type, Local<Object> obj, LogInfo* log)
{
	Nan::HandleScope scope;
	Local<Value> value = obj->Get(Nan::New("returnType").ToLocalChecked());
	if (value->IsNumber()) {
		(*return_type) = (as_map_return_type) value->NumberValue();
	} else if (value->IsUndefined()) {
		(*return_type) = AS_MAP_RETURN_NONE;
	} else {
		as_v8_error(log, "Type error: return_type should be integer");
		return AS_NODE_PARAM_ERR;
	}
	as_v8_detail(log, "Map return type: %i", (*return_type));
	return AS_NODE_PARAM_OK;
}

int add_write_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}
	as_v8_detail(log, "write operation on bin : %s", binName);

	Local<Value> v8val = obj->Get(Nan::New("value").ToLocalChecked());
	if (is_double_value(v8val)) {
		double val = double_value(v8val);
		as_v8_detail(log, "double value to be written %f", val);
		as_operations_add_write_double(ops, binName, val);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsNumber()) {
		int64_t val = v8val->IntegerValue();
		as_v8_detail(log, "integer value to be written %d", val);
		as_operations_add_write_int64(ops, binName, val);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsString()) {
		char* binVal = strdup(*String::Utf8Value(v8val));
		as_v8_detail(log, "String value to be written %s", binVal);
		as_operations_add_write_str(ops, binName, binVal);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsObject()) {
		Local<Object> binObj = v8val->ToObject();
		int len ;
		uint8_t* data ;
		if (extract_blob_from_jsobject(&data, &len, binObj, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_v8_detail(log, "Blob value to be written: %u", data);
		as_operations_add_write_rawp(ops, binName, data, len, true);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsNull()) {
		as_v8_detail(log, "Writing null value");
		as_operations_add_write(ops, binName, (as_bin_value*) &as_nil);
		return AS_NODE_PARAM_OK;
	} else {
		as_v8_debug(log, "Type error in write operation");
		return AS_NODE_PARAM_ERR;
	}
}

int add_read_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}
	as_v8_detail(log, "Read operation on bin :%s", binName);
	as_operations_add_read(ops, binName);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_incr_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_detail(log, "Incr operation on bin :%s", binName);
	Local<Value> v8val = obj->Get(Nan::New("value").ToLocalChecked());
	if (is_double_value(v8val)) {
		double binValue = double_value(v8val);
		as_v8_detail(log, "value to be incremented %lf", binValue);
		as_operations_add_incr_double(ops, binName, binValue);
		if (binName != NULL) free (binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsNumber()) {
		int64_t binValue = v8val->IntegerValue();
		as_v8_detail(log, "value to be incremented %lld", binValue);
		as_operations_add_incr( ops, binName, binValue);
		if (binName != NULL) free (binName);
		return AS_NODE_PARAM_OK;
	} else {
		as_v8_debug(log, "Type error in incr operation");
		return AS_NODE_PARAM_ERR;
	}
}

int add_prepend_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_detail(log, "prepend operation on bin :%s", binName);

	Local<Value> v8val = obj->Get(Nan::New("value").ToLocalChecked());
	if (v8val->IsString()) {
		char* binVal = strdup(*String::Utf8Value(v8val));
		as_v8_detail(log, "prepending string %s", binVal);
		as_operations_add_prepend_strp(ops, binName, binVal, true);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsObject()) {
		Local<Object> binObj = v8val->ToObject();
		int len ;
		uint8_t* data ;
		if (extract_blob_from_jsobject(&data, &len, binObj, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_v8_detail(log, "prepending raw bytes %u", data);
		as_operations_add_prepend_rawp(ops, binName, data, len, true);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	} else {
		as_v8_debug(log, "Type error in prepend operation");
		return AS_NODE_PARAM_ERR;
	}
}

int add_append_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_detail(log, "append operation on bin :%s", binName);
	Local<Value> v8val = obj->Get(Nan::New("value").ToLocalChecked());
	if (v8val->IsString()) {
		char* binVal = strdup(*String::Utf8Value(v8val));
		as_v8_detail(log, "appending string %s", binVal);
		as_operations_add_append_strp(ops, binName, binVal,true);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	} else if (v8val->IsObject()) {
		Local<Object> binObj = v8val->ToObject();
		int len ;
		uint8_t* data ;
		if (extract_blob_from_jsobject(&data, &len, binObj, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_v8_detail(log, "appending raw bytes %u", data);
		as_operations_add_append_rawp(ops, binName, data, len, true);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	} else {
		as_v8_debug(log, "Type error in append operation");
		return AS_NODE_PARAM_ERR;
	}
}

int add_touch_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	as_operations_add_touch(ops);
	as_v8_debug(log, "Touch operation is set");
	return AS_NODE_PARAM_OK;
}

int add_list_append_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* val;
	if (get_asval_property(&val, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_append(ops, binName, val);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_append_items_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list* list;
	if (get_list_property(&list, obj, "list", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_append_items(ops, binName, list);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_insert_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* val;
	if (get_asval_property(&val, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_insert(ops, binName, index, val);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_insert_items_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list* list;
	if (get_list_property(&list, obj, "list", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_insert_items(ops, binName, index, list);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_pop_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_pop(ops, binName, index);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_pop_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_operations_add_list_pop_range(ops, binName, index, count);
	} else {
		as_operations_add_list_pop_range_from(ops, binName, index);
	}
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_remove(ops, binName, index);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_operations_add_list_remove_range(ops, binName, index, count);
	} else {
		as_operations_add_list_remove_range_from(ops, binName, index);
	}
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_clear_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_clear(ops, binName);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_set_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* val;
	if (get_asval_property(&val, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_set(ops, binName, index, val);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_trim_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t count;
	if (get_int64_property(&count, obj, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_trim(ops, binName, index, count);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_get_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_get(ops, binName, index);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_get_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_operations_add_list_get_range(ops, binName, index, count);
	} else {
		as_operations_add_list_get_range_from(ops, binName, index);
	}
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_increment_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_increment(ops, binName, index, value);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_list_size_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_list_size(ops, binName);
	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_set_policy_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_set_policy(ops, binName, &policy);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_put_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_put(ops, binName, &policy, key, value);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_put_items_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map* items;
	Local<Value> v8items = obj->Get(Nan::New("items").ToLocalChecked());
	if (!v8items->IsObject()) {
		as_v8_error(log, "Type error: items property should be an Object");
		return AS_NODE_PARAM_ERR;
	}
	if (map_from_jsobject(&items, v8items->ToObject(), log) != AS_NODE_PARAM_OK) {
		as_v8_error(log, "Type error: items property should be an Object");
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_put_items(ops, binName, &policy, items);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_increment_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* incr;
	if (get_asval_property(&incr, obj, "incr", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_increment(ops, binName, &policy, key, incr);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_decrement_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* decr;
	if (get_asval_property(&decr, obj, "decr", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_decrement(ops, binName, &policy, key, decr);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_clear_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_clear(ops, binName);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_key_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_remove_by_key(ops, binName, key, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_key_list_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list* keys;
	if (get_list_property(&keys, obj, "keys", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_remove_by_key_list(ops, binName, keys, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_key_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool begin_defined;
	as_val* begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, obj, "begin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool end_defined;
	as_val* end = NULL;
	if (get_optional_asval_property(&end, &end_defined, obj, "end", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_remove_by_key_range(ops, binName, begin, end, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_value_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_remove_by_value(ops, binName, value, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_value_list_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list* values;
	if (get_list_property(&values, obj, "values", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_remove_by_value_list(ops, binName, values, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_value_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool begin_defined;
	as_val* begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, obj, "begin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool end_defined;
	as_val* end = NULL;
	if (get_optional_asval_property(&end, &end_defined, obj, "end", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_remove_by_value_range(ops, binName, begin, end, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_index_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_remove_by_index(ops, binName, index, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_index_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_operations_add_map_remove_by_index_range(ops, binName, index, count, return_type);
	} else {
		as_operations_add_map_remove_by_index_range_to_end(ops, binName, index, return_type);
	}

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_rank_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, obj, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_remove_by_rank(ops, binName, rank, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_rank_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, obj, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_operations_add_map_remove_by_rank_range(ops, binName, rank, count, return_type);
	} else {
		as_operations_add_map_remove_by_rank_range_to_end(ops, binName, rank, return_type);
	}

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_size_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_size(ops, binName);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_key_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_get_by_key(ops, binName, key, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_key_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool begin_defined;
	as_val* begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, obj, "begin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool end_defined;
	as_val* end = NULL;
	if (get_optional_asval_property(&end, &end_defined, obj, "end", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_get_by_key_range(ops, binName, begin, end, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_value_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_get_by_value(ops, binName, value, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_value_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool begin_defined;
	as_val* begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, obj, "begin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool end_defined;
	as_val* end = NULL;
	if (get_optional_asval_property(&end, &end_defined, obj, "end", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_get_by_value_range(ops, binName, begin, end, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_index_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_get_by_index(ops, binName, index, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_index_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_operations_add_map_get_by_index_range(ops, binName, index, count, return_type);
	} else {
		as_operations_add_map_get_by_index_range_to_end(ops, binName, index, return_type);
	}

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_rank_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, obj, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_operations_add_map_get_by_rank(ops, binName, rank, return_type);

	if (binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_rank_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, obj, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_operations_add_map_get_by_rank_range(ops, binName, rank, count, return_type);
	} else {
		as_operations_add_map_get_by_rank_range_to_end(ops, binName, rank, return_type);
	}

	if (binName != NULL) free(binName);
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
	{ "LIST_APPEND", add_list_append_op },
	{ "LIST_APPEND_ITEMS", add_list_append_items_op },
	{ "LIST_INSERT", add_list_insert_op },
	{ "LIST_INSERT_ITEMS", add_list_insert_items_op },
	{ "LIST_POP", add_list_pop_op },
	{ "LIST_POP_RANGE", add_list_pop_range_op },
	{ "LIST_REMOVE", add_list_remove_op },
	{ "LIST_REMOVE_RANGE", add_list_remove_range_op },
	{ "LIST_CLEAR", add_list_clear_op },
	{ "LIST_SET", add_list_set_op },
	{ "LIST_TRIM", add_list_trim_op },
	{ "LIST_GET", add_list_get_op },
	{ "LIST_GET_RANGE", add_list_get_range_op },
	{ "LIST_INCREMENT", add_list_increment_op },
	{ "LIST_SIZE", add_list_size_op },
	{ "MAP_SET_POLICY", add_map_set_policy_op },
	{ "MAP_PUT", add_map_put_op },
	{ "MAP_PUT_ITEMS", add_map_put_items_op },
	{ "MAP_INCREMENT", add_map_increment_op },
	{ "MAP_DECREMENT", add_map_decrement_op },
	{ "MAP_CLEAR", add_map_clear_op },
	{ "MAP_REMOVE_BY_KEY", add_map_remove_by_key_op },
	{ "MAP_REMOVE_BY_KEY_LIST", add_map_remove_by_key_list_op },
	{ "MAP_REMOVE_BY_KEY_RANGE", add_map_remove_by_key_range_op },
	{ "MAP_REMOVE_BY_VALUE", add_map_remove_by_value_op },
	{ "MAP_REMOVE_BY_VALUE_LIST", add_map_remove_by_value_list_op },
	{ "MAP_REMOVE_BY_VALUE_RANGE", add_map_remove_by_value_range_op },
	{ "MAP_REMOVE_BY_INDEX", add_map_remove_by_index_op },
	{ "MAP_REMOVE_BY_INDEX_RANGE", add_map_remove_by_index_range_op },
	{ "MAP_REMOVE_BY_RANK", add_map_remove_by_rank_op },
	{ "MAP_REMOVE_BY_RANK_RANGE", add_map_remove_by_rank_range_op },
	{ "MAP_SIZE", add_map_size_op },
	{ "MAP_GET_BY_KEY", add_map_get_by_key_op },
	{ "MAP_GET_BY_KEY_RANGE", add_map_get_by_key_range_op },
	{ "MAP_GET_BY_VALUE", add_map_get_by_value_op },
	{ "MAP_GET_BY_VALUE_RANGE", add_map_get_by_value_range_op },
	{ "MAP_GET_BY_INDEX", add_map_get_by_index_op },
	{ "MAP_GET_BY_INDEX_RANGE", add_map_get_by_index_range_op },
	{ "MAP_GET_BY_RANK", add_map_get_by_rank_op },
	{ "MAP_GET_BY_RANK_RANGE", add_map_get_by_rank_range_op }
};

int operations_from_jsarray(as_operations* ops, Local<Array> arr, LogInfo* log)
{
	uint32_t capacity = arr->Length();
	as_v8_detail(log, "number of operations in the array %d", capacity);
	if (capacity > 0) {
		as_operations_init(ops, capacity);
	} else {
		return AS_NODE_PARAM_ERR;
	}
	int result = AS_NODE_PARAM_OK;
	int64_t op;
	for (uint32_t i = 0; i < capacity; i++) {
		Local<Object> obj = arr->Get(i)->ToObject();
		setTTL(obj, &ops->ttl, log);
		result = get_int64_property(&op, obj, "op", log);
		if (result == AS_NODE_PARAM_OK) {
			const ops_table_entry *entry = &ops_table[op];
			if (entry) {
				result = (entry->op_function)(ops, obj, log);
			} else {
				result = AS_NODE_PARAM_ERR;
			}
		}
		if (result != AS_NODE_PARAM_OK) {
			as_v8_error(log, "invalid operation [%i] - result: %i", op, result);
			goto Return;
		}
	}
Return:
	return result;
}

Local<Object> opcode_values() {
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		obj->Set(Nan::New(entry.op_name).ToLocalChecked(), Nan::New(i));
	}

	return scope.Escape(obj);
}
