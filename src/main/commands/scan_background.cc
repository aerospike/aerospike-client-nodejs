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
#include "scan.h"

extern "C" {
#include <aerospike/aerospike_scan.h>
#include <aerospike/as_error.h>
#include <aerospike/as_policy.h>
#include <aerospike/as_scan.h>
#include <aerospike/as_status.h>
}

using namespace v8;

class ScanBackgroundCommand : public AerospikeCommand {
	public:
		ScanBackgroundCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("ScanBackground", client, callback_) {}

		~ScanBackgroundCommand() {
			if (policy != NULL) cf_free(policy);
			as_scan_destroy(&scan);
		}

		as_policy_scan* policy = NULL;
		uint64_t scan_id = 0;
		as_scan scan;
};

static void*
prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	ScanBackgroundCommand* cmd = new ScanBackgroundCommand(client, info[5].As<Function>());
	LogInfo* log = client->log;

	setup_scan(&cmd->scan, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		cmd->policy = (as_policy_scan*) cf_malloc(sizeof(as_policy_scan));
		if (scanpolicy_from_jsobject(cmd->policy, info[3].As<Object>(), log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
		}
	}

	if (info[4]->IsNumber()) {
		cmd->scan_id = Nan::To<int64_t>(info[4]).FromJust();
		as_v8_info(log, "Using scan ID %lli for background scan.", cmd->scan_id);
	}

	return cmd;
}

static void
execute(uv_work_t* req)
{
	ScanBackgroundCommand* cmd = reinterpret_cast<ScanBackgroundCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Sending scan_background command");
	aerospike_scan_background(cmd->as, &cmd->err, cmd->policy, &cmd->scan, &cmd->scan_id);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	ScanBackgroundCommand* cmd = reinterpret_cast<ScanBackgroundCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		cmd->Callback(0, {});
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::ScanBackground)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_OPT(info[4], IsNumber, "Scan ID must be a number");
	TYPE_CHECK_REQ(info[5], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
