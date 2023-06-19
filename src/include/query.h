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

#pragma once

extern "C" {
#include <aerospike/as_query.h>
}

#include <node.h>

#include "log.h"


struct query_udata {
    as_query* query;
    AsyncCommand* cmd;
    uint32_t count;
    uint32_t max_records;
};

void setup_query(as_query *query, v8::Local<v8::Value> ns,
				 v8::Local<v8::Value> set, v8::Local<v8::Value> maybe_options,
				 as_cdt_ctx* context, bool* with_context, LogInfo *log);
void setup_options(as_query *query, v8::Local<v8::Object> options, as_cdt_ctx* context, bool* with_context, LogInfo *log);
void setup_query_pages(as_query ** query, v8::Local<v8::Value> ns, v8::Local<v8::Value> set,
                       v8::Local<v8::Value>maybe_options, uint8_t* bytes, uint32_t bytes_size,
                       as_cdt_ctx* context, bool* with_context, LogInfo *log);
void free_query(as_query *query, as_policy_query *policy);
