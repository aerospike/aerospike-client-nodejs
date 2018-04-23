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
}

#define INFO_REQUEST_LEN  50

using namespace v8;

class InfoCommand : public AerospikeCommand {
	public:
		InfoCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("Info", client, callback_) {}

		~InfoCommand() {
			if (policy != NULL) cf_free(policy);
			if (request != NULL && strlen(request) > 0) cf_free(request);
			if (response != NULL) cf_free(response);
			if (addr != NULL) cf_free(addr);
		}

		as_policy_info* policy = NULL;
		char* request = NULL;
		char* response = NULL;
		char* addr = NULL;
		uint16_t port = 0;
};

static void*
prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	InfoCommand* cmd = new InfoCommand(client, info[3].As<Function>());
	LogInfo* log = client->log;

	if (info[0]->IsString()) {
		cmd->request = (char*) cf_malloc(INFO_REQUEST_LEN);
		if (as_strlcpy(cmd->request, *String::Utf8Value(info[0]->ToString()), INFO_REQUEST_LEN) > INFO_REQUEST_LEN) {
			return cmd->SetError(AEROSPIKE_ERR_PARAM, "Info request exceeds max. length (%d)", INFO_REQUEST_LEN);
		}
	} else {
		cmd->request = (char*) "";
	}

	if (info[1]->IsObject()) {
		if (host_from_jsobject(info[1]->ToObject(), &cmd->addr, &cmd->port, log) != AS_NODE_PARAM_OK) {
			return cmd->SetError(AEROSPIKE_ERR_PARAM, "Host parameter is invalid");
		}
	}

	if (info[2]->IsObject()) {
		cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[2]->ToObject(), log) != AS_NODE_PARAM_OK ) {
			return cmd->SetError(AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	InfoCommand* cmd = reinterpret_cast<InfoCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	if (cmd->addr == NULL) {
		as_v8_debug(log, "Sending info command \"%s\" to random cluster host", cmd->request);
		aerospike_info_any(cmd->as, &cmd->err, cmd->policy, cmd->request, &cmd->response);
	} else {
		as_v8_debug(log, "Sending info command \"%s\" to cluster host %s:%d", cmd->request, cmd->addr, cmd->port);
		aerospike_info_host(cmd->as, &cmd->err, cmd->policy, cmd->addr, cmd->port, cmd->request, &cmd->response);
	}
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	InfoCommand* cmd = reinterpret_cast<InfoCommand*>(req->data);

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

NAN_METHOD(AerospikeClient::Info)
{
	TYPE_CHECK_OPT(info[0], IsString, "request must be a string");
	TYPE_CHECK_OPT(info[1], IsObject, "host must be an object");
	TYPE_CHECK_OPT(info[2], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
