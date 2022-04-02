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

#pragma once

extern "C" {
#include <aerospike/as_operations.h>
}

#include <node.h>

#include "log.h"

int operations_from_jsarray(as_operations *ops, v8::Local<v8::Array> arr,
							LogInfo *log);
int add_scalar_op(as_operations *ops, uint32_t opcode, v8::Local<v8::Object> op,
				  LogInfo *log);
int add_list_op(as_operations *ops, uint32_t opcode, v8::Local<v8::Object> op,
				LogInfo *log);
int add_map_op(as_operations *ops, uint32_t opcode, v8::Local<v8::Object> op,
			   LogInfo *log);
int add_bit_op(as_operations *ops, uint32_t opcode, v8::Local<v8::Object> op,
			   LogInfo *log);
int add_hll_op(as_operations *ops, uint32_t opcode, v8::Local<v8::Object> op,
			   LogInfo *log);
int add_exp_op(as_operations *ops, uint32_t opcode, v8::Local<v8::Object> op,
			   LogInfo *log);
int get_optional_cdt_context(as_cdt_ctx *context, bool *has_context,
							 v8::Local<v8::Object> obj, const char *prop,
							 const LogInfo *log);

v8::Local<v8::Object> scalar_opcode_values();
v8::Local<v8::Object> list_opcode_values();
v8::Local<v8::Object> map_opcode_values();
v8::Local<v8::Object> bit_opcode_values();
v8::Local<v8::Object> hll_opcode_values();
v8::Local<v8::Object> expop_opcode_values();

const uint32_t OPS_MASK = 0xFF00;
const uint32_t SCALAR_OPS_OFFSET = 0x0000;
const uint32_t LIST_OPS_OFFSET = 0x0100;
const uint32_t MAP_OPS_OFFSET = 0x0200;
const uint32_t BIT_OPS_OFFSET = 0x0300;
const uint32_t HLL_OPS_OFFSET = 0x0400;
const uint32_t EXPOP_OPS_OFFSET = 0x0500;
