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

NAN_METHOD(AerospikeClient::PutAsync)
{
	TYPE_CHECK_REQ(info[0], IsObject, "Key must be an object");
	TYPE_CHECK_REQ(info[1], IsObject, "Record must be an object");
	TYPE_CHECK_OPT(info[2], IsObject, "Metadata must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "Callback must be a function");

	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand* cmd = new AsyncCommand("Put", client, info[4].As<Function>());
	LogInfo* log = client->log;

	as_key key;
	bool key_initalized= false;
	as_record record;
	bool record_initalized = false;
	as_policy_write policy;
	as_policy_write* p_policy = NULL;
	as_status status;

	if (key_from_jsobject(&key, info[0].As<Object>(), log) != AS_NODE_PARAM_OK) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Key object invalid");
		goto Cleanup;
	}
	key_initalized = true;

	if (recordbins_from_jsobject(&record, info[1].As<Object>(), log) != AS_NODE_PARAM_OK) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Record object invalid");
		goto Cleanup;
	}
	record_initalized = true;

	if (info[2]->IsObject()) {
		if (recordmeta_from_jsobject(&record, info[2].As<Object>(), log) != AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Meta object invalid");
			goto Cleanup;
		}
	}

	if (info[3]->IsObject()) {
		if (writepolicy_from_jsobject(&policy, info[3].As<Object>(), log) != AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			goto Cleanup;
		}
		p_policy = &policy;
	}

	as_v8_debug(log, "Sending async put command");
	status = aerospike_key_put_async(client->as, &cmd->err, p_policy, &key, &record, async_write_listener, cmd, NULL, NULL);
	if (status == AEROSPIKE_OK) {
		cmd = NULL; // async callback responsible for deleting the command
	} else {
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
	if (key_initalized) as_key_destroy(&key);
	if (record_initalized) as_record_destroy(&record);
}
