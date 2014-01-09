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
    cons->PrototypeTemplate()->Set(String::NewSymbol("connect"), FunctionTemplate::New(Connect)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("close"), FunctionTemplate::New(Close)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("get"), FunctionTemplate::New(Get)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("exists"), FunctionTemplate::New(Exists)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("put"), FunctionTemplate::New(Put)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("select"), FunctionTemplate::New(Select)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("batch_get"), FunctionTemplate::New(Batch_Get)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("batch_exists"), FunctionTemplate::New(Batch_Exists)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("remove"), FunctionTemplate::New(Remove)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("operate"), FunctionTemplate::New(Operate)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("info"), FunctionTemplate::New(Info)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("set_log_level"), FunctionTemplate::New(SetLogLevel)->GetFunction());
    constructor = Persistent<Function>::New(cons->GetFunction());
}

/**
 *  Instantiate a new 'Aerospike(config)'
 */
Handle<Value> AerospikeClient::New(const Arguments& args)
{
    HandleScope scope;

    AerospikeClient * client = new AerospikeClient();
    client->as = (aerospike*) malloc(sizeof(aerospike));
    client->log = (LogInfo*) malloc(sizeof(LogInfo));

    as_config config;
    as_config_init(&config);

    // Assume by default log is not set
    int  default_log_set = 0;
    if(args[0]->IsObject()) {
        if (args[0]->ToObject()->Has(String::NewSymbol("log")))  
        {
            Local<Value> log_val = args[0]->ToObject()->Get(String::NewSymbol("log")) ;
            if (log_from_jsobject( client->log, log_val->ToObject()) == AS_NODE_PARAM_OK) {
                default_log_set = 1; // Log is passed as an argument. set the default value	
            }
        } 
        if ( default_log_set == 0 ) {
            LogInfo * log = client->log;
            log->fd = 2;
            log->severity = AS_LOG_LEVEL_INFO;
        }

    }
    if (args[0]->IsObject() ) {
        config_from_jsobject(&config, args[0]->ToObject(), client->log);   
    }

    aerospike_init(client->as, &config);

    as_v8_debug(client->log, "Aerospike object initialization : success");

    client->Wrap(args.This());

    return scope.Close(args.This());
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


Handle<Value> AerospikeClient::SetLogLevel(const Arguments& args)
{
    HandleScope scope;
    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());

    if (args[0]->IsObject()){
        LogInfo * log = client->log;
        if ( log_from_jsobject(log, args[0]->ToObject()) != AS_NODE_PARAM_OK) {
            log->severity = AS_LOG_LEVEL_INFO;
            log->fd       = 2;
        }
    }
    return scope.Close(client->handle_);
}
