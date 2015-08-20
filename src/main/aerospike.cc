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
	NanScope();
	Local<Object> config = args[0].As<Object>();
    NanReturnValue(AerospikeClient::NewInstance(config));
}

/**
 *  Aerospike key.
 *
 *      aerospike.key(namespace, set, value);
 *
 */
NAN_METHOD(key)
{
	NanScope();

    if ( args.Length() == 3 ) {
        Local<Object> key = NanNew<Object>();
        key->Set(NanNew("ns"), args[0]);
        key->Set(NanNew("set"), args[1]);
        key->Set(NanNew("key"), args[2]);
        NanReturnValue((key));
    }

    NanReturnUndefined();
}

/**
 *  aerospike object.
 */
void Aerospike(Handle<Object> exports, Handle<Object> module)
{
    AerospikeClient::Init();
    AerospikeQuery::Init(); 
    exports->Set(NanNew("client"),   NanNew<FunctionTemplate>(client)->GetFunction());
    exports->Set(NanNew("key"),      NanNew<FunctionTemplate>(key)->GetFunction());
    exports->Set(NanNew("status"),   status());
    exports->Set(NanNew("policy"),   policy());
    exports->Set(NanNew("operations"), operations());
	exports->Set(NanNew("language"), languages()); 
    exports->Set(NanNew("log"),      log());
	exports->Set(NanNew("scanPriority"), scanPriority());
	exports->Set(NanNew("scanStatus"), scanStatus());
	exports->Set(NanNew("predicates"),	predicates());
	exports->Set(NanNew("indexType"),indexType());
}

NODE_MODULE(aerospike, Aerospike)
