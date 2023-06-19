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

#include <node.h>

#include "conversions.h"
#include "log.h"
#include "operations.h"

extern "C" {
#include <aerospike/as_cdt_ctx.h>
}

using namespace v8;

NAN_METHOD(AerospikeClient::ContextToBase64)
{
	TYPE_CHECK_REQ(info[0], IsObject, "Context must be an object");

	as_cdt_ctx context;
	bool has_context = false;
	
	if (info[0]->IsObject()) {
		get_optional_cdt_context(&context, &has_context, info[0].As<Object>(), "context", NULL);
	}

	if(has_context){
		uint32_t capacity = as_cdt_ctx_base64_capacity(&context);
		char* serializedContext = new char[capacity];
		as_cdt_ctx_to_base64(&context, serializedContext, capacity);;
		as_cdt_ctx_destroy(&context);
		info.GetReturnValue().Set(Nan::New(serializedContext).ToLocalChecked());
		delete [] serializedContext;
	}
	else{
		Nan::ThrowError("Context is invalid, cannot serialize");
	}

}

NAN_METHOD(AerospikeClient::ContextFromBase64)
{
	TYPE_CHECK_REQ(info[0], IsObject, "Serialized context must be an object");

	char* serializedContext = NULL;
	if (info[0]->IsObject()) {
		if(get_string_property(&serializedContext, info[0].As<Object>(), "context", NULL) != AS_NODE_PARAM_OK){
			Nan::ThrowError("Serialized context is invalid");
			return;
		}
	}

	as_cdt_ctx context;
	as_cdt_ctx_from_base64(&context, serializedContext);
	Local<Array> v8_items = Nan::New<Array>(context.list.size);
	get_v8_cdt_context(&context, v8_items);
	cf_free(serializedContext);
	as_cdt_ctx_destroy(&context);
	info.GetReturnValue().Set(v8_items);

}

int get_v8_cdt_context(as_cdt_ctx *context, Local<Array> items)
{
	Nan::HandleScope scope;
	for(uint32_t i = 0; i < context->list.size; i++){
		
		as_cdt_ctx_item* item = (as_cdt_ctx_item*) as_vector_get(&context->list, i);
		Local<Array> v8Item = Nan::New<Array>(2);

		if((item->type & 0xF) > 0x1){
			Nan::Set(v8Item, 0, Nan::New(item->type));
			Nan::Set(v8Item, 1, val_to_jsvalue(item->val.pval, NULL));

			Nan::Set(items, i, v8Item);
		}
		else{
			Nan::Set(v8Item, 0, Nan::New(item->type));
			//First 31 bits mask
			int32_t ival = item->val.ival & 0x7FFFFFFF;
			//Signed bit mask
			if(item->val.ival & 0x8000000000000000){
				ival = ival | 0x80000000;
			}
			Nan::Set(v8Item, 1, Nan::New(ival));

			Nan::Set(items, i, v8Item);
		}	
	}
	return AS_NODE_PARAM_OK;
}

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
		int type = Nan::To<int>(v8type).FromJust();
		int intValue;
		as_val *asValue;
		switch (type) {
		case (AS_CDT_CTX_LIST_INDEX):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index(context, intValue);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case (AS_CDT_CTX_LIST_RANK):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_rank(context, intValue);
			as_v8_detail(log, "Adding List Rank context - rank: %d", intValue);
			break;
		case (AS_CDT_CTX_LIST_VALUE):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_list_value(context, asValue);
			as_v8_detail(log, "Adding List Value context");
			break;
		case (AS_CDT_CTX_MAP_INDEX):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_map_index(context, intValue);
			as_v8_detail(log, "Adding Map Index context - index: %d", intValue);
			break;
		case (AS_CDT_CTX_MAP_RANK):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_map_rank(context, intValue);
			as_v8_detail(log, "Adding Map Rank context - rank: %d", intValue);
			break;
		case (AS_CDT_CTX_MAP_KEY):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key(context, asValue);
			as_v8_detail(log, "Adding Map Key context");
			break;
		case (AS_CDT_CTX_MAP_VALUE):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_value(context, asValue);
			as_v8_detail(log, "Adding Map Value context");
			break;
		case (AS_CDT_CTX_LIST_INDEX | 0x40):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 0, false);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case (AS_CDT_CTX_MAP_KEY | 0x40):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_map_order) 0);
			as_v8_detail(log, "Adding Map Value context");
			break;
		case (AS_CDT_CTX_LIST_INDEX | 0x80):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 0, true);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case (AS_CDT_CTX_MAP_KEY | 0x80):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_map_order) 1);
			as_v8_detail(log, "Adding Map Value context");
			break;
		
		case (AS_CDT_CTX_LIST_INDEX | 0xc0):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 1, false);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case (AS_CDT_CTX_MAP_KEY | 0xc0):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_map_order) 3);
			as_v8_detail(log, "Adding Map Value context");
			break;
		}
	}

	return AS_NODE_PARAM_OK;

}

