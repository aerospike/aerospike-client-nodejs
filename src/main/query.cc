/*******************************************************************************
 * Copyright 2013-2023 Aerospike, Inc.
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

void setup_query(as_query *query, Local<Value> ns, Local<Value> set,
				 Local<Value> maybe_options, as_cdt_ctx* context, bool* with_context, as_exp **exp, LogInfo *log)
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
		return;
	}

	setup_options(query, maybe_options.As<Object>(), context, with_context, exp, log);


}

void setup_options(as_query *query, Local<Object> options, as_cdt_ctx* context, bool* with_context, as_exp **exp, LogInfo *log)
{

	Local<Value> filters_val =
		Nan::Get(options, Nan::New("filters").ToLocalChecked())
			.ToLocalChecked();
	TYPE_CHECK_OPT(filters_val, IsArray, "filters must be an array");
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
					Nan::ThrowTypeError("Error in filter context");
				}				
			}

			char *bin_name = NULL;
			char *index_name = NULL;

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
					Nan::ThrowError("Index name must not be defined if expression is defined");
				}

				if (v8_bin->IsString()) {
					as_v8_error(log, "Bin name must not be defined if expression is defined");
					Nan::ThrowError("Bin name must not be defined if expression is defined");
				}

				Local<Array> exp_ary = Local<Array>::Cast(v8_exp);
				if (compile_expression(exp_ary, exp, log) != AS_NODE_PARAM_OK) {
					Nan::ThrowError("Expressions could not be compiled");
				}

			}
			else if (v8_index_name->IsString()) {
				if (v8_bin->IsString()) {
					as_v8_error(log, "Bin name must not be defined if index name is defined");
					Nan::ThrowError("Bin name must not be defined if index name is defined");
				}
				index_name = strdup(*Nan::Utf8String(v8_index_name));
			}
			else if (v8_bin->IsString()) {
				bin_name = strdup(*Nan::Utf8String(v8_bin));
			}
			else {
				as_v8_error(log, "Bin, Index Name, or Expression must have valid type");
				Nan::ThrowError("Bin, Index Name, or Expression must have valid type");
				
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
						predicate, type, datatype, bin_name);
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
							else if (index_name) {
								as_query_where_with_index_name(query, index_name, predicate, type,
											   datatype, min, max);
							}
							else {
								as_query_where_with_ctx(query, bin_name, *with_context ? context : NULL, predicate, type,
										   datatype, min, max);
							
							}
							as_v8_debug(log,
										"Integer range predicate from %llu to %llu",
										min, max);
						}
						else {
							as_v8_error(log, "The min/max of the range value "
											 "passed must both be integers.");
							Nan::ThrowError("The min/max of the range value passed "
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
							Nan::ThrowError(
								"The region value passed is not a GeoJSON string");

							
						}
						const char *bin_val = strdup(*Nan::Utf8String(value));

						if(*exp){
							as_query_where_with_exp(query, *exp, predicate, type,
										   datatype, bin_val);
						}
						else if (index_name) {
							as_query_where_with_index_name(query, index_name, predicate, type,
										   datatype, bin_val);
						}
						else {
							as_query_where_with_ctx(query, bin_name, *with_context ? context : NULL, predicate, type,
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
							else if (index_name) {
								as_query_where_with_index_name(query, index_name, predicate, type,
											   datatype, val);
							}
							else {
								as_query_where_with_ctx(query, bin_name, *with_context ? context : NULL, predicate, type,
										   	   datatype, val);							
							}

							as_v8_debug(log, "Integer equality predicate %d", val);
						}
						else {
							as_v8_error(log, "querying a numeric index with equal "
											 "predicate - value must be a number");
							Nan::ThrowError("Querying an numeric index with equal "
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
							Nan::ThrowError("Querying a string index with equal "
											"predicate - value is not a string");
						}
						const char *bin_val = strdup(*Nan::Utf8String(value));

						if(*exp){
							as_query_where_with_exp(query, *exp, predicate, type,
										   datatype, bin_val);
						}
						else if (index_name) {
							as_query_where_with_index_name(query, index_name, predicate, type,
										   datatype, bin_val);
						}
						else {
							as_query_where_with_ctx(query, bin_name, *with_context ? context : NULL, predicate, type,
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
							Nan::ThrowError(
								"The region value passed is not a buffer");
						}
						uint8_t *bytes;
						int size = 0;
						get_bytes_property(&bytes, &size, filter, "val" , log);

						if(*exp){
							as_query_where_with_exp(query, *exp, predicate, type,
										   datatype, bytes, size, true);
						}
						else if (index_name) {
							as_query_where_with_index_name(query, index_name, predicate, type,
										   datatype, bytes, size, true);
						}
						else {
							as_query_where_with_ctx(query, bin_name, *with_context ? context : NULL, predicate, type,
									   	   datatype, bytes, size, true);
							
						}

						as_v8_debug(log, "Blob equality predicate");
					}
					break;
				}

				if (bin_name)
				{
					free((void *) bin_name);
				}
				if (index_name) {
					free((void *) index_name);
				}
			}
		}
	}

	Local<Value> selected =
		Nan::Get(options, Nan::New("selected").ToLocalChecked())
			.ToLocalChecked();
	TYPE_CHECK_OPT(selected, IsArray, "selected must be an array");
	if (selected->IsArray()) {
		Local<Array> bins = Local<Array>::Cast(selected);
		int size = bins->Length();
		as_v8_detail(log, "Number of bins to select in query %d", size);
		as_query_select_init(query, size);
		for (int i = 0; i < size; i++) {
			Local<Value> bin = Nan::Get(bins, i).ToLocalChecked();
			if (!bin->IsString()) {
				as_v8_error(log, "Bin value passed must be string");
				return Nan::ThrowError("Bin name passed is not a string");
			}
			as_query_select(query, *Nan::Utf8String(bin));
			as_v8_detail(log, "bin %d = %s", i, *Nan::Utf8String(bin));
		}
	}

	Local<Value> nobins =
		Nan::Get(options, Nan::New("nobins").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(nobins, IsBoolean, "nobins must be a boolean");
	if (nobins->IsBoolean()) {
		query->no_bins = Nan::To<bool>(nobins).FromJust();
	}

	Local<Value> max_records =
		Nan::Get(options, Nan::New("maxRecords").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(max_records, IsNumber, "max_records must be a number");
	if (max_records->IsNumber()) {
		query->max_records = (uint64_t) Nan::To<uint32_t>(max_records).FromJust();
	}

	Local<Value> ttl =
		Nan::Get(options, Nan::New("ttl").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(ttl, IsNumber, "ttl must be a number");
	if (ttl->IsNumber()) {
		query->ttl = (uint64_t) Nan::To<uint32_t>(ttl).FromJust();
	}


	Local<Value> udf =
		Nan::Get(options, Nan::New("udf").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(udf, IsObject, "udf must be an object");
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
			Nan::ThrowTypeError("Error in parsing the UDF parameters");
		}
		as_query_apply(query, filename, funcname, arglist);
	}

	Local<Value> maybeOps =
		Nan::Get(options, Nan::New("ops").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(maybeOps, IsArray, "ops must be an array");
	if (maybeOps->IsArray()) {
		Local<Array> ops = maybeOps.As<Array>();
		as_v8_debug(log, "Adding operations to background query");
		query->ops = as_operations_new(ops->Length());
		if (operations_from_jsarray(query->ops, ops, log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing ops arguments for query object failed");
			Nan::ThrowTypeError("Error in parsing the operations");
		}
	}
}

void setup_query_pages(as_query** query, Local<Value> ns, Local<Value> set,
				Local<Value> maybe_options, uint8_t* bytes, uint32_t bytes_size,
				as_cdt_ctx* context, bool* with_context, as_exp **exp, LogInfo *log)
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
		return;
	}
	as_query_set_paginate(*query, true);

	if (!maybe_options->IsObject()) {
		return;
	}

	setup_options(*query, maybe_options.As<Object>(), context, with_context, exp, log);

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
