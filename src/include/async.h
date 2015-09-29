/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
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
#include <citrusleaf/cf_queue.h>

/*******************************************************************************
 * STRUCTURES
 ********************************************************************************/
// This structure is used by query and scan async handles.
// To process the records from the callback and pass it to nodejs
typedef struct AsyncCallbackData {
    Nan::Persistent<Function> data_cb;
    Nan::Persistent<Function> error_cb;
    Nan::Persistent<Function> end_cb;
	cf_queue * result_q;
	int max_q_size;
	LogInfo * log;
	int signal_interval;
	uv_async_t async_handle;
}AsyncCallbackData;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/
/**
 *  Setup an asynchronous invocation of a function.
 */
Local<Value> async_invoke(
    ResolveArgs(args),
    void *  (* prepare)(ResolveArgs(args)),
    void    (* execute)(uv_work_t * req),
    void    (* respond)(uv_work_t * req, int status)
    );

void async_init( uv_async_t * async, void (*async_callback)(ResolveAsyncCallbackArgs));

void async_send( uv_async_t * async);

void async_close(uv_async_t* async);

void uv_initialize_loop();

void uv_finish_loop_execution();


// Anyone using async infrastructure have to implement the following three
// functions.
// 1. Callback to be called when an async signal is sent.
// 2. Function to populate the data coming from C, into the queue.
// 3. Function to populate the data from the queue and send it to nodejs application.

// currently scan and queue uses this infrastructure and has the custom implementation
// for all the three functions.
// And here is the example.
// Callback that's invoked when an async signal is sent.
//void async_callback( ResolveAsyncCallbackArgs);

// Push the result from C callback into a queue.
//bool async_queue_populate(const as_val * val, AsyncCallbackData* data);

// Process each element in the queue and call the nodejs callback with the processed data.
//void async_queue_process( AsyncCallbackData * data);


