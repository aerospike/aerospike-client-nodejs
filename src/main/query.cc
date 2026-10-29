/*******************************************************************************
 * Copyright 2013-2026 Aerospike, Inc.
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
#include <string>

#include "async.h"
#include "client.h"
#include "conversions.h"
#include "operations.h"
#include "expressions.h"
#include "log.h"
#include "query.h"

extern "C" {
#include <aerospike/as_query.h>
#include <aerospike/as_exp.h>
}

using namespace v8;

as_status setup_query(as_query *query, Local<Value> ns, Local<Value> set,
				 Local<Value> maybe_options, as_cdt_ctx* context, bool* with_context, as_exp **exp, as_error *err, LogInfo *log)
{
	as_namespace as_ns = {'\0'};
	as_set as_set = {'\0'};

	if (as_strlcpy(as_ns, *Nan::Utf8String(ns), AS_NAMESPACE_MAX_SIZE) >
		AS_NAMESPACE_MAX_SIZE) {
		as_v8_error(log, "Namespace exceeds max. length (%d)",
					AS_NAMESPACE_MAX_SIZE);
		// TODO: Return param error
	}

	if (set->IsString()) {
		if (as_strlcpy(as_set, *Nan::Utf8String(set), AS_SET_MAX_SIZE) >
			AS_SET_MAX_SIZE) {
			as_v8_error(log, "Set exceeds max. length (%d)", AS_SET_MAX_SIZE);
			// TODO: Return param error
		}
	}
	as_query_init(query, as_ns, as_set);

	if (!maybe_options->IsObject()) {
		return AEROSPIKE_OK;
	}

	return setup_options(query, maybe_options.As<Object>(), context, with_context, exp, err, log);
}

as_status setup_options(as_query *query, Local<Object> options, as_cdt_ctx* context, bool* with_context, as_exp **exp, as_error *err, LogInfo *log)
{

	Local<Value> filters_val =
		Nan::Get(options, Nan::New("filters").ToLocalChecked())
			.ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, filters_val, IsArray, "filters must be an array");
	if (filters_val->IsArray()) {
		Local<Array> filters = Local<Array>::Cast(filters_val);
		int size = filters->Length();
		as_v8_detail(log, "Number of filters in query: %d", size);
		as_query_where_init(query, size);
		for (int i = 0; i < size; i++) {
			Local<Object> filter =
				Nan::Get(filters, i).ToLocalChecked().As<Object>();
			if(!(*with_context)){
				if (get_optional_cdt_context(context, with_context, filter, "context", log) !=
					AS_NODE_PARAM_OK) {
					as_v8_error(log, "Parsing context arguments for query index filter failed");
					return as_error_update(err, AEROSPIKE_ERR_PARAM, "Error in filter context");
				}
			}

			std::string bin_name;
			std::string index_name;

			Local<Value> v8_bin =
				Nan::Get(filter, Nan::New("bin").ToLocalChecked())
					.ToLocalChecked();
			Local<Value> v8_index_name =
				Nan::Get(filter, Nan::New("indexName").ToLocalChecked())
					.ToLocalChecked();
			Local<Value> v8_exp =
				Nan::Get(filter, Nan::New("exp").ToLocalChecked())
					.ToLocalChecked();



			if (v8_exp->IsArray()) {

				if (v8_index_name->IsString()) {
					as_v8_error(log, "Index name must not be defined if expression is defined");
					return as_error_update(err, AEROSPIKE_ERR_PARAM, "Index name must not be defined if expression is defined");
				}

				if (v8_bin->IsString()) {
					as_v8_error(log, "Bin name must not be defined if expression is defined");
					return as_error_update(err, AEROSPIKE_ERR_PARAM, "Bin name must not be defined if expression is defined");
				}

				Local<Array> exp_ary = Local<Array>::Cast(v8_exp);
				if (compile_expression(exp_ary, exp, log) != AS_NODE_PARAM_OK) {
					return as_error_update(err, AEROSPIKE_ERR_PARAM, "Expressions could not be compiled");
				}

			}
			else if (v8_exp->IsString()) {

				if (v8_index_name->IsString()) {
					as_v8_error(log, "Index name must not be defined if expression is defined");
					return as_error_update(err, AEROSPIKE_ERR_PARAM, "Index name must not be defined if expression is defined");
				}

				if (v8_bin->IsString()) {
					as_v8_error(log, "Bin name must not be defined if expression is defined");
					return as_error_update(err, AEROSPIKE_ERR_PARAM, "Bin name must not be defined if expression is defined");
				}

				Nan::Utf8String exp_b64(v8_exp.As<String>());
				*exp = as_exp_from_base64(*exp_b64);
			}
			else if (v8_index_name->IsString()) {
				if (v8_bin->IsString()) {
					as_v8_error(log, "Bin name must not be defined if index name is defined");
					return as_error_update(err, AEROSPIKE_ERR_PARAM, "Bin name must not be defined if index name is defined");
				}
				index_name = *Nan::Utf8String(v8_index_name);
			}
			else if (v8_bin->IsString()) {
				bin_name = *Nan::Utf8String(v8_bin);
			}
			else {
				as_v8_error(log, "Bin, Index Name, or Expression must have valid type");
				return as_error_update(err, AEROSPIKE_ERR_PARAM, "Bin, Index Name, or Expression must have valid type");
			}


			as_predicate_type predicate =
				(as_predicate_type)Nan::To<int>(
					Nan::Get(filter, Nan::New("predicate").ToLocalChecked())
						.ToLocalChecked())
					.FromJust();
			as_index_type type =
				(as_index_type)Nan::To<int>(
					Nan::Get(filter, Nan::New("type").ToLocalChecked())
						.ToLocalChecked())
					.FromJust();
			as_index_datatype datatype =
				(as_index_datatype)Nan::To<int>(
					Nan::Get(filter, Nan::New("datatype").ToLocalChecked())
						.ToLocalChecked())
					.FromJust();
			as_v8_debug(log,
						"Building filter on predicate type %d, index type %d, "
						"data type %d, bin name '%s'",
						predicate, type, datatype, bin_name.c_str());
			switch (predicate) {
				case AS_PREDICATE_RANGE: {
					if (datatype == AS_INDEX_NUMERIC) {
						Local<Value> v8min =
							Nan::Get(filter, Nan::New("min").ToLocalChecked())
								.ToLocalChecked();
						Local<Value> v8max =
							Nan::Get(filter, Nan::New("max").ToLocalChecked())
								.ToLocalChecked();
						if (v8min->IsNumber() && v8max->IsNumber()) {
							const int64_t min = Nan::To<int64_t>(v8min).FromJust();
							const int64_t max = Nan::To<int64_t>(v8max).FromJust();
							if(*exp){
								as_query_where_with_exp(query, *exp, predicate, type,
											   datatype, min, max);
							}
							else if (!index_name.empty()) {
								as_query_where_with_index_name(query, index_name.c_str(), predicate, type,
											   datatype, min, max);
							}
							else {
								as_query_where_with_ctx(query, bin_name.c_str(), *with_context ? context : NULL, predicate, type,
										   datatype, min, max);

							}
							as_v8_debug(log,
										"Integer range predicate from %llu to %llu",
										min, max);
						}
						else {
							as_v8_error(log, "The min/max of the range value "
											 "passed must both be integers.");
							return as_error_update(err, AEROSPIKE_ERR_PARAM,
												   "The min/max of the range value passed "
												   "must both be integers.");
						}
					}
					else if (datatype == AS_INDEX_GEO2DSPHERE) {
						Local<Value> value =
							Nan::Get(filter, Nan::New("val").ToLocalChecked())
								.ToLocalChecked();
						if (!value->IsString()) {
							as_v8_error(
								log,
								"The region value passed must be a GeoJSON string");
							return as_error_update(err, AEROSPIKE_ERR_PARAM,
								"The region value passed is not a GeoJSON string");
						}
						const char *bin_val = strdup(*Nan::Utf8String(value));

						if(*exp){
							as_query_where_with_exp(query, *exp, predicate, type,
										   datatype, bin_val);
						}
						else if (!index_name.empty()) {
							as_query_where_with_index_name(query, index_name.c_str(), predicate, type,
										   datatype, bin_val);
						}
						else {
							as_query_where_with_ctx(query, bin_name.c_str(), *with_context ? context : NULL, predicate, type,
									   	   datatype, bin_val);

						}

						as_v8_debug(log, "Geo range predicate %s", bin_val);
					}
					break;
				}
				case AS_PREDICATE_EQUAL: {
					if (datatype == AS_INDEX_NUMERIC) {
						Local<Value> value =
							Nan::Get(filter, Nan::New("val").ToLocalChecked())
								.ToLocalChecked();
						if (value->IsNumber()) {
							const int64_t val = Nan::To<int64_t>(value).FromJust();




							if(*exp){
								as_query_where_with_exp(query, *exp, predicate, type,
											   datatype, val);
							}
							else if (!index_name.empty()) {
								as_query_where_with_index_name(query, index_name.c_str(), predicate, type,
											   datatype, val);
							}
							else {
								as_query_where_with_ctx(query, bin_name.c_str(), *with_context ? context : NULL, predicate, type,
										   	   datatype, val);
							}

							as_v8_debug(log, "Integer equality predicate %d", val);
						}
						else {
							as_v8_error(log, "querying a numeric index with equal "
											 "predicate - value must be a number");
							return as_error_update(err, AEROSPIKE_ERR_PARAM,
												   "Querying an numeric index with equal "
												   "predicate - value is not a number");
						}
					}
					else if (datatype == AS_INDEX_STRING) {
						Local<Value> value =
							Nan::Get(filter, Nan::New("val").ToLocalChecked())
								.ToLocalChecked();
						if (!value->IsString()) {
							as_v8_error(log, "querying a string index with equal "
											 "predicate - value must be a string");
							return as_error_update(err, AEROSPIKE_ERR_PARAM,
												   "Querying a string index with equal "
												   "predicate - value is not a string");
						}
						const char *bin_val = strdup(*Nan::Utf8String(value));

						if(*exp){
							as_query_where_with_exp(query, *exp, predicate, type,
										   datatype, bin_val);
						}
						else if (!index_name.empty()) {
							as_query_where_with_index_name(query, index_name.c_str(), predicate, type,
										   datatype, bin_val);
						}
						else {
							as_query_where_with_ctx(query, bin_name.c_str(), *with_context ? context : NULL, predicate, type,
									   	   datatype, bin_val);

						}

						as_v8_debug(log, "String equality predicate %s", bin_val);
					}
					else if (datatype == AS_INDEX_BLOB) {
						Local<Value> value =
							Nan::Get(filter, Nan::New("val").ToLocalChecked())
								.ToLocalChecked();
						if (!node::Buffer::HasInstance(value)) {
							as_v8_error(
								log,
								"The region value passed must be a Buffer");
							return as_error_update(err, AEROSPIKE_ERR_PARAM,
								"The region value passed is not a buffer");
						}
						uint8_t *bytes;
						int size = 0;
						get_bytes_property(&bytes, &size, filter, "val" , log);

						if(*exp){
							as_query_where_with_exp(query, *exp, predicate, type,
										   datatype, bytes, size, true);
						}
						else if (!index_name.empty()) {
							as_query_where_with_index_name(query, index_name.c_str(), predicate, type,
										   datatype, bytes, size, true);
						}
						else {
							as_query_where_with_ctx(query, bin_name.c_str(), *with_context ? context : NULL, predicate, type,
									   	   datatype, bytes, size, true);

						}

						as_v8_debug(log, "Blob equality predicate");
					}
					break;
				}
			}
		}
	}

	Local<Value> selected =
		Nan::Get(options, Nan::New("selected").ToLocalChecked())
			.ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, selected, IsArray, "selected must be an array");
	if (selected->IsArray()) {
		Local<Array> bins = Local<Array>::Cast(selected);
		int size = bins->Length();
		as_v8_detail(log, "Number of bins to select in query %d", size);
		as_query_select_init(query, size);
		for (int i = 0; i < size; i++) {
			Local<Value> bin = Nan::Get(bins, i).ToLocalChecked();
			if (!bin->IsString()) {
				as_v8_error(log, "Bin value passed must be string");
				return as_error_update(err, AEROSPIKE_ERR_PARAM, "Bin name passed is not a string");
			}
			as_query_select(query, *Nan::Utf8String(bin));
			as_v8_detail(log, "bin %d = %s", i, *Nan::Utf8String(bin));
		}
	}

	Local<Value> nobins =
		Nan::Get(options, Nan::New("nobins").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, nobins, IsBoolean, "nobins must be a boolean");
	if (nobins->IsBoolean()) {
		query->no_bins = Nan::To<bool>(nobins).FromJust();
	}

	Local<Value> max_records =
		Nan::Get(options, Nan::New("maxRecords").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, max_records, IsNumber, "max_records must be a number");
	if (max_records->IsNumber()) {
		query->max_records = (uint64_t) Nan::To<uint32_t>(max_records).FromJust();
	}

	Local<Value> ttl =
		Nan::Get(options, Nan::New("ttl").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, ttl, IsNumber, "ttl must be a number");
	if (ttl->IsNumber()) {
		query->ttl = (uint64_t) Nan::To<uint32_t>(ttl).FromJust();
	}


	Local<Value> udf =
		Nan::Get(options, Nan::New("udf").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, udf, IsObject, "udf must be an object");
	if (udf->IsObject()) {
		char module[255];
		char func[255];
		char *filename = module;
		char *funcname = func;
		as_list *arglist = NULL;
		int status = udfargs_from_jsobject(&filename, &funcname, &arglist,
										   udf.As<Object>(), log);
		if (status != 0) {
			as_v8_error(log, "Parsing UDF arguments for query object failed");
			return as_error_update(err, AEROSPIKE_ERR_PARAM, "Error in parsing the UDF parameters");
		}
		as_query_apply(query, filename, funcname, arglist);
	}

	Local<Value> maybeOps =
		Nan::Get(options, Nan::New("ops").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, maybeOps, IsArray, "ops must be an array");
	if (maybeOps->IsArray()) {
		Local<Array> ops = maybeOps.As<Array>();
		as_v8_debug(log, "Adding operations to background query");
		query->ops = as_operations_new(ops->Length());
		if (operations_from_jsarray(query->ops, ops, log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing ops arguments for query object failed");
			return as_error_update(err, AEROSPIKE_ERR_PARAM, "Error in parsing the operations");
		}
	}

	// Top-K: the C client checks the Top-K rules before sending. These checks
	// cover what it can't see: the JS value types, and a NUL that would cut a
	// bin name short so the query orders by a different bin.
	Local<Value> maybe_order_by_keys =
		Nan::Get(options, Nan::New("orderByKeys").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, maybe_order_by_keys, IsArray, "orderByKeys must be an array");
	if (maybe_order_by_keys->IsArray()) {
		Local<Array> order_by_keys = maybe_order_by_keys.As<Array>();
		for (uint32_t i = 0; i < order_by_keys->Length(); i++) {
			Local<Value> maybe_key = Nan::Get(order_by_keys, i).ToLocalChecked();
			if (!maybe_key->IsObject()) {
				return as_error_update(err, AEROSPIKE_ERR_PARAM, "Each order key must be an object");
			}
			Local<Object> key = maybe_key.As<Object>();
			Local<Value> v8_bin = Nan::Get(key, Nan::New("bin").ToLocalChecked()).ToLocalChecked();
			Local<Value> v8_type = Nan::Get(key, Nan::New("type").ToLocalChecked()).ToLocalChecked();
			Local<Value> v8_direction = Nan::Get(key, Nan::New("direction").ToLocalChecked()).ToLocalChecked();
			Local<Value> v8_flags = Nan::Get(key, Nan::New("flags").ToLocalChecked()).ToLocalChecked();
			if (!v8_bin->IsString()) {
				return as_error_update(err, AEROSPIKE_ERR_PARAM, "Order key bin must be a string");
			}
			if (!v8_type->IsUint32()) {
				return as_error_update(err, AEROSPIKE_ERR_PARAM, "Order key type must be one of Aerospike.orderByType");
			}
			if (!v8_direction->IsUint32()) {
				return as_error_update(err, AEROSPIKE_ERR_PARAM, "Order key direction must be one of Aerospike.order");
			}
			if (!v8_flags->IsUint32()) {
				return as_error_update(err, AEROSPIKE_ERR_PARAM, "Order key flags must be a combination of Aerospike.orderByFlags");
			}
			Nan::Utf8String bin(v8_bin);
			if (strlen(*bin) != (size_t)bin.length()) {
				return as_error_update(err, AEROSPIKE_ERR_PARAM, "Order key bin name must not contain NUL");
			}
			as_query_order_by_type type = (as_query_order_by_type)Nan::To<uint32_t>(v8_type).FromJust();
			as_order direction = (as_order)Nan::To<uint32_t>(v8_direction).FromJust();
			as_query_order_by_flags flags = Nan::To<uint32_t>(v8_flags).FromJust();
			if (i == 0) {
				as_query_order_by(query, *bin, type, direction, flags);
			}
			else {
				as_query_then_order_by(query, *bin, type, direction, flags);
			}
		}
	}

	Local<Value> top_k =
		Nan::Get(options, Nan::New("topKLimit").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT_ERR(err, top_k, IsUint32, "topK must be an integer from 1 to 1000");
	if (top_k->IsUint32()) {
		as_query_top_k(query, Nan::To<uint32_t>(top_k).FromJust());
	}

	return AEROSPIKE_OK;
}

as_status setup_query_pages(as_query** query, Local<Value> ns, Local<Value> set,
				Local<Value> maybe_options, uint8_t* bytes, uint32_t bytes_size,
				as_cdt_ctx* context, bool* with_context, as_exp **exp, as_error *err, LogInfo *log)
{
	as_namespace as_ns = {'\0'};
	as_set as_set = {'\0'};

	if (as_strlcpy(as_ns, *Nan::Utf8String(ns), AS_NAMESPACE_MAX_SIZE) >
		AS_NAMESPACE_MAX_SIZE) {
		as_v8_error(log, "Namespace exceeds max. length (%d)",
					AS_NAMESPACE_MAX_SIZE);
		// TODO: Return param error
	}

	if (set->IsString()) {
		if (as_strlcpy(as_set, *Nan::Utf8String(set), AS_SET_MAX_SIZE) >
			AS_SET_MAX_SIZE) {
			as_v8_error(log, "Set exceeds max. length (%d)", AS_SET_MAX_SIZE);
			// TODO: Return param error
		}
	}

	*query = as_query_new(as_ns, as_set);

	if(bytes_size){
		*query = as_query_from_bytes_new(bytes, bytes_size);
		return AEROSPIKE_OK;
	}
	as_query_set_paginate(*query, true);

	if (!maybe_options->IsObject()) {
		return AEROSPIKE_OK;
	}

	return setup_options(*query, maybe_options.As<Object>(), context, with_context, exp, err, log);
}


void free_query(as_query *query, as_policy_query *policy, as_exp *exp)
{
	if (query) {
		as_query_destroy(query);
	}

	if (policy) {
		if (policy->base.filter_exp) {
			as_exp_destroy(policy->base.filter_exp);
		}
	}

	if (exp) {
		as_exp_destroy(exp);
	}

}
