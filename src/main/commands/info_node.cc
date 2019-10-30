/*******************************************************************************
 * Copyright 2013-2019 Aerospike, Inc.
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
#include <aerospike/as_cluster.h>
}

#define MAX_INFO_REQUEST_LEN  256

using namespace v8;

class InfoNodeCommand : public AerospikeCommand {
	public:
		InfoNodeCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("InfoNode", client, callback_) {}

		~InfoNodeCommand() {
			if (policy != NULL) cf_free(policy);
			if (request != NULL && strlen(request) > 0) cf_free(request);
			if (response != NULL) cf_free(response);
		}

		as_policy_info* policy = NULL;
		char* request = NULL;
		char* response = NULL;
		char node_name[AS_NODE_NAME_SIZE] = { '\0' };
};

static void*
prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	InfoNodeCommand* cmd = new InfoNodeCommand(client, info[3].As<Function>());
	LogInfo* log = client->log;

	if (info[0]->IsString()) {
		cmd->request = (char*) cf_malloc(MAX_INFO_REQUEST_LEN);
		size_t reqlen = as_strlcpy(cmd->request, *Nan::Utf8String(info[0].As<String>()), MAX_INFO_REQUEST_LEN);
		if (reqlen > MAX_INFO_REQUEST_LEN) {
			as_v8_info(log, "Info request exceeds max. length (%zu > %i): \"%s...\"", reqlen, MAX_INFO_REQUEST_LEN, cmd->request);
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Info request exceeds max. length");
		}
	} else {
		cmd->request = (char*) "";
	}

	Local<String> node_name = info[1].As<String>();
	strncpy(cmd->node_name, *Nan::Utf8String(node_name), AS_NODE_NAME_SIZE);

	if (info[2]->IsObject()) {
		cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[2].As<Object>(), log) != AS_NODE_PARAM_OK ) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	InfoNodeCommand* cmd = reinterpret_cast<InfoNodeCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_cluster* cluster = cmd->as->cluster;
	as_node* node = as_node_get_by_name(cluster, cmd->node_name);
	if (node) {
		as_v8_debug(log, "Sending info command \"%s\" to cluster node %s", cmd->request, cmd->node_name);
		aerospike_info_node(cmd->as, &cmd->err, cmd->policy, node, cmd->request, &cmd->response);
		as_node_release(node);
	} else {
		as_v8_error(log, "No cluster node with name %s found", cmd->node_name);
	}
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	InfoNodeCommand* cmd = reinterpret_cast<InfoNodeCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		Local<Value> response;
		if (cmd->response != NULL && strlen(cmd->response) > 0) {
			response = Nan::New(cmd->response).ToLocalChecked();
		} else {
			response = Nan::Null();
		}
		Local<Value> argv[] = {
			Nan::Null(),
			response
		};
		cmd->Callback(2, argv);
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::InfoNode)
{
	TYPE_CHECK_OPT(info[0], IsString, "Request must be a string");
	TYPE_CHECK_REQ(info[1], IsString, "Node must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
