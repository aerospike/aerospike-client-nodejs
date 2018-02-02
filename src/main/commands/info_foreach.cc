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
#include <aerospike/as_node.h>
}

#define INFO_REQUEST_LEN  50

using namespace v8;

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

typedef struct node_info_s {
	char* info;
	char node[AS_NODE_NAME_SIZE];
} node_info;

/**
 *  InfoForeachCmd — Data to be used in async calls.
 *
 *  libuv allows us to pass around a pointer to an arbitraty object when
 *  running asynchronous functions. We create a data structure to hold the
 *  data we need during and after async work.
 */
typedef struct InfoForeachCmd {
	aerospike* as;
	bool param_err;
	as_error err;
	as_policy_info policy;
	as_policy_info* p_policy;
	char* req;
	as_vector* res;
	LogInfo* log;
	Nan::Persistent<Function> callback;
} InfoForeachCmd;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

bool aerospike_info_callback(const as_error* error, const as_node* node, const char* info_req, char* response, void* udata)
{
	InfoForeachCmd* cmd = reinterpret_cast<InfoForeachCmd*>(udata);
	LogInfo* log = cmd->log;
	as_vector* results = cmd->res;
	node_info result;

	if (strlen(node->name) > 0) {
		as_v8_debug(log, "Response from node %s", node->name);
		strncpy(result.node, node->name, AS_NODE_NAME_SIZE);
	} else {
		result.node[0] = '\0';
		as_v8_debug(log, "No host name from cluster");
	}

	if (response != NULL) {
		as_v8_debug(log, "Response is %s", response);
		result.info = (char*) cf_malloc(strlen(response) + 1);
		strncpy(result.info, response, strlen(response) + 1);
	} else {
		result.info = NULL;
		as_v8_debug(log, "No response from cluster");
	}

	as_vector_append(results, (void*) &result);

	return true;
}

/**
 *  prepare() — Function to prepare InfoForeachCmd, for use in `execute()` and `respond()`.
 *
 *  This should only keep references to V8 or V8 structures for use in
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	InfoForeachCmd* cmd = new InfoForeachCmd();
	cmd->param_err = false;
	cmd->as = client->as;
	cmd->log = client->log;
	cmd->res = as_vector_create(sizeof(node_info), 4);
	cmd->callback.Reset(info[2].As<Function>());

	Local<Value> maybe_request = info[0];
	Local<Value> maybe_policy = info[1];

	if (maybe_request->IsString()) {
		cmd->req = (char*) malloc(INFO_REQUEST_LEN);
		String::Utf8Value request(maybe_request->ToString());
		strncpy(cmd->req, *request, INFO_REQUEST_LEN);
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
 *  we need for input and output should be in the InfoForeachCmd structure.
 */
static void execute(uv_work_t* req)
{
	InfoForeachCmd* cmd = reinterpret_cast<InfoForeachCmd*>(req->data);
	LogInfo* log = cmd->log;

	if (cmd->param_err) {
		as_v8_debug(log, "Parameter error in info command");
	} else {
		as_v8_debug(log, "Sending info command \"%s\" to all cluster hosts", cmd->req);
		aerospike_info_foreach(cmd->as, &cmd->err, cmd->p_policy, cmd->req, aerospike_info_callback, (void*)cmd);
	}
}

/**
 *  AfterWork — Function to execute when the Work is complete
 *
 *  This function will be run inside the main event loop so it is safe to use
 *  V8 again. This is where you will convert the results into V8 types, and
 *  call the callback function with those results.
 */
static void respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	InfoForeachCmd* cmd = reinterpret_cast<InfoForeachCmd *>(req->data);
	LogInfo* log = cmd->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (cmd->err.code != AEROSPIKE_OK) {
		argv[0] = error_to_jsobject(&cmd->err, log);
		argv[1] = Nan::Null();
	} else {
		as_vector* results = cmd->res;
		Local<Array> v8Results = Nan::New<Array>(results->size);
		as_v8_debug(log, "num of responses %d", results->size);
		for (uint32_t i = 0 ; i < results->size; i++) {
			node_info* result = (node_info*) as_vector_get(results, i);
			const char* info = result->info;
			const char* node = result->node;

			Local<Object> v8Result = Nan::New<Object>();
			Local<Object> v8Node = Nan::New<Object>();

			if (node != NULL && strlen(node) > 0) {
				as_v8_debug(log, "Node name: %s", node);
				v8Node->Set(Nan::New("node_id").ToLocalChecked(), Nan::New(node).ToLocalChecked());
			}

			v8Result->Set(Nan::New("host").ToLocalChecked(), v8Node);

			if (info != NULL && strlen(info) > 0) {
				as_v8_debug(log, "Info response: %s", info);
				v8Result->Set(Nan::New("info").ToLocalChecked(), Nan::New(info).ToLocalChecked());
				cf_free((void*) info);
			}

			v8Results->Set(i, v8Result);
		}

		argv[0] = err_ok();
		argv[1] = v8Results;
	}

	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(cmd->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	as_vector_destroy(cmd->res);
	cmd->callback.Reset();
	delete cmd;
	delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

NAN_METHOD(AerospikeClient::InfoForeach)
{
	TYPE_CHECK_OPT(info[0], IsString, "request must be a string");
	TYPE_CHECK_OPT(info[1], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[2], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
