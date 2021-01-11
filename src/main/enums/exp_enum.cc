/*******************************************************************************
 * Copyright 2021 Aerospike, Inc.
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

#include <nan.h>
#include <node.h>

extern "C" {
#include <aerospike/as_exp.h>
}

using namespace v8;

#define set(__obj, __name, __value) Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> exp_opcode_values()
{
	Nan::EscapableHandleScope scope;

	Local<Object> exp_ops = Nan::New<Object>();
	set(exp_ops, "CMP_EQ", as_exp_ops::_AS_EXP_CODE_CMP_EQ);
	set(exp_ops, "KEY_EXIST", as_exp_ops::_AS_EXP_CODE_KEY_EXIST);
	set(exp_ops, "KEY", as_exp_ops::_AS_EXP_CODE_KEY);
	set(exp_ops, "BIN", as_exp_ops::_AS_EXP_CODE_BIN);
	set(exp_ops, "VAL_INT", as_exp_ops::_AS_EXP_CODE_VAL_INT);
	set(exp_ops, "VAL_RAWSTR", as_exp_ops::_AS_EXP_CODE_VAL_RAWSTR);

	Local<Object> exp_type = Nan::New<Object>();
	set(exp_type, "INT", as_exp_type::AS_EXP_TYPE_INT);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("ops").ToLocalChecked(), exp_ops);
	Nan::Set(enums, Nan::New("type").ToLocalChecked(), exp_type);
	return scope.Escape(enums);
}
