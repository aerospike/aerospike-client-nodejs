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

extern "C" {
#include <aerospike/as_hll_operations.h>
}

using namespace v8;

#define set(__obj, __name, __value) Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> hll_enum_values()
{
	Nan::EscapableHandleScope scope;

	// as_hll_write_flags
	Local<Object> write_flags = Nan::New<Object>();
	set(write_flags, "DEFAULT", AS_HLL_WRITE_DEFAULT);
	set(write_flags, "CREATE_ONLY", AS_HLL_WRITE_CREATE_ONLY);
	set(write_flags, "UPDATE_ONLY", AS_HLL_WRITE_UPDATE_ONLY);
	set(write_flags, "NO_FAIL", AS_HLL_WRITE_NO_FAIL);
	set(write_flags, "ALLOW_FOLD", AS_HLL_WRITE_ALLOW_FOLD);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("writeFlags").ToLocalChecked(), write_flags);
	return scope.Escape(enums);
}
