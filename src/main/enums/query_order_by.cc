/*******************************************************************************
 * Copyright 2026 Aerospike, Inc.
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
#include <aerospike/as_query.h>
}

using namespace v8;

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> orderByType()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "INTEGER", AS_QUERY_ORDER_BY_INTEGER);
	set(obj, "DOUBLE", AS_QUERY_ORDER_BY_DOUBLE);
	set(obj, "STRING", AS_QUERY_ORDER_BY_STRING);
	set(obj, "BYTES", AS_QUERY_ORDER_BY_BYTES);

	return scope.Escape(obj);
}

Local<Object> order()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "ASC", AS_ORDER_ASCENDING);
	set(obj, "DESC", AS_ORDER_DESCENDING);

	return scope.Escape(obj);
}

Local<Object> orderByFlags()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "DEFAULT", AS_QUERY_ORDER_BY_FLAGS_DEFAULT);
	set(obj, "CASE_INSENSITIVE", AS_QUERY_ORDER_BY_CASE_INSENSITIVE);

	return scope.Escape(obj);
}
