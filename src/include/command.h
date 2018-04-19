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

#include <string>
#include "log.h"

class AerospikeCommand : public Nan::AsyncResource {
	public:
		AerospikeCommand(std::string name, AerospikeClient* client, v8::Local<v8::Function> callback_)
			: Nan::AsyncResource(("aerospike:" + name + "Command").c_str())
			, cmd(name)
			, as(client->as)
			, log(client->log) {
				as_error_init(&err);
				callback.Reset(callback_);
				as_v8_detail(log, "Initialized %s command", cmd.c_str());
			}

		~AerospikeCommand() {
			Nan::HandleScope scope;
			callback.Reset();
		}

		AerospikeCommand* SetError(as_status code, const char* fmt, ...) {
			char msg[1024];
			va_list args;
			va_start(args, fmt);
			vsnprintf(msg, 1024, fmt, args);
			as_v8_error(log, "Error in %s command: %s", cmd.c_str(), msg);
			as_error_set_message(&err, code, msg);
			va_end(args);
			return this;
		}

		bool IsError() {
			return err.code != AEROSPIKE_OK;
		}

		bool CanExecute() {
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

		void Callback(const int argc, v8::Local<v8::Value> argv[]) {
			Nan::HandleScope scope;
			as_v8_debug(log, "Executing JS callback for %s command", cmd.c_str());
			Nan::TryCatch try_catch;
			v8::Local<v8::Object> target = Nan::New<v8::Object>();
			v8::Local<v8::Function> cb = Nan::New<v8::Function>(callback);
			runInAsyncScope(target, cb, argc, argv);
			if (try_catch.HasCaught()) {
				Nan::FatalException(try_catch);
			}
		}

		std::string cmd;
		aerospike* as;
		as_error err;
		LogInfo* log;
		Nan::Persistent<v8::Function> callback;
};
