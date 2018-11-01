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

void async_record_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);

	if (err) {
		cmd->ErrorCallback(err);
	} else {
		Local<Value> argv[] = {
			Nan::Null(),
			recordbins_to_jsobject(record, cmd->log),
			recordmeta_to_jsobject(record, cmd->log)
		};
		cmd->Callback(3, argv);
	}

	delete cmd;
}

void async_write_listener(as_error* err, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);

	if (err) {
		cmd->ErrorCallback(err);
	} else {
		cmd->Callback(0, {});
	}

	delete cmd;
}

void async_value_listener(as_error* err, as_val* value, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);

	if (err) {
		cmd->ErrorCallback(err);
	} else {
		Local<Value> argv[] = {
			Nan::Null(),
			val_to_jsvalue(value, cmd->log)
		};
		cmd->Callback(2, argv);
	}

	delete cmd;
}

void async_batch_listener(as_error* err, as_batch_read_records* records, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);

	if (err) {
		cmd->ErrorCallback(err);
	} else {
		Local<Value> argv[] {
			Nan::Null(),
			batch_records_to_jsarray(records, cmd->log)
		};
		cmd->Callback(2, argv);
	}

	free_batch_records(records);
	delete cmd;
}

bool async_scan_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand* cmd = reinterpret_cast<AsyncCommand*>(udata);
	const LogInfo* log = cmd->log;

	Local<Value> result;
	if (err) {
		result = cmd->ErrorCallback(err);
	} else if (record) {
		Local<Value> argv[] = {
			Nan::Null(),
			recordbins_to_jsobject(record, cmd->log),
			recordmeta_to_jsobject(record, cmd->log),
			key_to_jsobject(&record->key, cmd->log)
		};
		result = cmd->Callback(4, argv);
	} else {
		cmd->Callback(0, {});
		delete cmd;
		return false;
	}

	bool continue_scan = true;
	if (result->IsBoolean()) {
		continue_scan = Nan::To<bool>(result).FromJust();
		as_v8_debug(log, "Async scan callback returned: %s", continue_scan ? "true" : "false");
	}
	return continue_scan;
}
