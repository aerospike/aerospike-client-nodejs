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

NAN_METHOD(AerospikeClient::RoleSetWhitelist)
{
	TYPE_CHECK_REQ(info[0], IsString, "Role must be a string");
	TYPE_CHECK_OPT(info[1], IsArray, "Whitelist must be an array");
	TYPE_CHECK_OPT(info[2], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "Callback must be a function");

	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand *cmd = new AsyncCommand("RoleSetWhitelist", client, info[3].As<Function>());
	LogInfo *log = client->log;

	as_policy_admin policy;
	char * role = NULL;
	char ** whitelist = NULL;
	int whitelist_size = 0;
	as_status status;
	
	if(info[0]->IsString()){
		role = strdup(*Nan::Utf8String(info[0].As<String>()));
	}
	else{
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "role must be a vaild string");
		goto Cleanup;
	}

	if(info[1]->IsArray()){
		Local<Array> whitelist_array = info[1].As<Array>();
		whitelist_size = whitelist_array->Length();
		if(whitelist_size != 0){
			if (string_from_jsarray(&whitelist, whitelist_size, whitelist_array, log) !=
				AS_NODE_PARAM_OK) {
				CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
				goto Cleanup;
			}
		}
	}

	if (info[2]->IsObject()) {
		if (adminpolicy_from_jsobject(&policy, info[2].As<Object>(), log) !=
			AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			goto Cleanup;
		}
	}

	as_v8_debug(log, "WRITE THIS DEBUG MESSAGE");
	status = aerospike_set_whitelist(client->as, &cmd->err, &policy, role, const_cast<const char**>(whitelist), whitelist_size);

	if (status != AEROSPIKE_OK) {
		cmd->ErrorCallback();
	}
	else{
		cmd->Callback(0, {});
	}

Cleanup:
	delete cmd;
	if(role){
		free(role);
	}
	for(int i = 0; i < whitelist_size; i++) {
		free(whitelist[i]);
	}
	if(whitelist){
		free(whitelist);
	}

}