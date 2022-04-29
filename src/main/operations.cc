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

#include <cstdint>
#include <node.h>

#include "operations.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

int add_operation(as_operations *ops, uint32_t opcode, Local<Object> params,
				  LogInfo *log)
{
	switch (opcode & OPS_MASK) {
	case SCALAR_OPS_OFFSET:
		return add_scalar_op(ops, opcode, params, log);
	case LIST_OPS_OFFSET:
		return add_list_op(ops, opcode, params, log);
	case MAP_OPS_OFFSET:
		return add_map_op(ops, opcode, params, log);
	case BIT_OPS_OFFSET:
		return add_bit_op(ops, opcode, params, log);
	case HLL_OPS_OFFSET:
		return add_hll_op(ops, opcode, params, log);
	case EXPOP_OPS_OFFSET:
		return add_exp_op(ops, opcode, params, log);
	default:
		return AS_NODE_PARAM_ERR;
	}
}

int operations_from_jsarray(as_operations *ops, Local<Array> arr, LogInfo *log)
{
	uint32_t capacity = arr->Length();
	if (capacity == 0) {
		as_v8_error(log, "Operations list is empty");
		return AS_NODE_PARAM_ERR;
	}
	as_v8_detail(log, "Converting operations list: size=%d", capacity);

	int result = AS_NODE_PARAM_OK;
	uint32_t op;
	for (uint32_t i = 0; i < capacity; i++) {
		Local<Object> obj = Nan::Get(arr, i).ToLocalChecked().As<Object>();
		result = get_uint32_property(&op, obj, "op", log);
		if (result == AS_NODE_PARAM_OK) {
			result = add_operation(ops, op, obj, log);
		}
		if (result != AS_NODE_PARAM_OK) {
			as_v8_error(log, "invalid operation [%i] - result: %i", op, result);
			break;
		}
	}

	return result;
}
