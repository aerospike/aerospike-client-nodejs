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

#include <node.h>

#include "async.h"
#include "client.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

NAN_METHOD(AerospikeClient::BatchReadAsync)
{
	TYPE_CHECK_REQ(info[0], IsArray, "records must be an array of objects");
	TYPE_CHECK_OPT(info[1], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[2], IsFunction, "callback must be a function");

	AerospikeClient* client = ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	CallbackData* data = new CallbackData();
	data->client = client;
	data->callback.Reset(info[2].As<Function>());

	as_batch_read_records* records = NULL;
	bool destroy_batch = false;
	as_policy_batch policy;
	as_policy_batch* p_policy = NULL;
	as_error err;
	as_status status;

	if (batch_read_records_from_jsarray(&records, Local<Array>::Cast(info[0]), log) != AS_NODE_PARAM_OK) {
		as_error_update(&err, AEROSPIKE_ERR_PARAM, "Records array invalid");
		invoke_error_callback(&err, data);
		goto Cleanup;
	}
	destroy_batch = true;

	if (info[1]->IsObject()) {
		if (batchpolicy_from_jsobject(&policy, info[1]->ToObject(), log) != AS_NODE_PARAM_OK) {
			as_error_update(&err, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			invoke_error_callback(&err, data);
			goto Cleanup;
		}
		p_policy = &policy;
	}

	as_v8_debug(log, "Sending async batch read command\n");
	status = aerospike_batch_read_async(client->as, &err, p_policy, records, async_batch_listener, data, NULL);
	if (status == AEROSPIKE_OK) {
		destroy_batch = false;
	} else {
		invoke_error_callback(&err, data);
	}

Cleanup:
	// batch records will be freed by the callback if it was called
	if (destroy_batch) as_batch_read_destroy(records);
}
