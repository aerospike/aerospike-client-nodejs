/*******************************************************************************
 * Copyright 2013-2022 Aerospike, Inc.
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
#include <aerospike/as_cdt_ctx.h>
#include <aerospike/as_map_operations.h>
}

using namespace v8;

bool get_map_policy(as_map_policy *policy, v8::Local<v8::Object> obj,
					const LogInfo *log)
{
	Nan::HandleScope scope;
	as_map_policy_init(policy);
	Local<Value> maybe_policy_obj =
		Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (maybe_policy_obj->IsUndefined()) {
		as_v8_detail(log, "No map policy set - using default policy");
		return true;
	}
	else if (!maybe_policy_obj->IsObject()) {
		as_v8_error(log, "Type error: policy should be an Object");
		return false;
	}
	Local<Object> policy_obj = maybe_policy_obj.As<Object>();

	as_map_order order = AS_MAP_UNORDERED;
	bool order_set = false;
	if (get_optional_int_property((int *)&order, &order_set, policy_obj,
								  "order", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_write_mode write_mode = AS_MAP_UPDATE;
	bool write_mode_set = false;
	if (get_optional_int_property((int *)&write_mode, &write_mode_set,
								  policy_obj, "writeMode",
								  log) != AS_NODE_PARAM_OK) {
		return false;
	}

	uint32_t write_flags = AS_MAP_WRITE_DEFAULT;
	bool write_flags_set = false;
	if (get_optional_uint32_property(&write_flags, &write_flags_set, policy_obj,
									 "writeFlags", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (write_flags_set) {
		as_v8_detail(log,
					 "Setting map policy from write flags: order=%i, flags=%i",
					 order, write_flags);
		as_map_policy_set_flags(policy, order, write_flags);
	}
	else {
		as_v8_detail(log,
					 "Setting map policy from write mode: order=%i, mode=%i",
					 order, write_mode);
		as_map_policy_set(policy, order, write_mode);
	}
	return true;
}

bool get_map_return_type(as_map_return_type *return_type, Local<Object> obj,
						 LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New("returnType").ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		(*return_type) = (as_map_return_type)Nan::To<int>(value).FromJust();
	}
	else if (value->IsUndefined()) {
		(*return_type) = AS_MAP_RETURN_NONE;
	}
	else {
		as_v8_error(log, "Type error: returnType should be integer");
		return false;
	}
	as_v8_detail(log, "Map return type: %i", (*return_type));
	return true;
}

bool add_map_set_policy_op(as_operations *ops, const char *bin,
						   as_cdt_ctx *context, Local<Object> op, LogInfo *log)
{
	as_map_policy policy;
	if (!get_map_policy(&policy, op, log)) {
		return false;
	}

	as_v8_debug(log, "order=%i, write_cmd=%i", policy.attributes,
				policy.item_command);
	as_operations_map_set_policy(ops, bin, context, &policy);

	return true;
}

bool add_map_put_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					Local<Object> obj, LogInfo *log)
{
	as_val *key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_val *value = NULL;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_policy policy;
	if (!get_map_policy(&policy, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *key_str = as_val_tostring(key);
		char *value_str = as_val_tostring(value);
		as_v8_debug(log, "key=%s, value=%s, order=%i, write_cmd=%i", key_str,
					value_str, policy.attributes, policy.item_command);
		cf_free(key_str);
		cf_free(value_str);
	}
	as_operations_map_put(ops, bin, context, &policy, key, value);

	return true;
}

bool add_map_put_items_op(as_operations *ops, const char *bin,
						  as_cdt_ctx *context, Local<Object> obj, LogInfo *log)
{
	as_map *items = NULL;
	Local<Value> v8items =
		Nan::Get(obj, Nan::New("items").ToLocalChecked()).ToLocalChecked();
	if (!v8items->IsObject()) {
		as_v8_error(log, "Type error: items property should be an Object");
		return false;
	}
	if (map_from_jsobject(&items, v8items.As<Object>(), log) !=
		AS_NODE_PARAM_OK) {
		as_v8_error(log, "Type error: items property should be an Object");
		return false;
	}

	as_map_policy policy;
	if (!get_map_policy(&policy, obj, log)) {
		return false;
	}

	as_v8_debug(log, "order=%i, write_cmd=%i", policy.attributes,
				policy.item_command);
	as_operations_map_put_items(ops, bin, context, &policy, items);

	return true;
}

bool add_map_increment_op(as_operations *ops, const char *bin,
						  as_cdt_ctx *context, Local<Object> obj, LogInfo *log)
{
	as_val *key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_val *incr = NULL;
	if (get_asval_property(&incr, obj, "incr", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_policy policy;
	if (!get_map_policy(&policy, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *key_str = as_val_tostring(key);
		char *incr_str = as_val_tostring(incr);
		as_v8_debug(log, "key=%s, value=%s, order=%i, write_cmd=%i", key_str,
					incr_str, policy.attributes, policy.item_command);
		cf_free(key_str);
		cf_free(incr_str);
	}
	as_operations_map_increment(ops, bin, context, &policy, key, incr);

	return true;
}

bool add_map_decrement_op(as_operations *ops, const char *bin,
						  as_cdt_ctx *context, Local<Object> obj, LogInfo *log)
{
	as_val *key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_val *decr = NULL;
	if (get_asval_property(&decr, obj, "decr", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_policy policy;
	if (!get_map_policy(&policy, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *key_str = as_val_tostring(key);
		char *decr_str = as_val_tostring(decr);
		as_v8_debug(log, "key=%s, value=%s, order=%i, write_cmd=%i", key_str,
					decr_str, policy.attributes, policy.item_command);
		cf_free(key_str);
		cf_free(decr_str);
	}
	as_operations_map_decrement(ops, bin, context, &policy, key, decr);

	return true;
}

bool add_map_clear_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					  Local<Object> obj, LogInfo *log)
{
	as_operations_map_clear(ops, bin, context);

	return true;
}

bool add_map_remove_by_key_op(as_operations *ops, const char *bin,
							  as_cdt_ctx *context, Local<Object> obj,
							  LogInfo *log)
{
	as_val *key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *key_str = as_val_tostring(key);
		as_v8_debug(log, "key=%s, return_type=%i", key_str, return_type);
		cf_free(key_str);
	}
	as_operations_map_remove_by_key(ops, bin, context, key, return_type);

	return true;
}

bool add_map_remove_by_key_list_op(as_operations *ops, const char *bin,
								   as_cdt_ctx *context, Local<Object> obj,
								   LogInfo *log)
{
	as_list *keys = NULL;
	if (get_list_property(&keys, obj, "keys", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *keys_str = as_val_tostring(keys);
		as_v8_debug(log, "keys=%s, return_type=%i", keys_str, return_type);
		cf_free(keys_str);
	}
	as_operations_map_remove_by_key_list(ops, bin, context, keys, return_type);

	return true;
}

bool add_map_remove_by_key_range_op(as_operations *ops, const char *bin,
									as_cdt_ctx *context, Local<Object> obj,
									LogInfo *log)
{
	bool begin_defined;
	as_val *begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, obj, "begin",
									log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool end_defined;
	as_val *end = NULL;
	if (get_optional_asval_property(&end, &end_defined, obj, "end", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *begin_str = as_val_tostring(begin);
		char *end_str = as_val_tostring(end);
		as_v8_debug(log, "begin=%s, end=%s, return_type=%i", begin_str, end_str,
					return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_map_remove_by_key_range(ops, bin, context, begin, end,
										  return_type);

	return true;
}

bool add_map_remove_by_key_rel_index_range_op(as_operations *ops,
											  const char *bin,
											  as_cdt_ctx *context,
											  Local<Object> op, LogInfo *log)
{
	as_val *key = NULL;
	if (get_asval_property(&key, op, "key", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, op, log)) {
		return false;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char *key_str = as_val_tostring(key);
			as_v8_debug(log, "key=%s, index=%i, count=%i, return_type=%i",
						key_str, index, count, return_type);
			cf_free(key_str);
		}
		as_operations_map_remove_by_key_rel_index_range(
			ops, bin, context, key, index, count, return_type);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *key_str = as_val_tostring(key);
			as_v8_debug(log, "key=%s, index=%i, return_type=%i", key_str, index,
						return_type);
			cf_free(key_str);
		}
		as_operations_map_remove_by_key_rel_index_range_to_end(
			ops, bin, context, key, index, return_type);
	}

	return true;
}

bool add_map_remove_by_value_op(as_operations *ops, const char *bin,
								as_cdt_ctx *context, Local<Object> obj,
								LogInfo *log)
{
	as_val *value = NULL;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *value_str = as_val_tostring(value);
		as_v8_debug(log, "value=%s, return_type=%i", value_str, return_type);
		cf_free(value_str);
	}
	as_operations_map_remove_by_value(ops, bin, context, value, return_type);

	return true;
}

bool add_map_remove_by_value_list_op(as_operations *ops, const char *bin,
									 as_cdt_ctx *context, Local<Object> obj,
									 LogInfo *log)
{
	as_list *values = NULL;
	if (get_list_property(&values, obj, "values", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *values_str = as_val_tostring(values);
		as_v8_debug(log, "values=%s, return_type=%i", values_str, return_type);
		cf_free(values_str);
	}
	as_operations_map_remove_by_value_list(ops, bin, context, values,
										   return_type);

	return true;
}

bool add_map_remove_by_value_range_op(as_operations *ops, const char *bin,
									  as_cdt_ctx *context, Local<Object> obj,
									  LogInfo *log)
{
	bool begin_defined;
	as_val *begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, obj, "begin",
									log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool end_defined;
	as_val *end = NULL;
	if (get_optional_asval_property(&end, &end_defined, obj, "end", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *begin_str = as_val_tostring(begin);
		char *end_str = as_val_tostring(end);
		as_v8_debug(log, "begin=%s, end=%s, return_type=%i", begin_str, end_str,
					return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_map_remove_by_value_range(ops, bin, context, begin, end,
											return_type);

	return true;
}

bool add_map_remove_by_value_rel_rank_range_op(as_operations *ops,
											   const char *bin,
											   as_cdt_ctx *context,
											   Local<Object> op, LogInfo *log)
{
	as_val *value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, op, log)) {
		return false;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "value=%s, rank=%i, count=%i, return_type=%i",
						value_str, rank, count, return_type);
			cf_free(value_str);
		}
		as_operations_map_remove_by_value_rel_rank_range(
			ops, bin, context, value, rank, count, return_type);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "value=%s, rank=%i, return_type=%i", value_str,
						rank, return_type);
			cf_free(value_str);
		}
		as_operations_map_remove_by_value_rel_rank_range_to_end(
			ops, bin, context, value, rank, return_type);
	}

	return true;
}

bool add_map_remove_by_index_op(as_operations *ops, const char *bin,
								as_cdt_ctx *context, Local<Object> obj,
								LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	as_v8_debug(log, "index=%i, return_type=%i", index, return_type);
	as_operations_map_remove_by_index(ops, bin, context, index, return_type);

	return true;
}

bool add_map_remove_by_index_range_op(as_operations *ops, const char *bin,
									  as_cdt_ctx *context, Local<Object> obj,
									  LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count",
									log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (count_defined) {
		as_v8_debug(log, "index=%i, count=%i, return_type=%i", index, count,
					return_type);
		as_operations_map_remove_by_index_range(ops, bin, context, index, count,
												return_type);
	}
	else {
		as_v8_debug(log, "index=%i, return_type=%i", index, return_type);
		as_operations_map_remove_by_index_range_to_end(ops, bin, context, index,
													   return_type);
	}

	return true;
}

bool add_map_remove_by_rank_op(as_operations *ops, const char *bin,
							   as_cdt_ctx *context, Local<Object> obj,
							   LogInfo *log)
{
	int64_t rank;
	if (get_int64_property(&rank, obj, "rank", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	as_v8_debug(log, "rank=%i, return_type=%i", rank, return_type);
	as_operations_map_remove_by_rank(ops, bin, context, rank, return_type);

	return true;
}

bool add_map_remove_by_rank_range_op(as_operations *ops, const char *bin,
									 as_cdt_ctx *context, Local<Object> obj,
									 LogInfo *log)
{
	int64_t rank;
	if (get_int64_property(&rank, obj, "rank", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count",
									log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (count_defined) {
		as_v8_debug(log, "rank=%i, count=%i, return_type=%i", rank, count,
					return_type);
		as_operations_map_remove_by_rank_range(ops, bin, context, rank, count,
											   return_type);
	}
	else {
		as_v8_debug(log, "rank=%i, return_type=%i", rank, return_type);
		as_operations_map_remove_by_rank_range_to_end(ops, bin, context, rank,
													  return_type);
	}

	return true;
}

bool add_map_size_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					 Local<Object> obj, LogInfo *log)
{
	as_operations_map_size(ops, bin, context);

	return true;
}

bool add_map_get_by_key_op(as_operations *ops, const char *bin,
						   as_cdt_ctx *context, Local<Object> obj, LogInfo *log)
{
	as_val *key = NULL;
	if (get_asval_property(&key, obj, "key", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *key_str = as_val_tostring(key);
		as_v8_debug(log, "key=%s, return_type=%i", key_str, return_type);
		cf_free(key_str);
	}
	as_operations_map_get_by_key(ops, bin, context, key, return_type);

	return true;
}

bool add_map_get_by_key_range_op(as_operations *ops, const char *bin,
								 as_cdt_ctx *context, Local<Object> obj,
								 LogInfo *log)
{
	bool begin_defined;
	as_val *begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, obj, "begin",
									log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool end_defined;
	as_val *end = NULL;
	if (get_optional_asval_property(&end, &end_defined, obj, "end", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *begin_str = as_val_tostring(begin);
		char *end_str = as_val_tostring(end);
		as_v8_debug(log, "begin=%s, end=%s, return_type=%i", begin_str, end_str,
					return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_map_get_by_key_range(ops, bin, context, begin, end,
									   return_type);

	return true;
}

bool add_map_get_by_key_rel_index_range_op(as_operations *ops, const char *bin,
										   as_cdt_ctx *context,
										   Local<Object> op, LogInfo *log)
{
	as_val *key = NULL;
	if (get_asval_property(&key, op, "key", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, op, log)) {
		return false;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char *key_str = as_val_tostring(key);
			as_v8_debug(log, "key=%s, index=%i, count=%i, return_type=%i",
						key_str, index, count, return_type);
			cf_free(key_str);
		}
		as_operations_map_get_by_key_rel_index_range(ops, bin, context, key,
													 index, count, return_type);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *key_str = as_val_tostring(key);
			as_v8_debug(log, "key=%s, index=%i, return_type=%i", key_str, index,
						return_type);
			cf_free(key_str);
		}
		as_operations_map_get_by_key_rel_index_range_to_end(
			ops, bin, context, key, index, return_type);
	}

	return true;
}

bool add_map_get_by_value_op(as_operations *ops, const char *bin,
							 as_cdt_ctx *context, Local<Object> obj,
							 LogInfo *log)
{
	as_val *value = NULL;
	if (get_asval_property(&value, obj, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *value_str = as_val_tostring(value);
		as_v8_debug(log, "value=%s, return_type=%i", value_str, return_type);
		cf_free(value_str);
	}
	as_operations_map_get_by_value(ops, bin, context, value, return_type);

	return true;
}

bool add_map_get_by_value_range_op(as_operations *ops, const char *bin,
								   as_cdt_ctx *context, Local<Object> obj,
								   LogInfo *log)
{
	bool begin_defined;
	as_val *begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, obj, "begin",
									log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool end_defined;
	as_val *end = NULL;
	if (get_optional_asval_property(&end, &end_defined, obj, "end", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *begin_str = as_val_tostring(begin);
		char *end_str = as_val_tostring(end);
		as_v8_debug(log, "begin=%s, end=%s, return_type=%i", begin_str, end_str,
					return_type);
		cf_free(begin_str);
		cf_free(end_str);
	}
	as_operations_map_get_by_value_range(ops, bin, context, begin, end,
										 return_type);

	return true;
}

bool add_map_get_by_value_rel_rank_range_op(as_operations *ops, const char *bin,
											as_cdt_ctx *context,
											Local<Object> op, LogInfo *log)
{
	as_val *value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, op, "count", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, op, log)) {
		return false;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "value=%s, rank=%i, count=%i, return_type=%i",
						value_str, rank, count, return_type);
			cf_free(value_str);
		}
		as_operations_map_get_by_value_rel_rank_range(ops, bin, context, value,
													  rank, count, return_type);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "value=%s, rank=%i, return_type=%i", value_str,
						rank, return_type);
			cf_free(value_str);
		}
		as_operations_map_get_by_value_rel_rank_range_to_end(
			ops, bin, context, value, rank, return_type);
	}

	return true;
}

bool add_map_get_by_index_op(as_operations *ops, const char *bin,
							 as_cdt_ctx *context, Local<Object> obj,
							 LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	as_v8_debug(log, "index=%i, return_type=%i", index, return_type);
	as_operations_map_get_by_index(ops, bin, context, index, return_type);

	return true;
}

bool add_map_get_by_index_range_op(as_operations *ops, const char *bin,
								   as_cdt_ctx *context, Local<Object> obj,
								   LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count",
									log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (count_defined) {
		as_v8_debug(log, "index=%i, count=%i, return_type=%i", index, count,
					return_type);
		as_operations_map_get_by_index_range(ops, bin, context, index, count,
											 return_type);
	}
	else {
		as_v8_debug(log, "index=%i, return_type=%i", index, return_type);
		as_operations_map_get_by_index_range_to_end(ops, bin, context, index,
													return_type);
	}

	return true;
}

bool add_map_get_by_rank_op(as_operations *ops, const char *bin,
							as_cdt_ctx *context, Local<Object> obj,
							LogInfo *log)
{
	int64_t rank;
	if (get_int64_property(&rank, obj, "rank", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	as_v8_debug(log, "rank=%i, return_type=%i", rank, return_type);
	as_operations_map_get_by_rank(ops, bin, context, rank, return_type);

	return true;
}

bool add_map_get_by_rank_range_op(as_operations *ops, const char *bin,
								  as_cdt_ctx *context, Local<Object> obj,
								  LogInfo *log)
{
	int64_t rank;
	if (get_int64_property(&rank, obj, "rank", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool count_defined;
	int64_t count;
	if (get_optional_int64_property(&count, &count_defined, obj, "count",
									log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_map_return_type return_type;
	if (!get_map_return_type(&return_type, obj, log)) {
		return false;
	}

	if (count_defined) {
		as_v8_debug(log, "rank=%i, count=%i, return_type=%i", rank, count,
					return_type);
		as_operations_map_get_by_rank_range(ops, bin, context, rank, count,
											return_type);
	}
	else {
		as_v8_debug(log, "rank=%i, return_type=%i", rank, return_type);
		as_operations_map_get_by_rank_range_to_end(ops, bin, context, rank,
												   return_type);
	}

	return true;
}

typedef bool (*MapOperation)(as_operations *ops, const char *bin,
							 as_cdt_ctx *context, Local<Object> op,
							 LogInfo *log);

typedef struct {
	const char *op_name;
	MapOperation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{"MAP_SET_POLICY", add_map_set_policy_op},
	{"MAP_PUT", add_map_put_op},
	{"MAP_PUT_ITEMS", add_map_put_items_op},
	{"MAP_INCREMENT", add_map_increment_op},
	{"MAP_DECREMENT", add_map_decrement_op},
	{"MAP_CLEAR", add_map_clear_op},
	{"MAP_REMOVE_BY_KEY", add_map_remove_by_key_op},
	{"MAP_REMOVE_BY_KEY_LIST", add_map_remove_by_key_list_op},
	{"MAP_REMOVE_BY_KEY_RANGE", add_map_remove_by_key_range_op},
	{"MAP_REMOVE_BY_KEY_REL_INDEX_RANGE",
	 add_map_remove_by_key_rel_index_range_op},
	{"MAP_REMOVE_BY_VALUE", add_map_remove_by_value_op},
	{"MAP_REMOVE_BY_VALUE_LIST", add_map_remove_by_value_list_op},
	{"MAP_REMOVE_BY_VALUE_RANGE", add_map_remove_by_value_range_op},
	{"MAP_REMOVE_BY_VALUE_REL_RANK_RANGE",
	 add_map_remove_by_value_rel_rank_range_op},
	{"MAP_REMOVE_BY_INDEX", add_map_remove_by_index_op},
	{"MAP_REMOVE_BY_INDEX_RANGE", add_map_remove_by_index_range_op},
	{"MAP_REMOVE_BY_RANK", add_map_remove_by_rank_op},
	{"MAP_REMOVE_BY_RANK_RANGE", add_map_remove_by_rank_range_op},
	{"MAP_SIZE", add_map_size_op},
	{"MAP_GET_BY_KEY", add_map_get_by_key_op},
	{"MAP_GET_BY_KEY_RANGE", add_map_get_by_key_range_op},
	{"MAP_GET_BY_KEY_REL_INDEX_RANGE", add_map_get_by_key_rel_index_range_op},
	{"MAP_GET_BY_VALUE", add_map_get_by_value_op},
	{"MAP_GET_BY_VALUE_RANGE", add_map_get_by_value_range_op},
	{"MAP_GET_BY_VALUE_REL_RANK_RANGE", add_map_get_by_value_rel_rank_range_op},
	{"MAP_GET_BY_INDEX", add_map_get_by_index_op},
	{"MAP_GET_BY_INDEX_RANGE", add_map_get_by_index_range_op},
	{"MAP_GET_BY_RANK", add_map_get_by_rank_op},
	{"MAP_GET_BY_RANK_RANGE", add_map_get_by_rank_range_op}};

int add_map_op(as_operations *ops, uint32_t opcode, Local<Object> op,
			   LogInfo *log)
{
	opcode = opcode ^ MAP_OPS_OFFSET;
	const ops_table_entry *entry = &ops_table[opcode];
	if (!entry) {
		return AS_NODE_PARAM_ERR;
	}

	char *bin = NULL;
	if (get_string_property(&bin, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, "context", log) !=
		AS_NODE_PARAM_OK) {
		free(bin);
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log,
				"Adding map operation %s (opcode %i) on bin %s to operations "
				"list, %s CDT context",
				entry->op_name, opcode, bin, with_context ? "with" : "without");
	bool success =
		(entry->op_function)(ops, bin, with_context ? &context : NULL, op, log);

	free(bin);
	if (with_context)
		as_cdt_ctx_destroy(&context);

	return success ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
}

Local<Object> map_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(),
				 Nan::New(MAP_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}
