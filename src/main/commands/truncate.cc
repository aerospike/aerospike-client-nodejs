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

	if (as_strlcpy(cmd->ns, *String::Utf8Value(info[0]->ToString()), AS_NAMESPACE_MAX_SIZE) > AS_NAMESPACE_MAX_SIZE) {
		return cmd->SetError(AEROSPIKE_ERR_PARAM, "Namespace exceeds max. length (%d)", AS_NAMESPACE_MAX_SIZE);
	}

	if (info[1]->IsString()) {
		if (as_strlcpy(cmd->set, *String::Utf8Value(info[1]->ToString()), AS_SET_MAX_SIZE) > AS_SET_MAX_SIZE) {
			return cmd->SetError(AEROSPIKE_ERR_PARAM, "Set exceeds max. length (%d)", AS_SET_MAX_SIZE);
		}
	}

	if (info[2]->IsNumber()) {
		cmd->before_nanos = (uint64_t) info[2]->ToInteger()->Value();
	}

	if (info[3]->IsObject()) {
		cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[3]->ToObject(), log) != AS_NODE_PARAM_OK) {
			return cmd->SetError(AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
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
	LogInfo* log = cmd->log;

	const int argc = 1;
	Local<Value> argv[argc];
	if (cmd->IsError()) {
		as_v8_info(log, "Command failed: %d %s\n", cmd->err.code, cmd->err.message);
		argv[0] = error_to_jsobject(&cmd->err, log);
	} else {
		argv[0] = err_ok();
	}

	cmd->Callback(argc, argv);

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::Truncate)
{
	TYPE_CHECK_REQ(info[0], IsString, "namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "set must be a string");
	TYPE_CHECK_REQ(info[2], IsNumber, "before_nanos must be a number");
	TYPE_CHECK_OPT(info[3], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
