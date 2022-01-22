/*******************************************************************************
 * Copyright 2020 Aerospike, Inc.
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
#include <nan.h>

#include "log.h"
#include "conversions.h"
#include "expressions.h"
#include "operations.h"

extern "C" {
#include <aerospike/as_exp.h>
}

using namespace v8;

int
convert_entry(Local<Object> entry_obj, as_exp_entry* entry, const LogInfo* log)
{
	int rc = AS_NODE_PARAM_OK;

	if ((rc = get_int_property((int*) &entry->op, entry_obj, "op", log)) != AS_NODE_PARAM_OK) {
		printf("get_int_property failed\n");
		return rc;
	}

	if ((rc = get_optional_uint32_property(&entry->count, NULL, entry_obj, "count", log)) != AS_NODE_PARAM_OK) {
		printf("get_optional_uint32_property failed\n");
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("val").ToLocalChecked()).FromJust()) {
		rc = get_asval_property(&entry->v.val, entry_obj, "val", log);
		if(rc != AS_NODE_PARAM_OK)
			printf("get_asval_property failed\n");
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("strVal").ToLocalChecked()).FromJust()) {
		// TODO: Free v.str_val once request is done
		rc =  get_string_property((char**) &entry->v.str_val, entry_obj, "strVal", log);
		if(rc != AS_NODE_PARAM_OK)
			printf("get_string_property failed\n");
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("intVal").ToLocalChecked()).FromJust()) {
		rc = get_int64_property(&entry->v.int_val, entry_obj, "intVal", log);
		if(rc != AS_NODE_PARAM_OK)
			printf("get_int64_property failed\n");
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("floatVal").ToLocalChecked()).FromJust()) {
		rc = get_float_property(&entry->v.float_val, entry_obj, "floatVal", log);
		if(rc != AS_NODE_PARAM_OK)
			printf("get_float_property failed\n");
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("boolVal").ToLocalChecked()).FromJust()) {
		rc = get_bool_property(&entry->v.bool_val, entry_obj, "boolVal", log);
		if(rc != AS_NODE_PARAM_OK)
			printf("get_bool_property failed\n");
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("bytesVal").ToLocalChecked()).FromJust()) {
		// TODO: Free v.bytes_val once request is done
		rc = get_bytes_property(&entry->v.bytes_val, (int*) &entry->sz, entry_obj, "bytesVal", log);
		if(rc != AS_NODE_PARAM_OK)
			printf("get_bytes_property failed\n");
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("listPolicy").ToLocalChecked()).FromJust()) {
		printf("check listPolicy start");
		Local<Value> policy_obj = Nan::Get(entry_obj, Nan::New("listPolicy").ToLocalChecked()).ToLocalChecked();
		
		if (policy_obj->IsObject() && 
				get_optional_list_policy(entry->v.list_pol, NULL, policy_obj.As<Object>(), log)) {
			printf("check listPolicy found");
			return AS_NODE_PARAM_OK;
		}
		printf("check listPolicy failed");
	}

	if (Nan::Has(entry_obj, Nan::New("mapPolicy").ToLocalChecked()).FromJust()) {
		// TODO: implement policy convertion
		return AS_NODE_PARAM_OK;
	}

	if (Nan::Has(entry_obj, Nan::New("ctx").ToLocalChecked()).FromJust()) {
		entry->v.ctx = NULL;
		return get_optional_cdt_context(entry->v.ctx, NULL, entry_obj, "ctx", log);
	}

	return rc;
}

int
compile_expression(Local<Array> entries_ary, as_exp** filter_exp, const LogInfo* log)
{
	int rc = AS_NODE_PARAM_OK;
	int length = entries_ary->Length();
	as_v8_debug(log, "Compiling expression (length=%i)", length);
	as_exp_entry* entries = (as_exp_entry*) cf_malloc(length * sizeof(as_exp_entry));
	as_exp_entry* entry = entries;
	for (int i = 0; i < length; i++) {
		*entry = { };
		Local<Object> entry_obj = Nan::Get(entries_ary, i).ToLocalChecked().As<Object>();
		if ((rc = convert_entry(entry_obj, entry, log)) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Error converting expression entry: %i", i);
			goto done;
		}
		entry++;
	}
	// TODO: destroy *filter_exp after use
	*filter_exp = as_exp_compile(entries, length);

done:
	cf_free(entries);
	return rc;
}
