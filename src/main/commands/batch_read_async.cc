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

using namespace v8;

NAN_METHOD(AerospikeClient::BatchReadAsync)
{
	TYPE_CHECK_REQ(info[0], IsArray, "Records must be an array of objects");
	TYPE_CHECK_OPT(info[1], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[2], IsFunction, "Callback must be a function");

	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand* cmd = new AsyncCommand("BatchRead", client, info[2].As<Function>());
	LogInfo* log = client->log;

	as_batch_read_records* records = NULL;
	as_policy_batch policy;
	as_policy_batch* p_policy = NULL;
	as_status status;

	if (batch_read_records_from_jsarray(&records, info[0].As<Array>(), log) != AS_NODE_PARAM_OK) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Records array invalid");
		goto Cleanup;
	}

	if (info[1]->IsObject()) {
		if (batchpolicy_from_jsobject(&policy, info[1].As<Object>(), log) != AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			free_batch_records(records);
			goto Cleanup;
		}
		p_policy = &policy;
	}

	as_v8_debug(log, "Sending async batch read command");
	status = aerospike_batch_read_async(client->as, &cmd->err, p_policy,
			records, async_batch_listener, cmd, NULL);
	if (status == AEROSPIKE_OK) {
		cmd = NULL; // async callback responsible for deleting the command
	} else {
		free_batch_records(records);
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
}
