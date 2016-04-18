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
	#include <aerospike/as_scan.h>
}

#include <node.h>

#include "async_listener.h"
#include "client.h"
#include "conversions.h"
#include "log.h"
#include "scan.h"

using namespace v8;

void setup_scan(as_scan* scan, Local<Value> ns, Local<Value> set, Local<Value> maybe_options, LogInfo* log)
{
    as_namespace as_ns  = {'\0'};
    as_set       as_set = {'\0'};

	strncpy(as_ns, *String::Utf8Value(ns), AS_NAMESPACE_MAX_SIZE);
	if (set->IsString()) {
		strncpy(as_set, *String::Utf8Value(set), AS_SET_MAX_SIZE);
	}
	as_scan_init(scan, as_ns, as_set);

	if (!maybe_options->IsObject()) {
		return;
	}
	Local<Object> options = maybe_options->ToObject();

	Local<Value> selected = options->Get(Nan::New("selected").ToLocalChecked());
	TYPE_CHECK_OPT(selected, IsArray, "selected must be an array");
	if (selected->IsArray()) {
		Local<Array> bins = Local<Array>::Cast(selected);
		int size = bins->Length();
		as_v8_detail(log, "Number of bins to select in scan %d", size);
		as_scan_select_init(scan, size);
		for (int i=0; i < size; i++) {
			Local<Value> bin = bins->Get(i);
			if(!bin->IsString()) {
				as_v8_error(log, "Bin value passed must be string");
				return Nan::ThrowError("Bin name passed is not a string");
			}
			as_scan_select(scan, *String::Utf8Value(bin));
			as_v8_detail(log, "bin %d = %s", i, *String::Utf8Value(bin));
		}
	}

	Local<Value> nobins = options->Get(Nan::New("nobins").ToLocalChecked());
	TYPE_CHECK_OPT(nobins, IsBoolean, "nobins must be a boolean");
	if (nobins->IsBoolean()) {
		as_scan_set_nobins(scan, nobins->ToBoolean()->Value());
	}

	Local<Value> concurrent = options->Get(Nan::New("concurrent").ToLocalChecked());
	TYPE_CHECK_OPT(concurrent, IsBoolean, "concurrent must be a boolean");
	if (concurrent->IsBoolean()) {
		as_scan_set_concurrent(scan, concurrent->ToBoolean()->Value());
	}

	Local<Value> percent = options->Get(Nan::New("percent").ToLocalChecked());
	TYPE_CHECK_OPT(percent, IsNumber, "percent must be a number");
	if (percent->IsNumber()) {
		as_scan_set_percent(scan, percent->ToNumber()->Value());
	}

	Local<Value> priority = options->Get(Nan::New("priority").ToLocalChecked());
	TYPE_CHECK_OPT(priority, IsNumber, "prioriy must be a number");
	if (priority->IsNumber()) {
		as_scan_set_priority(scan, (as_scan_priority) priority->ToNumber()->Value());
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
			as_v8_error(log, "Parsing UDF arguments for scan object failed");
			Nan::ThrowTypeError("Error in parsing the UDF parameters");
		}
        as_scan_apply_each(scan, filename, funcname, (as_list*) arglist);
	}
}
