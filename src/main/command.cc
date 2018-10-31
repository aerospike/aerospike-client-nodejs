/*******************************************************************************
 * Copyright 2018 Aerospike, Inc.
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

#include <string>

#include "command.h"
#include "conversions.h"
#include "log.h"

extern "C" {
#include <aerospike/as_error.h>
}

using namespace v8;

AerospikeCommand*
AerospikeCommand::SetError(as_status code, const char* func, const char* file,
		uint32_t line, const char* fmt, ...)
{
	va_list args;
	va_start(args, fmt);
	as_error_setallv(&err, code, func, file, line, fmt, args);
	va_end(args);
	return this;
}

bool
AerospikeCommand::IsError()
{
	return err.code != AEROSPIKE_OK;
}

bool
AerospikeCommand::CanExecute()
{
	if (IsError()) {
		as_v8_info(log, "Skipping execution of %s command because an error occurred", cmd.c_str());
		return false;
	}

	if (as->cluster == NULL) {
		as_v8_info(log, "Skipping execution of %s command because client is invalid", cmd.c_str());
		return false;
	}

	return true;
}

Local<Value>
AerospikeCommand::Callback(const int argc, Local<Value> argv[])
{
	Nan::EscapableHandleScope scope;
	as_v8_debug(log, "Executing JS callback for %s command", cmd.c_str());

	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New(callback);
	Local<Value> result = runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv).ToLocalChecked();
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	return scope.Escape(result);
}

Local<Value>
AerospikeCommand::ErrorCallback()
{
	Nan::EscapableHandleScope scope;

	if (err.code <= AEROSPIKE_ERR_CLIENT) {
		as_v8_error(log, "Client error in %s command: %s [%d]", cmd.c_str(), err.message, err.code);
	} else {
		as_v8_debug(log, "Server error in %s command: %s [%d]", cmd.c_str(), err.message, err.code);
	}

	Local<Value> args[] = { error_to_jsobject(&err, log) };
	return scope.Escape(Callback(1, args));
}

Local<Value>
AerospikeCommand::ErrorCallback(as_error* error)
{
	Nan::EscapableHandleScope scope;

	as_error_copy(&err, error);

	return scope.Escape(ErrorCallback());
}

Local<Value>
AerospikeCommand::ErrorCallback(as_status code, const char* func, const char* file,
		uint32_t line, const char* fmt, ...)
{
	Nan::EscapableHandleScope scope;

	va_list args;
	va_start(args, fmt);
	as_error_setallv(&err, code, func, file, line, fmt, args);
	va_end(args);

	return scope.Escape(ErrorCallback());
}
