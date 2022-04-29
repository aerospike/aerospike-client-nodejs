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
#include <aerospike/as_list_operations.h>
}

using namespace v8;

bool get_optional_list_policy(as_list_policy *policy, bool *has_policy,
							  v8::Local<v8::Object> obj, const LogInfo *log)
{
	Nan::HandleScope scope;
	as_list_policy_init(policy);
	Local<Value> maybe_policy_obj =
		Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();

	if (!maybe_policy_obj->IsObject()) {
		as_v8_detail(log, "No valid list policy set - using default policy");
		return true;
	}

	if (maybe_policy_obj->IsUndefined()) {
		if (has_policy != NULL)
			(*has_policy) = false;
		as_v8_detail(log, "No list policy set - using default policy");
		return true;
	}
	else if (!maybe_policy_obj->IsObject()) {
		as_v8_error(log, "Type error: policy should be an Object");
		return false;
	}
	if (has_policy != NULL)
		(*has_policy) = true;
	Local<Object> policy_obj = maybe_policy_obj.As<Object>();

	as_list_order order;
	Local<Value> value =
		Nan::Get(policy_obj, Nan::New("order").ToLocalChecked())
			.ToLocalChecked();
	if (value->IsNumber()) {
		order = (as_list_order)Nan::To<int>(value).FromJust();
	}
	else if (value->IsUndefined()) {
		order = AS_LIST_UNORDERED;
	}
	else {
		as_v8_error(log, "Type error: order should be integer");
		return false;
	}

	as_list_write_flags write_flags;
	value = Nan::Get(policy_obj, Nan::New("writeFlags").ToLocalChecked())
				.ToLocalChecked();
	if (value->IsNumber()) {
		write_flags = (as_list_write_flags)Nan::To<int>(value).FromJust();
	}
	else if (value->IsUndefined()) {
		write_flags = AS_LIST_WRITE_DEFAULT;
	}
	else {
		as_v8_error(log, "Type error: writeFlags should be integer");
		return false;
	}

	as_v8_detail(log, "Setting list policy with order %i and write flags %i",
				 order, write_flags);
	as_list_policy_set(policy, order, write_flags);
	return true;
}

int get_list_return_type(as_list_return_type *return_type, Local<Object> obj,
						 LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New("returnType").ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		(*return_type) = (as_list_return_type)Nan::To<int>(value).FromJust();
	}
	else if (value->IsUndefined()) {
		(*return_type) = AS_LIST_RETURN_NONE;
	}
	else {
		as_v8_error(log, "Type error: returnType should be integer");
		return AS_NODE_PARAM_ERR;
	}

	bool inverted_defined = false;
	bool inverted = false;
	if (get_optional_bool_property(&inverted, &inverted_defined, obj,
								   "inverted", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}
	if (inverted_defined && inverted) {
		as_v8_detail(log, "Inverting list operation");
		(*return_type) =
			(as_list_return_type)((*return_type) | AS_LIST_RETURN_INVERTED);
	}

	as_v8_detail(log, "List return type: %i", (*return_type));
	return AS_NODE_PARAM_OK;
}

bool add_list_set_order_op(as_operations *ops, const char *bin,
						   as_cdt_ctx *context, Local<Object> op, LogInfo *log)
{
	as_list_order order;
	if (get_int_property((int *)&order, op, "order", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "order=%i", order);
	as_operations_list_set_order(ops, bin, context, order);

	return true;
}

bool add_list_sort_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					  Local<Object> op, LogInfo *log)
{
	as_list_sort_flags flags;
	if (get_int_property((int *)&flags, op, "flags", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "flags=%i", flags);
	as_operations_list_sort(ops, bin, context, flags);

	return true;
}

bool add_list_append_op(as_operations *ops, const char *bin,
						as_cdt_ctx *context, Local<Object> op, LogInfo *log)
{
	as_val *val = NULL;
	if (get_asval_property(&val, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool with_policy;
	as_list_policy policy;
	if (!get_optional_list_policy(&policy, &with_policy, op, log)) {
		return false;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char *val_str = as_val_tostring(val);
			as_v8_debug(log, "value=%s, order=%i, flags=%i", val_str,
						policy.order, policy.flags);
			cf_free(val_str);
		}
		as_operations_list_append(ops, bin, context, &policy, val);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *val_str = as_val_tostring(val);
			as_v8_debug(log, "value=%s", val_str);
			cf_free(val_str);
		}
		as_operations_list_append(ops, bin, context, NULL, val);
	}

	return true;
}

bool add_list_append_items_op(as_operations *ops, const char *bin,
							  as_cdt_ctx *context, Local<Object> op,
							  LogInfo *log)
{
	as_list *list = NULL;
	if (get_list_property(&list, op, "list", log) != AS_NODE_PARAM_OK) {
		if (list)
			as_list_destroy(list);
		return false;
	}

	bool with_policy;
	as_list_policy policy;
	if (!get_optional_list_policy(&policy, &with_policy, op, log)) {
		if (list)
			as_list_destroy(list);
		return false;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char *list_str = as_val_tostring(list);
			as_v8_debug(log, "values=%s, order=%i, flags=%i", list_str,
						policy.order, policy.flags);
			cf_free(list_str);
		}
		as_operations_list_append_items(ops, bin, context, &policy, list);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *list_str = as_val_tostring(list);
			as_v8_debug(log, "values=%s", list_str);
			cf_free(list_str);
		}
		as_operations_list_append_items(ops, bin, context, NULL, list);
	}

	return true;
}

