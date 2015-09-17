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

#include <node.h>
#include <nan.h>
#include "client.h"
#include "enums.h"
using namespace v8;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

NAN_METHOD(client)
{
    Nan::HandleScope scope;
	Local<Object> config = info[0].As<Object>();
    info.GetReturnValue().Set(AerospikeClient::NewInstance(config));
}

/**
 *  Aerospike key.
 *
 *      aerospike.key(namespace, set, value);
 *
 */
NAN_METHOD(key)
{
    Nan::HandleScope scope;

    if ( info.Length() == 3 ) {
        Local<Object> key = Nan::New<Object>();
        key->Set(Nan::New("ns").ToLocalChecked(), info[0]);
        key->Set(Nan::New("set").ToLocalChecked(), info[1]);
        key->Set(Nan::New("key").ToLocalChecked(), info[2]);
        info.GetReturnValue().Set(key);
    }
}

/**
 *  aerospike object.
 */
void Aerospike(Handle<Object> exports, Handle<Object> module)
{
    AerospikeClient::Init();
    AerospikeQuery::Init(); 
    exports->Set(Nan::New("client").ToLocalChecked(),   Nan::New<FunctionTemplate>(client)->GetFunction());
    exports->Set(Nan::New("key").ToLocalChecked(),      Nan::New<FunctionTemplate>(key)->GetFunction());
    exports->Set(Nan::New("status").ToLocalChecked(),   status());
    exports->Set(Nan::New("policy").ToLocalChecked(),   policy());
    exports->Set(Nan::New("operations").ToLocalChecked(), operations());
	exports->Set(Nan::New("language").ToLocalChecked(), languages()); 
    exports->Set(Nan::New("log").ToLocalChecked(),      log());
	exports->Set(Nan::New("scanPriority").ToLocalChecked(), scanPriority());
	exports->Set(Nan::New("scanStatus").ToLocalChecked(), scanStatus());
	exports->Set(Nan::New("predicates").ToLocalChecked(),	predicates());
	exports->Set(Nan::New("indexType").ToLocalChecked(),indexType());
}

NODE_MODULE(aerospike, Aerospike)
