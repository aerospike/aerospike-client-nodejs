/*******************************************************************************
 * Copyright 2013-2022 Aerospike, Inc.
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
#include <aerospike/as_map_operations.h>
}

using namespace v8;

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> map_enum_values()
{
	Nan::EscapableHandleScope scope;

	// as_map_order
	Local<Object> order = Nan::New<Object>();
	set(order, "UNORDERED", AS_MAP_UNORDERED);
	set(order, "KEY_ORDERED", AS_MAP_KEY_ORDERED);
	set(order, "KEY_VALUE_ORDERED", AS_MAP_KEY_VALUE_ORDERED);

	// as_map_write_mode
	Local<Object> write_mode = Nan::New<Object>();
	set(write_mode, "UPDATE", AS_MAP_UPDATE);
	set(write_mode, "UPDATE_ONLY", AS_MAP_UPDATE_ONLY);
	set(write_mode, "CREATE_ONLY", AS_MAP_CREATE_ONLY);

	// as_map_write_flags
	Local<Object> write_flags = Nan::New<Object>();
	set(write_flags, "DEFAULT", AS_MAP_WRITE_DEFAULT);
	set(write_flags, "CREATE_ONLY", AS_MAP_WRITE_CREATE_ONLY);
	set(write_flags, "UPDATE_ONLY", AS_MAP_WRITE_UPDATE_ONLY);
	set(write_flags, "NO_FAIL", AS_MAP_WRITE_NO_FAIL);
	set(write_flags, "PARTIAL", AS_MAP_WRITE_PARTIAL);

	// as_map_return_type
	Local<Object> return_type = Nan::New<Object>();
	set(return_type, "NONE", AS_MAP_RETURN_NONE);
	set(return_type, "INDEX", AS_MAP_RETURN_INDEX);
	set(return_type, "REVERSE_INDEX", AS_MAP_RETURN_REVERSE_INDEX);
	set(return_type, "RANK", AS_MAP_RETURN_RANK);
	set(return_type, "REVERSE_RANK", AS_MAP_RETURN_REVERSE_RANK);
	set(return_type, "COUNT", AS_MAP_RETURN_COUNT);
	set(return_type, "KEY", AS_MAP_RETURN_KEY);
	set(return_type, "VALUE", AS_MAP_RETURN_VALUE);
	set(return_type, "KEY_VALUE", AS_MAP_RETURN_KEY_VALUE);
	set(return_type, "INVERTED", AS_MAP_RETURN_INVERTED);

	// as_cdt_op_map
	Local<Object> opcodes = Nan::New<Object>();
	set(opcodes, "SET_TYPE", AS_CDT_OP_MAP_SET_TYPE);
	set(opcodes, "ADD", AS_CDT_OP_MAP_ADD);
	set(opcodes, "ADD_ITEMS", AS_CDT_OP_MAP_ADD_ITEMS);
	set(opcodes, "PUT", AS_CDT_OP_MAP_PUT);
	set(opcodes, "PUT_ITEMS", AS_CDT_OP_MAP_PUT_ITEMS);
	set(opcodes, "REPLACE", AS_CDT_OP_MAP_REPLACE);
	set(opcodes, "REPLACE_ITEMS", AS_CDT_OP_MAP_REPLACE_ITEMS);
	set(opcodes, "INCREMENT", AS_CDT_OP_MAP_INCREMENT);
	set(opcodes, "DECREMENT", AS_CDT_OP_MAP_DECREMENT);
	set(opcodes, "CLEAR", AS_CDT_OP_MAP_CLEAR);
	set(opcodes, "REMOVE_BY_KEY", AS_CDT_OP_MAP_REMOVE_BY_KEY);
	set(opcodes, "REMOVE_BY_INDEX", AS_CDT_OP_MAP_REMOVE_BY_INDEX);
	set(opcodes, "REMOVE_BY_RANK", AS_CDT_OP_MAP_REMOVE_BY_RANK);
	set(opcodes, "REMOVE_BY_KEY_LIST", AS_CDT_OP_MAP_REMOVE_BY_KEY_LIST);
	set(opcodes, "REMOVE_ALL_BY_VALUE", AS_CDT_OP_MAP_REMOVE_ALL_BY_VALUE);
	set(opcodes, "REMOVE_BY_VALUE_LIST", AS_CDT_OP_MAP_REMOVE_BY_VALUE_LIST);
	set(opcodes, "REMOVE_BY_KEY_INTERVAL",
		AS_CDT_OP_MAP_REMOVE_BY_KEY_INTERVAL);
	set(opcodes, "REMOVE_BY_INDEX_RANGE", AS_CDT_OP_MAP_REMOVE_BY_INDEX_RANGE);
	set(opcodes, "REMOVE_BY_VALUE_INTERVAL",
		AS_CDT_OP_MAP_REMOVE_BY_VALUE_INTERVAL);
	set(opcodes, "REMOVE_BY_RANK_RANGE", AS_CDT_OP_MAP_REMOVE_BY_RANK_RANGE);
	set(opcodes, "REMOVE_BY_KEY_REL_INDEX_RANGE",
		AS_CDT_OP_MAP_REMOVE_BY_KEY_REL_INDEX_RANGE);
	set(opcodes, "REMOVE_BY_VALUE_REL_RANK_RANGE",
		AS_CDT_OP_MAP_REMOVE_BY_VALUE_REL_RANK_RANGE);
	set(opcodes, "SIZE", AS_CDT_OP_MAP_SIZE);
	set(opcodes, "GET_BY_KEY", AS_CDT_OP_MAP_GET_BY_KEY);
	set(opcodes, "GET_BY_INDEX", AS_CDT_OP_MAP_GET_BY_INDEX);
	set(opcodes, "GET_BY_RANK", AS_CDT_OP_MAP_GET_BY_RANK);
	set(opcodes, "GET_ALL_BY_VALUE", AS_CDT_OP_MAP_GET_ALL_BY_VALUE);
	set(opcodes, "GET_BY_KEY_INTERVAL", AS_CDT_OP_MAP_GET_BY_KEY_INTERVAL);
	set(opcodes, "GET_BY_INDEX_RANGE", AS_CDT_OP_MAP_GET_BY_INDEX_RANGE);
	set(opcodes, "GET_BY_VALUE_INTERVAL", AS_CDT_OP_MAP_GET_BY_VALUE_INTERVAL);
	set(opcodes, "GET_BY_RANK_RANGE", AS_CDT_OP_MAP_GET_BY_RANK_RANGE);
	set(opcodes, "GET_BY_KEY_LIST", AS_CDT_OP_MAP_GET_BY_KEY_LIST);
	set(opcodes, "GET_BY_VALUE_LIST", AS_CDT_OP_MAP_GET_BY_VALUE_LIST);
	set(opcodes, "GET_BY_KEY_REL_INDEX_RANGE",
		AS_CDT_OP_MAP_GET_BY_KEY_REL_INDEX_RANGE);
	set(opcodes, "GET_BY_VALUE_REL_RANK_RANGE",
		AS_CDT_OP_MAP_GET_BY_VALUE_REL_RANK_RANGE);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("order").ToLocalChecked(), order);
	Nan::Set(enums, Nan::New("writeMode").ToLocalChecked(), write_mode);
	Nan::Set(enums, Nan::New("writeFlags").ToLocalChecked(), write_flags);
	Nan::Set(enums, Nan::New("returnType").ToLocalChecked(), return_type);
	Nan::Set(enums, Nan::New("opcodes").ToLocalChecked(), opcodes);
	return scope.Escape(enums);
}
