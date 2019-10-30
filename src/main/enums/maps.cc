/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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
#include <aerospike/as_map_operations.h>
}

using namespace v8;

#define set(__obj, __name, __value) Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> map_enum_values()
{
	Nan::EscapableHandleScope scope;

	// as_map_order
	Local<Object> order = Nan::New<Object>();
	set(order, "UNORDERED",				AS_MAP_UNORDERED);
	set(order, "KEY_ORDERED",			AS_MAP_KEY_ORDERED);
	set(order, "KEY_VALUE_ORDERED",		AS_MAP_KEY_VALUE_ORDERED);

	// as_map_write_mode
	Local<Object> write_mode = Nan::New<Object>();
	set(write_mode, "UPDATE",			AS_MAP_UPDATE);
	set(write_mode, "UPDATE_ONLY",		AS_MAP_UPDATE_ONLY);
	set(write_mode, "CREATE_ONLY",		AS_MAP_CREATE_ONLY);

	// as_map_write_flags
	Local<Object> write_flags = Nan::New<Object>();
	set(write_flags, "DEFAULT",			AS_MAP_WRITE_DEFAULT);
	set(write_flags, "CREATE_ONLY",		AS_MAP_WRITE_CREATE_ONLY);
	set(write_flags, "UPDATE_ONLY",		AS_MAP_WRITE_UPDATE_ONLY);
	set(write_flags, "NO_FAIL",			AS_MAP_WRITE_NO_FAIL);
	set(write_flags, "PARTIAL",			AS_MAP_WRITE_PARTIAL);

	// as_map_return_type
	Local<Object> return_type = Nan::New<Object>();
	set(return_type, "NONE",			AS_MAP_RETURN_NONE);
	set(return_type, "INDEX",			AS_MAP_RETURN_INDEX);
	set(return_type, "REVERSE_INDEX",	AS_MAP_RETURN_REVERSE_INDEX);
	set(return_type, "RANK",			AS_MAP_RETURN_RANK);
	set(return_type, "REVERSE_RANK",	AS_MAP_RETURN_REVERSE_RANK);
	set(return_type, "COUNT",			AS_MAP_RETURN_COUNT);
	set(return_type, "KEY",				AS_MAP_RETURN_KEY);
	set(return_type, "VALUE",			AS_MAP_RETURN_VALUE);
	set(return_type, "KEY_VALUE",		AS_MAP_RETURN_KEY_VALUE);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("order").ToLocalChecked(), order);
	Nan::Set(enums, Nan::New("writeMode").ToLocalChecked(), write_mode);
	Nan::Set(enums, Nan::New("writeFlags").ToLocalChecked(), write_flags);
	Nan::Set(enums, Nan::New("returnType").ToLocalChecked(), return_type);
	return scope.Escape(enums);
}
