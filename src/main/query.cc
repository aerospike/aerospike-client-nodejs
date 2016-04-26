/*******************************************************************************
 * Copyright 2016 Aerospike, Inc.
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
	#include <aerospike/as_query.h>
}

#include <node.h>

#include "async.h"
#include "client.h"
#include "conversions.h"
#include "log.h"
#include "query.h"

using namespace v8;

void setup_query(as_query* query, Local<Value> ns, Local<Value> set, Local<Value> maybe_options, LogInfo* log)
{
    as_namespace as_ns  = {'\0'};
    as_set       as_set = {'\0'};

	strncpy(as_ns, *String::Utf8Value(ns), AS_NAMESPACE_MAX_SIZE);
	if (set->IsString()) {
		strncpy(as_set, *String::Utf8Value(set), AS_SET_MAX_SIZE);
	}
	as_query_init(query, as_ns, as_set);

	if (!maybe_options->IsObject()) {
		return;
	}
	Local<Object> options = maybe_options->ToObject();

	Local<Value> filters_val = options->Get(Nan::New("filters").ToLocalChecked());
	TYPE_CHECK_OPT(filters_val, IsArray, "filters must be an array");
	if (filters_val->IsArray()) {
		Local<Array> filters = Local<Array>::Cast(filters_val);
		int size = filters->Length();
		as_v8_detail(log, "Number of filters in query: %d", size);
		as_query_where_init(query, size);
		for (int i = 0; i < size; i++) {
			Local<Object> filter = filters->Get(i)->ToObject();
			Local<Value> bin = filter->Get(Nan::New("bin").ToLocalChecked());
			if (!bin->IsString()) {
				as_v8_error(log, "Bin value must be string");
				Nan::ThrowError("Bin value is not a string");
			}
			const char* bin_name = strdup(*String::Utf8Value(bin));
			as_predicate_type predicate = (as_predicate_type) filter->Get(Nan::New("predicate").ToLocalChecked())->ToObject()->IntegerValue();
			as_index_type type = (as_index_type) filter->Get(Nan::New("type").ToLocalChecked())->ToObject()->IntegerValue();
			as_index_datatype datatype = (as_index_datatype) filter->Get(Nan::New("datatype").ToLocalChecked())->ToObject()->IntegerValue();
			as_v8_debug(log, "Building filter on predicate type %d, index type %d, data type %d, bin name '%s'", predicate, type, datatype, bin_name);
			switch(predicate) {
				case AS_PREDICATE_RANGE:
					{
						if (datatype == AS_INDEX_NUMERIC) {
							Local<Value> v8min = filter->Get(Nan::New("min").ToLocalChecked());
							Local<Value> v8max = filter->Get(Nan::New("max").ToLocalChecked());
							if (v8min->IsNumber() && v8max->IsNumber()) {
								const int64_t min = v8min->NumberValue();
								const int64_t max = v8max->NumberValue();
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
							const char* bin_val = strdup(*String::Utf8Value(value));
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
								const int64_t val = value->NumberValue();
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
							const char* bin_val = strdup(*String::Utf8Value(value));
							as_query_where(query, bin_name, predicate, type, datatype, bin_val);
							as_v8_debug(log, "String equality predicate %s", bin_val);
						}
						break;
					}
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
			as_query_select(query, *String::Utf8Value(bin));
			as_v8_detail(log, "bin %d = %s", i, *String::Utf8Value(bin));
		}
	}

	Local<Value> udf = options->Get(Nan::New("udf").ToLocalChecked());
	TYPE_CHECK_OPT(udf, IsObject, "udf must be an object");
	if (udf->IsObject()) {
		char module[255];
		char func[255];
		char* filename = module;
		char* funcname = func;
		as_arraylist* arglist = NULL;
		int status = udfargs_from_jsobject(&filename, &funcname, &arglist, udf->ToObject(), log);
		if (status != 0) {
			as_v8_error(log, "Parsing UDF arguments for query object failed");
			Nan::ThrowTypeError("Error in parsing the UDF parameters");
		}
        as_query_apply(query, filename, funcname, (as_list*) arglist);
	}
}
