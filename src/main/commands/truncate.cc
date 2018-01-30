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
	#include <aerospike/aerospike.h>
}

using namespace v8;

typedef struct TruncateCmd {
	bool param_err;
	aerospike* as;
	as_error err;
	as_policy_info policy;
	as_policy_info* p_policy;
	as_namespace ns;
	as_set set;
	uint64_t before_nanos;
	LogInfo* log;
	Nan::Persistent<Function> callback;
} TruncateCmd;


static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	TruncateCmd* cmd = new TruncateCmd();
	cmd->param_err = false;
	cmd->as = client->as;
	cmd->log = client->log;
	cmd->callback.Reset(info[4].As<Function>());
	strncpy(cmd->ns, *String::Utf8Value(info[0]->ToString()), AS_NAMESPACE_MAX_SIZE);

	if (info[1]->IsString()) {
		strncpy(cmd->set, *String::Utf8Value(info[1]->ToString()), AS_SET_MAX_SIZE);
	}

	if (info[2]->IsNumber()) {
		cmd->before_nanos = (uint64_t) info[2]->ToInteger()->Value();
	}

	if (info[3]->IsObject()) {
		if (infopolicy_from_jsobject(&cmd->policy, info[3]->ToObject(), log) != AS_NODE_PARAM_OK) {
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
	TruncateCmd* cmd = reinterpret_cast<TruncateCmd*>(req->data);
	LogInfo* log = cmd->log;
	if (cmd->param_err) {
		as_v8_debug(log, "Parameter error in the truncate options");
	} else {
		as_v8_debug(log, "Invoking aerospike truncate");
		aerospike_truncate(cmd->as, &cmd->err, cmd->p_policy, cmd->ns, cmd->set, cmd->before_nanos);
	}
}

static void respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	TruncateCmd* cmd = reinterpret_cast<TruncateCmd*>(req->data);
	LogInfo* log = cmd->log;

	const int argc = 1;
	Local<Value> argv[argc];
	if (cmd->err.code != AEROSPIKE_OK) {
		as_v8_info(log, "Command failed: %d %s\n", cmd->err.code, cmd->err.message);
		argv[0] = error_to_jsobject(&cmd->err, log);
	} else {
		argv[0] = err_ok();
	}

	as_v8_detail(log, "Invoking JS callback for truncate");
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

NAN_METHOD(AerospikeClient::Truncate)
{
	TYPE_CHECK_REQ(info[0], IsString, "namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "set must be a string");
	TYPE_CHECK_REQ(info[2], IsNumber, "before_nanos must be a number");
	TYPE_CHECK_OPT(info[3], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "callback must be a function");
	async_invoke(info, prepare, execute, respond);
}
