/*******************************************************************************
 * Copyright 2013-2020 Aerospike, Inc.
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
#include "query.h"

extern "C" {
#include <aerospike/aerospike_query.h>
#include <aerospike/as_error.h>
#include <aerospike/as_policy.h>
#include <aerospike/as_query.h>
#include <aerospike/as_status.h>
#include <aerospike/as_partition_filter.h>
}

using namespace v8;

NAN_METHOD(AerospikeClient::QueryAsync)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "Callback must be a function");

	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand *cmd =
		new AsyncCommand("Query", client, info[4].As<Function>());
	LogInfo *log = client->log;

	as_query query;
	as_policy_query policy;
	as_policy_query *p_policy = NULL;
	as_status status;
	as_partition_filter pf;
	bool pf_defined = false;

	setup_query(&query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		if (querypolicy_from_jsobject(&policy, info[3].As<Object>(), log) !=
			AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM,
							 "Partitions object invalid");
			goto Cleanup;
		}
		p_policy = &policy;
	}

	as_partition_filter_set_all(&pf);
	if (partitions_from_jsobject(&pf, &pf_defined, info[2].As<Object>(), log) !=
		AS_NODE_PARAM_OK) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
		goto Cleanup;
	}

	if (pf_defined) {
		as_v8_debug(log, "Sending async query partitions command");
		status = aerospike_query_partitions_async(
			client->as, &cmd->err, p_policy, &query, &pf, async_scan_listener,
			cmd, NULL);
	}
	else {
		as_v8_debug(log, "Sending async query command");
		status = aerospike_query_async(client->as, &cmd->err, p_policy, &query,
									   async_scan_listener, cmd, NULL);
	}

	if (status == AEROSPIKE_OK) {
		cmd = NULL; // async callback responsible for deleting the command
	}
	else {
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
	free_query(&query, p_policy);
}
