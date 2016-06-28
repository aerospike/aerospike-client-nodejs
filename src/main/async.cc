/*******************************************************************************
 * Copyright 2013-2016 Aerospike, Inc.
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
	#include <aerospike/as_error.h>
}

#include <node.h>
#include <uv.h>

#include "async.h"
#include "client.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

Local<Object> err_ok()
{
	Nan::EscapableHandleScope scope;
	Local<Object> err = Nan::New<Object>();
	err->Set(Nan::New("code").ToLocalChecked(), Nan::New(AEROSPIKE_OK));
	return scope.Escape(err);
}

/**
 *  Setup an asynchronous invocation of a function using uv worker threads.
 */
Local<Value> async_invoke(
    ResolveArgs(args),
    void *  (* prepare)(ResolveArgs(args)),
    void    (* execute)(uv_work_t * req),
    void    (* respond)(uv_work_t * req, int status)
    )
{
    // Create an async work token, and add AsyncData to it.
    uv_work_t * req = new uv_work_t;
    req->data = prepare(args);

    // Pass the work token to libuv to be run when a
    // worker-thread is available to process it.
    uv_queue_work(
        uv_default_loop(),  // event loop
        req,                // work token
        execute,            // execute work
        respond             // respond to callback
    );

    // Return value for the function. Because we are async, we will
    // return an `undefined`.
    return Nan::Undefined();
}

void release_uv_timer(uv_handle_t* handle)
{
	uv_timer_t* timer = (uv_timer_t*) handle;
	CallbackData* data = reinterpret_cast<CallbackData*>(timer->data);
	as_error* error = (as_error*)data->data;
	cf_free(timer);
	cf_free(error);
	delete data;
}

void async_error_callback(uv_timer_t* timer)
{
	Nan::HandleScope scope;
	CallbackData* data = reinterpret_cast<CallbackData*>(timer->data);
	const LogInfo* log = data->client->log;
	as_error* error = (as_error*)data->data;

	const int argc = 1;
	Local<Value> argv[argc];
	argv[0] = error_to_jsobject(error, log);

	as_v8_debug(log, "Invoking JS error callback function: %d %s", error->code, error->message);
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	uv_close((uv_handle_t*) timer, release_uv_timer);
}

void invoke_error_callback(as_error* error, CallbackData* data)
{
	Nan::HandleScope scope;
	as_error* err = (as_error*) cf_malloc(sizeof(as_error));
	as_error_setall(err, error->code, error->message, error->func,
			error->file, error->line);
	data->data = err;
	uv_timer_t* timer = (uv_timer_t*) cf_malloc(sizeof(uv_timer_t));
	uv_timer_init(uv_default_loop(), timer);
	timer->data = data;
	uv_timer_start(timer, async_error_callback, 0, 0);
}

void async_record_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;

	CallbackData * data = reinterpret_cast<CallbackData *>(udata);
	if (!data) {
		return Nan::ThrowError("Missing callback data - cannot process record callback");
	}

	const AerospikeClient * client = data->client;
	const LogInfo * log = client->log;

	const int argc = 3;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
		argv[1] = Nan::Null();
		argv[2] = Nan::Null();
	} else {
		argv[0] = err_ok();
		argv[1] = recordbins_to_jsobject(record, log);
		argv[2] = recordmeta_to_jsobject(record, log);
	}

	as_v8_debug(log, "Invoking JS callback function");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	delete data;
}

void async_write_listener(as_error* err, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;

	CallbackData * data = reinterpret_cast<CallbackData *>(udata);
	if (!data) {
		return Nan::ThrowError("Missing callback data - cannot process write callback");
	}

	const AerospikeClient * client = data->client;
	const LogInfo * log = client->log;

	const int argc = 1;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
	} else {
		argv[0] = err_ok();
	}

	as_v8_debug(log, "Invoking JS callback function");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	delete data;
}

void async_value_listener(as_error* err, as_val* value, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;

	CallbackData * data = reinterpret_cast<CallbackData *>(udata);
	if (!data) {
		return Nan::ThrowError("Missing callback data - cannot process value callback");
	}

	const AerospikeClient * client = data->client;
	const LogInfo * log = client->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
		argv[1] = Nan::Null();
	} else {
		argv[0] = err_ok();
		argv[1] = val_to_jsvalue(value, log);
	}

	as_v8_debug(log, "Invoking JS callback function");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	delete data;
}

void async_batch_listener(as_error* err, as_batch_read_records* records, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;

	CallbackData * data = reinterpret_cast<CallbackData *>(udata);
	if (!data) {
		return Nan::ThrowError("Missing callback data - cannot process record callback");
	}

	const AerospikeClient * client = data->client;
	const LogInfo * log = client->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
		argv[1] = Nan::Null();
	} else {
		argv[0] = err_ok();
		argv[1] = batch_records_to_jsarray(records, log);
	}
	as_batch_read_destroy(records);

	as_v8_debug(log, "Invoking JS callback function");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	delete data;
}

bool async_scan_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;

	CallbackData * data = reinterpret_cast<CallbackData *>(udata);
	if (!data) {
		Nan::ThrowError("Missing callback data - cannot process record callback");
		return false;
	}

	const AerospikeClient* client = data->client;
	const LogInfo* log = client->log;

	const int argc = 4;
	bool reached_end = false;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
		argv[1] = Nan::Null();
		argv[2] = Nan::Null();
		argv[3] = Nan::Null();
	} else if (record) {
		argv[0] = err_ok();
		argv[1] = recordbins_to_jsobject(record, log);
		argv[2] = recordmeta_to_jsobject(record, log);
		argv[3] = key_to_jsobject(&record->key, log);
	} else {
		reached_end = true;
		argv[0] = err_ok();
		argv[1] = Nan::Null();
		argv[2] = Nan::Null();
		argv[3] = Nan::Null();
	}

	as_v8_debug(log, "Invoking JS callback function");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Local<Value> cb_result = Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	if (reached_end) {
		data->callback.Reset();
		delete data;
		return false;
	} else {
		bool continue_scan = true;
		if (cb_result->IsBoolean()) {
			continue_scan = cb_result->ToBoolean()->Value();
			as_v8_debug(log, "Async scan callback returned: %s", continue_scan ? "true" : "false");
		}
		return continue_scan;
	}
}
