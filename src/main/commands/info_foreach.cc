/*******************************************************************************
 * Copyright 2013-2017 Aerospike Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 ******************************************************************************/

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "policy.h"
#include "log.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_info.h>
#include <aerospike/as_node.h>
}

#define INFO_REQUEST_LEN  50

using namespace v8;

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

typedef struct node_info_s {
	char* info;
	char node[AS_NODE_NAME_SIZE];
} node_info;

/**
 *  AsyncData — Data to be used in async calls.
 *
 *  libuv allows us to pass around a pointer to an arbitraty object when
 *  running asynchronous functions. We create a data structure to hold the
 *  data we need during and after async work.
 */
typedef struct AsyncData {
	aerospike* as;
	bool param_err;
	as_error err;
	as_policy_info policy;
	as_policy_info* p_policy;
	char* req;
	as_vector* res;
	LogInfo* log;
	Nan::Persistent<Function> callback;
} AsyncData;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

bool aerospike_info_callback(const as_error* error, const as_node* node, const char* info_req, char* response, void* udata)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(udata);
	LogInfo* log = data->log;
	as_vector* results = data->res;
	node_info result;

	if (strlen(node->name) > 0) {
		as_v8_debug(log, "Response from node %s", node->name);
		strncpy(result.node, node->name, AS_NODE_NAME_SIZE);
	} else {
		result.node[0] = '\0';
		as_v8_debug(log, "No host name from cluster");
	}

	if (response != NULL) {
		as_v8_debug(log, "Response is %s", response);
		result.info = (char*) cf_malloc(strlen(response) + 1);
		strncpy(result.info, response, strlen(response) + 1);
	} else {
		result.info = NULL;
		as_v8_debug(log, "No response from cluster");
	}

	as_vector_append(results, (void*) &result);

	return true;
}

/**
 *  prepare() — Function to prepare AsyncData, for use in `execute()` and `respond()`.
 *
 *  This should only keep references to V8 or V8 structures for use in
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient* client = ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	AsyncData* data = new AsyncData();
	data->param_err = false;
	data->as = client->as;
	data->log = client->log;
	data->res = as_vector_create(sizeof(node_info), 4);
	data->callback.Reset(info[2].As<Function>());

	Local<Value> maybe_request = info[0];
	Local<Value> maybe_policy = info[1];

	if (maybe_request->IsString()) {
		data->req = (char*) malloc(INFO_REQUEST_LEN);
		String::Utf8Value request(maybe_request->ToString());
		strncpy(data->req, *request, INFO_REQUEST_LEN);
	}

	if (maybe_policy->IsObject()) {
		if (infopolicy_from_jsobject(&data->policy, maybe_policy->ToObject(), log) != AS_NODE_PARAM_OK ) {
			as_v8_debug(log, "policy parameter is invalid");
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			data->param_err = true;
			goto Return;
		}
		data->p_policy = &data->policy;
	}

Return:
	return data;
}

/**
 *  execute() — Function to execute inside the worker-thread.
 *
 *  It is not safe to access V8 or V8 data structures here, so everything
 *  we need for input and output should be in the AsyncData structure.
 */
static void execute(uv_work_t* req)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(req->data);
	LogInfo* log = data->log;

	if (data->param_err) {
		as_v8_debug(log, "Parameter error in info command");
	} else {
		as_v8_debug(log, "Sending info command \"%s\" to all cluster hosts", data->req);
		aerospike_info_foreach(data->as, &data->err, data->p_policy, data->req, aerospike_info_callback, (void*)data);
	}
}

/**
 *  AfterWork — Function to execute when the Work is complete
 *
 *  This function will be run inside the main event loop so it is safe to use
 *  V8 again. This is where you will convert the results into V8 types, and
 *  call the callback function with those results.
 */
static void respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	AsyncData* data = reinterpret_cast<AsyncData *>(req->data);
	LogInfo* log = data->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (data->err.code != AEROSPIKE_OK) {
		argv[0] = error_to_jsobject(&data->err, log);
		argv[1] = Nan::Null();
	} else {
		as_vector* results = data->res;
		Local<Array> v8Results = Nan::New<Array>(results->size);
		as_v8_debug(log, "num of responses %d", results->size);
		for (uint32_t i = 0 ; i < results->size; i++) {
			node_info* result = (node_info*) as_vector_get(results, i);
			const char* info = result->info;
			const char* node = result->node;

			Local<Object> v8Result = Nan::New<Object>();
			Local<Object> v8Node = Nan::New<Object>();

			if (node != NULL && strlen(node) > 0) {
				as_v8_debug(log, "Node name: %s", node);
				v8Node->Set(Nan::New("node_id").ToLocalChecked(), Nan::New(node).ToLocalChecked());
			}

			v8Result->Set(Nan::New("host").ToLocalChecked(), v8Node);

			if (info != NULL && strlen(info) > 0) {
				as_v8_debug(log, "Info response: %s", info);
				v8Result->Set(Nan::New("info").ToLocalChecked(), Nan::New(info).ToLocalChecked());
				cf_free((void*) info);
			}

			v8Results->Set(i, v8Result);
		}

		argv[0] = err_ok();
		argv[1] = v8Results;
	}

	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	as_vector_destroy(data->res);
	data->callback.Reset();
	delete data;
	delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

NAN_METHOD(AerospikeClient::InfoForeach)
{
	TYPE_CHECK_OPT(info[0], IsString, "request must be a string");
	TYPE_CHECK_OPT(info[1], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[2], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
