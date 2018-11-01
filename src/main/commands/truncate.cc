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
}

using namespace v8;

class TruncateCommand : public AerospikeCommand {
	public:
		TruncateCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("Truncate", client, callback_) {}

		~TruncateCommand() {
			if (policy != NULL) cf_free(policy);
		}

	as_policy_info* policy = NULL;
	as_namespace ns;
	as_set set;
	uint64_t before_nanos = 0;
};

static void*
prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	TruncateCommand* cmd = new TruncateCommand(client, info[4].As<Function>());
	LogInfo* log = client->log;

	if (as_strlcpy(cmd->ns, *Nan::Utf8String(info[0].As<String>()), AS_NAMESPACE_MAX_SIZE) > AS_NAMESPACE_MAX_SIZE) {
		return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Namespace exceeds max. length (%d)", AS_NAMESPACE_MAX_SIZE);
	}

	if (info[1]->IsString()) {
		if (as_strlcpy(cmd->set, *Nan::Utf8String(info[1].As<String>()), AS_SET_MAX_SIZE) > AS_SET_MAX_SIZE) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Set exceeds max. length (%d)", AS_SET_MAX_SIZE);
		}
	}

	if (info[2]->IsNumber()) {
		cmd->before_nanos = (uint64_t) Nan::To<int64_t>(info[2]).FromJust();
	}

	if (info[3]->IsObject()) {
		cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[3].As<Object>(), log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	TruncateCommand* cmd = reinterpret_cast<TruncateCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Executing Truncate command: ns=%s, set=%s, before_nanos=%d", cmd->ns, cmd->set, cmd->before_nanos);
	aerospike_truncate(cmd->as, &cmd->err, cmd->policy, cmd->ns, cmd->set, cmd->before_nanos);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	TruncateCommand* cmd = reinterpret_cast<TruncateCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		cmd->Callback(0, {});
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::Truncate)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_REQ(info[2], IsNumber, "Before nanos must be a number");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
