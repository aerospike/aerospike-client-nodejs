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
#include <aerospike/aerospike_scan.h>
#include <aerospike/as_error.h>
#include <aerospike/as_job.h>
#include <aerospike/as_policy.h>
#include <aerospike/as_status.h>
}

using namespace v8;

class JobInfoCommand : public AerospikeCommand {
	public:
		JobInfoCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("JobInfo", client, callback_) { }

		~JobInfoCommand() {
			if (policy != NULL) cf_free(policy);
			if (module) free(module);
		}

		as_policy_info* policy = NULL;
		uint64_t job_id = 0;
		char* module = NULL;
		as_job_info job_info;
};

static void*
prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	JobInfoCommand* cmd = new JobInfoCommand(client, info[3].As<Function>());
	LogInfo* log = client->log;

	cmd->job_id = Nan::To<int64_t>(info[0]).FromJust();
	cmd->module = strdup(*Nan::Utf8String(info[1].As<String>()));

	if (info[2]->IsObject()) {
		cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[2].As<Object>(), log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	JobInfoCommand* cmd = reinterpret_cast<JobInfoCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Executing JobInfo command: job ID: %lli, module: %s", cmd->job_id, cmd->module);
	aerospike_job_info(cmd->as, &cmd->err, cmd->policy, cmd->module, cmd->job_id, false, &cmd->job_info);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	JobInfoCommand* cmd = reinterpret_cast<JobInfoCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		Local<Value> argv[] = {
			Nan::Null(),
			jobinfo_to_jsobject(&cmd->job_info, log)
		};
		cmd->Callback(2, argv);
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::JobInfo)
{
	TYPE_CHECK_REQ(info[0], IsNumber, "Job ID must be a number");
	TYPE_CHECK_REQ(info[1], IsString, "Module must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
