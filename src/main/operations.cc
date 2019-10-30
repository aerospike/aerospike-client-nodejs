/*******************************************************************************
 * Copyright 2013-2019 Aerospike, Inc.
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
#include <aerospike/as_vector.h>
#include <aerospike/as_cdt_ctx.h>
#include <aerospike/as_list_operations.h>
#include <aerospike/as_map_operations.h>
#include <aerospike/as_nil.h>
#include <aerospike/as_operations.h>
}

using namespace v8;

int get_optional_list_policy(as_list_policy* policy, bool* has_policy, Local<Object> obj, LogInfo* log)
{
	Nan::HandleScope scope;
	as_list_policy_init(policy);
	Local<Value> maybe_policy_obj = Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (maybe_policy_obj->IsUndefined()) {
		if (has_policy != NULL) (*has_policy) = false;
		as_v8_detail(log, "No list policy set - using default policy");
		return AS_NODE_PARAM_OK;
	} else if (!maybe_policy_obj->IsObject()) {
		as_v8_error(log, "Type error: policy should be an Object");
		return AS_NODE_PARAM_ERR;
	}
	if (has_policy != NULL) (*has_policy) = true;
	Local<Object> policy_obj = maybe_policy_obj.As<Object>();

	as_list_order order;
	Local<Value> value = Nan::Get(policy_obj, Nan::New("order").ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		order = (as_list_order) Nan::To<int>(value).FromJust();
	} else if (value->IsUndefined()) {
		order = AS_LIST_UNORDERED;
	} else {
		as_v8_error(log, "Type error: order should be integer");
		return AS_NODE_PARAM_ERR;
	}

	as_list_write_flags write_flags;
	value = Nan::Get(policy_obj, Nan::New("writeFlags").ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		write_flags = (as_list_write_flags) Nan::To<int>(value).FromJust();
	} else if (value->IsUndefined()) {
		write_flags = AS_LIST_WRITE_DEFAULT;
	} else {
		as_v8_error(log, "Type error: writeFlags should be integer");
		return AS_NODE_PARAM_ERR;
	}

	as_v8_detail(log, "Setting list policy with order %i and write flags %i", order, write_flags);
	as_list_policy_set(policy, order, write_flags);
	return AS_NODE_PARAM_OK;
}

int get_list_return_type(as_list_return_type* return_type, Local<Object> obj, LogInfo* log)
{
	Nan::HandleScope scope;
	Local<Value> value = Nan::Get(obj, Nan::New("returnType").ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		(*return_type) = (as_list_return_type) Nan::To<int>(value).FromJust();
	} else if (value->IsUndefined()) {
		(*return_type) = AS_LIST_RETURN_NONE;
	} else {
		as_v8_error(log, "Type error: returnType should be integer");
		return AS_NODE_PARAM_ERR;
	}

	bool inverted_defined = false;
	bool inverted = false;
	if (get_optional_bool_property(&inverted, &inverted_defined, obj, "inverted", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}
	if (inverted_defined && inverted) {
		as_v8_detail(log, "Inverting list operation");
		(*return_type) = (as_list_return_type) ((*return_type) | AS_LIST_RETURN_INVERTED);
	}

	as_v8_detail(log, "List return type: %i", (*return_type));
	return AS_NODE_PARAM_OK;
}

int get_map_policy(as_map_policy* policy, Local<Object> obj, LogInfo* log)
{
	Nan::HandleScope scope;
	as_map_policy_init(policy);
	Local<Value> maybe_policy_obj = Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (maybe_policy_obj->IsUndefined()) {
		as_v8_detail(log, "No map policy set - using default policy");
		return AS_NODE_PARAM_OK;
	} else if (!maybe_policy_obj->IsObject()) {
		as_v8_error(log, "Type error: policy should be an Object");
		return AS_NODE_PARAM_ERR;
	}
	Local<Object> policy_obj = maybe_policy_obj.As<Object>();

	as_map_order order = AS_MAP_UNORDERED;
	bool order_set = false;
	if (get_optional_int_property((int *) &order, &order_set, policy_obj, "order", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_write_mode write_mode = AS_MAP_UPDATE;
	bool write_mode_set = false;
	if (get_optional_int_property((int *) &write_mode, &write_mode_set, policy_obj, "writeMode", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	uint32_t write_flags = AS_MAP_WRITE_DEFAULT;
	bool write_flags_set = false;
	if (get_optional_uint32_property(&write_flags, &write_flags_set, policy_obj, "writeFlags", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (write_flags_set) {
		as_v8_detail(log, "Setting map policy from write flags: order=%i, flags=%i", order, write_flags);
		as_map_policy_set_flags(policy, order, write_flags);
	} else {
		as_v8_detail(log, "Setting map policy from write mode: order=%i, mode=%i", order, write_mode);
		as_map_policy_set(policy, order, write_mode);
	}
	return AS_NODE_PARAM_OK;
}

int get_map_return_type(as_map_return_type* return_type, Local<Object> obj, LogInfo* log)
{
	Nan::HandleScope scope;
	Local<Value> value = Nan::Get(obj, Nan::New("returnType").ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		(*return_type) = (as_map_return_type) Nan::To<int>(value).FromJust();
	} else if (value->IsUndefined()) {
		(*return_type) = AS_MAP_RETURN_NONE;
	} else {
		as_v8_error(log, "Type error: returnType should be integer");
		return AS_NODE_PARAM_ERR;
	}
	as_v8_detail(log, "Map return type: %i", (*return_type));
	return AS_NODE_PARAM_OK;
}

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

int add_list_set_order_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_order order;
	if (get_int_property((int*) &order, op, "order", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, order=%i", binName, order);
	as_operations_list_set_order(ops, binName, with_context ? &context : NULL, order);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_sort_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_sort_flags flags;
	if (get_int_property((int*) &flags, op, "flags", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, flags=%i", binName, flags);
	as_operations_list_sort(ops, binName, with_context ? &context : NULL, flags);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_append_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* val = NULL;
	if (get_asval_property(&val, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_policy;
	as_list_policy policy;
	if (get_optional_list_policy(&policy, &with_policy, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context = true;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char* val_str = as_val_tostring(val);
			as_v8_debug(log, "bin=%s, value=%s, order=%i, flags=%i, context=%d", binName, val_str, policy.order, policy.flags, with_context);
			cf_free(val_str);
		}
		as_operations_list_append(ops, binName, with_context ? &context : NULL, &policy, val);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* val_str = as_val_tostring(val);
			as_v8_debug(log, "bin=%s, value=%s, context=%d", binName, val_str, with_context);
			cf_free(val_str);
		}
		as_operations_list_append(ops, binName, with_context ? &context : NULL, NULL, val);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_append_items_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		return AS_NODE_PARAM_ERR;
	}

	as_list* list = NULL;
	if (get_list_property(&list, op, "list", log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		if (list) as_list_destroy(list);
		return AS_NODE_PARAM_ERR;
	}

	bool with_policy;
	as_list_policy policy;
	if (get_optional_list_policy(&policy, &with_policy, op, log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		if (list) as_list_destroy(list);
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char* list_str = as_val_tostring(list);
			as_v8_debug(log, "bin=%s, values=%s, order=%i, flags=%i", binName, list_str, policy.order, policy.flags);
			cf_free(list_str);
		}
		as_operations_list_append_items(ops, binName, with_context ? &context : NULL, &policy, list);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* list_str = as_val_tostring(list);
			as_v8_debug(log, "bin=%s, values=%s", binName, list_str);
			cf_free(list_str);
		}
		as_operations_list_append_items(ops, binName, with_context ? &context : NULL, NULL, list);
	}

	if (binName) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_insert_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* val = NULL;
	if (get_asval_property(&val, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_policy;
	as_list_policy policy;
	if (get_optional_list_policy(&policy, &with_policy, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char* val_str = as_val_tostring(val);
			as_v8_debug(log, "bin=%s, index=%i, value=%s, order=%i, flags=%i", binName, index, val_str, policy.order, policy.flags);
			cf_free(val_str);
		}
		as_operations_list_insert(ops, binName, with_context ? &context : NULL, &policy, index, val);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* val_str = as_val_tostring(val);
			as_v8_debug(log, "bin=%s, index=%i, value=%s", binName, index, val_str);
			cf_free(val_str);
		}
		as_operations_list_insert(ops, binName, with_context ? &context : NULL, NULL, index, val);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_insert_items_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		return AS_NODE_PARAM_ERR;
	}

	as_list* list = NULL;
	if (get_list_property(&list, op, "list", log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		if (list) as_list_destroy(list);
		return AS_NODE_PARAM_ERR;
	}

	bool with_policy;
	as_list_policy policy;
	if (get_optional_list_policy(&policy, &with_policy, op, log) != AS_NODE_PARAM_OK) {
		if (binName) free(binName);
		if (list) as_list_destroy(list);
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char* list_str = as_val_tostring(list);
			as_v8_debug(log, "bin=%s, index=%i, list=%s, order=%i, flags=%i", binName, index, list_str, policy.order, policy.flags);
			cf_free(list_str);
		}
		as_operations_list_insert_items(ops, binName, with_context ? &context : NULL, &policy, index, list);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* list_str = as_val_tostring(list);
			as_v8_debug(log, "bin=%s, index=%i, list=%s", binName, index, list_str);
			cf_free(list_str);
		}
		as_operations_list_insert_items(ops, binName, with_context ? &context : NULL, NULL, index, list);
	}

	if (binName) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_pop_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, index=%i", binName, index);
	as_operations_list_pop(ops, binName, with_context ? &context : NULL, index);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_pop_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, index=%i, count=%i", binName, index, count);
		as_operations_list_pop_range(ops, binName, with_context ? &context : NULL, index, count);
	} else {
		as_v8_debug(log, "bin=%s, index=%i", binName, index);
		as_operations_list_pop_range_from(ops, binName, with_context ? &context : NULL, index);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, index=%i", binName, index);
	as_operations_list_remove(ops, binName, with_context ? &context : NULL, index);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, index=%i, count=%i", binName, index, count);
		as_operations_list_remove_range(ops, binName, with_context ? &context : NULL, index, count);
	} else {
		as_v8_debug(log, "bin=%s, index=%i", binName, index);
		as_operations_list_remove_range_from(ops, binName, with_context ? &context : NULL, index);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_by_index_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, index=%i, return_type=%i", binName, index, return_type);
	as_operations_list_remove_by_index(ops, binName, with_context ? &context : NULL, index, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_by_index_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, index=%i, count=%i, return_type=%i", binName, index, count, return_type);
		as_operations_list_remove_by_index_range(ops, binName, with_context ? &context : NULL, index, count, return_type);
	} else {
		as_v8_debug(log, "bin=%s, index=%i, return_type=%i", binName, index, return_type);
		as_operations_list_remove_by_index_range_to_end(ops, binName, with_context ? &context : NULL, index, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_by_value_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* value_str = as_val_tostring(value);
		as_v8_debug(log, "bin=%s, value=%s, return_type=%i", binName, value_str, return_type);
		cf_free(value_str);
	}
	as_operations_list_remove_by_value(ops, binName, with_context ? &context : NULL, value, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_by_value_list_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list* values = NULL;
	if (get_list_property(&values, op, "values", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* values_str = as_val_tostring(values);
		as_v8_debug(log, "bin=%s, values=%s, return_type=%i", binName, values_str, return_type);
		cf_free(values_str);
	}
	as_operations_list_remove_by_value_list(ops, binName, with_context ? &context : NULL, values, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_by_value_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool begin_defined;
	as_val* begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, op, "begin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool end_defined;
	as_val* end = NULL;
	if (get_optional_asval_property(&end, &end_defined, op, "end", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* begin_str = as_val_tostring(begin);
		char* end_str = as_val_tostring(end);
		as_v8_debug(log, "bin=%s, begin=%s, end=%s, return_type=%i", binName, begin_str, end_str, return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_list_remove_by_value_range(ops, binName, with_context ? &context : NULL, begin, end, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_by_value_rel_rank_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, value=%s, rank=%i, count=%i, return_type=%i", binName, value_str, rank, count, return_type);
			cf_free(value_str);
		}
		as_operations_list_remove_by_value_rel_rank_range(ops, binName, with_context ? &context : NULL, value, rank, count, return_type);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, value=%s, rank=%i, return_type=%i", binName, value_str, rank, return_type);
			cf_free(value_str);
		}
		as_operations_list_remove_by_value_rel_rank_range_to_end(ops, binName, with_context ? &context : NULL, value, rank, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_by_rank_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, rank=%i, return_type=%i", binName, rank, return_type);
	as_operations_list_remove_by_rank(ops, binName, with_context ? &context : NULL, rank, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_remove_by_rank_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, rank=%i, count=%i, return_type=%i", binName, rank, count, return_type);
		as_operations_list_remove_by_rank_range(ops, binName, with_context ? &context : NULL, rank, count, return_type);
	} else {
		as_v8_debug(log, "bin=%s, rank=%i, return_type=%i", binName, rank, return_type);
		as_operations_list_remove_by_rank_range_to_end(ops, binName, with_context ? &context : NULL, rank, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_clear_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s", binName);
	as_operations_list_clear(ops, binName, with_context ? &context : NULL);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_set_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* val = NULL;
	if (get_asval_property(&val, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_policy;
	as_list_policy policy;
	if (get_optional_list_policy(&policy, &with_policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* val_str = as_val_tostring(val);
		as_v8_debug(log, "bin=%s, index=%i, value=%s", binName, index, val_str);
		cf_free(val_str);
	}
	as_operations_list_set(ops, binName, with_context ? &context : NULL, with_policy ? &policy : NULL, index, val);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_trim_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, index=%i, count=%i", binName, index, count);
	as_operations_list_trim(ops, binName, with_context ? &context : NULL, index, count);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, index=%i", binName, index);
	as_operations_list_get(ops, binName, with_context ? &context : NULL, index);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_range_op(as_operations* ops, Local<Object> obj, LogInfo* log)
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, index=%i, count=%i", binName, index, count);
		as_operations_list_get_range(ops, binName, with_context ? &context : NULL, index, count);
	} else {
		as_v8_debug(log, "bin=%s, index=%i", binName, index);
		as_operations_list_get_range_from(ops, binName, with_context ? &context : NULL, index);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_by_index_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, index=%i, return_type=%i", binName, index, return_type);
	as_operations_list_get_by_index(ops, binName, with_context ? &context : NULL, index, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_by_index_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, index=%i, count=%i, return_type=%i", binName, index, count, return_type);
		as_operations_list_get_by_index_range(ops, binName, with_context ? &context : NULL, index, count, return_type);
	} else {
		as_v8_debug(log, "bin=%s, index=%i, return_type=%i", binName, index, return_type);
		as_operations_list_get_by_index_range_to_end(ops, binName, with_context ? &context : NULL, index, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_by_value_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* value_str = as_val_tostring(value);
		as_v8_debug(log, "bin=%s, value=%s, return_type=%i", binName, value_str, return_type);
		cf_free(value_str);
	}
	as_operations_list_get_by_value(ops, binName, with_context ? &context : NULL, value, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_by_value_list_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list* values = NULL;
	if (get_list_property(&values, op, "values", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* values_str = as_val_tostring(values);
		as_v8_debug(log, "bin=%s, values=%s, return_type=%i", binName, values_str, return_type);
		cf_free(values_str);
	}
	as_operations_list_get_by_value_list(ops, binName, with_context ? &context : NULL, values, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_by_value_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool begin_defined;
	as_val* begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, op, "begin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool end_defined;
	as_val* end = NULL;
	if (get_optional_asval_property(&end, &end_defined, op, "end", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* begin_str = as_val_tostring(begin);
		char* end_str = as_val_tostring(end);
		as_v8_debug(log, "bin=%s, begin=%s, end=%s, return_type=%i", binName, begin_str, end_str, return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_list_get_by_value_range(ops, binName, with_context ? &context : NULL, begin, end, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_by_value_rel_rank_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, value=%s, rank=%i, count=%i, return_type=%i", binName, value_str, rank, count, return_type);
			cf_free(value_str);
		}
		as_operations_list_get_by_value_rel_rank_range(ops, binName, with_context ? &context : NULL, value, rank, count, return_type);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, value=%s, rank=%i, return_type=%i", binName, value_str, rank, return_type);
			cf_free(value_str);
		}
		as_operations_list_get_by_value_rel_rank_range_to_end(ops, binName, with_context ? &context : NULL, value, rank, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_by_rank_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, rank=%i, return_type=%i", binName, rank, return_type);
	as_operations_list_get_by_rank(ops, binName, with_context ? &context : NULL, rank, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_get_by_rank_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, rank=%i, count=%i, return_type=%i", binName, rank, count, return_type);
		as_operations_list_get_by_rank_range(ops, binName, with_context ? &context : NULL, rank, count, return_type);
	} else {
		as_v8_debug(log, "bin=%s, rank=%i, return_type=%i", binName, rank, return_type);
		as_operations_list_get_by_rank_range_to_end(ops, binName, with_context ? &context : NULL, rank, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_increment_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool value_defined;
	as_val* value = NULL;
	if (get_optional_asval_property(&value, &value_defined, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_policy;
	as_list_policy policy;
	if (get_optional_list_policy(&policy, &with_policy, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, index=%i, value=%s, order=%i, flags=%i", binName, index, value_str, policy.order, policy.flags);
			cf_free(value_str);
		}
		as_operations_list_increment(ops, binName, with_context ? &context : NULL, &policy, index, value);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, index=%i, value=%s", binName, index, value_str);
			cf_free(value_str);
		}
		as_operations_list_increment(ops, binName, with_context ? &context : NULL, NULL, index, value);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_list_size_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s", binName);
	as_operations_list_size(ops, binName, with_context ? &context : NULL);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_set_policy_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, order=%i, write_cmd=%i", binName, policy.attributes, policy.item_command);
	as_operations_map_set_policy(ops, binName, with_context ? &context : NULL, &policy);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_put_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* key_str = as_val_tostring(key);
		char* value_str = as_val_tostring(value);
		as_v8_debug(log, "bin=%s, key=%s, value=%s, order=%i, write_cmd=%i", binName, key_str, value_str, policy.attributes, policy.item_command);
		cf_free(key_str);
		cf_free(value_str);
	}
	as_operations_map_put(ops, binName, with_context ? &context : NULL, &policy, key, value);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_put_items_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map* items = NULL;
	Local<Value> v8items = Nan::Get(obj, Nan::New("items").ToLocalChecked()).ToLocalChecked();
	if (!v8items->IsObject()) {
		as_v8_error(log, "Type error: items property should be an Object");
		return AS_NODE_PARAM_ERR;
	}
	if (map_from_jsobject(&items, v8items.As<Object>(), log) != AS_NODE_PARAM_OK) {
		as_v8_error(log, "Type error: items property should be an Object");
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, order=%i, write_cmd=%i", binName, policy.attributes, policy.item_command);
	as_operations_map_put_items(ops, binName, with_context ? &context : NULL, &policy, items);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_increment_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* incr = NULL;
	if (get_asval_property(&incr, obj, "incr", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* key_str = as_val_tostring(key);
		char* incr_str = as_val_tostring(incr);
		as_v8_debug(log, "bin=%s, key=%s, value=%s, order=%i, write_cmd=%i", binName, key_str, incr_str, policy.attributes, policy.item_command);
		cf_free(key_str);
		cf_free(incr_str);
	}
	as_operations_map_increment(ops, binName, with_context ? &context : NULL, &policy, key, incr);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_decrement_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* decr = NULL;
	if (get_asval_property(&decr, obj, "decr", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_policy policy;
	if (get_map_policy(&policy, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* key_str = as_val_tostring(key);
		char* decr_str = as_val_tostring(decr);
		as_v8_debug(log, "bin=%s, key=%s, value=%s, order=%i, write_cmd=%i", binName, key_str, decr_str, policy.attributes, policy.item_command);
		cf_free(key_str);
		cf_free(decr_str);
	}
	as_operations_map_decrement(ops, binName, with_context ? &context : NULL, &policy, key, decr);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_clear_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s", binName);
	as_operations_map_clear(ops, binName, with_context ? &context : NULL);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_key_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* key_str = as_val_tostring(key);
		as_v8_debug(log, "bin=%s, key=%s, return_type=%i", binName, key_str, return_type);
		cf_free(key_str);
	}
	as_operations_map_remove_by_key(ops, binName, with_context ? &context : NULL, key, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_key_list_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list* keys = NULL;
	if (get_list_property(&keys, obj, "keys", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* keys_str = as_val_tostring(keys);
		as_v8_debug(log, "bin=%s, keys=%s, return_type=%i", binName, keys_str, return_type);
		cf_free(keys_str);
	}
	as_operations_map_remove_by_key_list(ops, binName, with_context ? &context : NULL, keys, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* begin_str = as_val_tostring(begin);
		char* end_str = as_val_tostring(end);
		as_v8_debug(log, "bin=%s, begin=%s, end=%s, return_type=%i", binName, begin_str, end_str, return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_map_remove_by_key_range(ops, binName, with_context ? &context : NULL, begin, end, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_key_rel_index_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key = NULL;
	if (get_asval_property(&key, op, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char* key_str = as_val_tostring(key);
			as_v8_debug(log, "bin=%s, key=%s, index=%i, count=%i, return_type=%i", binName, key_str, index, count, return_type);
			cf_free(key_str);
		}
		as_operations_map_remove_by_key_rel_index_range(ops, binName, with_context ? &context : NULL, key, index, count, return_type);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* key_str = as_val_tostring(key);
			as_v8_debug(log, "bin=%s, key=%s, index=%i, return_type=%i", binName, key_str, index, return_type);
			cf_free(key_str);
		}
		as_operations_map_remove_by_key_rel_index_range_to_end(ops, binName, with_context ? &context : NULL, key, index, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_value_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* value_str = as_val_tostring(value);
		as_v8_debug(log, "bin=%s, value=%s, return_type=%i", binName, value_str, return_type);
		cf_free(value_str);
	}
	as_operations_map_remove_by_value(ops, binName, with_context ? &context : NULL, value, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_value_list_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_list* values = NULL;
	if (get_list_property(&values, obj, "values", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* values_str = as_val_tostring(values);
		as_v8_debug(log, "bin=%s, values=%s, return_type=%i", binName, values_str, return_type);
		cf_free(values_str);
	}
	as_operations_map_remove_by_value_list(ops, binName, with_context ? &context : NULL, values, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* begin_str = as_val_tostring(begin);
		char* end_str = as_val_tostring(end);
		as_v8_debug(log, "bin=%s, begin=%s, end=%s, return_type=%i", binName, begin_str, end_str, return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_map_remove_by_value_range(ops, binName, with_context ? &context : NULL, begin, end, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_remove_by_value_rel_rank_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, value=%s, rank=%i, count=%i, return_type=%i", binName, value_str, rank, count, return_type);
			cf_free(value_str);
		}
		as_operations_map_remove_by_value_rel_rank_range(ops, binName, with_context ? &context : NULL, value, rank, count, return_type);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, value=%s, rank=%i, return_type=%i", binName, value_str, rank, return_type);
			cf_free(value_str);
		}
		as_operations_map_remove_by_value_rel_rank_range_to_end(ops, binName, with_context ? &context : NULL, value, rank, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, index=%i, return_type=%i", binName, index, return_type);
	as_operations_map_remove_by_index(ops, binName, with_context ? &context : NULL, index, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, index=%i, count=%i, return_type=%i", binName, index, count, return_type);
		as_operations_map_remove_by_index_range(ops, binName, with_context ? &context : NULL, index, count, return_type);
	} else {
		as_v8_debug(log, "bin=%s, index=%i, return_type=%i", binName, index, return_type);
		as_operations_map_remove_by_index_range_to_end(ops, binName, with_context ? &context : NULL, index, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, rank=%i, return_type=%i", binName, rank, return_type);
	as_operations_map_remove_by_rank(ops, binName, with_context ? &context : NULL, rank, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, rank=%i, count=%i, return_type=%i", binName, rank, count, return_type);
		as_operations_map_remove_by_rank_range(ops, binName, with_context ? &context : NULL, rank, count, return_type);
	} else {
		as_v8_debug(log, "bin=%s, rank=%i, return_type=%i", binName, rank, return_type);
		as_operations_map_remove_by_rank_range_to_end(ops, binName, with_context ? &context : NULL, rank, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_size_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s", binName);
	as_operations_map_size(ops, binName, with_context ? &context : NULL);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_key_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* key_str = as_val_tostring(key);
		as_v8_debug(log, "bin=%s, key=%s, return_type=%i", binName, key_str, return_type);
		cf_free(key_str);
	}
	as_operations_map_get_by_key(ops, binName, with_context ? &context : NULL, key, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* begin_str = as_val_tostring(begin);
		char* end_str = as_val_tostring(end);
		as_v8_debug(log, "bin=%s, begin=%s, end=%s, return_type=%i", binName, begin_str, end_str, return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_map_get_by_key_range(ops, binName, with_context ? &context : NULL, begin, end, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_key_rel_index_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* key = NULL;
	if (get_asval_property(&key, op, "key", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char* key_str = as_val_tostring(key);
			as_v8_debug(log, "bin=%s, key=%s, index=%i, count=%i, return_type=%i", binName, key_str, index, count, return_type);
			cf_free(key_str);
		}
		as_operations_map_get_by_key_rel_index_range(ops, binName, with_context ? &context : NULL, key, index, count, return_type);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* key_str = as_val_tostring(key);
			as_v8_debug(log, "bin=%s, key=%s, index=%i, return_type=%i", binName, key_str, index, return_type);
			cf_free(key_str);
		}
		as_operations_map_get_by_key_rel_index_range_to_end(ops, binName, with_context ? &context : NULL, key, index, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_value_op(as_operations* ops, Local<Object> obj, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, obj, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* value_str = as_val_tostring(value);
		as_v8_debug(log, "bin=%s, value=%s, return_type=%i", binName, value_str, return_type);
		cf_free(value_str);
	}
	as_operations_map_get_by_value(ops, binName, with_context ? &context : NULL, value, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (as_v8_debug_enabled(log)) {
		char* begin_str = as_val_tostring(begin);
		char* end_str = as_val_tostring(end);
		as_v8_debug(log, "bin=%s, begin=%s, end=%s, return_type=%i", binName, begin_str, end_str, return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_map_get_by_value_range(ops, binName, with_context ? &context : NULL, begin, end, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
	return AS_NODE_PARAM_OK;
}

int add_map_get_by_value_rel_rank_range_op(as_operations* ops, Local<Object> op, LogInfo* log)
{
	char* binName = NULL;
	if (get_string_property(&binName, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_val* value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_map_return_type return_type;
	if (get_map_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, value=%s, rank=%i, count=%i, return_type=%i", binName, value_str, rank, count, return_type);
			cf_free(value_str);
		}
		as_operations_map_get_by_value_rel_rank_range(ops, binName, with_context ? &context : NULL, value, rank, count, return_type);
	} else {
		if (as_v8_debug_enabled(log)) {
			char* value_str = as_val_tostring(value);
			as_v8_debug(log, "bin=%s, value=%s, rank=%i, return_type=%i", binName, value_str, rank, return_type);
			cf_free(value_str);
		}
		as_operations_map_get_by_value_rel_rank_range_to_end(ops, binName, with_context ? &context : NULL, value, rank, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, index=%i, return_type=%i", binName, index, return_type);
	as_operations_map_get_by_index(ops, binName, with_context ? &context : NULL, index, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, index=%i, count=%i, return_type=%i", binName, index, count, return_type);
		as_operations_map_get_by_index_range(ops, binName, with_context ? &context : NULL, index, count, return_type);
	} else {
		as_v8_debug(log, "bin=%s, index=%i, return_type=%i", binName, index, return_type);
		as_operations_map_get_by_index_range_to_end(ops, binName, with_context ? &context : NULL, index, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "bin=%s, rank=%i, return_type=%i", binName, rank, return_type);
	as_operations_map_get_by_rank(ops, binName, with_context ? &context : NULL, rank, return_type);

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, obj, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (count_defined) {
		as_v8_debug(log, "bin=%s, rank=%i, count=%i, return_type=%i", binName, rank, count, return_type);
		as_operations_map_get_by_rank_range(ops, binName, with_context ? &context : NULL, rank, count, return_type);
	} else {
		as_v8_debug(log, "bin=%s, rank=%i, return_type=%i", binName, rank, return_type);
		as_operations_map_get_by_rank_range_to_end(ops, binName, with_context ? &context : NULL, rank, return_type);
	}

	if (binName != NULL) free(binName);
	if (with_context) as_cdt_ctx_destroy(&context);
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
	{ "LIST_SET_ORDER", add_list_set_order_op },
	{ "LIST_SORT", add_list_sort_op },
	{ "LIST_APPEND", add_list_append_op },
	{ "LIST_APPEND_ITEMS", add_list_append_items_op },
	{ "LIST_INSERT", add_list_insert_op },
	{ "LIST_INSERT_ITEMS", add_list_insert_items_op },
	{ "LIST_POP", add_list_pop_op },
	{ "LIST_POP_RANGE", add_list_pop_range_op },
	{ "LIST_REMOVE", add_list_remove_op },
	{ "LIST_REMOVE_RANGE", add_list_remove_range_op },
	{ "LIST_REMOVE_BY_INDEX", add_list_remove_by_index_op },
	{ "LIST_REMOVE_BY_INDEX_RANGE", add_list_remove_by_index_range_op },
	{ "LIST_REMOVE_BY_VALUE", add_list_remove_by_value_op },
	{ "LIST_REMOVE_BY_VALUE_LIST", add_list_remove_by_value_list_op },
	{ "LIST_REMOVE_BY_VALUE_RANGE", add_list_remove_by_value_range_op },
	{ "LIST_REMOVE_BY_VALUE_REL_RANK_RANGE", add_list_remove_by_value_rel_rank_range_op },
	{ "LIST_REMOVE_BY_RANK", add_list_remove_by_rank_op },
	{ "LIST_REMOVE_BY_RANK_RANGE", add_list_remove_by_rank_range_op },
	{ "LIST_CLEAR", add_list_clear_op },
	{ "LIST_SET", add_list_set_op },
	{ "LIST_TRIM", add_list_trim_op },
	{ "LIST_GET", add_list_get_op },
	{ "LIST_GET_RANGE", add_list_get_range_op },
	{ "LIST_GET_BY_INDEX", add_list_get_by_index_op },
	{ "LIST_GET_BY_INDEX_RANGE", add_list_get_by_index_range_op },
	{ "LIST_GET_BY_VALUE", add_list_get_by_value_op },
	{ "LIST_GET_BY_VALUE_LIST", add_list_get_by_value_list_op },
	{ "LIST_GET_BY_VALUE_RANGE", add_list_get_by_value_range_op },
	{ "LIST_GET_BY_VALUE_REL_RANK_RANGE", add_list_get_by_value_rel_rank_range_op },
	{ "LIST_GET_BY_RANK", add_list_get_by_rank_op },
	{ "LIST_GET_BY_RANK_RANGE", add_list_get_by_rank_range_op },
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
	{ "MAP_REMOVE_BY_KEY_REL_INDEX_RANGE", add_map_remove_by_key_rel_index_range_op },
	{ "MAP_REMOVE_BY_VALUE", add_map_remove_by_value_op },
	{ "MAP_REMOVE_BY_VALUE_LIST", add_map_remove_by_value_list_op },
	{ "MAP_REMOVE_BY_VALUE_RANGE", add_map_remove_by_value_range_op },
	{ "MAP_REMOVE_BY_VALUE_REL_RANK_RANGE", add_map_remove_by_value_rel_rank_range_op },
	{ "MAP_REMOVE_BY_INDEX", add_map_remove_by_index_op },
	{ "MAP_REMOVE_BY_INDEX_RANGE", add_map_remove_by_index_range_op },
	{ "MAP_REMOVE_BY_RANK", add_map_remove_by_rank_op },
	{ "MAP_REMOVE_BY_RANK_RANGE", add_map_remove_by_rank_range_op },
	{ "MAP_SIZE", add_map_size_op },
	{ "MAP_GET_BY_KEY", add_map_get_by_key_op },
	{ "MAP_GET_BY_KEY_RANGE", add_map_get_by_key_range_op },
	{ "MAP_GET_BY_KEY_REL_INDEX_RANGE", add_map_get_by_key_rel_index_range_op },
	{ "MAP_GET_BY_VALUE", add_map_get_by_value_op },
	{ "MAP_GET_BY_VALUE_RANGE", add_map_get_by_value_range_op },
	{ "MAP_GET_BY_VALUE_REL_RANK_RANGE", add_map_get_by_value_rel_rank_range_op },
	{ "MAP_GET_BY_INDEX", add_map_get_by_index_op },
	{ "MAP_GET_BY_INDEX_RANGE", add_map_get_by_index_range_op },
	{ "MAP_GET_BY_RANK", add_map_get_by_rank_op },
	{ "MAP_GET_BY_RANK_RANGE", add_map_get_by_rank_range_op }
};

int
add_operation(as_operations* ops, int64_t opcode, Local<Object> params, LogInfo* log)
{
	switch (opcode & OPS_MASK) {
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
	as_v8_detail(log, "Converting operations list: size=%d", capacity);
	if (capacity > 0) {
		as_operations_init(ops, capacity);
	} else {
		return AS_NODE_PARAM_ERR;
	}

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
