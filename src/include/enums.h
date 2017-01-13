/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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

#include <nan.h>
#include <node.h>
#include "client.h"

#define TTL_NAMESPACE_DEFAULT	0
#define TTL_NEVER_EXPIRE		-1
#define TTL_DONT_UPDATE			-2

using namespace v8;

Local<Object> generation_policy_values();
Local<Object> indexDataType();
Local<Object> indexType();
Local<Object> jobStatus();
Local<Object> key_policy_values();
Local<Object> languages();
Local<Object> log();
Local<Object> map_enum_values();
Local<Object> opcode_values();
Local<Object> policy();
Local<Object> predicates();
Local<Object> retry_policy_values();
Local<Object> scanPriority();
Local<Object> status();
Local<Object> ttl_enum_values();