bool add_list_insert_op(as_operations *ops, const char *bin,
						as_cdt_ctx *context, Local<Object> op, LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_val *val = NULL;
	if (get_asval_property(&val, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool with_policy;
	as_list_policy policy;
	if (!get_optional_list_policy(&policy, &with_policy, op, log)) {
		return false;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char *val_str = as_val_tostring(val);
			as_v8_debug(log, "index=%i, value=%s, order=%i, flags=%i", index,
						val_str, policy.order, policy.flags);
			cf_free(val_str);
		}
		as_operations_list_insert(ops, bin, context, &policy, index, val);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *val_str = as_val_tostring(val);
			as_v8_debug(log, "index=%i, value=%s", index, val_str);
			cf_free(val_str);
		}
		as_operations_list_insert(ops, bin, context, NULL, index, val);
	}

	return true;
}

bool add_list_insert_items_op(as_operations *ops, const char *bin,
							  as_cdt_ctx *context, Local<Object> op,
							  LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list *list = NULL;
	if (get_list_property(&list, op, "list", log) != AS_NODE_PARAM_OK) {
		if (list)
			as_list_destroy(list);
		return false;
	}

	bool with_policy;
	as_list_policy policy;
	if (!get_optional_list_policy(&policy, &with_policy, op, log)) {
		if (list)
			as_list_destroy(list);
		return false;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char *list_str = as_val_tostring(list);
			as_v8_debug(log, "index=%i, list=%s, order=%i, flags=%i", index,
						list_str, policy.order, policy.flags);
			cf_free(list_str);
		}
		as_operations_list_insert_items(ops, bin, context, &policy, index,
										list);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *list_str = as_val_tostring(list);
			as_v8_debug(log, "index=%i, list=%s", index, list_str);
			cf_free(list_str);
		}
		as_operations_list_insert_items(ops, bin, context, NULL, index, list);
	}

	return true;
}

bool add_list_pop_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					 Local<Object> obj, LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "index=%i", index);
	as_operations_list_pop(ops, bin, context, index);

	return true;
}

bool add_list_pop_range_op(as_operations *ops, const char *bin,
						   as_cdt_ctx *context, Local<Object> obj, LogInfo *log)
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

	if (count_defined) {
		as_v8_debug(log, "index=%i, count=%i", index, count);
		as_operations_list_pop_range(ops, bin, context, index, count);
	}
	else {
		as_v8_debug(log, "index=%i", index);
		as_operations_list_pop_range_from(ops, bin, context, index);
	}

	return true;
}

bool add_list_remove_op(as_operations *ops, const char *bin,
						as_cdt_ctx *context, Local<Object> obj, LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "index=%i", index);
	as_operations_list_remove(ops, bin, context, index);

	return true;
}

bool add_list_remove_range_op(as_operations *ops, const char *bin,
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

	if (count_defined) {
		as_v8_debug(log, "index=%i, count=%i", index, count);
		as_operations_list_remove_range(ops, bin, context, index, count);
	}
	else {
		as_v8_debug(log, "index=%i", index);
		as_operations_list_remove_range_from(ops, bin, context, index);
	}

	return true;
}

bool add_list_remove_by_index_op(as_operations *ops, const char *bin,
								 as_cdt_ctx *context, Local<Object> op,
								 LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "index=%i, return_type=%i", index, return_type);
	as_operations_list_remove_by_index(ops, bin, context, index, return_type);

	return true;
}

bool add_list_remove_by_index_range_op(as_operations *ops, const char *bin,
									   as_cdt_ctx *context, Local<Object> op,
									   LogInfo *log)
{
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

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (count_defined) {
		as_v8_debug(log, "index=%i, count=%i, return_type=%i", index, count,
					return_type);
		as_operations_list_remove_by_index_range(ops, bin, context, index,
												 count, return_type);
	}
	else {
		as_v8_debug(log, "index=%i, return_type=%i", index, return_type);
		as_operations_list_remove_by_index_range_to_end(ops, bin, context,
														index, return_type);
	}

	return true;
}

