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

#include "async_listener.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

Local<Object> err(int code, const char* message)
{
	Nan::EscapableHandleScope scope;
	Local<Object> err = Nan::New<Object>();
	err->Set(Nan::New("code").ToLocalChecked(), Nan::New(code));
	err->Set(Nan::New("message").ToLocalChecked(), Nan::New(message).ToLocalChecked());
	return scope.Escape(err);
}

Local<Object> err_ok()
{
	Nan::EscapableHandleScope scope;
	Local<Object> err = Nan::New<Object>();
	err->Set(Nan::New("code").ToLocalChecked(), Nan::New(AEROSPIKE_OK));
	return scope.Escape(err);
}

void invoke_error_callback(int code, const char* message, CallbackData* data)
{
	AerospikeClient * client = data->client;
	LogInfo * log = client->log;

	const int argc = 1;
	Local<Value> argv[argc];
	argv[0] = err(code, message);

	as_v8_debug(log, "Invoking JS error callback function: %d %s\n", code, message);
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	delete data;
}

void async_record_listener(as_error* err, as_record* record, void* udata, as_event_loop* event_loop)
{
	Nan::HandleScope scope;

	CallbackData * data = reinterpret_cast<CallbackData *>(udata);
	if (!data) {
		return Nan::ThrowError("Missing callback data - cannot process record callback");
	}

	AerospikeClient * client = data->client;
	LogInfo * log = client->log;

	const int argc = 3;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s\n", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
		argv[1] = Nan::Null();
		argv[2] = Nan::Null();
	} else {
		argv[0] = err_ok();
		argv[1] = recordbins_to_jsobject(record, log);
		argv[2] = recordmeta_to_jsobject(record, log);
	}

	as_v8_debug(log, "Invoking JS callback function\n");
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

	AerospikeClient * client = data->client;
	LogInfo * log = client->log;

	const int argc = 1;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s\n", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
	} else {
		argv[0] = err_ok();
	}

	as_v8_debug(log, "Invoking JS callback function\n");
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

	AerospikeClient * client = data->client;
	LogInfo * log = client->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s\n", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
		argv[1] = Nan::Null();
	} else {
		argv[0] = err_ok();
		argv[1] = val_to_jsvalue(value, log);
	}

	as_v8_debug(log, "Invoking JS callback function\n");
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

	AerospikeClient * client = data->client;
	LogInfo * log = client->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s\n", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
		argv[1] = Nan::Null();
	} else {
		argv[0] = err_ok();
		argv[1] = batch_records_to_jsarray(records, log);
	}
	as_batch_read_destroy(records);

	as_v8_debug(log, "Invoking JS callback function\n");
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

	AerospikeClient * client = data->client;
	LogInfo * log = client->log;

	const int argc = 3;
	bool reached_end = false;
	Local<Value> argv[argc];
	if (err) {
		as_v8_debug(log, "Command failed: %d %s\n", err->code, err->message);
		argv[0] = error_to_jsobject(err, log);
		argv[1] = Nan::Null();
		argv[2] = Nan::Null();
	} else if (record) {
		argv[0] = err_ok();
		argv[1] = recordbins_to_jsobject(record, log);
		argv[2] = recordmeta_to_jsobject(record, log);
	} else {
		reached_end = true;
		argv[0] = err_ok();
		argv[1] = Nan::Null();
		argv[2] = Nan::Null();
	}

	as_v8_debug(log, "Invoking JS callback function\n");
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
			as_v8_debug(log, "Async scan callback returned: %s\n", continue_scan ? "true" : "false");
		}
		return continue_scan;
	}
}
