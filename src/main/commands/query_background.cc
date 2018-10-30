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
#include "query.h"

extern "C" {
#include <aerospike/aerospike_query.h>
#include <aerospike/as_error.h>
#include <aerospike/as_policy.h>
#include <aerospike/as_query.h>
#include <aerospike/as_status.h>
}

using namespace v8;

class QueryBackgroundCommand : public AerospikeCommand {
	public:
		QueryBackgroundCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("QueryBackground", client, callback_) {}

		~QueryBackgroundCommand() {
			if (policy != NULL) cf_free(policy);
			as_query_destroy(&query);
		}

		as_policy_write* policy = NULL;
		uint64_t query_id = 0;
		as_query query;
};

static void*
prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	QueryBackgroundCommand* cmd = new QueryBackgroundCommand(client, info[5].As<Function>());
	LogInfo* log = client->log;

	setup_query(&cmd->query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		cmd->policy = (as_policy_write*) cf_malloc(sizeof(as_policy_write));
		if (writepolicy_from_jsobject(cmd->policy, info[3].As<Object>(), log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	if (info[4]->IsNumber()) {
		cmd->query_id = Nan::To<int64_t>(info[4]).FromJust();
		as_v8_info(log, "Using query ID %lli for background query.", cmd->query_id);
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	QueryBackgroundCommand* cmd = reinterpret_cast<QueryBackgroundCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Sending query background command");
	aerospike_query_background(cmd->as, &cmd->err, cmd->policy, &cmd->query, &cmd->query_id);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	QueryBackgroundCommand* cmd = reinterpret_cast<QueryBackgroundCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		cmd->Callback(0, {});
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::QueryBackground)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_OPT(info[4], IsNumber, "Query ID must be a number");
	TYPE_CHECK_REQ(info[5], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
