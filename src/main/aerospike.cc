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
#include "client.h"
#include "enums.h"
using namespace v8;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

Handle<Value> client(const Arguments& args)
{
    NODE_ISOLATE_DECL;
    HANDLESCOPE;
    return scope.Close(AerospikeClient::NewInstance(args));
}

/**
 *  Aerospike key.
 *
 *      aerospike.key(namespace, set, value);
 *
 */
Handle<Value> key(const Arguments& args)
{
    NODE_ISOLATE; 
    HANDLESCOPE;

    if ( args.Length() == 3 ) {
        Local<Object> key = Object::New();
        key->Set(String::NewSymbol("ns"), args[0]);
        key->Set(String::NewSymbol("set"), args[1]);
        key->Set(String::NewSymbol("key"), args[2]);
        return scope.Close(key);
    }

    return scope.Close(Undefined());
}

/**
 *  aerospike object.
 */
void Aerospike(Handle<Object> exports, Handle<Object> module)
{
    AerospikeClient::Init();
    
    exports->Set(String::NewSymbol("client"),   FunctionTemplate::New(client)->GetFunction());
    exports->Set(String::NewSymbol("key"),      FunctionTemplate::New(key)->GetFunction());
    exports->Set(String::NewSymbol("status"),   status());
    exports->Set(String::NewSymbol("policy"),   policy());
    exports->Set(String::NewSymbol("operator"), operators());
	exports->Set(String::NewSymbol("language"), languages()); 
    exports->Set(String::NewSymbol("log"),      log());
	exports->Set(String::NewSymbol("scanPriority"), scanPriority());
	exports->Set(String::NewSymbol("scanStatus"), scanStatus());
	exports->Set(String::NewSymbol("filter"),	filter());
	exports->Set(String::NewSymbol("indexType"),indexType());
	exports->Set(String::NewSymbol("queryType"),queryType());
}

NODE_MODULE(aerospike, Aerospike)
