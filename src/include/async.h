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

extern "C" {
	#include <aerospike/aerospike.h>
	#include <aerospike/aerospike_batch.h>
	#include <aerospike/as_event.h>
}

#include <nan.h>
#include <node.h>

#include "client.h"

typedef struct CallbackData {
	AerospikeClient * client;
	Nan::Persistent<v8::Function> callback;
	void* data;
} CallbackData;

/**
 * Creates a new as_error struct with status code set to AEROSPIKE_ERR_OK.
 */
v8::Local<v8::Object> err_ok();

/**
 *  Setup an asynchronous invocation of a function using libuv worker threads.
 */
v8::Local<v8::Value> async_invoke(
    const Nan::FunctionCallbackInfo<v8::Value> &args,
    void* (* prepare)(const Nan::FunctionCallbackInfo<v8::Value> &args),
    void  (* execute)(uv_work_t* req),
    void  (* respond)(uv_work_t* req, int status)
    );

/**
 * Asynchronously invoke callback function with the given error.
 */
void invoke_error_callback(as_error* error, CallbackData* data);

// implements the as_async_record_listener interface
void async_record_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop);

// implements the as_async_write_listener interface
void async_write_listener(as_error* err, void* udata, as_event_loop* event_loop);

// implements the as_async_value_listener interface
void async_value_listener(as_error* err, as_val* value, void* udata, as_event_loop* event_loop);

// implements the as_async_batch_listener interface
void async_batch_listener(as_error* err, as_batch_read_records* records, void* udata, as_event_loop* event_loop);

// implements the as_async_scan_listener and as_async_query_record_listener interfaces
bool async_scan_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop);
