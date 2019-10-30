/*******************************************************************************
 * Copyright 2018 Aerospike, Inc.
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

#include "predexp.h"

extern "C" {
#include <aerospike/as_predexp.h>
}

using namespace v8;

enum predex_args {
	NO_ARGS,
	STRING_ARG,
	INT32_ARG,
	INT64_ARG,
	UINT16_ARG,
	UINT32_ARG
};

typedef union {
	as_predexp_base* (*fnone)();
	as_predexp_base* (*fint32)(int32_t value);
	as_predexp_base* (*fint64)(int64_t value);
	as_predexp_base* (*fuint16)(uint16_t value);
	as_predexp_base* (*fuint32)(uint32_t value);
	as_predexp_base* (*fstr)(const char* value);
} predex_conv;

typedef struct {
	const char* name;
	predex_args args;
	predex_conv conv;
} predex_table_entry;

typedef as_predexp_base* (*pfunc)();

const predex_table_entry predex_table[] = {
	{ "AND", UINT16_ARG, { (pfunc) as_predexp_and } },
	{ "OR", UINT16_ARG, { (pfunc) as_predexp_or } },
	{ "NOT", NO_ARGS, { (pfunc) as_predexp_not } },
	{ "INT_VALUE", INT64_ARG, { (pfunc) as_predexp_integer_value } },
	{ "STR_VALUE", STRING_ARG, { (pfunc) as_predexp_string_value } },
	{ "GEO_VALUE", STRING_ARG, { (pfunc) as_predexp_geojson_value } },
	{ "INT_BIN", STRING_ARG, { (pfunc) as_predexp_integer_bin } },
	{ "STR_BIN", STRING_ARG, { (pfunc) as_predexp_string_bin } },
	{ "GEO_BIN", STRING_ARG, { (pfunc) as_predexp_geojson_bin } },
	{ "LIST_BIN", STRING_ARG, { (pfunc) as_predexp_list_bin } },
	{ "MAP_BIN", STRING_ARG, { (pfunc) as_predexp_map_bin } },
	{ "INT_VAR", STRING_ARG, { (pfunc) as_predexp_integer_var } },
	{ "STR_VAR", STRING_ARG, { (pfunc) as_predexp_string_var } },
	{ "GEO_VAR", STRING_ARG, { (pfunc) as_predexp_geojson_var } },
	{ "REC_DEVICE_SIZE", NO_ARGS, { (pfunc) as_predexp_rec_device_size } },
	{ "REC_LAST_UPDATE", NO_ARGS, { (pfunc) as_predexp_rec_last_update } },
	{ "REC_VOID_TIME", NO_ARGS, { (pfunc) as_predexp_rec_void_time } },
	{ "REC_DIGEST_MODULO", INT32_ARG, { (pfunc) as_predexp_rec_digest_modulo } },
	{ "INT_EQUAL", NO_ARGS, { (pfunc) as_predexp_integer_equal } },
	{ "INT_UNEQUAL", NO_ARGS, { (pfunc) as_predexp_integer_unequal } },
	{ "INT_GREATER", NO_ARGS, { (pfunc) as_predexp_integer_greater } },
	{ "INT_GREATEREQ", NO_ARGS, { (pfunc) as_predexp_integer_greatereq } },
	{ "INT_LESS", NO_ARGS, { (pfunc) as_predexp_integer_less } },
	{ "INT_LESSEQ", NO_ARGS, { (pfunc) as_predexp_integer_lesseq } },
	{ "STR_EQUAL", NO_ARGS, { (pfunc) as_predexp_string_equal } },
	{ "STR_UNEQUAL", NO_ARGS, { (pfunc) as_predexp_string_unequal } },
	{ "STR_REGEX", UINT32_ARG, { (pfunc) as_predexp_string_regex } },
	{ "GEO_WITHIN", NO_ARGS, { (pfunc) as_predexp_geojson_within } },
	{ "GEO_CONTAINS", NO_ARGS, { (pfunc) as_predexp_geojson_contains } },
	{ "LIST_ITERATE_OR", STRING_ARG, { (pfunc) as_predexp_list_iterate_or } },
	{ "LIST_ITERATE_AND", STRING_ARG, { (pfunc) as_predexp_list_iterate_and } },
	{ "MAPKEY_ITERATE_OR", STRING_ARG, { (pfunc) as_predexp_mapkey_iterate_or } },
	{ "MAPKEY_ITERATE_AND", STRING_ARG, { (pfunc) as_predexp_mapkey_iterate_and } },
	{ "MAPVAL_ITERATE_OR", STRING_ARG, { (pfunc) as_predexp_mapval_iterate_or } },
	{ "MAPVAL_ITERATE_AND", STRING_ARG, { (pfunc) as_predexp_mapval_iterate_and } }
};

as_predexp_base*
convert_predexp(Local<Object> predexp)
{
	int code = Nan::To<int>(Nan::Get(predexp, Nan::New("code").ToLocalChecked()).ToLocalChecked()).FromJust();
	const predex_table_entry *entry = &predex_table[code];
	if (!entry) {
		return NULL;
	}

	Local<Value> arg = Nan::Get(predexp, Nan::New("arg").ToLocalChecked()).ToLocalChecked();

	switch (entry->args) {
		case NO_ARGS:
			return entry->conv.fnone();
		case STRING_ARG:
			{
				char* str_arg = strdup(*Nan::Utf8String(arg));
				as_predexp_base* res = entry->conv.fstr(str_arg);
				free(str_arg);
				return res;
			}
		case INT32_ARG:
			return entry->conv.fint32(Nan::To<int32_t>(arg).FromJust());
		case INT64_ARG:
			return entry->conv.fint64(Nan::To<int64_t>(arg).FromJust());
		case UINT16_ARG:
			return entry->conv.fuint16(Nan::To<uint32_t>(arg).FromJust());
		case UINT32_ARG:
			return entry->conv.fuint32(Nan::To<uint32_t>(arg).FromJust());
		default:
			return NULL;
	}
}

Local<Object>
predexp_codes()
{
	Nan::EscapableHandleScope scope;
	Local<Object> map = Nan::New<Object>();

	uint32_t entries = sizeof(predex_table) / sizeof(predex_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		predex_table_entry entry = predex_table[i];
		Nan::Set(map, Nan::New(entry.name).ToLocalChecked(), Nan::New(i));
	}

	return scope.Escape(map);
}
