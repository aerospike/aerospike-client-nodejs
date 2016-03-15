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

extern "C" {
	#include <aerospike/as_event.h>
	#include <aerospike/as_log.h>
}

#include <uv.h>
#include <unistd.h>
#include "client.h"
#include "enums.h"
#include "log.h"

using namespace v8;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

NAN_METHOD(register_as_event_loop)
{
    Nan::HandleScope();
	if (!as_event_set_external_loop_capacity(1)) {
		return Nan::ThrowError("unable to register default event loop");
	}
	as_event_set_external_loop(uv_default_loop());
}

NAN_METHOD(deregister_as_event_loop)
{
    Nan::HandleScope();
	as_event_close_loops();
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
    AerospikeQuery::Init();
    exports->Set(Nan::New("register_as_event_loop").ToLocalChecked(), Nan::New<FunctionTemplate>(register_as_event_loop)->GetFunction());
    exports->Set(Nan::New("deregister_as_event_loop").ToLocalChecked(), Nan::New<FunctionTemplate>(deregister_as_event_loop)->GetFunction());
    exports->Set(Nan::New("enable_as_logging").ToLocalChecked(), Nan::New<FunctionTemplate>(enable_as_logging)->GetFunction());
    exports->Set(Nan::New("client").ToLocalChecked(),   Nan::New<FunctionTemplate>(client)->GetFunction());
    exports->Set(Nan::New("status").ToLocalChecked(),   status());
    exports->Set(Nan::New("policy").ToLocalChecked(),   policy());
    exports->Set(Nan::New("operations").ToLocalChecked(), operations());
    exports->Set(Nan::New("cdt_operations").ToLocalChecked(), cdt_operations());
	exports->Set(Nan::New("language").ToLocalChecked(), languages());
    exports->Set(Nan::New("log").ToLocalChecked(),      log());
	exports->Set(Nan::New("scanPriority").ToLocalChecked(), scanPriority());
	exports->Set(Nan::New("scanStatus").ToLocalChecked(), scanStatus());
	exports->Set(Nan::New("predicates").ToLocalChecked(), predicates());
	exports->Set(Nan::New("indexType").ToLocalChecked(), indexType());
}

NODE_MODULE(aerospike, Aerospike)
