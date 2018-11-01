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
#include "command.h"
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

NAN_METHOD(AerospikeClient::ScanAsync)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_OPT(info[4], IsNumber, "Scan_id must be a number");
	TYPE_CHECK_REQ(info[5], IsFunction, "Callback must be a function");

	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand* cmd = new AsyncCommand("Scan", client, info[5].As<Function>());
	LogInfo* log = client->log;

	as_scan scan;
	uint64_t scan_id = 0;
	as_policy_scan policy;
	as_policy_scan* p_policy = NULL;
	as_status status;

	setup_scan(&scan, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		if (scanpolicy_from_jsobject(&policy, info[3].As<Object>(), log) != AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			goto Cleanup;
		}
		p_policy = &policy;
	}

	if (info[4]->IsNumber()) {
		scan_id = Nan::To<int64_t>(info[4]).FromJust();
		as_v8_info(log, "Using scan ID %lli for async scan.", scan_id);
	}

	as_v8_debug(log, "Sending async scan command");
	status = aerospike_scan_async(client->as, &cmd->err, p_policy, &scan, &scan_id, async_scan_listener, cmd, NULL);
	if (status == AEROSPIKE_OK) {
		cmd = NULL; // async callback responsible for deleting the command
	} else {
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
	as_scan_destroy(&scan);
}
