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

	Local<Value> filters_val = Nan::Get(options, Nan::New("filters").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(filters_val, IsArray, "filters must be an array");
	if (filters_val->IsArray()) {
		Local<Array> filters = Local<Array>::Cast(filters_val);
		int size = filters->Length();
		as_v8_detail(log, "Number of filters in query: %d", size);
		as_query_where_init(query, size);
		for (int i = 0; i < size; i++) {
			Local<Object> filter = Nan::Get(filters, i).ToLocalChecked().As<Object>();
			Local<Value> bin = Nan::Get(filter, Nan::New("bin").ToLocalChecked()).ToLocalChecked();
			if (!bin->IsString()) {
				as_v8_error(log, "Bin value must be string");
				Nan::ThrowError("Bin value is not a string");
			}
			const char* bin_name = strdup(*Nan::Utf8String(bin));
			as_predicate_type predicate = (as_predicate_type) Nan::To<int>(Nan::Get(filter, Nan::New("predicate").ToLocalChecked()).ToLocalChecked()).FromJust();
			as_index_type type = (as_index_type) Nan::To<int>(Nan::Get(filter, Nan::New("type").ToLocalChecked()).ToLocalChecked()).FromJust();
			as_index_datatype datatype = (as_index_datatype) Nan::To<int>(Nan::Get(filter, Nan::New("datatype").ToLocalChecked()).ToLocalChecked()).FromJust();
			as_v8_debug(log, "Building filter on predicate type %d, index type %d, data type %d, bin name '%s'", predicate, type, datatype, bin_name);
			switch(predicate) {
				case AS_PREDICATE_RANGE:
					{
						if (datatype == AS_INDEX_NUMERIC) {
							Local<Value> v8min = Nan::Get(filter, Nan::New("min").ToLocalChecked()).ToLocalChecked();
							Local<Value> v8max = Nan::Get(filter, Nan::New("max").ToLocalChecked()).ToLocalChecked();
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
							Local<Value> value = Nan::Get(filter, Nan::New("val").ToLocalChecked()).ToLocalChecked();
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
							Local<Value> value = Nan::Get(filter, Nan::New("val").ToLocalChecked()).ToLocalChecked();
							if (value->IsNumber()) {
								const int64_t val = Nan::To<int64_t>(value).FromJust();
								as_query_where(query, bin_name, predicate, type, datatype, val);
								as_v8_debug(log, "Integer equality predicate %d", val);
							} else {
								as_v8_error(log, "querying a numeric index with equal predicate - value must be a number");
								Nan::ThrowError("Querying an numeric index with equal predicate - value is not a number");
							}
						} else if (datatype == AS_INDEX_STRING) {
							Local<Value> value = Nan::Get(filter, Nan::New("val").ToLocalChecked()).ToLocalChecked();
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

	Local<Value> predexp_val = Nan::Get(options, Nan::New("predexp").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(predexp_val, IsArray, "predexp must be an array");
	if (predexp_val->IsArray()) {
		Local<Array> predexp_ary = Local<Array>::Cast(predexp_val);
		int size = predexp_ary->Length();
		if (size > 0) {
			as_query_predexp_init(query, size);
			for (int i = 0; i < size; i++) {
				Local<Object> predexpObj = Nan::Get(predexp_ary, i).ToLocalChecked().As<Object>();
				as_predexp_base* predexp = convert_predexp(predexpObj);
				as_query_predexp_add(query, predexp);
			}
		}
	}

	Local<Value> selected = Nan::Get(options, Nan::New("selected").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(selected, IsArray, "selected must be an array");
	if (selected->IsArray()) {
		Local<Array> bins = Local<Array>::Cast(selected);
		int size = bins->Length();
		as_v8_detail(log, "Number of bins to select in scan %d", size);
		as_query_select_init(query, size);
		for (int i = 0; i < size; i++) {
			Local<Value> bin = Nan::Get(bins, i).ToLocalChecked();
			if(!bin->IsString()) {
				as_v8_error(log, "Bin value passed must be string");
				return Nan::ThrowError("Bin name passed is not a string");
			}
			as_query_select(query, strdup(*Nan::Utf8String(bin)));
			as_v8_detail(log, "bin %d = %s", i, *Nan::Utf8String(bin));
		}
	}

	Local<Value> nobins = Nan::Get(options, Nan::New("nobins").ToLocalChecked()).ToLocalChecked();
	TYPE_CHECK_OPT(nobins, IsBoolean, "nobins must be a boolean");
	if (nobins->IsBoolean()) {
		query->no_bins = Nan::To<bool>(nobins).FromJust();
	}

	Local<Value> udf = Nan::Get(options, Nan::New("udf").ToLocalChecked()).ToLocalChecked();
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
