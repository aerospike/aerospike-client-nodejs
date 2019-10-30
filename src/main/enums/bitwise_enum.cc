/*******************************************************************************
 * Copyright 2019 Aerospike, Inc.
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
#include <aerospike/as_bit_operations.h>
}

using namespace v8;

#define set(__obj, __name, __value) Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> bitwise_enum_values()
{
	Nan::EscapableHandleScope scope;

	// as_bit_write_flags
	Local<Object> write_flags = Nan::New<Object>();
	set(write_flags, "DEFAULT", AS_BIT_WRITE_DEFAULT);
	set(write_flags, "CREATE_ONLY", AS_BIT_WRITE_CREATE_ONLY);
	set(write_flags, "UPDATE_ONLY", AS_BIT_WRITE_UPDATE_ONLY);
	set(write_flags, "NO_FAIL", AS_BIT_WRITE_NO_FAIL);
	set(write_flags, "PARTIAL", AS_BIT_WRITE_PARTIAL);

	// as_bit_resize_flags
	Local<Object> resize_flags = Nan::New<Object>();
	set(resize_flags, "DEFAULT", AS_BIT_RESIZE_DEFAULT);
	set(resize_flags, "FROM_FRONT", AS_BIT_RESIZE_FROM_FRONT);
	set(resize_flags, "GROW_ONLY", AS_BIT_RESIZE_GROW_ONLY);
	set(resize_flags, "SHRINK_ONLY", AS_BIT_RESIZE_SHRINK_ONLY);

	// as_bit_overflow_action
	Local<Object> overflow = Nan::New<Object>();
	set(overflow, "FAIL", AS_BIT_OVERFLOW_FAIL);
	set(overflow, "SATURATE", AS_BIT_OVERFLOW_SATURATE);
	set(overflow, "WRAP", AS_BIT_OVERFLOW_WRAP);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("writeFlags").ToLocalChecked(), write_flags);
	Nan::Set(enums, Nan::New("resizeFlags").ToLocalChecked(), resize_flags);
	Nan::Set(enums, Nan::New("overflow").ToLocalChecked(), overflow);
	return scope.Escape(enums);
}
