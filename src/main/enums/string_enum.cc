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
 *
 * Values mirror aerospike/as_string_operations.h (as_string_write_flags,
 * as_string_regex_flags, as_string_numeric_type) without including that header
 * here, because it pulls in as_operations.h which uses C-only forward enum
 * declarations that ISO C++ rejects when compiled as C++.
 ******************************************************************************/

#include <node.h>
#include <nan.h>

#include "enums.h"

using namespace v8;

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

v8::Local<v8::Object> string_enum_values()
{
	Nan::EscapableHandleScope scope;

	Local<Object> write_flags = Nan::New<Object>();
	set(write_flags, "DEFAULT", 0);
	set(write_flags, "NO_FAIL", 4);

	Local<Object> regex_flags = Nan::New<Object>();
	set(regex_flags, "NONE", 0);
	set(regex_flags, "CASE_INSENSITIVE", 1 << 0);
	set(regex_flags, "MULTILINE", 1 << 1);
	set(regex_flags, "DOTALL", 1 << 2);
	set(regex_flags, "UNIX_LINES", 1 << 3);
	set(regex_flags, "GLOBAL", 1 << 4);

	Local<Object> numeric_type = Nan::New<Object>();
	set(numeric_type, "ANY", 0);
	set(numeric_type, "INT", 1);
	set(numeric_type, "FLOAT", 2);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("writeFlags").ToLocalChecked(), write_flags);
	Nan::Set(enums, Nan::New("regexFlags").ToLocalChecked(), regex_flags);
	Nan::Set(enums, Nan::New("numericType").ToLocalChecked(), numeric_type);
	return scope.Escape(enums);
}
