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
}

#define INFO_REQUEST_LEN  50

using namespace v8;

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

typedef struct node_info_result_s {
	char* response;
	char node[AS_NODE_NAME_MAX_SIZE];
} node_info_result;

/**
 *  AsyncData — Data to be used in async calls.
 *
 *  libuv allows us to pass around a pointer to an arbitraty object when
 *  running asynchronous functions. We create a data structure to hold the
 *  data we need during and after async work.
 */
typedef struct AsyncData {
	aerospike* as;
	int param_err;
	as_error err;
	as_policy_info* policy;
	char* req;
	as_vector* info_results;
	LogInfo* log;
	Nan::Persistent<Function> callback;
	Nan::Persistent<Function> done;
} AsyncData;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

bool aerospike_info_cluster_callback(const as_error* error, const as_node* node, const char* info_req, char* response, void* udata)
{
	// Fetch the AsyncData structure
	AsyncData* data    = reinterpret_cast<AsyncData*>(udata);
	LogInfo* log       = data->log;
	as_vector* results = data->info_results;
	node_info_result result;

	if (node->name != NULL) {
		as_v8_debug(log, "Response from node %s", node->name);
		strncpy(result.node, node->name, AS_NODE_NAME_MAX_SIZE);
	} else {
		result.node[0] = '\0';
		as_v8_debug(log, "No host name from cluster");
	}

	if (response != NULL) {
		as_v8_debug(log, "Response is %s", response);
		result.response = (char*) cf_malloc(strlen(response) + 1);
		strncpy(result.response, response, strlen(response) + 1);
	} else {
		result.response = NULL;
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
static void* prepare(ResolveArgs(info))
{
	Nan::HandleScope scope;
	AerospikeClient* client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

	AsyncData* data    = new AsyncData();
	data->as           = client->as;
	data->param_err    = 0;
	data->policy       = NULL;
	data->info_results = as_vector_create(sizeof(node_info_result), 4);
	LogInfo* log = data->log = client->log;

	Local<Value> maybe_request = info[0];
	Local<Value> maybe_policy = info[1];
	Local<Value> maybe_info_callback = info[2];
	Local<Value> maybe_done_callback = info[3];

	if (maybe_request->IsString()) {
		data->req = (char*) malloc(INFO_REQUEST_LEN);
		strncpy(data->req, *String::Utf8Value(maybe_request->ToString()), INFO_REQUEST_LEN);
	} else if (maybe_request->IsNull() || maybe_request->IsUndefined()) {
		// request string is an optional parameter - ignore if missing
	} else {
		as_v8_error(log, "Request should be a String");
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
		goto Err_Return;
	}

	if (maybe_policy->IsObject()) {
		data->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
		if (infopolicy_from_jsobject(data->policy, maybe_policy->ToObject(), log) != AS_NODE_PARAM_OK ) {
			as_v8_debug(log, "policy parameter is invalid");
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			data->param_err = 1;
		}
	} else if (maybe_policy->IsNull() || maybe_policy->IsUndefined()) {
		// policy is an optional parameter - ignore if missing
	} else {
		as_v8_error(log, "Readpolicy should be an object");
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
		goto Err_Return;
	}

	if (maybe_info_callback->IsFunction()) {
		data->callback.Reset(maybe_info_callback.As<Function>());
	} else {
		data->callback.Reset(Nan::New<FunctionTemplate>()->GetFunction());
	}

	if (maybe_done_callback->IsFunction()) {
		data->done.Reset(maybe_done_callback.As<Function>());
	} else {
		data->done.Reset(Nan::New<FunctionTemplate>()->GetFunction());
	}

	return data;

Err_Return:
	data->param_err = 1;
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
	AsyncData* data         = reinterpret_cast<AsyncData*>(req->data);
	aerospike* as           = data->as;
	as_error* err           = &data->err;
	char* request           = data->req;
	as_policy_info* policy  = data->policy;
	LogInfo* log            = data->log;

	as_v8_debug(log, "info request on entire cluster");
	aerospike_info_foreach(as, err, policy, request, aerospike_info_cluster_callback, (void*)data);
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
	as_error* err   = &data->err;
	LogInfo* log    = data->log;

	as_vector* results = data->info_results;
	as_v8_debug(log, "num of responses %d", results->size);

	const int argc = 3;
	Local<Value> argv[argc];
	for (uint32_t i = 0 ; i < results->size; i++) {
		node_info_result* result = (node_info_result*) as_vector_get(results, i);

		if (data->param_err == 0) {
			const char* node_name = result->node;
			const char* response = result->response;

			argv[0] = error_to_jsobject(err, log);

			if (response != NULL && strlen(response) > 0) {
				as_v8_debug(log, "Response is %s", response);
				argv[1] = Nan::New(response).ToLocalChecked();
				cf_free((void*) response);
			} else {
				argv[1] = Nan::Null();
			}

			if( node_name != NULL && strlen(node_name) > 0 ) {
				Local<Object> node = Nan::New<Object>();
				as_v8_debug(log, "The host is %s", node_name);
				node->Set(Nan::New("node_id").ToLocalChecked(), Nan::New(node_name).ToLocalChecked());
				argv[2] = (node);
			} else {
				argv[2] = Nan::Null();
			}
		} else {
			err->func = NULL;
			argv[0] = error_to_jsobject(err, log);
			argv[1] = Nan::Null();
			argv[2] = Nan::Null();
		}

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New<Function>(data->callback);
		Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}
	}

	Nan::TryCatch try_catch;
	Local<Value> done_argv[0];
	Local<Function> done_cb = Nan::New<Function>(data->done);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), done_cb, 0, done_argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->done.Reset();
	data->callback.Reset();

	if (data->policy != NULL) {
		cf_free(data->policy);
	}
	as_vector_destroy(results);
	delete data;
	delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'info()' Operation
 */
NAN_METHOD(AerospikeClient::InfoForeach)
{
	async_invoke(info, prepare, execute, respond);
}
