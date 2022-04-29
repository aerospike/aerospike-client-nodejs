/*******************************************************************************
 * Copyright 2018-2022 Aerospike, Inc.
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

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

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

	// as_cdt_op_list
	Local<Object> opcodes = Nan::New<Object>();
	set(opcodes, "SET_TYPE", AS_CDT_OP_LIST_SET_TYPE);
	set(opcodes, "APPEND", AS_CDT_OP_LIST_APPEND);
	set(opcodes, "APPEND_ITEMS", AS_CDT_OP_LIST_APPEND_ITEMS);
	set(opcodes, "INSERT", AS_CDT_OP_LIST_INSERT);
	set(opcodes, "INSERT_ITEMS", AS_CDT_OP_LIST_INSERT_ITEMS);
	set(opcodes, "POP", AS_CDT_OP_LIST_POP);
	set(opcodes, "POP_RANGE", AS_CDT_OP_LIST_POP_RANGE);
	set(opcodes, "REMOVE", AS_CDT_OP_LIST_REMOVE);
	set(opcodes, "REMOVE_RANGE", AS_CDT_OP_LIST_REMOVE_RANGE);
	set(opcodes, "SET", AS_CDT_OP_LIST_SET);
	set(opcodes, "TRIM", AS_CDT_OP_LIST_TRIM);
	set(opcodes, "CLEAR", AS_CDT_OP_LIST_CLEAR);
	set(opcodes, "INCREMENT", AS_CDT_OP_LIST_INCREMENT);
	set(opcodes, "SORT", AS_CDT_OP_LIST_SORT);
	set(opcodes, "SIZE", AS_CDT_OP_LIST_SIZE);
	set(opcodes, "GET", AS_CDT_OP_LIST_GET);
	set(opcodes, "GET_RANGE", AS_CDT_OP_LIST_GET_RANGE);
	set(opcodes, "GET_BY_INDEX", AS_CDT_OP_LIST_GET_BY_INDEX);
	set(opcodes, "GET_BY_RANK", AS_CDT_OP_LIST_GET_BY_RANK);
	set(opcodes, "GET_ALL_BY_VALUE", AS_CDT_OP_LIST_GET_ALL_BY_VALUE);
	set(opcodes, "GET_BY_VALUE_LIST", AS_CDT_OP_LIST_GET_BY_VALUE_LIST);
	set(opcodes, "GET_BY_INDEX_RANGE", AS_CDT_OP_LIST_GET_BY_INDEX_RANGE);
	set(opcodes, "GET_BY_VALUE_INTERVAL", AS_CDT_OP_LIST_GET_BY_VALUE_INTERVAL);
	set(opcodes, "GET_BY_RANK_RANGE", AS_CDT_OP_LIST_GET_BY_RANK_RANGE);
	set(opcodes, "GET_BY_VALUE_REL_RANK_RANGE",
		AS_CDT_OP_LIST_GET_BY_VALUE_REL_RANK_RANGE);
	set(opcodes, "REMOVE_BY_INDEX", AS_CDT_OP_LIST_REMOVE_BY_INDEX);
	set(opcodes, "REMOVE_BY_RANK", AS_CDT_OP_LIST_REMOVE_BY_RANK);
	set(opcodes, "REMOVE_ALL_BY_VALUE", AS_CDT_OP_LIST_REMOVE_ALL_BY_VALUE);
	set(opcodes, "REMOVE_BY_VALUE_LIST", AS_CDT_OP_LIST_REMOVE_BY_VALUE_LIST);
	set(opcodes, "REMOVE_BY_INDEX_RANGE", AS_CDT_OP_LIST_REMOVE_BY_INDEX_RANGE);
	set(opcodes, "REMOVE_BY_VALUE_INTERVAL",
		AS_CDT_OP_LIST_REMOVE_BY_VALUE_INTERVAL);
	set(opcodes, "REMOVE_BY_RANK_RANGE", AS_CDT_OP_LIST_REMOVE_BY_RANK_RANGE);
	set(opcodes, "REMOVE_BY_VALUE_REL_RANK_RANGE",
		AS_CDT_OP_LIST_REMOVE_BY_VALUE_REL_RANK_RANGE);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("order").ToLocalChecked(), order);
	Nan::Set(enums, Nan::New("sortFlags").ToLocalChecked(), sort_flags);
	Nan::Set(enums, Nan::New("writeFlags").ToLocalChecked(), write_flags);
	Nan::Set(enums, Nan::New("returnType").ToLocalChecked(), return_type);
	Nan::Set(enums, Nan::New("opcodes").ToLocalChecked(), opcodes);
	return scope.Escape(enums);
}
