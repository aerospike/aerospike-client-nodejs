/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
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

#include "client.h"
#include "enums.h"
#include "operations.h"
#include "log.h"

extern "C" {
	#include <aerospike/as_event.h>
	#include <aerospike/as_log.h>
	#include <aerospike/as_async_proto.h>
}


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

NAN_METHOD(enable_as_logging)
{
	Nan::HandleScope();
	as_log_set_level(AS_LOG_LEVEL_TRACE);
	as_log_set_callback(v8_logging_callback);
}

NAN_METHOD(client)
{
	Nan::HandleScope();
	Local<Object> config = info[0].As<Object>();
	info.GetReturnValue().Set(AerospikeClient::NewInstance(config));
}

/**
 *  aerospike object.
 */
void Aerospike(Handle<Object> exports, Handle<Object> module)
{
	AerospikeClient::Init();
	export("client",					Nan::New<FunctionTemplate>(client)->GetFunction());
	export("enable_as_logging",			Nan::New<FunctionTemplate>(enable_as_logging)->GetFunction());
	export("get_cluster_count",			Nan::New<FunctionTemplate>(get_cluster_count)->GetFunction());
	export("register_as_event_loop",	Nan::New<FunctionTemplate>(register_as_event_loop)->GetFunction());
	export("release_as_event_loop",		Nan::New<FunctionTemplate>(release_as_event_loop)->GetFunction());

	// enumerations
	export("indexDataType",				indexDataType());
	export("indexType",					indexType());
	export("jobStatus",					jobStatus());
	export("language",					languages());
	export("maps",						map_enum_values());
	export("predicates",				predicates());
	export("scanPriority",				scanPriority());
	export("log",						log());
	export("operations",				opcode_values());
	export("policy",					policy());
	export("status",					status());
	export("ttl",						ttl_enum_values());
}

NODE_MODULE(aerospike, Aerospike)
