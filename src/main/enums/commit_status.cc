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

Local<Object> commitStatus()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "OK", AS_COMMIT_OK);
	set(obj, "ALREADY_COMMITTED", AS_COMMIT_ALREADY_COMMITTED);
	set(obj, "VERIFY_FAILED", AS_COMMIT_VERIFY_FAILED);
	set(obj, "MARK_ROLL_FORWARD_ABANDONED", AS_COMMIT_MARK_ROLL_FORWARD_ABANDONED);
	set(obj, "ROLL_FORWARD_ABANDONED", AS_COMMIT_ROLL_FORWARD_ABANDONED);
	set(obj, "CLOSE_ABANDONED", AS_COMMIT_CLOSE_ABANDONED);
	return scope.Escape(obj);
}
