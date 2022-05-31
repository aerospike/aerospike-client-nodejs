/*******************************************************************************
 * Copyright 2022 Aerospike, Inc.
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
#include <aerospike/aerospike_key.h>
#include <aerospike/as_config.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
#include <aerospike/aerospike_batch.h>
}

using namespace v8;

class AdminCreateUserCommand : public AerospikeCommand {
  public:
	AdminCreateUserCommand(AerospikeClient *client, Local<Function> callback_)
		: AerospikeCommand("AdminCreateUser", client, callback_)
	{
	}
	static void AdminCreateUserCommandFree(AdminCreateUserCommand *cmd)
	{
		if (cmd->policy) {
			cf_free(cmd->policy);
			cmd->policy = NULL;
		}
	}
	~AdminCreateUserCommand() { AdminCreateUserCommandFree(this); }

	as_policy_admin *policy = NULL;
	char* user_name = NULL;
	char* password = NULL;
	char** roles = NULL;
	int roles_size = 0
};

static void *prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AdminCreateUserCommand *cmd =
		new AdminCreateUserCommand(client, info[4].As<Function>());
	LogInfo *log = client->log;

	Local<Array> keys = info[0].As<Array>();
	if (batch_from_jsarray(&cmd->batch, keys, log) != AS_NODE_PARAM_OK) {
		return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
						   "Batch keys parameter invalid");
	}

	if (info[1]->IsObject()) {
		if (udfargs_from_jsobject(&cmd->module, &cmd->function, &cmd->arglist,
								  info[1].As<Object>(),
								  log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Batch keys parameter invalid");
		}
	}

	if (info[2]->IsObject()) {
		cmd->policy = (as_policy_admin *)cf_malloc(sizeof(as_policy_admin));
		if (adminpolicy_from_jsobject(cmd->policy, info[2].As<Object>(), log) !=
			AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "admin policy parameter invalid");
		}
	}

	if (info[3]->IsObject()) {
		cmd->policy_apply =
			(as_policy_admin_create_user *)cf_malloc(sizeof(as_policy_admin_create_user));
		if (batchapply_policy_from_jsobject(cmd->policy_apply,
											info[3].As<Object>(),
											log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Batch policy parameter invalid");
		}
	}

	return cmd;
}

static void execute(uv_work_t *req)
{
	AdminCreateUserCommand *cmd = reinterpret_cast<AdminCreateUserCommand *>(req->data);
	LogInfo *log = cmd->log;
	int status;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Executing AdminCreateUser command for %d user",
				cmd->user_name);
	status = aerospike_create_user(cmd->as, &cmd->err, cmd->policy,
							  cmd->user_name, cmd->password, cmd->roles,
							  cmd->roles_size);
	if(status != AEROSPIKE_OK) {
		CmdSetError(cmd, status, "Error Executing AdminCreateUser");
	}
}

static void respond(uv_work_t *req, int status)
{
	Nan::HandleScope scope;
	AdminCreateUserCommand *cmd = reinterpret_cast<AdminCreateUserCommand *>(req->data);
	if (cmd->IsError()) {
		cmd->ErrorCallback();
	}
	else {
		cmd->Callback(0, {});
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::AdminCreateUser)
{
	TYPE_CHECK_REQ(info[0], IsObject, "User must be string");
	TYPE_CHECK_OPT(info[1], IsObject, "Password must be string");
	TYPE_CHECK_OPT(info[2], IsObject, "Admin policy must be an object");
	TYPE_CHECK_OPT(info[3], IsArray, "Roles must be an array");
	TYPE_CHECK_REQ(info[4], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
