/*******************************************************************************
 * Copyright 2023 Aerospike, Inc.
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
#include "operations.h"

extern "C" {
#include <aerospike/aerospike_query.h>
#include <aerospike/as_error.h>
#include <aerospike/as_policy.h>
#include <aerospike/as_query.h>
#include <aerospike/as_status.h>
#include <aerospike/as_partition_filter.h>
}

using namespace v8;

NAN_METHOD(AerospikeClient::QueryPages)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "Options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_OPT(info[4], IsObject, "saved_query must be an object");
	TYPE_CHECK_OPT(info[5], IsNumber, "max_records must be a number");
	TYPE_CHECK_OPT(info[6], IsObject, "context must be an object");	
	TYPE_CHECK_REQ(info[7], IsFunction, "Callback must be a function");

	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand *cmd =
		new AsyncCommand("Query", client, info[7].As<Function>());
	LogInfo *log = client->log;

	as_policy_query* p_policy = NULL;
	as_policy_query policy;
	as_partition_filter pf;
	bool pf_defined = false;
	as_status status;
	as_cdt_ctx context;
	bool with_context = false;
	as_exp *exp = NULL;

	struct query_udata* qu = (query_udata*) cf_malloc(sizeof(struct query_udata));
	qu->cmd = cmd;
	qu->count = 0;
	qu->exp = exp;

	if (info[6]->IsObject()) {
		if (get_optional_cdt_context(&context, &with_context, info[6].As<Object>(), "context", log) !=
			AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing context arguments for query index filter failed");
			Nan::ThrowTypeError("Error in filter context");
		}
	}

	if (info[4]->IsObject()) {
		uint32_t bytes_size = 0;
		load_bytes_size(info[4].As<Object>(), &bytes_size, log);
		uint8_t* bytes = new uint8_t[bytes_size];
		load_bytes(info[4].As<Object>(), bytes, bytes_size, log);
		setup_query_pages(&qu->query, info[0], info[1], Nan::Null(), bytes, bytes_size, &context, &with_context, &exp, log);
		delete [] bytes;
	}
	else{
		setup_query_pages(&qu->query, info[0], info[1], info[2], NULL, 0, &context, &with_context, &exp, log);
	}

	if(with_context) {
		qu->query->where.entries[0].ctx = &context;
	}

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

	if(info[5]->IsNumber()){
		qu->max_records = Nan::To<int32_t>(info[5]).FromJust();
		qu->query->max_records = 0;
	}


	if (pf_defined) {
		as_v8_debug(log, "Sending async query partitions command");
		status = aerospike_query_partitions_async(
			client->as, &cmd->err, p_policy, (as_query*) qu->query, &pf, async_query_pages_listener,
			qu, NULL);
	}
	else {
		as_v8_debug(log, "Sending async query command");
	
		status = aerospike_query_async(client->as, &cmd->err, p_policy, (as_query*) qu->query,
									   async_query_pages_listener, qu, NULL);
	}

	if (status == AEROSPIKE_OK) {
		cmd = NULL; // async callback responsible for deleting the command
	}
	else {
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
	if (p_policy && policy.base.filter_exp) {
		as_exp_destroy(policy.base.filter_exp);
	}
	if(with_context) {
		as_cdt_ctx_destroy(&context);
	}

}