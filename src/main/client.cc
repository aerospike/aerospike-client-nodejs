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
    #include <aerospike/aerospike.h>
    #include <aerospike/aerospike_key.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_key.h>
    #include <aerospike/as_record.h>
}

#include <unistd.h>
#include <node.h>
#include "client.h"
#include "conversions.h"
#include "scan.h"
#include "query.h"
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
    cons->PrototypeTemplate()->Set(String::NewSymbol("batchGet"), FunctionTemplate::New(BatchGet)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("batchExists"), FunctionTemplate::New(BatchExists)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("close"), FunctionTemplate::New(Close)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("connect"), FunctionTemplate::New(Connect)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("exists"), FunctionTemplate::New(Exists)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("get"), FunctionTemplate::New(Get)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("info"), FunctionTemplate::New(Info)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("indexCreate"), FunctionTemplate::New(sindexCreate)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("indexRemove"), FunctionTemplate::New(sindexRemove)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("operate"), FunctionTemplate::New(Operate)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("put"), FunctionTemplate::New(Put)->GetFunction());
	cons->PrototypeTemplate()->Set(String::NewSymbol("query"), FunctionTemplate::New(Query)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("remove"), FunctionTemplate::New(Remove)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("select"), FunctionTemplate::New(Select)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("udfRegister"), FunctionTemplate::New(Register)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("execute"), FunctionTemplate::New(Execute)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("udfRemove"), FunctionTemplate::New(UDFRemove)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("updateLogging"), FunctionTemplate::New(SetLogLevel)->GetFunction());
    constructor = Persistent<Function>::New(NODE_ISOLATE_PRE cons->GetFunction());
}

/**
 *  Instantiate a new 'Aerospike(config)'
 */
Handle<Value> AerospikeClient::New(const Arguments& args)
{
    NODE_ISOLATE_DECL;
    HANDLESCOPE;

    AerospikeClient * client = new AerospikeClient();
    client->as = (aerospike*) cf_malloc(sizeof(aerospike));
    client->log = (LogInfo*) cf_malloc(sizeof(LogInfo));

	// initialize the log to default values.
    LogInfo * log = client->log;
    log->fd = 2;
    log->severity = AS_LOG_LEVEL_INFO;

	// initialize the config to default values.
    as_config config;
    as_config_init(&config);

    // Assume by default log is not set
    if(args[0]->IsObject()) {
        int default_log_set = 0;
        if (args[0]->ToObject()->Has(String::NewSymbol("log")))  
        {
            Local<Value> log_val = args[0]->ToObject()->Get(String::NewSymbol("log")) ;
            if (log_from_jsobject( client->log, log_val->ToObject()) == AS_NODE_PARAM_OK) {
                default_log_set = 1; // Log is passed as an argument. set the default value	
            } else {
                //log info is set to default level
            }
        } 
        if ( default_log_set == 0 ) {
			LogInfo * log = client->log;
			log->fd = 2;
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
    HANDLESCOPE;

    const unsigned argc = 1;

    Handle<Value> argv[argc] = { args[0] };

    Local<Object> instance = constructor->NewInstance(argc, argv);

    return scope.Close(instance);
}


Handle<Value> AerospikeClient::SetLogLevel(const Arguments& args)
{
    HANDLESCOPE;

    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());

    if (args[0]->IsObject()){
        LogInfo * log = client->log;
        if ( log_from_jsobject(log, args[0]->ToObject()) != AS_NODE_PARAM_OK ) {
            log->severity = AS_LOG_LEVEL_INFO;
            log->fd       = 2;
        }
    }
    return scope.Close(client->handle_);
}

Handle<Value> AerospikeClient::Scan(const Arguments& args)
{
	HANDLESCOPE;

	AerospikeScan::Init();
	return scope.Close(AerospikeScan::NewInstance(args));
}

Handle<Value> AerospikeClient::Query(const Arguments& args)
{
	HANDLESCOPE;

	AerospikeQuery::Init();
	return scope.Close(AerospikeQuery::NewInstance(args));
}

