/*******************************************************************************
 * Copyright 2013-2021 Aerospike, Inc.
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

bool
add_exp_write_op(as_operations* ops, const char* bin, Local<Object> obj, LogInfo* log)
{
	int rc = 0;
	as_exp* exp = NULL;
	as_exp_write_flags flags = 0;

	Local<Array> exp_ary = Local<Array>::Cast(obj);
		if ((rc = compile_expression(exp_ary, &exp, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	return as_operations_exp_write(ops, bin, exp, flags);
}

bool
add_exp_read_op(as_operations* ops, const char* bin, Local<Object> obj, LogInfo* log)
{
	int rc = 0;
	as_exp* exp = NULL;
	as_exp_read_flags flags = 0;

	Local<Array> exp_ary = Local<Array>::Cast(obj);
		if ((rc = compile_expression(exp_ary, &exp, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	return as_operations_exp_read(ops, bin, exp, flags);
}


typedef bool (*Operation) (as_operations* ops, const char* bin, Local<Object> op, LogInfo* log);

typedef struct {
	const char* op_name;
	Operation op_function;
	bool needs_bin;
} ops_table_entry;

const ops_table_entry ops_table[] = {
	{ "WRITE", add_exp_write_op, true },
	{ "READ", add_exp_read_op, true }
};

int
add_exp_op(as_operations* ops, uint32_t opcode, Local<Object> op, LogInfo* log)
{
	opcode = opcode ^ EXPOP_OPS_OFFSET;
	const ops_table_entry *entry = &ops_table[opcode];
	if (!entry) {
		return AS_NODE_PARAM_ERR;
	}

	char* bin = NULL;
	if (entry->needs_bin) {
		if (get_string_property(&bin, op, "bin", log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	} else {
		bin = (char*) "n/a";
	}

	as_v8_debug(log, "Adding exp operation %s (opcode %i) on bin %s to operations list",
			entry->op_name, opcode, bin);
	bool success = (entry->op_function)(ops, bin, op, log);

	if (entry->needs_bin) free(bin);

	return success ? AS_NODE_PARAM_OK : AS_NODE_PARAM_ERR;
}

Local<Object>
expop_opcode_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	uint32_t entries = sizeof(ops_table) / sizeof(ops_table_entry);
	for (uint32_t i = 0; i < entries; i++) {
		ops_table_entry entry = ops_table[i];
		Nan::Set(obj, Nan::New(entry.op_name).ToLocalChecked(), Nan::New(EXPOP_OPS_OFFSET | i));
	}

	return scope.Escape(obj);
}
