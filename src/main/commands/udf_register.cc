/*******************************************************************************
 * Copyright 2013-2018 Aerospike, Inc.
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
#include "string.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_udf.h>
#include <aerospike/as_udf.h>
#include <aerospike/as_config.h>
#include <aerospike/as_string.h>
}

#define MAX_FILENAME_LEN 255

using namespace v8;

class UdfRegisterCommand : public AerospikeCommand {
	public:
		UdfRegisterCommand(AerospikeClient* client, Local<Function> callback_)
			: AerospikeCommand("UdfRegister", client, callback_) { }

		~UdfRegisterCommand() {
			if (policy != NULL) cf_free(policy);
			if (content.type != 0) as_bytes_destroy(&content);
		}

	as_policy_info* policy = NULL;
	char filename[MAX_FILENAME_LEN] = { '\0' };
	as_bytes content;
	as_udf_type type;
};


static void*
prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	UdfRegisterCommand* cmd = new UdfRegisterCommand(client, info[3].As<Function>());
	LogInfo* log = client->log;

	char* filepath = strdup(*Nan::Utf8String(info[0].As<String>()));
	FILE * file = fopen(filepath, "r");
	if (!file) {
		CmdSetError(cmd, AEROSPIKE_ERR, "Cannot open file: %s", filepath);
		if (filepath != NULL) cf_free(filepath);
		return cmd;
	}

	// Determine the file size.
	int rv = fseek(file, 0, SEEK_END);
	if (rv != 0) {
		CmdSetError(cmd, AEROSPIKE_ERR_CLIENT, "Cannot determine file size: fseek returned %d", rv);
		if (filepath != NULL) cf_free(filepath);
		fclose(file);
		return cmd;
	}

	int file_size = ftell(file);
	if (file_size < 0) {
		CmdSetError(cmd, AEROSPIKE_ERR, "Cannot determine file size: ftell returned %d", file_size);
		if (filepath != NULL) cf_free(filepath);
		fclose(file);
		return cmd;
	}

	//Read the file's content into local buffer.
	rewind(file);
	uint8_t* file_content = (uint8_t*) cf_malloc(sizeof(uint8_t) * file_size);
	if (file_content == NULL) {
		CmdSetError(cmd, AEROSPIKE_ERR, "Memory allocation for UDF buffer failed");
		fclose(file);
		return cmd;
	}

	uint8_t* p_write = file_content;
	int read = fread(p_write, 1, 512, file);
	int size = 0;

	while (read) {
		size += read;
		p_write += read;
		read = fread(p_write, 1, 512, file);
	}
	fclose(file);

	as_string filename;
	as_basename(&filename, filepath);
	if (as_string_get(&filename) == NULL) {
		CmdSetError(cmd, AEROSPIKE_ERR, "Cannot determine UDF file basename");
		if (filepath != NULL) cf_free(filepath);
		return cmd;
	}
	if (as_strlcpy(cmd->filename, as_string_get(&filename), MAX_FILENAME_LEN) > MAX_FILENAME_LEN) {
		CmdSetError(cmd, AEROSPIKE_ERR, "UDF filename exceeds max. length (> %d)", MAX_FILENAME_LEN);
		if (filepath != NULL) cf_free(filepath);
		return cmd;
	}

	//Wrap the local buffer as an as_bytes object.
	as_bytes_init_wrap(&cmd->content, file_content, size, true);

	if (info[1]->IsNumber()) {
		cmd->type = (as_udf_type) Nan::To<int>(info[1]).FromJust();
	} else {
		cmd->type = AS_UDF_TYPE_LUA;
	}

	if (info[2]->IsObject()) {
		cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(cmd->policy, info[2].As<Object>(), log) != AS_NODE_PARAM_OK) {
			CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "Policy parameter is invalid");
			if (filepath != NULL) cf_free(filepath);
			return cmd;
		}
	}

	if (filepath != NULL) cf_free(filepath);

	return cmd;
}

static void
execute(uv_work_t* req)
{
	UdfRegisterCommand* cmd = reinterpret_cast<UdfRegisterCommand*>(req->data);
	LogInfo* log = cmd->log;

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Executing UdfRegister command: %s", cmd->filename);
	aerospike_udf_put(cmd->as, &cmd->err, cmd->policy, cmd->filename, cmd->type, &cmd->content);
}

static void
respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	UdfRegisterCommand* cmd = reinterpret_cast<UdfRegisterCommand*>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	} else {
		cmd->Callback(0, {});
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::Register)
{
	TYPE_CHECK_REQ(info[0], IsString, "Filename must be a string");
	TYPE_CHECK_OPT(info[1], IsNumber, "Type must be an integer");
	TYPE_CHECK_OPT(info[2], IsObject, "Policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
