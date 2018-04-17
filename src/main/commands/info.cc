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

extern "C" {
	#include <aerospike/aerospike.h>
	#include <aerospike/aerospike_info.h>
}

#define INFO_REQUEST_LEN  50

using namespace v8;

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

/**
 *  InfoCmd — Data to be used in async calls.
 *
 *  libuv allows us to pass around a pointer to an arbitraty object when
 *  running asynchronous functions. We create a data structure to hold the
 *  data we need during and after async work.
 */
class InfoCommand : public Nan::AsyncResource {
	public:
		InfoCommand(AerospikeClient* client, Local<Function> callback_)
			: Nan::AsyncResource("aerospike:InfoCommand")
			, as(client->as)
			, log(client->log) {
				callback.Reset(callback_);
			}

		~InfoCommand() {
			callback.Reset();
		}

		aerospike* as;
		bool param_err = false;
		as_error err;
		as_policy_info policy;
		as_policy_info* p_policy = NULL;
		char* req = NULL;
		char* res = NULL;
		char* addr = NULL;
		uint16_t port = 0;
		LogInfo* log;
		Nan::Persistent<Function> callback;
};


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

/**
 *  prepare() — Function to prepare InfoCmd, for use in `execute()` and `respond()`.
 *
 *  This should only keep references to V8 or V8 structures for use in
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	InfoCommand* cmd = new InfoCommand(client, info[3].As<Function>());
	LogInfo* log = client->log;

	Local<Value> maybe_request = info[0];
	Local<Value> maybe_host = info[1];
	Local<Value> maybe_policy = info[2];

	if (maybe_request->IsString()) {
		cmd->req = (char*) cf_malloc(INFO_REQUEST_LEN);
		String::Utf8Value request(maybe_request->ToString());
		strncpy(cmd->req, *request, INFO_REQUEST_LEN);
	} else {
		cmd->req = (char*) "";
	}

	if (maybe_host->IsObject()) {
		if (host_from_jsobject(maybe_host->ToObject(), &cmd->addr, &cmd->port, log) != AS_NODE_PARAM_OK) {
			as_v8_debug(log, "host parameter is invalid");
			COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
			cmd->param_err = true;
			goto Return;
		}
	}

	if (maybe_policy->IsObject()) {
		if (infopolicy_from_jsobject(&cmd->policy, maybe_policy->ToObject(), log) != AS_NODE_PARAM_OK ) {
			as_v8_debug(log, "policy parameter is invalid");
			COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
			cmd->param_err = true;
			goto Return;
		}
		cmd->p_policy = &cmd->policy;
	}

Return:
	return cmd;
}

/**
 *  execute() — Function to execute inside the worker-thread.
 *
 *  It is not safe to access V8 or V8 data structures here, so everything
 *  we need for input and output should be in the InfoCmd structure.
 */
static void execute(uv_work_t* req)
{
	InfoCommand* cmd = reinterpret_cast<InfoCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (cmd->param_err) {
		as_v8_debug(log, "Parameter error in info command");
	} else {
		if (cmd->addr == NULL) {
			as_v8_debug(log, "Sending info command \"%s\" to random cluster host", cmd->req);
			aerospike_info_any(cmd->as, &cmd->err, cmd->p_policy, cmd->req, &cmd->res);
		} else {
			as_v8_debug(log, "Sending info command \"%s\" to cluster host %s:%d", cmd->req, cmd->addr, cmd->port);
			aerospike_info_host(cmd->as, &cmd->err, cmd->p_policy, cmd->addr, cmd->port, cmd->req, &cmd->res);
		}
	}
}

/**
 *  AfterWork — Function to execute when the Work is complete
 *
 *  This function will be run inside the main event loop so it is safe to use
 *  V8 again. This is where you will convert the results into V8 types, and
 *  call the callback function with those results.
 */
static void respond(uv_work_t * req, int status)
{
	Nan::HandleScope scope;
	InfoCommand* cmd = reinterpret_cast<InfoCommand*>(req->data);
	char* response = cmd->res;
	LogInfo* log = cmd->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (cmd->err.code != AEROSPIKE_OK) {
		argv[0] = error_to_jsobject(&cmd->err, log);
		argv[1] = Nan::Null();
	} else {
		argv[0] = err_ok();
		if (response != NULL && strlen(response) > 0) {
			as_v8_debug(log, "Response is %s", response);
			argv[1] = Nan::New(response).ToLocalChecked();
			cf_free((void*)response);
		} else {
			argv[1] = Nan::Null();
		}
	}

	Nan::TryCatch try_catch;
	Local<Object> target = Nan::New<Object>();
	Local<Function> cb = Nan::New<Function>(cmd->callback);
	cmd->runInAsyncScope(target, cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	delete cmd;
	delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'info()' Operation
 */
NAN_METHOD(AerospikeClient::Info)
{
	TYPE_CHECK_OPT(info[0], IsString, "request must be a string");
	TYPE_CHECK_OPT(info[1], IsObject, "host must be an object");
	TYPE_CHECK_OPT(info[2], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
