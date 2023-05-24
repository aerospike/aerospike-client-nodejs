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

extern "C" {
#include <aerospike/as_scan.h>
}

#include <node.h>

#include "log.h"

struct scan_udata {
    as_scan* scan;
    AsyncCommand * cmd;
    uint32_t count;
    uint32_t max_records;
};

void setup_scan(as_scan *scan, v8::Local<v8::Value> ns,
				v8::Local<v8::Value> set, v8::Local<v8::Value> maybe_options,
				LogInfo *log);

void setup_options(as_scan *scan, v8::Local<v8::Object> options, LogInfo *log);

void setup_scan_pages(as_scan **scan, v8::Local<v8::Value> ns, v8::Local<v8::Value> set,
                      v8::Local<v8::Value> maybe_options, uint8_t* bytes, uint32_t bytes_size, LogInfo *log);