bool add_list_remove_by_value_op(as_operations *ops, const char *bin,
								 as_cdt_ctx *context, Local<Object> op,
								 LogInfo *log)
{
	as_val *value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *value_str = as_val_tostring(value);
		as_v8_debug(log, "value=%s, return_type=%i", value_str, return_type);
		cf_free(value_str);
	}
	as_operations_list_remove_by_value(ops, bin, context, value, return_type);

	return true;
}

bool add_list_remove_by_value_list_op(as_operations *ops, const char *bin,
									  as_cdt_ctx *context, Local<Object> op,
									  LogInfo *log)
{
	as_list *values = NULL;
	if (get_list_property(&values, op, "values", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *values_str = as_val_tostring(values);
		as_v8_debug(log, "values=%s, return_type=%i", values_str, return_type);
		cf_free(values_str);
	}
	as_operations_list_remove_by_value_list(ops, bin, context, values,
											return_type);

	return true;
}

bool add_list_remove_by_value_range_op(as_operations *ops, const char *bin,
									   as_cdt_ctx *context, Local<Object> op,
									   LogInfo *log)
{
	bool begin_defined;
	as_val *begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, op, "begin", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	bool end_defined;
	as_val *end = NULL;
	if (get_optional_asval_property(&end, &end_defined, op, "end", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
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
	as_operations_list_remove_by_value_range(ops, bin, context, begin, end,
											 return_type);

	return true;
}

bool add_list_remove_by_value_rel_rank_range_op(as_operations *ops,
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

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "value=%s, rank=%i, count=%i, return_type=%i",
						value_str, rank, count, return_type);
			cf_free(value_str);
		}
		as_operations_list_remove_by_value_rel_rank_range(
			ops, bin, context, value, rank, count, return_type);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "value=%s, rank=%i, return_type=%i", value_str,
						rank, return_type);
			cf_free(value_str);
		}
		as_operations_list_remove_by_value_rel_rank_range_to_end(
			ops, bin, context, value, rank, return_type);
	}

	return true;
}

bool add_list_remove_by_rank_op(as_operations *ops, const char *bin,
								as_cdt_ctx *context, Local<Object> op,
								LogInfo *log)
{
	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "rank=%i, return_type=%i", rank, return_type);
	as_operations_list_remove_by_rank(ops, bin, context, rank, return_type);

	return true;
}

bool add_list_remove_by_rank_range_op(as_operations *ops, const char *bin,
									  as_cdt_ctx *context, Local<Object> op,
									  LogInfo *log)
{
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

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (count_defined) {
		as_v8_debug(log, "rank=%i, count=%i, return_type=%i", rank, count,
					return_type);
		as_operations_list_remove_by_rank_range(ops, bin, context, rank, count,
												return_type);
	}
	else {
		as_v8_debug(log, "rank=%i, return_type=%i", rank, return_type);
		as_operations_list_remove_by_rank_range_to_end(ops, bin, context, rank,
													   return_type);
	}

	return true;
}

bool add_list_clear_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					   Local<Object> obj, LogInfo *log)
{
	as_operations_list_clear(ops, bin, context);

	return true;
}

bool add_list_set_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					 Local<Object> obj, LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_val *val = NULL;
	if (get_asval_property(&val, obj, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool with_policy;
	as_list_policy policy;
	if (!get_optional_list_policy(&policy, &with_policy, obj, log)) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *val_str = as_val_tostring(val);
		as_v8_debug(log, "index=%i, value=%s", index, val_str);
		cf_free(val_str);
	}
	as_operations_list_set(ops, bin, context, with_policy ? &policy : NULL,
						   index, val);

	return true;
}

bool add_list_trim_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					  Local<Object> obj, LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	int64_t count;
	if (get_int64_property(&count, obj, "count", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "index=%i, count=%i", index, count);
	as_operations_list_trim(ops, bin, context, index, count);

	return true;
}

bool add_list_get_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					 Local<Object> obj, LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, obj, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "index=%i", index);
	as_operations_list_get(ops, bin, context, index);

	return true;
}

bool add_list_get_range_op(as_operations *ops, const char *bin,
						   as_cdt_ctx *context, Local<Object> obj, LogInfo *log)
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

	if (count_defined) {
		as_v8_debug(log, "index=%i, count=%i", index, count);
		as_operations_list_get_range(ops, bin, context, index, count);
	}
	else {
		as_v8_debug(log, "index=%i", index);
		as_operations_list_get_range_from(ops, bin, context, index);
	}

	return true;
}

