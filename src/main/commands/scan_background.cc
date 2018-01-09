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
#include "scan.h"

extern "C" {
	#include <aerospike/aerospike_scan.h>
	#include <aerospike/as_error.h>
	#include <aerospike/as_policy.h>
	#include <aerospike/as_scan.h>
	#include <aerospike/as_status.h>
}

using namespace v8;

typedef struct ScanBackgroundCmd {
    bool param_err;
    aerospike* as;
    as_error err;
    as_policy_scan policy;
    as_policy_scan* p_policy;
    uint64_t scan_id;
    as_scan scan;
    LogInfo* log;
    Nan::Persistent<Function> callback;
} ScanBackgroundCmd;

static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	ScanBackgroundCmd* cmd = new ScanBackgroundCmd();
	cmd->param_err = false;
	cmd->as = client->as;
	cmd->log = client->log;
	cmd->scan_id = 0;
	cmd->callback.Reset(info[5].As<Function>());

	setup_scan(&cmd->scan, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		if (scanpolicy_from_jsobject(&cmd->policy, info[3]->ToObject(), log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing of scan policy from object failed");
			COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
			cmd->param_err = true;
			goto Return;
		}
		cmd->p_policy = &cmd->policy;
	}

	if (info[4]->IsNumber()) {
		cmd->scan_id = info[4]->ToInteger()->Value();
		as_v8_info(log, "Using scan ID %lli for background scan.", cmd->scan_id);
	}

Return:
	return cmd;
}

static void execute(uv_work_t* req)
{
	ScanBackgroundCmd* cmd = reinterpret_cast<ScanBackgroundCmd*>(req->data);
	LogInfo* log = cmd->log;
	if (cmd->param_err) {
		as_v8_debug(log, "Parameter error in the scan options");
	} else {
		as_v8_debug(log, "Sending scan_background command");
		aerospike_scan_background(cmd->as, &cmd->err, cmd->p_policy, &cmd->scan, &cmd->scan_id);
	}
	as_scan_destroy(&cmd->scan);
}

static void respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	ScanBackgroundCmd* cmd = reinterpret_cast<ScanBackgroundCmd*>(req->data);
	LogInfo* log = cmd->log;

	const int argc = 1;
	Local<Value> argv[argc];
	if (cmd->err.code != AEROSPIKE_OK) {
		as_v8_info(log, "Command failed: %d %s\n", cmd->err.code, cmd->err.message);
		argv[0] = error_to_jsobject(&cmd->err, log);
	} else {
		argv[0] = err_ok();
	}

	as_v8_detail(log, "Invoking JS callback for scan_background");
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

NAN_METHOD(AerospikeClient::ScanBackground)
{
	TYPE_CHECK_REQ(info[0], IsString, "namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "policy must be an object");
	TYPE_CHECK_OPT(info[4], IsNumber, "scan_id must be a number");
	TYPE_CHECK_REQ(info[5], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
