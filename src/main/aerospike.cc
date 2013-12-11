/*******************************************************************************
 * Copyright 2013 Aerospike Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 ******************************************************************************/

#include <node.h>
#include "client.h"
#include "./enums/enums.h"
using namespace v8;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

/**
 *	Connect to an aerospike cluster specified by the config.
 *
 *		aerospike.connect(config);
 *
 */
/*Handle<Value> Connect(const Arguments& args)
{
	HandleScope scope;
	return scope.Close(AerospikeClient::NewInstance(args));
}*/

Handle<Value> Client(const Arguments& args)
{
	HandleScope scope;
	return scope.Close(AerospikeClient::NewInstance(args));
}
/**
 *	Aerospike key.
 *
 *		aerospike.key(namespace, set, value);
 *
 */
Handle<Value> Key(const Arguments& args)
{
	HandleScope scope;

	if ( args.Length() == 3 ) {
		Local<Object> key = Object::New();
		key->Set(String::NewSymbol("ns"), args[0]);
		key->Set(String::NewSymbol("set"), args[1]);
		key->Set(String::NewSymbol("value"), args[2]);
		return scope.Close(key);
	}

	return scope.Close(Undefined());
}

Handle<Object> GetAllPolicy() {
	HandleScope scope;
	Handle<Object> obj = Object::New();

	obj->Set(String::NewSymbol("Key"), keyPolicy());
	obj->Set(String::NewSymbol("Retry"), retryPolicy());
	obj->Set(String::NewSymbol("Generation"), generationPolicy());
	obj->Set(String::NewSymbol("Exists"), existsPolicy());

	return scope.Close(obj);
}

/**
 *	aerospike object.
 */
void Aerospike(Handle<Object> exports, Handle<Object> module)
{
	AerospikeClient::Init();

	exports->Set(String::NewSymbol("client"), FunctionTemplate::New(Client)->GetFunction());
	exports->Set(String::NewSymbol("key"), FunctionTemplate::New(Key)->GetFunction());
	exports->Set(String::NewSymbol("Status"), errorCodes());
	exports->Set(String::NewSymbol("Policy"),GetAllPolicy());
	exports->Set(String::NewSymbol("Operators"), operatorsEnum());
	exports->Set(String::NewSymbol("Log"), logLevel());
}

NODE_MODULE(aerospike, Aerospike)
