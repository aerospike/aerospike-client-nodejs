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
#include "query.h"
using namespace v8;

/*******************************************************************************
 *  Fields
 ******************************************************************************/

/**
 *  JavaScript constructor for AerospikeClient
 */
Persistent<FunctionTemplate> AerospikeClient::constructor;

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
    Local<FunctionTemplate> cons = NanNew<FunctionTemplate>(AerospikeClient::New);
    cons->SetClassName(NanNew("AerospikeClient"));
    cons->InstanceTemplate()->SetInternalFieldCount(1);

    // Prototype
	NODE_SET_PROTOTYPE_METHOD(cons, "batchGet", BatchGet);
	NODE_SET_PROTOTYPE_METHOD(cons, "batchExists", BatchExists);
	NODE_SET_PROTOTYPE_METHOD(cons, "batchSelect", BatchSelect);
	NODE_SET_PROTOTYPE_METHOD(cons, "close", Close);
	NODE_SET_PROTOTYPE_METHOD(cons, "connect", Connect);
	NODE_SET_PROTOTYPE_METHOD(cons, "exists", Exists);
	NODE_SET_PROTOTYPE_METHOD(cons, "get", Get);
	NODE_SET_PROTOTYPE_METHOD(cons, "info", Info);
	NODE_SET_PROTOTYPE_METHOD(cons, "indexCreate", sindexCreate);
	NODE_SET_PROTOTYPE_METHOD(cons, "indexRemove", sindexRemove);
	NODE_SET_PROTOTYPE_METHOD(cons, "operate", Operate);
	NODE_SET_PROTOTYPE_METHOD(cons, "put", Put);
	NODE_SET_PROTOTYPE_METHOD(cons, "query", Query);
	NODE_SET_PROTOTYPE_METHOD(cons, "remove", Remove);
	NODE_SET_PROTOTYPE_METHOD(cons, "select", Select);
	NODE_SET_PROTOTYPE_METHOD(cons, "udfRegister", Register);
	NODE_SET_PROTOTYPE_METHOD(cons, "execute", Execute);
	NODE_SET_PROTOTYPE_METHOD(cons, "udfRemove", UDFRemove);
	NODE_SET_PROTOTYPE_METHOD(cons, "updateLogging", SetLogLevel);
	NanAssignPersistent(constructor, cons);
}

/**
 *  Instantiate a new 'Aerospike(config)'
 */
NAN_METHOD(AerospikeClient::New)
{
	NanScope();

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
        if (args[0]->ToObject()->Has(NanNew("log")))  
        {
            Local<Value> log_val = args[0]->ToObject()->Get(NanNew("log")) ;
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
        int result = config_from_jsobject(&config, args[0]->ToObject(), client->log);   
		if( result != AS_NODE_PARAM_OK)
		{
			// Throw an exception if an error happens in parsing the config object.
			return NanThrowError(NanNew("Configuration Error while creating client object"));
		}
	}

    aerospike_init(client->as, &config);

    as_v8_debug(client->log, "Aerospike object initialization : success");

    client->Wrap(args.This());

    NanReturnValue(args.This());
}

/**
 *  Instantiate a new 'Aerospike(config)'
 */
Handle<Value> AerospikeClient::NewInstance(Local<Object> args)
{
    NanEscapableScope();

    const unsigned argc = 1;

    Handle<Value> argv[argc] = { args };

	Local<FunctionTemplate> constructorHandle = NanNew<FunctionTemplate>(constructor);

    Local<Value> instance = constructorHandle->GetFunction()->NewInstance(argc, argv);

	return NanEscapeScope(instance);
}


NAN_METHOD(AerospikeClient::SetLogLevel)
{
    NanScope();

    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.Holder());

    if (args[0]->IsObject()){
        LogInfo * log = client->log;
        if ( log_from_jsobject(log, args[0]->ToObject()) != AS_NODE_PARAM_OK ) {
            log->severity = AS_LOG_LEVEL_INFO;
            log->fd       = 2;
        }
    }
    
	NanReturnValue(args.Holder());
}


NAN_METHOD(AerospikeClient::Query)
{
	NanScope();

	AerospikeQuery::Init();
	Local<Object> ns	 = args[0].As<Object>();
	Local<Object> set	 = args[1].As<Object>();
	Local<Object> client = args.This();
	NanReturnValue(AerospikeQuery::NewInstance(ns, set, client));
}

