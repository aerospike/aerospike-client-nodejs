/*******************************************************************************
 * Copyright 2013 Aerospike Inc.
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

extern "C" {
	#include <aerospike/aerospike.h>
	#include <aerospike/aerospike_info.h>
}

#include <node.h>

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"

#define INFO_REQUEST_LEN  50

using namespace v8;

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

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
	char* res;
	char* addr;
	uint16_t port;
	LogInfo* log;
	Nan::Persistent<Function> callback;
} AsyncData;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

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
	LogInfo* log = client->log;

	AsyncData* data = new AsyncData();
	data->param_err = false;
	data->as = client->as;
	data->log = client->log;
	data->callback.Reset(info[3].As<Function>());

	Local<Value> maybe_request = info[0];
	Local<Value> maybe_host = info[1];
	Local<Value> maybe_policy = info[2];

	if (maybe_request->IsString()) {
		data->req = (char*) cf_malloc(INFO_REQUEST_LEN);
		String::Utf8Value request(maybe_request->ToString());
		strncpy(data->req, *request, INFO_REQUEST_LEN);
	}

	if (maybe_host->IsObject()) {
		if (host_from_jsobject(maybe_host->ToObject(), &data->addr, &data->port, log) != AS_NODE_PARAM_OK) {
			as_v8_debug(log, "host parameter is invalid");
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			data->param_err = true;
			goto Return;
		}
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
		as_v8_debug(log, "Parameter error in the job info options");
	} else {
		if (data->addr == NULL) {
			as_v8_debug(log, "Sending info command \"%s\" to random cluster host", data->req);
			aerospike_info_any(data->as, &data->err, data->p_policy, data->req, &data->res);
		} else {
			as_v8_debug(log, "Sending info command \"%s\" to cluster host %s:%d", data->req, data->addr, data->port);
			aerospike_info_host(data->as, &data->err, data->p_policy, data->addr, data->port, data->req, &data->res);
		}
	}
}

/**
 *  AfterWork — Function to execute when the Work is complete
 *
 *  This function will be run inside the main event loop so it is safe to use
 *  V8 again. This is where you will convert the results into V8 types, and
 *  call the callback function with those results.
 */
static void respond(uv_work_t * req, int status)
{
	Nan::HandleScope scope;
	AsyncData* data = reinterpret_cast<AsyncData*>(req->data);
	char* response = data->res;
	LogInfo* log = data->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (data->err.code != AEROSPIKE_OK) {
		argv[0] = error_to_jsobject(&data->err, log);
		argv[1] = Nan::Null();
	} else {
		argv[0] = err_ok();
		if (response != NULL && strlen(response) > 0) {
			as_v8_debug(log, "Response is %s", response);
			argv[1] = Nan::New(response).ToLocalChecked();
			cf_free((void*)response);
		} else {
			argv[1] = Nan::Null();
		}
	}

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

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'info()' Operation
 */
NAN_METHOD(AerospikeClient::Info)
{
	TYPE_CHECK_OPT(info[0], IsString, "request must be a string");
	TYPE_CHECK_OPT(info[1], IsObject, "host must be an object");
	TYPE_CHECK_OPT(info[2], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[3], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
