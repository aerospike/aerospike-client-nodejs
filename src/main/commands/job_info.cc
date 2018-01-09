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

#define JOB_MODULE_LEN 50

using namespace v8;

typedef struct JobInfoCmd {
	bool param_err;
	aerospike* as;
	as_error err;
	as_policy_info policy;
	as_policy_info* p_policy;
	uint64_t job_id;
	char module[JOB_MODULE_LEN];
	as_job_info job_info;
	LogInfo* log;
	Nan::Persistent<Function> callback;
} JobInfoCmd;

static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	JobInfoCmd* cmd = new JobInfoCmd();
	cmd->param_err = false;
	cmd->as = client->as;
	cmd->log = client->log;
	cmd->job_id = info[0]->ToInteger()->Value();
	cmd->callback.Reset(info[3].As<Function>());

	strncpy(cmd->module, *String::Utf8Value(info[1]->ToString()), JOB_MODULE_LEN);

	if (info[2]->IsObject()) {
		if (infopolicy_from_jsobject(&cmd->policy, info[2]->ToObject(), log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing of info policy from object failed");
			COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
			cmd->param_err = true;
			goto Return;
		}
		cmd->p_policy = &cmd->policy;
	}

Return:
	return cmd;
}

static void execute(uv_work_t* req)
{
	JobInfoCmd* cmd = reinterpret_cast<JobInfoCmd*>(req->data);
	LogInfo* log = cmd->log;
	if (cmd->param_err) {
		as_v8_debug(log, "Parameter error in the job info options");
	} else {
		as_v8_debug(log, "Sending job info command - job ID: %lli, module: %s", cmd->job_id, cmd->module);
		aerospike_job_info(cmd->as, &cmd->err, cmd->p_policy, cmd->module,
				cmd->job_id, false, &cmd->job_info
				);
	}
}

static void respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	JobInfoCmd* cmd = reinterpret_cast<JobInfoCmd*>(req->data);
	LogInfo* log = cmd->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (cmd->err.code != AEROSPIKE_OK) {
		as_v8_info(log, "Command failed: %d %s\n", cmd->err.code, cmd->err.message);
		argv[0] = error_to_jsobject(&cmd->err, log);
		argv[1] = Nan::Null();
	} else {
		argv[0] = err_ok();
		argv[1] = jobinfo_to_jsobject(&cmd->job_info, log);
	}

	as_v8_detail(log, "Invoking JS callback for job_info");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(cmd->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	cmd->callback.Reset();
	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::JobInfo)
{
	TYPE_CHECK_REQ(info[0], IsNumber, "job_id must be a number");
	TYPE_CHECK_REQ(info[1], IsString, "module must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
