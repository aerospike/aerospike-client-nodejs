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

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/aerospike_key.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_key.h>
    #include <aerospike/as_record.h>
}

#include <node.h>
#include "client.h"
#include "util/conversions.h"
using namespace v8;

/*******************************************************************************
 *  Fields
 ******************************************************************************/

/**
 *  JavaScript constructor for AerospikeClient
 */
Persistent<Function> AerospikeClient::constructor;

/*******************************************************************************
 *  Constructor and Destructor
 ******************************************************************************/

AerospikeClient::AerospikeClient() {}

AerospikeClient::~AerospikeClient() {}

/*******************************************************************************
 *  Methods
 ******************************************************************************/

/**
 *  Initialize a client object. 
 *  This creates a constructor function, and sets up the prototype.
 */
void AerospikeClient::Init()
{  
    // Prepare constructor template
    Local<FunctionTemplate> cons = FunctionTemplate::New(New);
    cons->SetClassName(String::NewSymbol("AerospikeClient"));
    cons->InstanceTemplate()->SetInternalFieldCount(1);

    // Prototype
    cons->PrototypeTemplate()->Set(String::NewSymbol("close"), FunctionTemplate::New(Close)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("get"), FunctionTemplate::New(Get)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("put"), FunctionTemplate::New(Put)->GetFunction());
	cons->PrototypeTemplate()->Set(String::NewSymbol("select"), FunctionTemplate::New(Select)->GetFunction());
	cons->PrototypeTemplate()->Set(String::NewSymbol("batch_get"), FunctionTemplate::New(Batch_Get)->GetFunction());
	cons->PrototypeTemplate()->Set(String::NewSymbol("remove"), FunctionTemplate::New(Remove)->GetFunction());

    constructor = Persistent<Function>::New(cons->GetFunction());
}

/**
 *  Instantiate a new 'Aerospike(config)'
 */
Handle<Value> AerospikeClient::New(const Arguments& args)
{
    HandleScope scope;

    as_config config;
    as_config_init(&config);

	if (args[0]->IsObject() ) {
		config_from_jsobject(&config, args[0]->ToObject());	
	}


    AerospikeClient * client = new AerospikeClient();

    aerospike_init(&client->as, &config);

    as_error err;
    
    aerospike_connect(&client->as, &err);

	if (err.code != AEROSPIKE_OK) {
		client->as.cluster = NULL;
	}
    client->Wrap(args.This());

    return args.This();
}

/**
 *  Instantiate a new 'Aerospike(config)'
 */
Handle<Value> AerospikeClient::NewInstance(const Arguments& args)
{
    HandleScope scope;

  const unsigned argc = 1;

  Handle<Value> argv[argc] = { args[0] };
  
  Local<Object> instance = constructor->NewInstance(argc, argv);

  return scope.Close(instance);
}

