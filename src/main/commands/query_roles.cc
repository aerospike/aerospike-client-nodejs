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
#include "command.h"
#include "async.h"
#include "conversions.h"
#include "policy.h"
#include "log.h"

extern "C" {
#include <aerospike/aerospike_scan.h>
#include <aerospike/as_error.h>
#include <aerospike/as_job.h>
#include <aerospike/as_policy.h>
#include <aerospike/as_status.h>
#include <aerospike/as_admin.h>
}

using namespace v8;

NAN_METHOD(AerospikeClient::QueryRoles)
{
	TYPE_CHECK_OPT(info[0], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[1], IsFunction, "Callback must be a function");

	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand *cmd = new AsyncCommand("QueryRoles", client, info[1].As<Function>());
	LogInfo *log = client->log;

	as_policy_admin policy;
	as_role** roles = NULL;
	int roles_size = 0;
	as_status status;
	

	if (info[0]->IsObject()) {
		if (adminpolicy_from_jsobject(&policy, info[0].As<Object>(), log) !=
			AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			goto Cleanup;
		}
	}

	as_v8_debug(log, "WRITE THIS DEBUG MESSAGE");
	status = aerospike_query_roles(client->as, &cmd->err, &policy, &roles, &roles_size);

	if (status != AEROSPIKE_OK) {
		cmd->ErrorCallback();
	}
	else{
		Local<Value> argv[] = { Nan::Null(),
								as_roles_to_jsobject(roles, roles_size, log)};
		cmd->Callback(2, argv);
	}

Cleanup:
	delete cmd;
	for(int i = 0; i < roles_size; i++){
		as_role_destroy(roles[i]);
	}
	if(roles){
		free(roles);
	}

}