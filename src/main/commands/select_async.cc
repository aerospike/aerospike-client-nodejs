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

NAN_METHOD(AerospikeClient::SelectAsync)
{
	TYPE_CHECK_REQ(info[0], IsObject, "Key must be an object");
	TYPE_CHECK_REQ(info[1], IsArray, "Bins must be a string array");
	TYPE_CHECK_OPT(info[2], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "Callback must be a function");

	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand* cmd = new AsyncCommand("Select", client, info[3].As<Function>());
	LogInfo* log = client->log;

	as_key key;
	bool key_initalized = false;
	char** bins = NULL;
	uint32_t num_bins = 0;
	as_policy_read policy;
	as_policy_read* p_policy = NULL;
	as_status status;

	if (key_from_jsobject(&key, info[0].As<Object>(), log) != AS_NODE_PARAM_OK) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Key object invalid");
		goto Cleanup;
	}
	key_initalized = true;

	if (bins_from_jsarray(&bins, &num_bins, info[1].As<Array>(), log) != AS_NODE_PARAM_OK) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Bins array invalid");
		goto Cleanup;
	}

	if (info[2]->IsObject()) {
		if (readpolicy_from_jsobject(&policy, info[2].As<Object>(), log) != AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			goto Cleanup;
		}
		p_policy = &policy;
	}

	as_v8_debug(log, "Sending async select command");
	status = aerospike_key_select_async(client->as, &cmd->err, p_policy, &key, (const char**)bins, async_record_listener, cmd, NULL, NULL);
	if (status == AEROSPIKE_OK) {
		cmd = NULL; // async callback responsible for deleting the command
	} else {
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
	if (key_initalized) as_key_destroy(&key);
	if (bins) {
		for (uint32_t i = 0; i < num_bins; i++) {
			cf_free(bins[i]);
		}
		cf_free(bins);
	}
}
