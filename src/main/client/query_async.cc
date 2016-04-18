/*******************************************************************************
 * Copyright 2016 Aerospike, Inc.
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

extern "C" {
	#include <aerospike/aerospike_query.h>
	#include <aerospike/as_error.h>
	#include <aerospike/as_policy.h>
	#include <aerospike/as_query.h>
	#include <aerospike/as_status.h>
}

#include <node.h>

#include "async_listener.h"
#include "client.h"
#include "conversions.h"
#include "log.h"
#include "query.h"

using namespace v8;

NAN_METHOD(AerospikeClient::QueryAsync)
{
	TYPE_CHECK_REQ(info[0], IsString, "namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "callback must be a function");

	AerospikeClient* client = ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	CallbackData* data = new CallbackData();
	data->client = client;
	data->callback.Reset(info[4].As<Function>());

	as_query query;
	as_policy_query policy;
	as_policy_query* p_policy = NULL;
	as_error err;
	as_status status;

	setup_query(&query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		if (querypolicy_from_jsobject(&policy, info[3]->ToObject(), log) != AS_NODE_PARAM_OK) {
			as_error_update(&err, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			invoke_error_callback(&err, data);
			goto Cleanup;
		}
		p_policy = &policy;
	}

	as_v8_debug(log, "Sending async query command");
	status = aerospike_query_async(client->as, &err, p_policy, &query, async_query_record_listener, data, NULL);
	if (status != AEROSPIKE_OK) {
		invoke_error_callback(&err, data);
	}

Cleanup:
	as_query_destroy(&query);
}
