/*******************************************************************************
 * Copyright 2024 Aerospike, Inc.
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
#include <aerospike/aerospike_txn.h>
}

using namespace v8;

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> abortStatus()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "OK", AS_ABORT_OK);
	set(obj, "ALREADY_ABORTED", AS_ABORT_ALREADY_ABORTED);
	set(obj, "ROLL_BACK_ABANDONED", AS_ABORT_ROLL_BACK_ABANDONED);
	set(obj, "CLOSE_ABANDONED", AS_ABORT_CLOSE_ABANDONED);
	return scope.Escape(obj);
}
