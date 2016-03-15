/*******************************************************************************
 * Copyright 2016 Aerospike, Inc.
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
	#include <aerospike/aerospike.h>
	#include <aerospike/as_event.h>
}

#include <node.h>
#include "client.h"

typedef struct CallbackData {
	AerospikeClient * client;
	Nan::Persistent<Function> callback;
} CallbackData;

void invoke_error_callback(int code, const char* message, CallbackData* data);

// implements the as_async_record_listener interface
void async_record_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop);

// implements the as_async_write_listener interface
void async_write_listener(as_error* err, void* udata, as_event_loop* event_loop);

// implements the as_async_value_listener interface
void async_value_listener(as_error* err, as_val* value, void* udata, as_event_loop* event_loop);
