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
#include "async.h"
#include "command.h"
#include "conversions.h"
#include "expressions.h"
#include "policy.h"
#include "log.h"

extern "C" {
#include <aerospike/aerospike_info.h>
}


using namespace v8;

NAN_METHOD(AerospikeClient::SetXDRFilter)
{
	TYPE_CHECK_OPT(info[0], IsArray, "Expression must be an array");
	TYPE_CHECK_REQ(info[1], IsString, "dataCenter must be an object");
	TYPE_CHECK_REQ(info[2], IsString, "Namespace must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "Policy must be an object");
	TYPE_CHECK_OPT(info[4], IsFunction, "Callback must be a function");

	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	AsyncCommand *cmd =
		new AsyncCommand("Exists", client, info[4].As<Function>());
	LogInfo *log = client->log;

	as_policy_info policy;
	as_policy_info *p_policy = NULL;
	as_status status;

  	const char[42] fmt_str = "xdr-set-filter:dc=%s;namespace=%s;exp=%s";

	char *request_str_p = NULL;
	char *response_p = NULL;



	as_namespace as_ns = {'\0'};
	char* dc = NULL;
	struct as_exp* filter_exp = NULL;
	char* filter_b64 = NULL;
	unsigned int request_length = 0;

	Local<Value> exp_val = info[0];
	Local<Value> dc_val = info[1];
	Local<Value> ns_val = info[2];

	if (exp_val->IsArray()) {
		int rc = 0;
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if ((rc = compile_expression(exp_ary, &filter_exp, log)) !=
			AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "unable to compile expression, expression was invalid");
			goto Cleanup;
		}
	}
	else if (exp_val->IsNull() || exp_val->IsUndefined()) {
		// no-op
	}
	else {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Invalid filter expression value");
		goto Cleanup;
	}

	if(filter_exp){
		filter_b64 = as_exp_to_base64(filter_exp);
	}



	if (datacenter_from_jsobject(dc_val, &dc, log) !=
		AS_NODE_PARAM_OK) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "dataCenter must be a string");
		goto Cleanup;
	}


	if (ns_val->IsString()) {
		Local<String> v8_ns = ns_val.As<String>();
		if (as_strlcpy(as_ns, *Nan::Utf8String(v8_ns), AS_NAMESPACE_MAX_SIZE) >
			AS_NAMESPACE_MAX_SIZE) {
			// Length of the message below
			const int msg_length = 36;
			char msg[msg_length];
			snprintf(msg, msg_length, "Namespace exceeds max. length (%d)", AS_NAMESPACE_MAX_SIZE);
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, msg);
			goto Cleanup;
		}
	}
	else{
		CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Namespace must be a string");
		goto Cleanup;
	}



	if (info[3]->IsObject()) {
		if (infopolicy_from_jsobject(&policy, info[1].As<Object>(), log) !=
			AS_NODE_PARAM_OK) {
			CmdErrorCallback(cmd, AEROSPIKE_ERR_PARAM, "Policy object invalid");
			goto Cleanup;
		}
		p_policy = &policy;
	}

	if(filter_b64 != NULL) {

  	request_length = strlen(fmt_str) + strlen(dc) +
                                strlen((char *)as_ns) +
                                strlen(filter_b64) + 1 - 6;
    request_str_p = (char *) cf_malloc(request_length * sizeof(char));

    sprintf(request_str_p, fmt_str, dc, (char *)as_ns,
            filter_b64);
	}
	else {

  	request_length = strlen(fmt_str) + strlen(dc) +
                                strlen((char *)as_ns) +
                                5 + 1 - 6;
    request_str_p = (char *) cf_malloc(request_length * sizeof(char));

    sprintf(request_str_p, fmt_str, dc, (char *)as_ns,
            "null");

	}



  status = aerospike_info_any(client->as, &cmd->err, p_policy, request_str_p,
                                &response_p);

  // The above is the same as below, except below doesn't give a response.
	// status = aerospike_set_xdr_filter(client->as, &cmd->err, p_policy, dc, (char*) as_ns, filter_b64);

	if (status == AEROSPIKE_OK) {
		Local<Value> argv[] = {Nan::Null(), Nan::New(response_p).ToLocalChecked()};
		cmd->Callback(2, argv);
	}
	else {
		cmd->ErrorCallback();
	}

Cleanup:
	delete cmd;
	if (filter_exp) {
		as_exp_destroy(filter_exp);
		
	}
	if (filter_b64){
		cf_free(filter_b64);
	}
	if (dc) {
		cf_free(dc);
	}
	if(request_str_p){
		cf_free(request_str_p);
	}
	if(response_p){
		cf_free(response_p);
	}
}
