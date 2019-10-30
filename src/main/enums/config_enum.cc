/*******************************************************************************
 * Copyright 2013-2019 Aerospike, Inc.
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

#include <node.h>
#include <nan.h>

extern "C" {
#include <aerospike/as_config.h>
#include <aerospike/as_log.h>
}

using namespace v8;

#define set(__obj, __name, __value) Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> log_enum_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "OFF", -1);
	set(obj, "ERROR", AS_LOG_LEVEL_ERROR);
	set(obj, "WARN", AS_LOG_LEVEL_WARN);
	set(obj, "INFO", AS_LOG_LEVEL_INFO);
	set(obj, "DEBUG", AS_LOG_LEVEL_DEBUG);
	set(obj, "TRACE", AS_LOG_LEVEL_TRACE);
	set(obj, "DETAIL", AS_LOG_LEVEL_TRACE); // renamed in v3.4 - keep old name for backwards compatibility
	return scope.Escape(obj);
}

Local<Object> auth_mode_enum_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "INTERNAL", AS_AUTH_INTERNAL);
	set(obj, "EXTERNAL", AS_AUTH_EXTERNAL);
	set(obj, "EXTERNAL_INSECURE", AS_AUTH_EXTERNAL_INSECURE);
	return scope.Escape(obj);
}
