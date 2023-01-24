/*******************************************************************************
 * Copyright 2013-2022 Aerospike, Inc.
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

#include "conversions.h"
#include "log.h"
#include "operations.h"

extern "C" {
#include <aerospike/as_cdt_ctx.h>
#include <aerospike/as_cdt_order.h>
}

using namespace v8;
enum ctx_type 
{
	CDT_CTX_LIST_INDEX = 0x10,
	CDT_CTX_LIST_RANK = 0x11,
	CDT_CTX_LIST_VALUE = 0x13,
	CDT_CTX_MAP_INDEX = 0x20,
	CDT_CTX_MAP_RANK = 0x21,
	CDT_CTX_MAP_KEY = 0x22,
	CDT_CTX_MAP_VALUE = 0x23,
	CDT_CTX_LIST_INDEX_CREATE_UNORDERED_NO_PAD = 0x50,
	CDT_CTX_MAP_KEY_CREATE_UNORDERED = 0x62,
	CDT_CTX_LIST_INDEX_CREATE_UNORDERED_PAD  = 0x90,
	CDT_CTX_MAP_KEY_CREATE_KEY_ORDERED = 0xa2,
	CDT_CTX_LIST_INDEX_CREATE_ORDERED  = 0xd0,
	CDT_CTX_MAP_KEY_CREATE_KEY_VALUE_ORDERED = 0xe2,
};


int get_optional_cdt_context(as_cdt_ctx *context, bool *has_context,
							 Local<Object> obj, const char *prop,
							 const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> maybe_context_obj =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (maybe_context_obj->IsUndefined() || maybe_context_obj->IsNull()) {
		if (has_context != NULL)
			(*has_context) = false;
		as_v8_detail(log, "No CDT context set");
		return AS_NODE_PARAM_OK;
	}
	else if (!maybe_context_obj->IsObject()) {
		as_v8_error(log, "Type error: context should be an Object");
		return AS_NODE_PARAM_ERR;
	}

	if (has_context != NULL)
		(*has_context) = true;
	Local<Array> items =
		Local<Array>::Cast(Nan::Get(maybe_context_obj.As<Object>(),
									Nan::New("items").ToLocalChecked())
							   .ToLocalChecked());
	const uint32_t length = items->Length();
	as_cdt_ctx_init(context, length);
	as_v8_detail(log, "Setting CDT context - depth: %d", length);
	for (uint32_t i = 0; i < length; i++) {
		Local<Array> item =
			Local<Array>::Cast(Nan::Get(items, i).ToLocalChecked());
		Local<Value> v8type = Nan::Get(item, 0).ToLocalChecked();
		Local<Value> v8value = Nan::Get(item, 1).ToLocalChecked();
		ctx_type type = (ctx_type)Nan::To<int>(v8type).FromJust();
		int intValue;
		as_val *asValue;
		switch (type) {
		case CDT_CTX_LIST_INDEX:
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index(context, intValue);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case CDT_CTX_LIST_RANK:
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_rank(context, intValue);
			as_v8_detail(log, "Adding List Rank context - rank: %d", intValue);
			break;
		case CDT_CTX_LIST_VALUE:
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_list_value(context, asValue);
			as_v8_detail(log, "Adding List Value context");
			break;
		case CDT_CTX_MAP_INDEX:
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_map_index(context, intValue);
			as_v8_detail(log, "Adding Map Index context - index: %d", intValue);
			break;
		case CDT_CTX_MAP_RANK:
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_map_rank(context, intValue);
			as_v8_detail(log, "Adding Map Rank context - rank: %d", intValue);
			break;
		case CDT_CTX_MAP_KEY:
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key(context, asValue);
			as_v8_detail(log, "Adding Map Key context");
			break;
		case CDT_CTX_MAP_VALUE:
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_value(context, asValue);
			as_v8_detail(log, "Adding Map Value context");
			break;
		case CDT_CTX_LIST_INDEX_CREATE_UNORDERED_NO_PAD:
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 0, false);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case CDT_CTX_MAP_KEY_CREATE_UNORDERED:
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_list_order) 0);
			as_v8_detail(log, "Adding Map Value context");
			break;
		case CDT_CTX_LIST_INDEX_CREATE_UNORDERED_PAD:
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 0, true);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case CDT_CTX_MAP_KEY_CREATE_KEY_ORDERED:
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_list_order) 1);
			as_v8_detail(log, "Adding Map Value context");
			break;
		case CDT_CTX_LIST_INDEX_CREATE_ORDERED:
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 1, false);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case CDT_CTX_MAP_KEY_CREATE_KEY_VALUE_ORDERED:
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_list_order) 3);
			as_v8_detail(log, "Adding Map Value context");
			break;

		}
	}

	return AS_NODE_PARAM_OK;
}
