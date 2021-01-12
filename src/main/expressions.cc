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

extern "C" {
#include <aerospike/as_exp.h>
}

using namespace v8;

int
convert_entry(Local<Object> entry_obj, as_exp_entry* entry, const LogInfo* log)
{
	int rc = AS_NODE_PARAM_OK;
	if ((rc = get_int_property((int*) &entry->op, entry_obj, "op", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	if ((rc = get_optional_uint32_property(&entry->count, NULL, entry_obj, "count", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	bool has_value = false;
	if ((rc = get_optional_asval_property(&entry->v.val, &has_value, entry_obj, "val", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (has_value) return rc;

	// TODO: Free v.str_val once request is done
	if ((rc = get_optional_string_property((char**) &entry->v.str_val, &has_value, entry_obj, "strVal", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (has_value) return rc;

	if ((rc = get_optional_int64_property(&entry->v.int_val, &has_value, entry_obj, "intVal", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (has_value) return rc;

	if ((rc = get_optional_bool_property(&entry->v.bool_val, &has_value, entry_obj, "boolVal", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (has_value) return rc;

	// TODO: Free v.bytes_val once request is done
	if ((rc = get_optional_bytes_property(&entry->v.bytes_val, (int*) &entry->sz, &has_value, entry_obj, "bytesVal", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (has_value) return rc;

	// TODO: support GeoJson, Nil, float values, and possibly uint64 values as BigInt?

	return rc;
}

int
compile_filter_expression(Local<Array> entries_ary, as_exp** filter_exp, const LogInfo* log)
{
	int rc = AS_NODE_PARAM_OK;
	int length = entries_ary->Length();
	as_v8_debug(log, "Compiling filter expression (length=%i)", length);
	as_exp_entry* entries = (as_exp_entry*) cf_malloc(length * sizeof(as_exp_entry));
	as_exp_entry* entry = entries;
	for (int i = 0; i < length; i++) {
		*entry = { };
		Local<Object> entry_obj = Nan::Get(entries_ary, i).ToLocalChecked().As<Object>();
		if ((rc = convert_entry(entry_obj, entry, log)) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Error converting filter expression entry: %i", i);
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
