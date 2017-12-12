/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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
#include <aerospike/as_event.h>
#include <aerospike/as_log.h>
#include <aerospike/as_async_proto.h>
}

#include "client.h"
#include "enums.h"
#include "operations.h"
#include "log.h"
#include "conversions.h"

#define export(__name, __value) exports->Set(Nan::New(__name).ToLocalChecked(), __value)

using namespace v8;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

NAN_METHOD(register_as_event_loop)
{
	Nan::HandleScope();
	if (!as_event_set_external_loop_capacity(1)) {
		return Nan::ThrowError("Unable to register default event loop");
	}
	as_event_set_external_loop(uv_default_loop());
	uv_update_time(uv_default_loop());
}

NAN_METHOD(release_as_event_loop)
{
	Nan::HandleScope();
	as_event_close_loops();
}

NAN_METHOD(get_cluster_count)
{
	Nan::HandleScope();
	uint32_t count = as_async_get_cluster_count();
	info.GetReturnValue().Set(Nan::New(count));
}

NAN_METHOD(setDefaultLogging)
{
	Nan::HandleScope();
	if (info[0]->IsObject()){
		if (log_from_jsobject(&g_log_info, info[0]->ToObject()) == AS_NODE_PARAM_OK) {
			if (g_log_info.level < 0) {
				// common logging does not support log level "OFF"
				as_log_set_level(AS_LOG_LEVEL_ERROR);
				as_log_set_callback(NULL);
			} else {
				as_log_set_level(g_log_info.level);
				as_log_set_callback(as_log_callback_fnct);
			}
		}
	}
}

NAN_METHOD(client)
{
	Nan::HandleScope();
	Local<Object> config = info[0].As<Object>();
	Local<Function> eventCb = info[1].As<Function>();
	info.GetReturnValue().Set(AerospikeClient::NewInstance(config, eventCb));
}

/**
 *  aerospike object.
 */
void Aerospike(Handle<Object> exports, Handle<Object> module)
{
	AerospikeClient::Init();
	export("client", Nan::New<FunctionTemplate>(client)->GetFunction());
	export("get_cluster_count", Nan::New<FunctionTemplate>(get_cluster_count)->GetFunction());
	export("register_as_event_loop", Nan::New<FunctionTemplate>(register_as_event_loop)->GetFunction());
	export("release_as_event_loop", Nan::New<FunctionTemplate>(release_as_event_loop)->GetFunction());
	export("setDefaultLogging", Nan::New<FunctionTemplate>(setDefaultLogging)->GetFunction());

	// enumerations
	export("indexDataType", indexDataType());
	export("indexType", indexType());
	export("jobStatus", jobStatus());
	export("language", languages());
	export("maps", map_enum_values());
	export("predicates", predicates());
	export("scanPriority", scanPriority());
	export("log", log());
	export("operations", opcode_values());
	export("policy", policy());
	export("status", status());
	export("ttl", ttl_enum_values());
}

NODE_MODULE(aerospike, Aerospike)
