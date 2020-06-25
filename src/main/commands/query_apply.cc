/*******************************************************************************
 * Copyright 2013-2020 Aerospike, Inc.
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
#include "query.h"

extern "C" {
#include <aerospike/aerospike_query.h>
#include <aerospike/as_error.h>
#include <aerospike/as_policy.h>
#include <aerospike/as_query.h>
#include <aerospike/as_status.h>
}

using namespace v8;

class QueryApplyCommand : public AerospikeCommand {
	public:
		QueryApplyCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("QueryApply", client, callback_) {}

		~QueryApplyCommand() {
			free_query(&query, policy);
			if (policy != NULL) cf_free(policy);
			if (val != NULL) cf_free(val);
		}

		as_policy_query* policy = NULL;
		as_query query;
		as_val* val = NULL;
};

static bool
query_foreach_callback(const as_val* val, void* udata) {
	if (val) {
		QueryApplyCommand* cmd = reinterpret_cast<QueryApplyCommand*>(udata);
		cmd->val = asval_clone(val, cmd->log);
	}
	return false;
}

static void*
prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	QueryApplyCommand* cmd = new QueryApplyCommand(client, info[4].As<Function>());
	LogInfo* log = client->log;

	setup_query(&cmd->query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		cmd->policy = (as_policy_query*) cf_malloc(sizeof(as_policy_query));
		if (querypolicy_from_jsobject(cmd->policy, info[3].As<Object>(), log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	QueryApplyCommand* cmd = reinterpret_cast<QueryApplyCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Sending query command with stream UDF");
	aerospike_query_foreach(cmd->as, &cmd->err, cmd->policy, &cmd->query, query_foreach_callback, cmd);

	if (cmd->policy && cmd->policy->base.predexp) as_predexp_list_destroy(cmd->policy->base.predexp);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	QueryApplyCommand* cmd = reinterpret_cast<QueryApplyCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		Local<Value> argv[] = {
			Nan::Null(),
			val_to_jsvalue(cmd->val, cmd->log)
		};
		cmd->Callback(2, argv);
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::QueryApply)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
