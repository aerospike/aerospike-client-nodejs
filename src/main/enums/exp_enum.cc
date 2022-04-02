/*******************************************************************************
 * Copyright 2021-2022 Aerospike, Inc.
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

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> exp_opcode_values()
{
	Nan::EscapableHandleScope scope;

	Local<Object> exp_ops = Nan::New<Object>();
	set(exp_ops, "CMP_EQ", as_exp_ops::_AS_EXP_CODE_CMP_EQ);
	set(exp_ops, "CMP_NE", as_exp_ops::_AS_EXP_CODE_CMP_NE);
	set(exp_ops, "CMP_GT", as_exp_ops::_AS_EXP_CODE_CMP_GT);
	set(exp_ops, "CMP_GE", as_exp_ops::_AS_EXP_CODE_CMP_GE);
	set(exp_ops, "CMP_LT", as_exp_ops::_AS_EXP_CODE_CMP_LT);
	set(exp_ops, "CMP_LE", as_exp_ops::_AS_EXP_CODE_CMP_LE);

	set(exp_ops, "CMP_REGEX", as_exp_ops::_AS_EXP_CODE_CMP_REGEX);
	set(exp_ops, "CMP_GEO", as_exp_ops::_AS_EXP_CODE_CMP_GEO);

	set(exp_ops, "AND", as_exp_ops::_AS_EXP_CODE_AND);
	set(exp_ops, "OR", as_exp_ops::_AS_EXP_CODE_OR);
	set(exp_ops, "NOT", as_exp_ops::_AS_EXP_CODE_NOT);
	set(exp_ops, "EXCLUSIVE", as_exp_ops::_AS_EXP_CODE_EXCLUSIVE);

	set(exp_ops, "DIGEST_MODULO", as_exp_ops::_AS_EXP_CODE_DIGEST_MODULO);
	set(exp_ops, "DEVICE_SIZE", as_exp_ops::_AS_EXP_CODE_DEVICE_SIZE);
	set(exp_ops, "LAST_UPDATE", as_exp_ops::_AS_EXP_CODE_LAST_UPDATE);
	set(exp_ops, "SINCE_UPDATE", as_exp_ops::_AS_EXP_CODE_SINCE_UPDATE);
	set(exp_ops, "VOID_TIME", as_exp_ops::_AS_EXP_CODE_VOID_TIME);
	set(exp_ops, "TTL", as_exp_ops::_AS_EXP_CODE_TTL);
	set(exp_ops, "SET_NAME", as_exp_ops::_AS_EXP_CODE_SET_NAME);
	set(exp_ops, "KEY_EXIST", as_exp_ops::_AS_EXP_CODE_KEY_EXIST);
	set(exp_ops, "IS_TOMBSTONE", as_exp_ops::_AS_EXP_CODE_NOT);
	set(exp_ops, "MEMORY_SIZE", as_exp_ops::_AS_EXP_CODE_MEMORY_SIZE);

	set(exp_ops, "KEY", as_exp_ops::_AS_EXP_CODE_KEY);
	set(exp_ops, "BIN", as_exp_ops::_AS_EXP_CODE_BIN);
	set(exp_ops, "BIN_TYPE", as_exp_ops::_AS_EXP_CODE_BIN_TYPE);

	set(exp_ops, "QUOTE", as_exp_ops::_AS_EXP_CODE_QUOTE);
	set(exp_ops, "CALL", as_exp_ops::_AS_EXP_CODE_CALL);

	set(exp_ops, "AS_VAL", as_exp_ops::_AS_EXP_CODE_AS_VAL);
	set(exp_ops, "VAL_GEO", as_exp_ops::_AS_EXP_CODE_VAL_GEO);
	set(exp_ops, "VAL_PK", as_exp_ops::_AS_EXP_CODE_VAL_PK);
	set(exp_ops, "VAL_INT", as_exp_ops::_AS_EXP_CODE_VAL_INT);
	set(exp_ops, "VAL_UINT", as_exp_ops::_AS_EXP_CODE_VAL_UINT);
	set(exp_ops, "VAL_FLOAT", as_exp_ops::_AS_EXP_CODE_VAL_FLOAT);
	set(exp_ops, "VAL_BOOL", as_exp_ops::_AS_EXP_CODE_VAL_BOOL);
	set(exp_ops, "VAL_STR", as_exp_ops::_AS_EXP_CODE_VAL_STR);
	set(exp_ops, "VAL_BYTES", as_exp_ops::_AS_EXP_CODE_VAL_BYTES);
	set(exp_ops, "VAL_RAWSTR", as_exp_ops::_AS_EXP_CODE_VAL_RAWSTR);
	set(exp_ops, "VAL_RTYPE", as_exp_ops::_AS_EXP_CODE_VAL_RTYPE);

	set(exp_ops, "CALL_VOP_START", as_exp_ops::_AS_EXP_CODE_CALL_VOP_START);
	set(exp_ops, "CDT_LIST_CRMOD", as_exp_ops::_AS_EXP_CODE_CDT_LIST_CRMOD);
	set(exp_ops, "CDT_LIST_MOD", as_exp_ops::_AS_EXP_CODE_CDT_LIST_MOD);
	set(exp_ops, "CDT_MAP_CRMOD", as_exp_ops::_AS_EXP_CODE_CDT_MAP_CRMOD);
	set(exp_ops, "CDT_MAP_CR", as_exp_ops::_AS_EXP_CODE_CDT_MAP_CR);
	set(exp_ops, "CDT_MAP_MOD", as_exp_ops::_AS_EXP_CODE_CDT_MAP_MOD);

	set(exp_ops, "END_OF_VA_ARGS", as_exp_ops::_AS_EXP_CODE_END_OF_VA_ARGS);

	set(exp_ops, "ADD", as_exp_ops::_AS_EXP_CODE_ADD);
	set(exp_ops, "SUB", as_exp_ops::_AS_EXP_CODE_SUB);
	set(exp_ops, "MUL", as_exp_ops::_AS_EXP_CODE_MUL);
	set(exp_ops, "DIV", as_exp_ops::_AS_EXP_CODE_DIV);
	set(exp_ops, "POW", as_exp_ops::_AS_EXP_CODE_POW);
	set(exp_ops, "LOG", as_exp_ops::_AS_EXP_CODE_LOG);
	set(exp_ops, "MOD", as_exp_ops::_AS_EXP_CODE_MOD);
	set(exp_ops, "ABS", as_exp_ops::_AS_EXP_CODE_ABS);
	set(exp_ops, "FLOOR", as_exp_ops::_AS_EXP_CODE_FLOOR);
	set(exp_ops, "CEIL", as_exp_ops::_AS_EXP_CODE_CEIL);
	set(exp_ops, "TO_INT", as_exp_ops::_AS_EXP_CODE_TO_INT);
	set(exp_ops, "TO_FLOAT", as_exp_ops::_AS_EXP_CODE_TO_FLOAT);
	set(exp_ops, "INT_AND", as_exp_ops::_AS_EXP_CODE_INT_AND);
	set(exp_ops, "INT_OR", as_exp_ops::_AS_EXP_CODE_INT_OR);
	set(exp_ops, "INT_XOR", as_exp_ops::_AS_EXP_CODE_INT_XOR);
	set(exp_ops, "INT_NOT", as_exp_ops::_AS_EXP_CODE_INT_NOT);
	set(exp_ops, "INT_LSHIFT", as_exp_ops::_AS_EXP_CODE_INT_LSHIFT);
	set(exp_ops, "INT_RSHIFT", as_exp_ops::_AS_EXP_CODE_INT_RSHIFT);
	set(exp_ops, "INT_ARSHIFT", as_exp_ops::_AS_EXP_CODE_INT_ARSHIFT);
	set(exp_ops, "INT_COUNT", as_exp_ops::_AS_EXP_CODE_INT_COUNT);
	set(exp_ops, "INT_LSCAN", as_exp_ops::_AS_EXP_CODE_INT_LSCAN);
	set(exp_ops, "INT_RSCAN", as_exp_ops::_AS_EXP_CODE_INT_RSCAN);
	set(exp_ops, "MIN", as_exp_ops::_AS_EXP_CODE_MIN);
	set(exp_ops, "MAX", as_exp_ops::_AS_EXP_CODE_MAX);

	set(exp_ops, "COND", as_exp_ops::_AS_EXP_CODE_COND);
	set(exp_ops, "LET", as_exp_ops::_AS_EXP_CODE_LET);
	set(exp_ops, "VAR", as_exp_ops::_AS_EXP_CODE_VAR);

	Local<Object> expop_ops = Nan::New<Object>();
	set(expop_ops, "READ", as_operator::AS_OPERATOR_EXP_READ);
	set(expop_ops, "WRITE", as_operator::AS_OPERATOR_EXP_MODIFY);

	Local<Object> exp_sys = Nan::New<Object>();
	set(exp_sys, "CALL_CDT", as_exp_call_system_type::_AS_EXP_SYS_CALL_CDT);
	set(exp_sys, "CALL_BITS", as_exp_call_system_type::_AS_EXP_SYS_CALL_BITS);
	set(exp_sys, "CALL_HLL", as_exp_call_system_type::_AS_EXP_SYS_CALL_HLL);
	set(exp_sys, "FLAG_MODIFY_LOCAL",
		as_exp_call_system_type::_AS_EXP_SYS_FLAG_MODIFY_LOCAL);

	Local<Object> exp_type = Nan::New<Object>();
	set(exp_type, "NIL", as_exp_type::AS_EXP_TYPE_NIL);
	set(exp_type, "INT", as_exp_type::AS_EXP_TYPE_INT);
	set(exp_type, "STR", as_exp_type::AS_EXP_TYPE_STR);
	set(exp_type, "LIST", as_exp_type::AS_EXP_TYPE_LIST);
	set(exp_type, "MAP", as_exp_type::AS_EXP_TYPE_MAP);
	set(exp_type, "BLOB", as_exp_type::AS_EXP_TYPE_BLOB);
	set(exp_type, "FLOAT", as_exp_type::AS_EXP_TYPE_FLOAT);
	set(exp_type, "GEOJSON", as_exp_type::AS_EXP_TYPE_GEOJSON);
	set(exp_type, "HLL", as_exp_type::AS_EXP_TYPE_HLL);

	set(exp_type, "AUTO", as_exp_type::AS_EXP_TYPE_AUTO);
	set(exp_type, "ERROR", as_exp_type::AS_EXP_TYPE_ERROR);

	Local<Object> enums = Nan::New<Object>();
	Nan::Set(enums, Nan::New("ops").ToLocalChecked(), exp_ops);
	Nan::Set(enums, Nan::New("sys").ToLocalChecked(), exp_sys);
	Nan::Set(enums, Nan::New("type").ToLocalChecked(), exp_type);
	return scope.Escape(enums);
}
