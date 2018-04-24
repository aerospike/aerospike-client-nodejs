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

#pragma once

#include "client.h"
#include "log.h"

#define CmdSetError(__cmd, __code, __fmt, ...) \
	__cmd->SetError(__code, __func__, __FILE__, __LINE__, __fmt, ##__VA_ARGS__);
#define CmdErrorCallback(__cmd, __code, __fmt, ...) \
	__cmd->ErrorCallback(__code, __func__, __FILE__, __LINE__, __fmt, ##__VA_ARGS__);

class AerospikeCommand : public Nan::AsyncResource {
	public:
		AerospikeCommand(std::string name, AerospikeClient* client, v8::Local<v8::Function> callback_)
			: Nan::AsyncResource(("aerospike:" + name + "Command").c_str())
			, as(client->as)
			, log(client->log)
			, cmd(name) {
				as_error_init(&err);
				callback.Reset(callback_);
			}

		~AerospikeCommand() {
			Nan::HandleScope scope;
			callback.Reset();
		}

		AerospikeCommand* SetError(as_status code, const char* func, const char* file, uint32_t line, const char* fmt, ...);
		bool IsError();
		bool CanExecute();

		v8::Local<v8::Value> Callback(const int argc, v8::Local<v8::Value> argv[]);
		v8::Local<v8::Value> ErrorCallback();
		v8::Local<v8::Value> ErrorCallback(as_error* err);
		v8::Local<v8::Value> ErrorCallback(as_status code, const char* func, const char* file, uint32_t line, const char* fmt, ...);

		aerospike* as;
		as_error err;
		LogInfo* log;

	private:
		std::string cmd;
		Nan::Persistent<v8::Function> callback;
};

class AsyncCommand : public AerospikeCommand {
	public:
		AsyncCommand(std::string name, AerospikeClient* client, v8::Local<v8::Function> callback)
			: AerospikeCommand(name, client, callback) {}
};
