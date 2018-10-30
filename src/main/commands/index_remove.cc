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
#include <aerospike/as_config.h>
#include <aerospike/aerospike_index.h>
}

using namespace v8;

class IndexRemoveCommand : public AerospikeCommand {
	public:
		IndexRemoveCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("IndexRemove", client, callback_) { }

		~IndexRemoveCommand() {
			if (policy != NULL) cf_free(policy);
			if (index != NULL) cf_free(index);
		}

		as_policy_info* policy = NULL;
		as_namespace ns;
		char* index = NULL;
};

static void*
prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	IndexRemoveCommand* cmd = new IndexRemoveCommand(client, info[3].As<Function>());
	LogInfo* log = cmd->log = client->log;

	if (as_strlcpy(cmd->ns, *Nan::Utf8String(info[0].As<String>()), AS_NAMESPACE_MAX_SIZE) > AS_NAMESPACE_MAX_SIZE) {
		return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Namespace exceeds max. length (%d)", AS_NAMESPACE_MAX_SIZE);
	}

	cmd->index = strdup(*Nan::Utf8String(info[1].As<String>()));

	if (info[2]->IsObject()) {
		cmd->policy = (as_policy_info*)cf_malloc(sizeof(as_policy_info));
		if(infopolicy_from_jsobject(cmd->policy, info[2].As<Object>(), log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	IndexRemoveCommand* cmd = reinterpret_cast<IndexRemoveCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Executing IndexRemove command: ns=%s, index=%s",
			cmd->ns, cmd->index);
	aerospike_index_remove(cmd->as, &cmd->err, cmd->policy, cmd->ns, cmd->index);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	IndexRemoveCommand* cmd = reinterpret_cast<IndexRemoveCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		cmd->Callback(0, {});
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::IndexRemove)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_REQ(info[1], IsString, "Index name must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
