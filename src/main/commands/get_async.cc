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

NAN_METHOD(AerospikeClient::GetAsync)
{
	TYPE_CHECK_REQ(info[0], IsObject, "Key must be an object");
	TYPE_CHECK_OPT(info[1], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[2], IsFunction, "Callback must be a function");

	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand* cmd = new AsyncCommand("Get", client, info[2].As<Function>());
	LogInfo* log = client->log;

	as_key key;
	bool key_initalized = false;
	as_policy_read policy;
	as_policy_read* p_policy = NULL;
	as_status status = AEROSPIKE_ERR;

	if (key_from_jsobject(&key, info[0].As<Object>(), log) != AS_NODE_PARAM_OK) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Key object invalid");
		goto Cleanup;
	}
	key_initalized = true;

	if (info[1]->IsObject()) {
		if (readpolicy_from_jsobject(&policy, info[1].As<Object>(), log) != AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			goto Cleanup;
		}
		p_policy = &policy;
	}

	as_v8_debug(log, "Sending async get command");
	status = aerospike_key_get_async(client->as, &cmd->err, p_policy, &key, async_record_listener, cmd, NULL, NULL);
	if (status == AEROSPIKE_OK) {
		cmd = NULL; // async callback responsible for deleting the command
	} else {
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
	if (key_initalized) as_key_destroy(&key);
}
