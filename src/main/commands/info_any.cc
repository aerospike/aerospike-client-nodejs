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
}

#define MAX_INFO_REQUEST_LEN  256

using namespace v8;

class InfoAnyCommand : public AerospikeCommand {
	public:
		InfoAnyCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("InfoAny", client, callback_) {}

		~InfoAnyCommand() {
			if (policy != NULL) cf_free(policy);
			if (request != NULL && strlen(request) > 0) cf_free(request);
			if (response != NULL) cf_free(response);
		}

		as_policy_info* policy = NULL;
		char* request = NULL;
		char* response = NULL;
};

static void*
prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	InfoAnyCommand* cmd = new InfoAnyCommand(client, info[2].As<Function>());
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
	InfoAnyCommand* cmd = reinterpret_cast<InfoAnyCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Sending info command \"%s\" to random cluster host", cmd->request);
	aerospike_info_any(cmd->as, &cmd->err, cmd->policy, cmd->request, &cmd->response);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	InfoAnyCommand* cmd = reinterpret_cast<InfoAnyCommand*>(req->data);

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

NAN_METHOD(AerospikeClient::InfoAny)
{
	TYPE_CHECK_OPT(info[0], IsString, "Request must be a string");
	TYPE_CHECK_OPT(info[1], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[2], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
