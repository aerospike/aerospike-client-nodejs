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

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "policy.h"
#include "log.h"
#include "query.h"

extern "C" {
	#include <aerospike/aerospike_query.h>
	#include <aerospike/as_error.h>
	#include <aerospike/as_policy.h>
	#include <aerospike/as_query.h>
	#include <aerospike/as_status.h>
	#include <citrusleaf/cf_queue.h>
}

using namespace v8;

#define QUEUE_SZ 100000

typedef struct AsyncData {
	bool param_err;
	aerospike* as;
	as_error err;
	as_policy_query policy;
	as_policy_query* p_policy;
	as_query query;
	cf_queue* result_q;
	int max_q_size;
	int signal_interval;
	uv_async_t async_handle;
	LogInfo* log;
	Nan::Persistent<Function> callback;
} AsyncData;

// Push the record from the server to a queue.
// The record cannot be passed directly from query callback to v8 thread
// because v8 objects can only be created inside a v8 context. This
// callback is in C client thread, which is not aware of the v8 context. So
// store this records in a temporary queue. When the queue reaches a certain
// size, signal v8 thread to process the queue.
static bool async_queue_populate(const as_val* val, AsyncData* data)
{
	if (data->result_q == NULL) {
		// Result queue is not initialized - this should never happen!
		as_v8_error(data->log, "Internal Error: Queue not initialized");
		return false;
	}

	// Clone the value as as_val is freed up after the callback.
	as_val* clone = asval_clone((as_val*) val, data->log);
	if (clone != NULL) {
		if (cf_queue_sz(data->result_q) >= data->max_q_size) {
			sleep(1);
		}
		cf_queue_push(data->result_q, &clone);
		data->signal_interval++;
		if (data->signal_interval % (data->max_q_size / 20) == 0) {
			data->signal_interval = 0;
			uv_async_send(&data->async_handle);
		}
	}

	return true;
}

// Pop each record from the queue and invoke the node callback with this record.
static void async_queue_process(AsyncData* data)
{
	Nan::HandleScope scope;
	Local<Function> cb = Nan::New<Function>(data->callback);
	as_val* val = NULL;
	while (data->result_q && cf_queue_sz(data->result_q) > 0) {
		int rv = cf_queue_pop(data->result_q, &val, CF_QUEUE_FOREVER);
		if (rv == CF_QUEUE_OK) {
			const int argc = 2;
			Local<Value> argv[argc];
			argv[0] = err_ok();
			argv[1] = val_to_jsvalue(val, data->log);
			Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
			as_val_destroy(val);
		}
	}
}

static void async_callback(ResolveAsyncCallbackArgs)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(handle->data);
	if (data->result_q == NULL) {
		as_v8_error(data->log, "Internal error: data or result q is not initialized");
		return;
	}
	async_queue_process(data);
}

static bool query_foreach_callback(const as_val* val, void* udata)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(udata);
	if (val == NULL) {
		as_v8_debug(data->log, "value returned by query callback is NULL");
		return false;
	}
	return async_queue_populate(val, data);
}

static void release_handle(uv_handle_t* async_handle)
{
    AsyncData* data = reinterpret_cast<AsyncData*>(async_handle->data);
    delete data;
}

/**
 *  prepare() — Function to prepare AsyncData, for use in `execute()` and `respond()`.
 *
 *  This should only keep references to V8 or V8 structures for use in
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(ResolveArgs(info))
{
	Nan::HandleScope scope;

	AerospikeClient* client = ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	AsyncData* data = new AsyncData();
	data->param_err = false;
	data->as = client->as;
	data->log = client->log;
	data->callback.Reset(info[4].As<Function>());

	setup_query(&data->query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		if (querypolicy_from_jsobject(&data->policy, info[3]->ToObject(), log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing of query policy from object failed");
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			data->param_err = true;
			goto Return;
		}
		data->p_policy = &data->policy;
	}

	data->signal_interval   = 0;
	data->result_q          = cf_queue_create(sizeof(as_val*), true);
	data->max_q_size        = QUEUE_SZ; // TODO: make this configurable

	uv_async_init(uv_default_loop(), &data->async_handle, async_callback);
	data->async_handle.data = data;

Return:
	return data;
}

/**
 *  execute() — Function to execute inside the worker-thread.
 *
 *  It is not safe to access V8 or V8 data structures here, so everything
 *  we need for input and output should be in the AsyncData structure.
 */
static void execute(uv_work_t* req)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(req->data);
	LogInfo* log = data->log;

	if (data->param_err) {
		as_v8_debug(log, "Parameter error in the query options");
	} else {
		as_v8_debug(log, "Sending query command with UDF aggregation");
		aerospike_query_foreach(data->as, &data->err, data->p_policy, &data->query, query_foreach_callback, data);

		// send an async signal here. If at all there's any residual records left in the result_q,
		// this signal's callback will send it to node layer.
		uv_async_send(&data->async_handle);
	}

	as_query_destroy(&data->query);
}

/**
 *  respond() — Function to be called after `execute()`. Used to send response
 *  to the callback.
 *
 *  This function will be run inside the main event loop so it is safe to use
 *  V8 again. This is where you will convert the results into V8 types, and
 *  call the callback function with those results.
 */
static void respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	AsyncData* data = reinterpret_cast<AsyncData*>(req->data);
	LogInfo* log = data->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (data->err.code != AEROSPIKE_OK) {
		as_v8_info(log, "Command failed: %d %s\n", data->err.code, data->err.message);
		argv[0] = error_to_jsobject(&data->err, log);
	} else {
		argv[0] = err_ok();
		if (data->result_q && !CF_Q_EMPTY(data->result_q)) {
			async_queue_process(data);
		}
	}
	argv[1] = Nan::Null();

	as_v8_detail(log, "Invoking JS callback for query_apply");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	if (data->result_q != NULL) {
		cf_queue_destroy(data->result_q);
		data->result_q = NULL;
	}
	uv_close((uv_handle_t*) &data->async_handle, release_handle);

	as_query_destroy(&data->query);

	delete req;
}

/**
 *  The 'query.foreach()' Operation
 */
NAN_METHOD(AerospikeClient::QueryForeach)
{
	TYPE_CHECK_REQ(info[0], IsString, "namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