bool add_list_get_by_index_op(as_operations *ops, const char *bin,
							  as_cdt_ctx *context, Local<Object> op,
							  LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "index=%i, return_type=%i", index, return_type);
	as_operations_list_get_by_index(ops, bin, context, index, return_type);

	return true;
}

bool add_list_get_by_index_range_op(as_operations *ops, const char *bin,
									as_cdt_ctx *context, Local<Object> op,
									LogInfo *log)
{
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

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (count_defined) {
		as_v8_debug(log, "index=%i, count=%i, return_type=%i", index, count,
					return_type);
		as_operations_list_get_by_index_range(ops, bin, context, index, count,
											  return_type);
	}
	else {
		as_v8_debug(log, "index=%i, return_type=%i", index, return_type);
		as_operations_list_get_by_index_range_to_end(ops, bin, context, index,
													 return_type);
	}

	return true;
}

bool add_list_get_by_value_op(as_operations *ops, const char *bin,
							  as_cdt_ctx *context, Local<Object> op,
							  LogInfo *log)
{
	as_val *value = NULL;
	if (get_asval_property(&value, op, "value", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *value_str = as_val_tostring(value);
		as_v8_debug(log, "value=%s, return_type=%i", value_str, return_type);
		cf_free(value_str);
	}
	as_operations_list_get_by_value(ops, bin, context, value, return_type);

	return true;
}

bool add_list_get_by_value_list_op(as_operations *ops, const char *bin,
								   as_cdt_ctx *context, Local<Object> op,
								   LogInfo *log)
{
	as_list *values = NULL;
	if (get_list_property(&values, op, "values", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (as_v8_debug_enabled(log)) {
		char *values_str = as_val_tostring(values);
		as_v8_debug(log, "values=%s, return_type=%i", values_str, return_type);
		cf_free(values_str);
	}
	as_operations_list_get_by_value_list(ops, bin, context, values,
										 return_type);

	return true;
}

bool add_list_get_by_value_range_op(as_operations *ops, const char *bin,
									as_cdt_ctx *context, Local<Object> op,
									LogInfo *log)
{
	bool begin_defined;
	as_val *begin = NULL;
	if (get_optional_asval_property(&begin, &begin_defined, op, "begin", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	bool end_defined;
	as_val *end = NULL;
	if (get_optional_asval_property(&end, &end_defined, op, "end", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
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
	as_operations_list_get_by_value_range(ops, bin, context, begin, end,
										  return_type);

	return true;
}

bool add_list_get_by_value_rel_rank_range_op(as_operations *ops,
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

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (count_defined) {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "value=%s, rank=%i, count=%i, return_type=%i",
						value_str, rank, count, return_type);
			cf_free(value_str);
		}
		as_operations_list_get_by_value_rel_rank_range(
			ops, bin, context, value, rank, count, return_type);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "value=%s, rank=%i, return_type=%i", value_str,
						rank, return_type);
			cf_free(value_str);
		}
		as_operations_list_get_by_value_rel_rank_range_to_end(
			ops, bin, context, value, rank, return_type);
	}

	return true;
}

bool add_list_get_by_rank_op(as_operations *ops, const char *bin,
							 as_cdt_ctx *context, Local<Object> op,
							 LogInfo *log)
{
	int64_t rank;
	if (get_int64_property(&rank, op, "rank", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	as_v8_debug(log, "rank=%i, return_type=%i", rank, return_type);
	as_operations_list_get_by_rank(ops, bin, context, rank, return_type);

	return true;
}

bool add_list_get_by_rank_range_op(as_operations *ops, const char *bin,
								   as_cdt_ctx *context, Local<Object> op,
								   LogInfo *log)
{
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

	as_list_return_type return_type;
	if (get_list_return_type(&return_type, op, log) != AS_NODE_PARAM_OK) {
		return false;
	}

	if (count_defined) {
		as_v8_debug(log, "rank=%i, count=%i, return_type=%i", rank, count,
					return_type);
		as_operations_list_get_by_rank_range(ops, bin, context, rank, count,
											 return_type);
	}
	else {
		as_v8_debug(log, "rank=%i, return_type=%i", rank, return_type);
		as_operations_list_get_by_rank_range_to_end(ops, bin, context, rank,
													return_type);
	}

	return true;
}

bool add_list_increment_op(as_operations *ops, const char *bin,
						   as_cdt_ctx *context, Local<Object> op, LogInfo *log)
{
	int64_t index;
	if (get_int64_property(&index, op, "index", log) != AS_NODE_PARAM_OK) {
		return false;
	}

	bool value_defined;
	as_val *value = NULL;
	if (get_optional_asval_property(&value, &value_defined, op, "value", log) !=
		AS_NODE_PARAM_OK) {
		return false;
	}

	bool with_policy;
	as_list_policy policy;
	if (!get_optional_list_policy(&policy, &with_policy, op, log)) {
		return false;
	}

	if (with_policy) {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "index=%i, value=%s, order=%i, flags=%i", index,
						value_str, policy.order, policy.flags);
			cf_free(value_str);
		}
		as_operations_list_increment(ops, bin, context, &policy, index, value);
	}
	else {
		if (as_v8_debug_enabled(log)) {
			char *value_str = as_val_tostring(value);
			as_v8_debug(log, "index=%i, value=%s", index, value_str);
			cf_free(value_str);
		}
		as_operations_list_increment(ops, bin, context, NULL, index, value);
	}

	return true;
}

bool add_list_size_op(as_operations *ops, const char *bin, as_cdt_ctx *context,
					  Local<Object> obj, LogInfo *log)
{
	as_operations_list_size(ops, bin, context);

	return true;
}

typedef bool (*ListOperation)(as_operations *ops, const char *bin,
							  as_cdt_ctx *context, Local<Object> op,
							  LogInfo *log);

typedef struct {
	const char *op_name;
	ListOperation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{"LIST_SET_ORDER", add_list_set_order_op},
	{"LIST_SORT", add_list_sort_op},
	{"LIST_APPEND", add_list_append_op},
	{"LIST_APPEND_ITEMS", add_list_append_items_op},
	{"LIST_INSERT", add_list_insert_op},
	{"LIST_INSERT_ITEMS", add_list_insert_items_op},
	{"LIST_POP", add_list_pop_op},
	{"LIST_POP_RANGE", add_list_pop_range_op},
	{"LIST_REMOVE", add_list_remove_op},
	{"LIST_REMOVE_RANGE", add_list_remove_range_op},
	{"LIST_REMOVE_BY_INDEX", add_list_remove_by_index_op},
	{"LIST_REMOVE_BY_INDEX_RANGE", add_list_remove_by_index_range_op},
	{"LIST_REMOVE_BY_VALUE", add_list_remove_by_value_op},
	{"LIST_REMOVE_BY_VALUE_LIST", add_list_remove_by_value_list_op},
	{"LIST_REMOVE_BY_VALUE_RANGE", add_list_remove_by_value_range_op},
	{"LIST_REMOVE_BY_VALUE_REL_RANK_RANGE",
	 add_list_remove_by_value_rel_rank_range_op},
	{"LIST_REMOVE_BY_RANK", add_list_remove_by_rank_op},
	{"LIST_REMOVE_BY_RANK_RANGE", add_list_remove_by_rank_range_op},
	{"LIST_CLEAR", add_list_clear_op},
	{"LIST_SET", add_list_set_op},
	{"LIST_TRIM", add_list_trim_op},
	{"LIST_GET", add_list_get_op},
	{"LIST_GET_RANGE", add_list_get_range_op},
	{"LIST_GET_BY_INDEX", add_list_get_by_index_op},
	{"LIST_GET_BY_INDEX_RANGE", add_list_get_by_index_range_op},
	{"LIST_GET_BY_VALUE", add_list_get_by_value_op},
	{"LIST_GET_BY_VALUE_LIST", add_list_get_by_value_list_op},
	{"LIST_GET_BY_VALUE_RANGE", add_list_get_by_value_range_op},
	{"LIST_GET_BY_VALUE_REL_RANK_RANGE",
	 add_list_get_by_value_rel_rank_range_op},
	{"LIST_GET_BY_RANK", add_list_get_by_rank_op},
	{"LIST_GET_BY_RANK_RANGE", add_list_get_by_rank_range_op},
	{"LIST_INCREMENT", add_list_increment_op},
	{"LIST_SIZE", add_list_size_op}};

int add_list_op(as_operations *ops, uint32_t opcode, Local<Object> op,
				LogInfo *log)
{
	opcode = opcode ^ LIST_OPS_OFFSET;
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
				"Adding list operation %s (opcode %i) on bin %s to operations "
				"list, %s CDT context",
				entry->op_name, opcode, bin, with_context ? "with" : "without");
	bool success =
		(entry->op_function)(ops, bin, with_context ? &context : NULL, op, log);

	free(bin);
	if (with_context)
		as_cdt_ctx_destroy(&context);

	return success ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
}

Local<Object> list_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(),
				 Nan::New(LIST_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}
