/*******************************************************************************
 * Copyright 2013-2023 Aerospike, Inc.
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

#include "conversions.h"
#include "log.h"
#include "operations.h"
#include "expressions.h"

extern "C" {
#include <aerospike/as_nil.h>
#include <aerospike/as_operations.h>
}

using namespace v8;

bool add_select_by_path_op(as_operations *ops, const char *bin, as_cdt_ctx *context, struct as_exp* mod_exp, Local<Object> obj,
				 LogInfo *log)
{
	as_exp_path_select_flags flags;
	if (get_int_property((int *)&flags, obj, "flags", log) != AS_NODE_PARAM_OK) {
		return false;
	}

 	as_error err;
 	as_error_init(&err);

	as_status status = as_operations_select_by_path(&err, ops, bin, context, flags);
	if(status){

		printf("FAILED TO ADD OPERATION\n");
		return false;
	}
	else{
		return true;
	}
}

bool add_modify_by_path_op(as_operations *ops, const char *bin, as_cdt_ctx *context, struct as_exp* mod_exp, Local<Object> obj,
				 LogInfo *log)
{
	as_exp_path_modify_flags flags;
	if (get_int_property((int *)&flags, obj, "flags", log) != AS_NODE_PARAM_OK) {
		return false;
	}

 	as_error err;
 	as_error_init(&err);

	as_exp *exp = NULL;
	Local<Value> exp_val =
		Nan::Get(obj, Nan::New("modExp").ToLocalChecked()).ToLocalChecked();
	if (exp_val->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if (compile_expression(exp_ary, &exp, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}
	else if (exp_val->IsString()) {
		Nan::Utf8String exp_b64(exp_val.As<String>());
		exp = as_exp_from_base64(*exp_b64);
	}
	else {
		as_v8_error(log, "Type error: expression must be an array or a string");
		return false;
	}


	as_status status = as_operations_modify_by_path(&err, ops, bin, context, mod_exp, flags);
	if(status){
		return false;
	}
	else{
		return true;
	}
}

typedef bool (*CDTOperation)(as_operations *ops, const char *bin,
							  as_cdt_ctx *context, struct as_exp* mod_exp, Local<Object> op,
							  LogInfo *log);

typedef struct {
	const char *op_name;
	CDTOperation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{"SELECT_BY_PATH", add_select_by_path_op},	 {"MODIFY_BY_PATH", add_modify_by_path_op}};


int add_cdt_op(as_operations *ops, uint32_t opcode, Local<Object> op,
				  LogInfo *log)
{

	opcode = opcode ^ CDT_OPS_OFFSET;
	const ops_table_entry *entry = &ops_table[opcode];
	if (!entry) {
		return AS_NODE_PARAM_ERR;
	}

	char *bin = NULL;
	if (get_string_property(&bin, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	bool with_context;
	as_cdt_ctx context;
	if (get_optional_cdt_context(&context, &with_context, op, "context", log) !=
		AS_NODE_PARAM_OK) {
		free(bin);
		return AS_NODE_PARAM_ERR;
	}

	as_exp *exp = NULL;
	Local<Value> exp_val =
		Nan::Get(op, Nan::New("modExp").ToLocalChecked()).ToLocalChecked();
	if (exp_val->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if (compile_expression(exp_ary, &exp, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}
	else if (exp_val->IsString()) {
		Nan::Utf8String exp_b64(exp_val.As<String>());
		exp = as_exp_from_base64(*exp_b64);
	}

	as_v8_debug(
		log,
		"Adding cdt operation %s (opcode %i) on bin %s to operations list",
		entry->op_name, opcode, bin);
	bool success = (entry->op_function)(ops, bin, with_context ? &context : NULL, exp, op, log);

	free(bin);
	as_exp_destroy(exp);
	if (with_context)
		as_cdt_ctx_destroy(&context);

	return success ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
}

Local<Object> cdt_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(),
				 Nan::New(CDT_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}