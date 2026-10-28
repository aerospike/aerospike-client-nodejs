/*******************************************************************************
 * Copyright 2026 Aerospike, Inc.
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
#include <nan.h>

extern "C" {
#include <aerospike/as_bytes.h>
}

#include "log.h"

// Native helpers behind lib/vector.js. The serialized format and its
// validation belong to the C client (as_vector_value.h).
NAN_METHOD(setVectorClass);
NAN_METHOD(vectorEncode);
NAN_METHOD(vectorDecode);

bool is_vector_value(v8::Local<v8::Value> value);
int vector_bytes_from_jsvalue(as_bytes **bytes, v8::Local<v8::Value> value,
							  const LogInfo *log);
v8::Local<v8::Value> vector_to_jsvalue(v8::Local<v8::Object> buffer);
