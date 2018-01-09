/*******************************************************************************
 * Copyright 2013-2018 Aerospike, Inc.
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
	#include <aerospike/as_sleep.h>
	#include <aerospike/as_status.h>
	#include <aerospike/as_queue_mt.h>
}

using namespace v8;

#define QUEUE_SZ 100000

typedef struct QueryForeachCmd {
	bool param_err;
	aerospike* as;
	as_error err;
	as_policy_query policy;
	as_policy_query* p_policy;
	as_query query;
	as_queue_mt* result_q;
	uint32_t max_q_size;
	uint32_t signal_interval;
	uv_async_t async_handle;
	LogInfo* log;
	Nan::Persistent<Function> callback;
} QueryForeachCmd;

// Push the record from the server to a queue.
// The record cannot be passed directly from query callback to v8 thread
// because v8 objects can only be created inside a v8 context. This
// callback is in C client thread, which is not aware of the v8 context. So
// store this records in a temporary queue. When the queue reaches a certain
// size, signal v8 thread to process the queue.
static bool async_queue_populate(const as_val* val, QueryForeachCmd* cmd)
{
	if (cmd->result_q == NULL) {
		// Result queue is not initialized - this should never happen!
		as_v8_error(cmd->log, "Internal Error: Queue not initialized");
		return false;
	}

	// Clone the value as as_val is freed up after the callback.
	as_val* clone = asval_clone((as_val*) val, cmd->log);
	if (clone != NULL) {
		if (as_queue_mt_size(cmd->result_q) >= cmd->max_q_size) {
			as_sleep(1000);
		}
		as_queue_mt_push(cmd->result_q, &clone);
		cmd->signal_interval++;
		if (cmd->signal_interval % (cmd->max_q_size / 20) == 0) {
			cmd->signal_interval = 0;
			uv_async_send(&cmd->async_handle);
		}
	}

	return true;
}

// Pop each record from the queue and invoke the node callback with this record.
static void async_queue_process(QueryForeachCmd* cmd)
{
	Nan::HandleScope scope;
	Local<Function> cb = Nan::New<Function>(cmd->callback);
	as_val* val = NULL;
	while (cmd->result_q && !as_queue_mt_empty(cmd->result_q)) {
		if (as_queue_mt_pop(cmd->result_q, &val, AS_QUEUE_FOREVER)) {
			const int argc = 2;
			Local<Value> argv[argc];
			argv[0] = err_ok();
			argv[1] = val_to_jsvalue(val, cmd->log);
			Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
			as_val_destroy(val);
		}
	}
}

static void async_callback(uv_async_t* handle)
{
	QueryForeachCmd* cmd = reinterpret_cast<QueryForeachCmd*>(handle->data);
	if (cmd->result_q == NULL) {
		as_v8_error(cmd->log, "Internal error: data or result q is not initialized");
		return;
	}
	async_queue_process(cmd);
}

static bool query_foreach_callback(const as_val* val, void* udata)
{
	QueryForeachCmd* cmd = reinterpret_cast<QueryForeachCmd*>(udata);
	if (val == NULL) {
		as_v8_debug(cmd->log, "value returned by query callback is NULL");
		return false;
	}
	return async_queue_populate(val, cmd);
}

static void release_handle(uv_handle_t* async_handle)
{
    QueryForeachCmd* cmd = reinterpret_cast<QueryForeachCmd*>(async_handle->data);
    delete cmd;
}

/**
 *  prepare() — Function to prepare QueryForeachCmd, for use in `execute()` and `respond()`.
 *
 *  This should only keep references to V8 or V8 structures for use in
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;

	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	QueryForeachCmd* cmd = new QueryForeachCmd();
	cmd->param_err = false;
	cmd->as = client->as;
	cmd->log = client->log;
	cmd->callback.Reset(info[4].As<Function>());

	setup_query(&cmd->query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		if (querypolicy_from_jsobject(&cmd->policy, info[3]->ToObject(), log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing of query policy from object failed");
			COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
			cmd->param_err = true;
			goto Return;
		}
		cmd->p_policy = &cmd->policy;
	}

	cmd->signal_interval   = 0;
	cmd->result_q          = as_queue_mt_create(sizeof(as_val*), QUEUE_SZ);
	cmd->max_q_size        = QUEUE_SZ; // TODO: make this configurable

	uv_async_init(uv_default_loop(), &cmd->async_handle, async_callback);
	cmd->async_handle.data = (void*) cmd;

Return:
	return cmd;
}

/**
 *  execute() — Function to execute inside the worker-thread.
 *
 *  It is not safe to access V8 or V8 data structures here, so everything
 *  we need for input and output should be in the QueryForeachCmd structure.
 */
static void execute(uv_work_t* req)
{
	QueryForeachCmd* cmd = reinterpret_cast<QueryForeachCmd*>(req->data);
	LogInfo* log = cmd->log;

	if (cmd->param_err) {
		as_v8_debug(log, "Parameter error in the query options");
	} else {
		as_v8_debug(log, "Sending query command with UDF aggregation");
		aerospike_query_foreach(cmd->as, &cmd->err, cmd->p_policy, &cmd->query, query_foreach_callback, (void*) cmd);

		// send an async signal here. If at all there's any residual records left in the result_q,
		// this signal's callback will send it to node layer.
		uv_async_send(&cmd->async_handle);
	}

	as_query_destroy(&cmd->query);
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
	QueryForeachCmd* cmd = reinterpret_cast<QueryForeachCmd*>(req->data);
	LogInfo* log = cmd->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (cmd->err.code != AEROSPIKE_OK) {
		as_v8_info(log, "Command failed: %d %s\n", cmd->err.code, cmd->err.message);
		argv[0] = error_to_jsobject(&cmd->err, log);
	} else {
		argv[0] = err_ok();
		if (cmd->result_q && !as_queue_mt_empty(cmd->result_q)) {
			async_queue_process(cmd);
		}
	}
	argv[1] = Nan::Null();

	as_v8_detail(log, "Invoking JS callback for query_apply");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(cmd->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	cmd->callback.Reset();
	if (cmd->result_q != NULL) {
		as_queue_mt_destroy(cmd->result_q);
		cmd->result_q = NULL;
	}
	uv_close((uv_handle_t*) &cmd->async_handle, release_handle);

	as_query_destroy(&cmd->query);

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
