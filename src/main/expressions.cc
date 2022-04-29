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

int free_entries(Local<Array> entries_ary, as_exp_entry *entries,
				 const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	int i = 0, length = entries_ary->Length();
	as_exp_entry *entry = entries;
	for (i = 0; i < length; i++, entry++) {
		Local<Object> entry_obj =
			Nan::Get(entries_ary, i).ToLocalChecked().As<Object>();

		if (Nan::Has(entry_obj, Nan::New("value").ToLocalChecked())
				.FromJust()) {
			// it is freed by c-client in case of geojson exp but for other cases it may leak
			// if (entry->v.val) as_val_destroy(entry->v.val);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("strVal").ToLocalChecked())
				.FromJust()) {
			if (entry->v.str_val)
				free((void *)entry->v.str_val);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("bytesVal").ToLocalChecked())
				.FromJust()) {
			if (entry->v.str_val)
				cf_free((void *)entry->v.bytes_val);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("intVal").ToLocalChecked())
				.FromJust()) {
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("uintVal").ToLocalChecked())
				.FromJust()) {
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("floatVal").ToLocalChecked())
				.FromJust()) {
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("boolVal").ToLocalChecked())
				.FromJust()) {
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("ctx").ToLocalChecked()).FromJust()) {
			if (entry->v.ctx)
				as_cdt_ctx_destroy(entry->v.ctx);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("listPolicy").ToLocalChecked())
				.FromJust()) {
			if (entry->v.list_pol) {
				cf_free(entry->v.list_pol);
			}
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("mapPolicy").ToLocalChecked())
				.FromJust()) {
			if (entry->v.map_pol) {
				cf_free(entry->v.map_pol);
			}
			continue;
		}
	}

	cf_free(entries);
	return rc;
}

int convert_entry(Local<Object> entry_obj, as_exp_entry *entry,
				  const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;

	if ((rc = get_int_property((int *)&entry->op, entry_obj, "op", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}

	if ((rc = get_optional_uint32_property(&entry->count, NULL, entry_obj,
										   "count", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	if ((rc = get_optional_uint32_property(&entry->sz, NULL, entry_obj, "sz",
										   log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("value").ToLocalChecked()).FromJust()) {
		entry->v.val = NULL;
		rc = get_asval_property(&entry->v.val, entry_obj, "value", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("strVal").ToLocalChecked()).FromJust()) {
		entry->v.str_val = NULL;
		rc = get_string_property((char **)&entry->v.str_val, entry_obj,
								 "strVal", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("bytesVal").ToLocalChecked()).FromJust()) {
		entry->v.bytes_val = NULL;
		entry->sz = 0;
		rc = get_bytes_property(&entry->v.bytes_val, (int *)&entry->sz,
								entry_obj, "bytesVal", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("intVal").ToLocalChecked()).FromJust()) {
		rc = get_int64_property(&entry->v.int_val, entry_obj, "intVal", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("uintVal").ToLocalChecked()).FromJust()) {
		return get_uint64_property(&entry->v.uint_val, entry_obj, "uintVal",
								   log);
	}

	if (Nan::Has(entry_obj, Nan::New("floatVal").ToLocalChecked()).FromJust()) {
		return get_float_property(&entry->v.float_val, entry_obj, "floatVal",
								  log);
	}

	if (Nan::Has(entry_obj, Nan::New("boolVal").ToLocalChecked()).FromJust()) {
		return get_bool_property(&entry->v.bool_val, entry_obj, "boolVal", log);
	}

	if (Nan::Has(entry_obj, Nan::New("ctx").ToLocalChecked()).FromJust()) {
		entry->v.ctx = NULL;
		rc =
			get_optional_cdt_context(entry->v.ctx, NULL, entry_obj, "ctx", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("listPolicy").ToLocalChecked())
			.FromJust()) {
		entry->v.list_pol = NULL;
		Local<Value> policy_obj =
			Nan::Get(entry_obj, Nan::New("listPolicy").ToLocalChecked())
				.ToLocalChecked();
		if (policy_obj->IsObject()) {
			entry->v.list_pol =
				(as_list_policy *)cf_malloc(sizeof(as_list_policy));
			get_optional_list_policy(entry->v.list_pol, NULL,
									 policy_obj.As<Object>(), log);
		}
		return AS_NODE_PARAM_OK;
	}

	if (Nan::Has(entry_obj, Nan::New("mapPolicy").ToLocalChecked())
			.FromJust()) {
		entry->v.map_pol = NULL;
		Local<Value> policy_obj =
			Nan::Get(entry_obj, Nan::New("mapPolicy").ToLocalChecked())
				.ToLocalChecked();
		if (policy_obj->IsObject()) {
			entry->v.map_pol =
				(as_map_policy *)cf_malloc(sizeof(as_map_policy));
			get_map_policy(entry->v.map_pol, policy_obj.As<Object>(), log);
		}
		return AS_NODE_PARAM_OK;
	}

	return rc;
}

int compile_expression(Local<Array> entries_ary, as_exp **filter_exp,
					   const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	int i = 0, length = entries_ary->Length();
	as_v8_debug(log, "Compiling expression (length=%i)", length);
	as_exp_entry *entries =
		(as_exp_entry *)cf_malloc(length * sizeof(as_exp_entry));
	as_exp_entry *entry = entries;

	for (i = 0; i < length; i++) {
		*entry = {};
		Local<Object> entry_obj =
			Nan::Get(entries_ary, i).ToLocalChecked().As<Object>();
		if ((rc = convert_entry(entry_obj, entry, log)) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Error converting expression entry: %i", i);
			goto done;
		}
		entry++;
	}
	*filter_exp = as_exp_compile(entries, length);

done:
	free_entries(entries_ary, entries, log);
	return rc;
}
