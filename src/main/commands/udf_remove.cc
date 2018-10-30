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

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_udf.h>
#include <aerospike/as_udf.h>
#include <aerospike/as_config.h>
}

using namespace v8;

class UdfRemoveCommand : public AerospikeCommand {
	public:
		UdfRemoveCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("UdfRemove", client, callback_) { }

		~UdfRemoveCommand() {
			if (policy != NULL) cf_free(policy);
			if (module != NULL) free(module);
		}

		as_policy_info* policy = NULL;
		char* module = NULL;
};

static void*
prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	UdfRemoveCommand* cmd = new UdfRemoveCommand(client, info[2].As<Function>());
	LogInfo* log = client->log;

	cmd->module = strdup(*Nan::Utf8String(info[0].As<String>()));

	if (info[1]->IsObject()) {
		cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[1].As<Object>(), log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	UdfRemoveCommand* cmd = reinterpret_cast<UdfRemoveCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Executing UdfRemove command: module=%s", cmd->module);
	aerospike_udf_remove(cmd->as, &cmd->err, cmd->policy, cmd->module);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	UdfRemoveCommand* cmd = reinterpret_cast<UdfRemoveCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		cmd->Callback(0, {});
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::UDFRemove)
{
	TYPE_CHECK_REQ(info[0], IsString, "Module must be a string");
	TYPE_CHECK_OPT(info[1], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[2], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
