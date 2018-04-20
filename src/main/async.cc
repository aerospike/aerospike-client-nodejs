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

#include <cstdint>
#include <node.h>
#include <uv.h>

#include "async.h"
#include "command.h"
#include "client.h"
#include "conversions.h"
#include "log.h"

extern "C" {
#include <aerospike/as_error.h>
}

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
		const Nan::FunctionCallbackInfo<v8::Value> &args,
		void* (* prepare)(const Nan::FunctionCallbackInfo<v8::Value> &args),
		void  (* execute)(uv_work_t* req),
		void  (* respond)(uv_work_t* req, int status)
		)
{
	Nan::HandleScope scope;

	// Create an async work request and prepare the command
	uv_work_t * req = new uv_work_t;
	req->data = prepare(args);

	// Pass the work request to libuv to be run when a
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
	Nan::HandleScope scope;
	uv_timer_t* timer = (uv_timer_t*) handle;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(timer->data);
	cf_free(timer);
	delete cmd;
}

void async_error_callback(uv_timer_t* timer)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(timer->data);
	const LogInfo* log = cmd->log;
	as_error* error = &cmd->err;

	const int argc = 1;
	Local<Value> argv[argc];
	argv[0] = error_to_jsobject(error, log);

	as_v8_debug(log, "Invoking JS error callback function: %d %s", error->code, error->message);
	Nan::TryCatch try_catch;
	Local<Object> target = Nan::New<Object>();
	Local<Function> callback = Nan::New(cmd->callback);
	cmd->runInAsyncScope(target, callback, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	uv_close((uv_handle_t*) timer, release_uv_timer);
}

void invoke_error_callback(AsyncCommand* cmd)
{
	Nan::HandleScope scope;
	uv_timer_t* timer = (uv_timer_t*) cf_malloc(sizeof(uv_timer_t));
	uv_timer_init(uv_default_loop(), timer);
	timer->data = cmd;
	uv_timer_start(timer, async_error_callback, 0, 0);
}

void async_record_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);
	const LogInfo* log = cmd->log;

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

	cmd->Callback(argc, argv);

	delete cmd;
}

void async_write_listener(as_error* err, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);
	const LogInfo* log = cmd->log;

	const int argc = 1;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
	} else {
		argv[0] = err_ok();
	}

	cmd->Callback(argc, argv);

	delete cmd;
}

void async_value_listener(as_error* err, as_val* value, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);
	const LogInfo* log = cmd->log;

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

	cmd->Callback(argc, argv);

	delete cmd;
}

void async_batch_listener(as_error* err, as_batch_read_records* records, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);
	const LogInfo* log = cmd->log;

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
	free_batch_records(records);

	cmd->Callback(argc, argv);

	delete cmd;
}

bool async_scan_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);
	const LogInfo* log = cmd->log;

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

	Local<Value> result = cmd->Callback(argc, argv);

	if (reached_end) {
		delete cmd;
		return false;
	}

	bool continue_scan = true;
	if (result->IsBoolean()) {
		continue_scan = result->ToBoolean()->Value();
		as_v8_debug(log, "Async scan callback returned: %s", continue_scan ? "true" : "false");
	}
	return continue_scan;
}