as_cdt_ctx* get_optional_cdt_context_heap(int* rc,
							 Local<Object> obj, const char *prop,
							 const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> maybe_context_obj =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (maybe_context_obj->IsUndefined() || maybe_context_obj->IsNull()) {
		as_v8_detail(log, "No CDT context set");
		*rc = AS_NODE_PARAM_OK;
		return NULL;
	}
	else if (!maybe_context_obj->IsObject()) {
		as_v8_error(log, "Type error: context should be an Object");
		*rc = AS_NODE_PARAM_ERR;
		return NULL;
	}
	Local<Array> items =
		Local<Array>::Cast(Nan::Get(maybe_context_obj.As<Object>(),
									Nan::New("items").ToLocalChecked())
							   .ToLocalChecked());
	const uint32_t length = items->Length();
	as_cdt_ctx* context = as_cdt_ctx_create(length);
	as_v8_detail(log, "Setting CDT context - depth: %d", length);
	for (uint32_t i = 0; i < length; i++) {
		Local<Array> item =
			Local<Array>::Cast(Nan::Get(items, i).ToLocalChecked());
		Local<Value> v8type = Nan::Get(item, 0).ToLocalChecked();
		Local<Value> v8value = Nan::Get(item, 1).ToLocalChecked();
		int type = Nan::To<int>(v8type).FromJust();
		int intValue;
		as_val *asValue;
		switch (type) {
		case (AS_CDT_CTX_LIST_INDEX):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index(context, intValue);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case (AS_CDT_CTX_LIST_RANK):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_rank(context, intValue);
			as_v8_detail(log, "Adding List Rank context - rank: %d", intValue);
			break;
		case (AS_CDT_CTX_LIST_VALUE):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_list_value(context, asValue);
			as_v8_detail(log, "Adding List Value context");
			break;
		case (AS_CDT_CTX_MAP_INDEX):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_map_index(context, intValue);
			as_v8_detail(log, "Adding Map Index context - index: %d", intValue);
			break;
		case (AS_CDT_CTX_MAP_RANK):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_map_rank(context, intValue);
			as_v8_detail(log, "Adding Map Rank context - rank: %d", intValue);
			break;
		case (AS_CDT_CTX_MAP_KEY):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key(context, asValue);
			as_v8_detail(log, "Adding Map Key context");
			break;
		case (AS_CDT_CTX_MAP_VALUE):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_value(context, asValue);
			as_v8_detail(log, "Adding Map Value context");
			break;
		case (AS_CDT_CTX_LIST_INDEX | 0x40):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 0, false);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case (AS_CDT_CTX_MAP_KEY | 0x40):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_map_order) 0);
			as_v8_detail(log, "Adding Map Value context");
			break;
		case (AS_CDT_CTX_LIST_INDEX | 0x80):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 0, true);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case (AS_CDT_CTX_MAP_KEY | 0x80):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_map_order) 1);
			as_v8_detail(log, "Adding Map Value context");
			break;
		
		case (AS_CDT_CTX_LIST_INDEX | 0xc0):
			intValue = Nan::To<int>(v8value).FromJust();
			as_cdt_ctx_add_list_index_create(context, intValue, (as_list_order) 1, false);
			as_v8_detail(log, "Adding List Index context - index: %d",
						 intValue);
			break;
		case (AS_CDT_CTX_MAP_KEY | 0xc0):
			asval_from_jsvalue(&asValue, v8value, log);
			as_cdt_ctx_add_map_key_create(context, asValue, (as_map_order) 3);
			as_v8_detail(log, "Adding Map Value context");
			break;
		}
	}
	*rc = AS_NODE_PARAM_OK;
	return context;
}