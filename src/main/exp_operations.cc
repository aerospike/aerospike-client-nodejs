/*******************************************************************************
 * Copyright 2022 Aerospike, Inc.
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
#include "expressions.h"
#include "operations.h"

extern "C" {
#include <aerospike/as_exp_operations.h>
}

using namespace v8;

bool add_exp_write_op(as_operations *ops, const char *bin, as_exp *exp,
					  int flags, LogInfo *log)
{
	return as_operations_exp_write(ops, bin, exp, (as_exp_write_flags)flags);
}

bool add_exp_read_op(as_operations *ops, const char *bin, as_exp *exp,
					 int flags, LogInfo *log)
{
	return as_operations_exp_read(ops, bin, exp, (as_exp_read_flags)flags);
}

typedef bool (*Operation)(as_operations *ops, const char *bin, as_exp *exp,
						  int flags, LogInfo *log);

typedef struct {
	const char *op_name;
	Operation op_function;
} ops_table_entry;

const ops_table_entry ops_table[] = {{"WRITE", add_exp_write_op},
									 {"READ", add_exp_read_op}};

int add_exp_op(as_operations *ops, uint32_t opcode, Local<Object> op,
			   LogInfo *log)
{
	as_exp *exp = NULL;
	int flags = 0;

	opcode = opcode ^ EXPOP_OPS_OFFSET;
	const ops_table_entry *entry = &ops_table[opcode];
	if (!entry) {
		return AS_NODE_PARAM_ERR;
	}

	char *bin = NULL;
	if (get_string_property(&bin, op, "bin", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	if (get_int_property((int *)&flags, op, "flags", log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> exp_val =
		Nan::Get(op, Nan::New("exp").ToLocalChecked()).ToLocalChecked();
	if (exp_val->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if (compile_expression(exp_ary, &exp, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}

	as_v8_debug(
		log, "Adding exp operation %s (opcode %i) on bin %s to operations list",
		entry->op_name, opcode, bin);

	bool success = (entry->op_function)(ops, bin, exp, flags, log);

	return success ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
}

Local<Object> expop_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(),
				 Nan::New(EXPOP_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}
