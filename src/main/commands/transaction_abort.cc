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
#include "conversions.h"
#include "log.h"
#include "async.h"
#include "transaction.h"

using namespace v8;

NAN_METHOD(AerospikeClient::TransactionAbort)
{
	// TYPE_CHECK_REQ(info[0], is_transaction_value, "Transaction must be an object");
	TYPE_CHECK_REQ(info[1], IsFunction, "Callback must be a function");

	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand *cmd = new AsyncCommand("Abort", client, info[1].As<Function>());
	LogInfo *log = client->log;

	Transaction *transaction;
	as_status status;


	if (is_transaction_value(info[0])) {
		transaction = Nan::ObjectWrap::Unwrap<Transaction>(info[0].As<Object>());
	}
	else {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Transaction object invalid");
		goto Cleanup;
	}

	status = aerospike_abort_async(client->as, &cmd->err, transaction->txn, async_abort_listener, cmd, NULL);
	as_v8_debug(log, "Sending transaction abort command");

	if (status == AEROSPIKE_OK) {
		cmd = NULL; // async callback responsible for deleting the command
	}
	else {
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
}