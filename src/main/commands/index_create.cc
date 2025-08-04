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
#include "async.h"
#include "conversions.h"
#include "policy.h"
#include "log.h"
#include "operations.h"
#include "expressions.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/as_config.h>
#include <aerospike/aerospike_index.h>
}

using namespace v8;

class IndexCreateCommand : public AerospikeCommand {
  public:
	IndexCreateCommand(AerospikeClient *client, Local<Function> callback_)
		: AerospikeCommand("IndexCreate", client, callback_)
	{
	}

	~IndexCreateCommand()
	{
		if (policy != NULL)
			cf_free(policy);
		if (index != NULL)
			free(index);
		if (with_context)
			as_cdt_ctx_destroy(&context);

		if(exp){
			as_exp_destroy(exp);
		}
	}

	as_index_task task;
	as_policy_info *policy = NULL;
	as_namespace ns;
	as_set set;
	as_bin_name bin;
	bool bin_set = false;
	char *index = NULL;
	as_index_type itype;
	as_index_datatype dtype;
	as_cdt_ctx context;
	bool with_context;
	LogInfo *log = NULL;
	as_exp *exp = NULL;
};

static void *prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	IndexCreateCommand *cmd =
		new IndexCreateCommand(client, info[9].As<Function>());
	cmd->log = client->log;

	if (as_strlcpy(cmd->ns, *Nan::Utf8String(info[0].As<String>()),
				   AS_NAMESPACE_MAX_SIZE) > AS_NAMESPACE_MAX_SIZE) {
		return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
						   "Namespace exceeds max. length (%d)",
						   AS_NAMESPACE_MAX_SIZE);
	}

	if (info[1]->IsString()) {
		if (as_strlcpy(cmd->set, *Nan::Utf8String(info[1].As<String>()),
					   AS_SET_MAX_SIZE) > AS_SET_MAX_SIZE) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Set exceeds max. length (%d)", AS_SET_MAX_SIZE);
		}
	}

	if (info[2]->IsString()) {
		cmd->bin_set = true;
		if (as_strlcpy(cmd->bin, *Nan::Utf8String(info[2].As<String>()),
					   AS_BIN_NAME_MAX_LEN) > AS_BIN_NAME_MAX_LEN) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Bin name exceeds max. length (%d)",
							   AS_BIN_NAME_MAX_LEN);
		}
	}

	if (info[3]->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(info[3].As<Array>());
		if (compile_expression(exp_ary, &cmd->exp, cmd->log) != AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Compiling expressions failed");
		}
	}

	cmd->index = strdup(*Nan::Utf8String(info[4].As<String>()));
	cmd->itype = (as_index_type)Nan::To<int>(info[5]).FromJust();
	cmd->dtype = (as_index_datatype)Nan::To<int>(info[6]).FromJust();

	if (info[7]->IsObject()) {
		if (get_optional_cdt_context(&cmd->context, &cmd->with_context, info[7].As<Object>(), "context", cmd->log) !=
			AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
								   "Context parameter is invalid");
		}
	}

	if (info[8]->IsObject()) {
		cmd->policy = (as_policy_info *)cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[8].As<Object>(), cmd->log) !=
			AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Policy parameter is invalid");
		}
	}

	return cmd;
}

static void execute(uv_work_t *req)
{
	IndexCreateCommand *cmd = reinterpret_cast<IndexCreateCommand *>(req->data);


	if (!cmd->CanExecute()) {
		return;
	}



	if(cmd->exp){
		as_v8_debug(cmd->log,
					"Executing IndexCreate on Expression command: ns=%s, set=%s"
					"index=%s, type=%d, datatype=%d",
					cmd->ns, cmd->set, cmd->index, cmd->itype,
					cmd->dtype);
		aerospike_index_create_exp(cmd->as, &cmd->err, &cmd->task, cmd->policy,
							   cmd->ns, cmd->set, cmd->index,
							   cmd->itype, cmd->dtype, cmd->exp);
	}
	else if(cmd->bin_set){
		as_v8_debug(cmd->log,
				"Executing IndexCreate command: ns=%s, set=%s, bin=%s, "
				"index=%s, type=%d, datatype=%d",
				cmd->ns, cmd->set, cmd->bin, cmd->index, cmd->itype,
				cmd->dtype);
		aerospike_index_create_ctx(cmd->as, &cmd->err, &cmd->task, cmd->policy,
							   cmd->ns, cmd->set, cmd->bin, cmd->index,
							   cmd->itype, cmd->dtype, cmd->with_context ? &cmd->context : NULL);
	}
	else{
		CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Creation of an index requires either a bin name or an expression.");
		return;

	}


}

static void respond(uv_work_t *req, int status)
{
	Nan::HandleScope scope;
	IndexCreateCommand *cmd = reinterpret_cast<IndexCreateCommand *>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	}
	else {
		cmd->Callback(0, {});
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::IndexCreate)
{
	TYPE_CHECK_REQ(info[0], IsString, "Namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "Set must be a string");
	TYPE_CHECK_OPT(info[2], IsString, "Bin must be a string");
	TYPE_CHECK_OPT(info[3], IsArray, "Exp must be an array");
	TYPE_CHECK_REQ(info[4], IsString, "Index name must be a string");
	TYPE_CHECK_REQ(info[5], IsNumber, "Index type must be an integer");
	TYPE_CHECK_REQ(info[6], IsNumber, "Index datatype must be an integer");
	TYPE_CHECK_OPT(info[7], IsObject, "Context must be an object");
	TYPE_CHECK_OPT(info[8], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[9], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
