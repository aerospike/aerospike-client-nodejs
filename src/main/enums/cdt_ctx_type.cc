/*******************************************************************************
 * Copyright 2022-2023 Aerospike, Inc.
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

extern "C" {
#include <aerospike/as_cdt_ctx.h>
}

using namespace v8;

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> ctxType()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "EXP", as_cdt_ctx_type::AS_CDT_CTX_EXP);
	set(obj, "LIST_INDEX", as_cdt_ctx_type::AS_CDT_CTX_LIST_INDEX);
	set(obj, "LIST_RANK", as_cdt_ctx_type::AS_CDT_CTX_LIST_RANK);
	set(obj, "LIST_VALUE", as_cdt_ctx_type::AS_CDT_CTX_LIST_VALUE);
	set(obj, "MAP_INDEX", as_cdt_ctx_type::AS_CDT_CTX_MAP_INDEX);
	set(obj, "MAP_RANK", as_cdt_ctx_type::AS_CDT_CTX_MAP_RANK);
	set(obj, "MAP_KEY", as_cdt_ctx_type::AS_CDT_CTX_MAP_KEY);
	set(obj, "MAP_VALUE", as_cdt_ctx_type::AS_CDT_CTX_MAP_VALUE);
	set(obj, "MAP_KEYS_IN", as_cdt_ctx_type::AS_CDT_CTX_MAP_KEYS_IN);
	return scope.Escape(obj);
}
