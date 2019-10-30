/*******************************************************************************
 * Copyright 2018 Aerospike, Inc.
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
#include <aerospike/as_list_operations.h>
}

using namespace v8;

#define set(__obj, __name, __value) Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> list_enum_values()
{
	Nan::EscapableHandleScope scope;

	// as_list_order
	Local<Object> order = Nan::New<Object>();
	set(order, "UNORDERED", AS_LIST_UNORDERED);
	set(order, "ORDERED", AS_LIST_ORDERED);

	// as_list_sort_flags
	Local<Object> sort_flags = Nan::New<Object>();
	set(sort_flags, "DEFAULT", AS_LIST_SORT_DEFAULT);
	set(sort_flags, "DROP_DUPLICATES", AS_LIST_SORT_DROP_DUPLICATES);

	// as_list_write_flags
	Local<Object> write_flags = Nan::New<Object>();
	set(write_flags, "DEFAULT", AS_LIST_WRITE_DEFAULT);
	set(write_flags, "ADD_UNIQUE", AS_LIST_WRITE_ADD_UNIQUE);
	set(write_flags, "INSERT_BOUNDED", AS_LIST_WRITE_INSERT_BOUNDED);
	set(write_flags, "NO_FAIL", AS_LIST_WRITE_NO_FAIL);
	set(write_flags, "PARTIAL", AS_LIST_WRITE_PARTIAL);

	// as_list_return_type
	Local<Object> return_type = Nan::New<Object>();
	set(return_type, "NONE", AS_LIST_RETURN_NONE);
	set(return_type, "INDEX", AS_LIST_RETURN_INDEX);
	set(return_type, "REVERSE_INDEX", AS_LIST_RETURN_REVERSE_INDEX);
	set(return_type, "RANK", AS_LIST_RETURN_RANK);
	set(return_type, "REVERSE_RANK", AS_LIST_RETURN_REVERSE_RANK);
	set(return_type, "COUNT", AS_LIST_RETURN_COUNT);
	set(return_type, "VALUE", AS_LIST_RETURN_VALUE);
	set(return_type, "INVERTED", AS_LIST_RETURN_INVERTED);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("order").ToLocalChecked(), order);
	Nan::Set(enums, Nan::New("sortFlags").ToLocalChecked(), sort_flags);
	Nan::Set(enums, Nan::New("writeFlags").ToLocalChecked(), write_flags);
	Nan::Set(enums, Nan::New("returnType").ToLocalChecked(), return_type);
	return scope.Escape(enums);
}
