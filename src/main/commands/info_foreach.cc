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
#include "string.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_info.h>
#include <aerospike/as_node.h>
}

#define INFO_REQUEST_LEN  50

using namespace v8;

typedef struct node_info_s {
	char* info;
	char node[AS_NODE_NAME_SIZE];
} node_info;

class InfoForeachCommand : public AerospikeCommand {
	public:
		InfoForeachCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("InfoForeach", client, callback_) {
				results = as_vector_create(sizeof(node_info), 4);
			}

		~InfoForeachCommand() {
			if (policy != NULL) cf_free(policy);
			if (request != NULL && strlen(request) > 0) cf_free(request);
			as_vector_destroy(results);
		}

		as_policy_info* policy = NULL;
		char* request = NULL;
		as_vector* results;
};

bool
aerospike_info_callback(const as_error* error, const as_node* node, const char* info_req, char* response, void* udata)
{
	InfoForeachCommand* cmd = reinterpret_cast<InfoForeachCommand*>(udata);
	LogInfo* log = cmd->log;
	node_info result;

	if (strlen(node->name) > 0) {
		as_v8_debug(log, "Response from node %s", node->name);
		if (as_strlcpy(result.node, node->name, AS_NODE_NAME_SIZE) > AS_NODE_NAME_SIZE) {
			as_v8_info(log, "Node name exceeds max. length (%d)", AS_NODE_NAME_SIZE);
		}
	} else {
		result.node[0] = '\0';
		as_v8_debug(log, "No host name from cluster");
	}

	if (response != NULL) {
		as_v8_debug(log, "Response is %s", response);
		result.info = strdup(response);
	} else {
		result.info = NULL;
		as_v8_debug(log, "No response from cluster");
	}

	as_vector_append(cmd->results, (void*) &result);

	return true;
}

static void*
prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	InfoForeachCommand* cmd = new InfoForeachCommand(client, info[2].As<Function>());
	LogInfo* log = client->log;

	if (info[0]->IsString()) {
		cmd->request = (char*) malloc(INFO_REQUEST_LEN);
		if (as_strlcpy(cmd->request, *Nan::Utf8String(info[0].As<String>()), INFO_REQUEST_LEN) > INFO_REQUEST_LEN) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Info request exceeds max. length (%d)", INFO_REQUEST_LEN);
		}
	} else {
		cmd->request = (char*) "";
	}

	if (info[1]->IsObject()) {
		cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[1].As<Object>(), log) != AS_NODE_PARAM_OK ) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	InfoForeachCommand* cmd = reinterpret_cast<InfoForeachCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Sending info command \"%s\" to all cluster hosts", cmd->request);
	aerospike_info_foreach(cmd->as, &cmd->err, cmd->policy, cmd->request, aerospike_info_callback, (void*)cmd);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	InfoForeachCommand* cmd = reinterpret_cast<InfoForeachCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		as_vector* results = cmd->results;
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
				Nan::Set(v8Node, Nan::New("node_id").ToLocalChecked(), Nan::New(node).ToLocalChecked());
			}

			Nan::Set(v8Result, Nan::New("host").ToLocalChecked(), v8Node);

			if (info != NULL && strlen(info) > 0) {
				as_v8_debug(log, "Info response: %s", info);
				Nan::Set(v8Result, Nan::New("info").ToLocalChecked(), Nan::New(info).ToLocalChecked());
				cf_free((void*) info);
			}

			Nan::Set(v8Results, i, v8Result);
		}

		Local<Value> argv[] = {
			Nan::Null(),
			v8Results
		};
		cmd->Callback(2, argv);
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::InfoForeach)
{
	TYPE_CHECK_OPT(info[0], IsString, "Request must be a string");
	TYPE_CHECK_OPT(info[1], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[2], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
