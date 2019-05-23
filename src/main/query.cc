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

#include "async.h"
#include "client.h"
#include "conversions.h"
#include "predexp.h"
#include "log.h"
#include "query.h"

extern "C" {
#include <aerospike/as_query.h>
#include <aerospike/as_predexp.h>
}

using namespace v8;

void setup_query(as_query* query, Local<Value> ns, Local<Value> set, Local<Value> maybe_options, LogInfo* log)
{
    as_namespace as_ns  = {'\0'};
    as_set       as_set = {'\0'};

	if (as_strlcpy(as_ns, *Nan::Utf8String(ns), AS_NAMESPACE_MAX_SIZE) > AS_NAMESPACE_MAX_SIZE) {
		as_v8_error(log, "Namespace exceeds max. length (%d)", AS_NAMESPACE_MAX_SIZE);
		// TODO: Return param error
	}

	if (set->IsString()) {
		if (as_strlcpy(as_set, *Nan::Utf8String(set), AS_SET_MAX_SIZE) > AS_SET_MAX_SIZE) {
			as_v8_error(log, "Set exceeds max. length (%d)", AS_SET_MAX_SIZE);
			// TODO: Return param error
		}
	}

	as_query_init(query, as_ns, as_set);

	if (!maybe_options->IsObject()) {
		return;
	}
	Local<Object> options = maybe_options.As<Object>();

	Local<Value> filters_val = options->Get(Nan::New("filters").ToLocalChecked());
	TYPE_CHECK_OPT(filters_val, IsArray, "filters must be an array");
	if (filters_val->IsArray()) {
		Local<Array> filters = Local<Array>::Cast(filters_val);
		int size = filters->Length();
		as_v8_detail(log, "Number of filters in query: %d", size);
		as_query_where_init(query, size);
		for (int i = 0; i < size; i++) {
			Local<Object> filter = filters->Get(i).As<Object>();
			Local<Value> bin = filter->Get(Nan::New("bin").ToLocalChecked());
			if (!bin->IsString()) {
				as_v8_error(log, "Bin value must be string");
				Nan::ThrowError("Bin value is not a string");
			}
			const char* bin_name = strdup(*Nan::Utf8String(bin));
			as_predicate_type predicate = (as_predicate_type) Nan::To<int>(filter->Get(Nan::New("predicate").ToLocalChecked())).FromJust();
			as_index_type type = (as_index_type) Nan::To<int>(filter->Get(Nan::New("type").ToLocalChecked())).FromJust();
			as_index_datatype datatype = (as_index_datatype) Nan::To<int>(filter->Get(Nan::New("datatype").ToLocalChecked())).FromJust();
			as_v8_debug(log, "Building filter on predicate type %d, index type %d, data type %d, bin name '%s'", predicate, type, datatype, bin_name);
			switch(predicate) {
				case AS_PREDICATE_RANGE:
					{
						if (datatype == AS_INDEX_NUMERIC) {
							Local<Value> v8min = filter->Get(Nan::New("min").ToLocalChecked());
							Local<Value> v8max = filter->Get(Nan::New("max").ToLocalChecked());
							if (v8min->IsNumber() && v8max->IsNumber()) {
								const int64_t min = Nan::To<int64_t>(v8min).FromJust();
								const int64_t max = Nan::To<int64_t>(v8max).FromJust();
								as_query_where(query, bin_name, predicate, type, datatype, min, max);
								as_v8_debug(log, "Integer range predicate from %llu to %llu", min, max);
							} else {
								as_v8_error(log, "The min/max of the range value passed must both be integers.");
								Nan::ThrowError("The min/max of the range value passed must both be integers.");
							}
						} else if (datatype == AS_INDEX_GEO2DSPHERE) {
							Local<Value> value = filter->Get(Nan::New("val").ToLocalChecked());
							if (!value->IsString()) {
								as_v8_error(log, "The region value passed must be a GeoJSON string");
								Nan::ThrowError("The region value passed is not a GeoJSON string");
							}
							const char* bin_val = strdup(*Nan::Utf8String(value));
							as_query_where(query, bin_name, predicate, type, datatype, bin_val);
							as_v8_debug(log, "Geo range predicate %s", bin_val);
						}
						break;
					}
				case AS_PREDICATE_EQUAL:
					{
						if (datatype == AS_INDEX_NUMERIC) {
							Local<Value> value = filter->Get(Nan::New("val").ToLocalChecked());
							if (value->IsNumber()) {
								const int64_t val = Nan::To<int64_t>(value).FromJust();
								as_query_where(query, bin_name, predicate, type, datatype, val);
								as_v8_debug(log, "Integer equality predicate %d", val);
							} else {
								as_v8_error(log, "querying a numeric index with equal predicate - value must be a number");
								Nan::ThrowError("Querying an numeric index with equal predicate - value is not a number");
							}
						} else if (datatype == AS_INDEX_STRING) {
							Local<Value> value = filter->Get(Nan::New("val").ToLocalChecked());
							if (!value->IsString()) {
								as_v8_error(log, "querying a string index with equal predicate - value must be a string");
								Nan::ThrowError("Querying a string index with equal predicate - value is not a string");
							}
							const char* bin_val = strdup(*Nan::Utf8String(value));
							as_query_where(query, bin_name, predicate, type, datatype, bin_val);
							as_v8_debug(log, "String equality predicate %s", bin_val);
						}
						break;
					}
			}
		}
	}

	Local<Value> predexp_val = options->Get(Nan::New("predexp").ToLocalChecked());
	TYPE_CHECK_OPT(predexp_val, IsArray, "predexp must be an array");
	if (predexp_val->IsArray()) {
		Local<Array> predexp_ary = Local<Array>::Cast(predexp_val);
		int size = predexp_ary->Length();
		if (size > 0) {
			as_query_predexp_init(query, size);
			for (int i = 0; i < size; i++) {
				Local<Object> predexpObj = predexp_ary->Get(i).As<Object>();
				as_predexp_base* predexp = convert_predexp(predexpObj);
				as_query_predexp_add(query, predexp);
			}
		}
	}

	Local<Value> selected = options->Get(Nan::New("selected").ToLocalChecked());
	TYPE_CHECK_OPT(selected, IsArray, "selected must be an array");
	if (selected->IsArray()) {
		Local<Array> bins = Local<Array>::Cast(selected);
		int size = bins->Length();
		as_v8_detail(log, "Number of bins to select in scan %d", size);
		as_query_select_init(query, size);
		for (int i = 0; i < size; i++) {
			Local<Value> bin = bins->Get(i);
			if(!bin->IsString()) {
				as_v8_error(log, "Bin value passed must be string");
				return Nan::ThrowError("Bin name passed is not a string");
			}
			as_query_select(query, strdup(*Nan::Utf8String(bin)));
			as_v8_detail(log, "bin %d = %s", i, *Nan::Utf8String(bin));
		}
	}

	Local<Value> nobins = options->Get(Nan::New("nobins").ToLocalChecked());
	TYPE_CHECK_OPT(nobins, IsBoolean, "nobins must be a boolean");
	if (nobins->IsBoolean()) {
		query->no_bins = Nan::To<bool>(nobins).FromJust();
	}

	Local<Value> udf = options->Get(Nan::New("udf").ToLocalChecked());
	TYPE_CHECK_OPT(udf, IsObject, "udf must be an object");
	if (udf->IsObject()) {
		char module[255];
		char func[255];
		char* filename = module;
		char* funcname = func;
		as_list* arglist = NULL;
		int status = udfargs_from_jsobject(&filename, &funcname, &arglist, udf.As<Object>(), log);
		if (status != 0) {
			as_v8_error(log, "Parsing UDF arguments for query object failed");
			Nan::ThrowTypeError("Error in parsing the UDF parameters");
		}
        as_query_apply(query, filename, funcname, arglist);
	}
}
