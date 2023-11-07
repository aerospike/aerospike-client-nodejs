/*******************************************************************************
 * Copyright 2023 Aerospike, Inc.
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
#include <aerospike/as_exp_operations.h>
}

using namespace v8;

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> expWriteFlags()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "DEFAULT", AS_EXP_WRITE_DEFAULT);
	set(obj, "CREATE_ONLY", AS_EXP_WRITE_CREATE_ONLY);
	set(obj, "UPDATE_ONLY", AS_EXP_WRITE_UPDATE_ONLY);
	set(obj, "ALLOW_DELETE", AS_EXP_WRITE_ALLOW_DELETE);
	set(obj, "POLICY_NO_FAIL", AS_EXP_WRITE_POLICY_NO_FAIL);
	set(obj, "EVAL_NO_FAIL", AS_EXP_WRITE_EVAL_NO_FAIL);

	return scope.Escape(obj);
}