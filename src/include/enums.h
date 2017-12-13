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

#include <node.h>

#define TTL_NAMESPACE_DEFAULT  0
#define TTL_NEVER_EXPIRE      -1
#define TTL_DONT_UPDATE       -2

v8::Local<v8::Object> generation_policy_values();
v8::Local<v8::Object> indexDataType();
v8::Local<v8::Object> indexType();
v8::Local<v8::Object> jobStatus();
v8::Local<v8::Object> key_policy_values();
v8::Local<v8::Object> languages();
v8::Local<v8::Object> log();
v8::Local<v8::Object> map_enum_values();
v8::Local<v8::Object> opcode_values();
v8::Local<v8::Object> policy();
v8::Local<v8::Object> predicates();
v8::Local<v8::Object> retry_policy_values();
v8::Local<v8::Object> scanPriority();
v8::Local<v8::Object> status();
v8::Local<v8::Object> ttl_enum_values();
