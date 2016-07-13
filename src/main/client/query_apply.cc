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

extern "C" {
	#include <aerospike/aerospike_query.h>
	#include <aerospike/as_error.h>
	#include <aerospike/as_policy.h>
	#include <aerospike/as_query.h>
	#include <aerospike/as_status.h>
}

#include <node.h>

#include "async.h"
#include "client.h"
#include "conversions.h"
#include "log.h"
#include "query.h"

using namespace v8;

typedef struct AsyncData {
	bool param_err;
	aerospike* as;
	as_error err;
	as_policy_query policy;
	as_policy_query* p_policy;
	as_query query;
	as_val* val;
	LogInfo* log;
	Nan::Persistent<Function> callback;
} AsyncData;

static bool query_foreach_callback(const as_val* val, void* udata) {
	if (val) {
		AsyncData* data = reinterpret_cast<AsyncData*>(udata);
		data->val = asval_clone(val, data->log);
	}
	return false;
}

static void* prepare(ResolveArgs(info))
{
	AerospikeClient* client = ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	AsyncData* data = new AsyncData();
	data->param_err = false;
	data->as = client->as;
	data->log = client->log;
	data->callback.Reset(info[4].As<Function>());

	setup_query(&data->query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		if (querypolicy_from_jsobject(&data->policy, info[1]->ToObject(), log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing of query policy from object failed");
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			data->param_err = true;
			goto Return;
		}
		data->p_policy = &data->policy;
	}

Return:
	return data;
}

static void execute(uv_work_t* req)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(req->data);
	LogInfo* log = data->log;
	if (data->param_err) {
		as_v8_debug(log, "Parameter error in the query options");
	} else {
		as_v8_debug(log, "Sending query command with stream UDF");
		aerospike_query_foreach(data->as, &data->err, data->p_policy, &data->query, query_foreach_callback, data);
	}
	as_query_destroy(&data->query);
}

static void respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	AsyncData* data = reinterpret_cast<AsyncData*>(req->data);
	LogInfo* log = data->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (data->err.code != AEROSPIKE_OK) {
		as_v8_info(log, "Command failed: %d %s\n", data->err.code, data->err.message);
		argv[0] = error_to_jsobject(&data->err, log);
		argv[1] = Nan::Null();
	} else {
		argv[0] = err_ok();
		argv[1] = val_to_jsvalue(data->val, log);
	}

	as_v8_detail(log, "Invoking JS callback for query_apply");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	delete data;
	delete req;
}

NAN_METHOD(AerospikeClient::QueryApply)
{
	TYPE_CHECK_REQ(info[0], IsString, "namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
