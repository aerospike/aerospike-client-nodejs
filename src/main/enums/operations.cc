/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
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
#include "enums.h"
#include <aerospike/as_operations.h>
using namespace v8;

#define set_op(__obj, __str, __val) __obj->Set(Nan::New(__str).ToLocalChecked(), Nan::New(__val))

Local<Object> operations()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set_op(obj, "READ", AS_OPERATOR_READ);
	set_op(obj, "WRITE", AS_OPERATOR_WRITE);
	set_op(obj, "INCR", AS_OPERATOR_INCR);
	set_op(obj, "APPEND", AS_OPERATOR_APPEND);
	set_op(obj, "PREPEND", AS_OPERATOR_PREPEND);
	set_op(obj, "TOUCH", AS_OPERATOR_TOUCH);
	return scope.Escape(obj);
}

