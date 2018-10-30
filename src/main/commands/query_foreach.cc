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
#include "command.h"
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

class QueryForeachCommand : public AerospikeCommand {
	public:
		QueryForeachCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("QueryForeach", client, callback_) {
				max_q_size = QUEUE_SZ; // TODO: make this configurable
				results = as_queue_mt_create(sizeof(as_val*), max_q_size);
			}

		~QueryForeachCommand() {
			if (policy != NULL) cf_free(policy);
			if (results != NULL) {
				as_queue_mt_destroy(results);
				results = NULL;
			}
			as_query_destroy(&query);
		}

		as_policy_query* policy = NULL;
		as_query query;
		as_queue_mt* results;
		uint32_t max_q_size;
		uint32_t signal_interval = 0;
		uv_async_t async_handle;
};

// Push the record from the server to a queue.
// The record cannot be passed directly from query callback to v8 thread
// because v8 objects can only be created inside a v8 context. This
// callback is in C client thread, which is not aware of the v8 context. So
// store this records in a temporary queue. When the queue reaches a certain
// size, signal v8 thread to process the queue.
static bool
async_queue_populate(const as_val* val, QueryForeachCommand* cmd)
{
	if (cmd->results == NULL) {
		// Result queue is not initialized - this should never happen!
		as_v8_error(cmd->log, "Internal Error: Queue not initialized");
		return false;
	}

	// Clone the value as as_val is freed up after the callback.
	as_val* clone = asval_clone((as_val*) val, cmd->log);
	if (clone != NULL) {
		if (as_queue_mt_size(cmd->results) >= cmd->max_q_size) {
			as_sleep(1000);
		}
		as_queue_mt_push(cmd->results, &clone);
		cmd->signal_interval++;
		if (cmd->signal_interval % (cmd->max_q_size / 20) == 0) {
			cmd->signal_interval = 0;
			uv_async_send(&cmd->async_handle);
		}
	}

	return true;
}

// Pop each record from the queue and invoke the node callback with this record.
static void
async_queue_process(QueryForeachCommand* cmd)
{
	Nan::HandleScope scope;

	const int argc = 2;
	as_val* val = NULL;
	while (cmd->results && !as_queue_mt_empty(cmd->results)) {
		if (as_queue_mt_pop(cmd->results, &val, AS_QUEUE_FOREVER)) {
			Local<Value> argv[argc] = {
				Nan::Null(),
				val_to_jsvalue(val, cmd->log)
			};
			cmd->Callback(2, argv);
			as_val_destroy(val);
		}
	}
}

static void
async_callback(uv_async_t* handle)
{
	QueryForeachCommand* cmd = reinterpret_cast<QueryForeachCommand*>(handle->data);
	if (cmd->results == NULL) {
		as_v8_error(cmd->log, "Internal error: result queue is not initialized");
		return;
	}
	async_queue_process(cmd);
}

static bool
query_foreach_callback(const as_val* val, void* udata)
{
	QueryForeachCommand* cmd = reinterpret_cast<QueryForeachCommand*>(udata);
	if (val == NULL) {
		as_v8_debug(cmd->log, "Value returned by query callback is NULL");
		return false;
	}
	return async_queue_populate(val, cmd);
}

static void
release_handle(uv_handle_t* async_handle)
{
	Nan::HandleScope scope;
    QueryForeachCommand* cmd = reinterpret_cast<QueryForeachCommand*>(async_handle->data);
    delete cmd;
}

static void*
prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	QueryForeachCommand* cmd = new QueryForeachCommand(client, info[4].As<Function>());
	LogInfo* log = client->log;

	setup_query(&cmd->query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		cmd->policy = (as_policy_query*) cf_malloc(sizeof(as_policy_query));
		if (querypolicy_from_jsobject(cmd->policy, info[3].As<Object>(), log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	uv_async_init(uv_default_loop(), &cmd->async_handle, async_callback);
	cmd->async_handle.data = (void*) cmd;

	return cmd;
}

static void
execute(uv_work_t* req)
{
	QueryForeachCommand* cmd = reinterpret_cast<QueryForeachCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Sending query command with UDF aggregation");
	aerospike_query_foreach(cmd->as, &cmd->err, cmd->policy, &cmd->query, query_foreach_callback, (void*) cmd);

	// Send an async signal here. If at all there's any residual records left in the results,
	// this signal's callback will send it to node layer.
	uv_async_send(&cmd->async_handle);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	QueryForeachCommand* cmd = reinterpret_cast<QueryForeachCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		if (cmd->results && !as_queue_mt_empty(cmd->results)) {
			async_queue_process(cmd);
		}
		cmd->Callback(0, {});
	}

	uv_close((uv_handle_t*) &cmd->async_handle, release_handle);

	delete req;
}

NAN_METHOD(AerospikeClient::QueryForeach)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
