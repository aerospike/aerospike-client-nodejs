/*******************************************************************************
 * Copyright 2013-2023 Aerospike, Inc.
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



extern "C" {
#include <aerospike/as_metrics.h>
}

using namespace v8;

NAN_METHOD(AerospikeClient::DisableMetrics)
{
	TYPE_CHECK_REQ(info[0], IsFunction, "Callback must be a function");

	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand *cmd =
		new AsyncCommand("DisableMetrics", client, info[0].As<Function>());

	if (aerospike_disable_metrics(client->as, &cmd->err) != AEROSPIKE_OK) {
		cmd->ErrorCallback(&cmd->err);
		goto Cleanup;
	}
	else{
		Local<Value> argv[] = {Nan::Null(), Nan::Null()};
		cmd->Callback(2, argv);
	}

Cleanup:
	delete cmd;
}