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
	#include <aerospike/as_log.h>
}

#include <unistd.h>
#include <node.h>
#include "client.h"
#include "conversions.h"
#include "query.h"
#include "log.h"

/*******************************************************************************
 *  Fields
 ******************************************************************************/

/**
 *  JavaScript constructor for AerospikeClient
 */
Nan::Persistent<FunctionTemplate> AerospikeClient::constructor;

/*******************************************************************************
 *  Constructor and Destructor
 ******************************************************************************/

AerospikeClient::AerospikeClient() {}

AerospikeClient::~AerospikeClient() {}

/*******************************************************************************
 *  Methods
 ******************************************************************************/

NAN_METHOD(AerospikeClient::SetLogLevel)
{
	Nan::HandleScope();

	AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.Holder());

	if (info[0]->IsObject()){
		LogInfo * log = client->log;
		if ( log_from_jsobject(log, info[0]->ToObject()) != AS_NODE_PARAM_OK ) {
			log->severity = AS_LOG_LEVEL_INFO;
			log->fd       = 2;
		}
	}
	info.GetReturnValue().Set(info.Holder());
}


NAN_METHOD(AerospikeClient::Query)
{
	Nan::HandleScope();
	Local<Object> ns	 = info[0].As<Object>();
	Local<Object> set	 = info[1].As<Object>();
	Local<Object> config = info[2].As<Object>();
	Local<Object> client = info.This();
	info.GetReturnValue().Set(AerospikeQuery::NewInstance(ns, set, config, client));
}

/**
 *  Instantiate a new 'AerospikeClient(config)'
 *  Constructor for AerospikeClient.
 */
NAN_METHOD(AerospikeClient::New)
{
	Nan::HandleScope();

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
	if (info[0]->IsObject()) {
		int default_log_set = 0;
		if (info[0]->ToObject()->Has(Nan::New("log").ToLocalChecked())) {
			Local<Value> log_val = info[0]->ToObject()->Get(Nan::New("log").ToLocalChecked()) ;
			if (log_from_jsobject( client->log, log_val->ToObject()) == AS_NODE_PARAM_OK) {
				default_log_set = 1; // Log is passed as an argument. set the default value
			} else {
				//log info is set to default level
			}
		}
		if (default_log_set == 0) {
			log->fd = 2;
		}
	}

	if (info[0]->IsObject()) {
		int result = config_from_jsobject(&config, info[0]->ToObject(), client->log);
		if (result != AS_NODE_PARAM_OK) {
			// Throw an exception if an error happens in parsing the config object.
			Nan::ThrowError("Configuration Error while creating client object");
		}
	}

	aerospike_init(client->as, &config);
	as_v8_debug(client->log, "Aerospike object initialization : success");
	client->Wrap(info.This());
	info.GetReturnValue().Set(info.This());
}

/**
 *  Instantiate a new 'AerospikeClient(config)'
 */
Local<Value> AerospikeClient::NewInstance(Local<Object> info)
{
	Nan::EscapableHandleScope scope;
	const unsigned argc = 1;
	Handle<Value> argv[argc] = { info };
	Local<FunctionTemplate> constructorHandle = Nan::New<FunctionTemplate>(constructor);
	Local<Value> instance = constructorHandle->GetFunction()->NewInstance(argc, argv);
	return scope.Escape(instance);
}

/**
 *  Initialize a client object.
 *  This creates a constructor function, and sets up the prototype.
 */
void AerospikeClient::Init()
{
	// Prepare constructor template
	Local<FunctionTemplate> cons = Nan::New<FunctionTemplate>(AerospikeClient::New);
	cons->SetClassName(Nan::New("AerospikeClient").ToLocalChecked());

	// A client object created in node.js, holds reference to the wrapped c++
	// object using an internal field.
	// InternalFieldCount signifies the number of c++ objects the node.js object
	// will refer to when it is intiatiated in node.js
	cons->InstanceTemplate()->SetInternalFieldCount(1);

	// Prototype
	Nan::SetPrototypeMethod(cons, "hasPendingAsyncCommands", HasPendingAsyncCommands);
	Nan::SetPrototypeMethod(cons, "applyAsync", ApplyAsync);
	Nan::SetPrototypeMethod(cons, "batchGet", BatchGet);
	Nan::SetPrototypeMethod(cons, "batchExists", BatchExists);
	Nan::SetPrototypeMethod(cons, "batchSelect", BatchSelect);
	Nan::SetPrototypeMethod(cons, "batchRead", BatchReadAsync);
	Nan::SetPrototypeMethod(cons, "close", Close);
	Nan::SetPrototypeMethod(cons, "connect", Connect);
	Nan::SetPrototypeMethod(cons, "isConnected", IsConnected);
	Nan::SetPrototypeMethod(cons, "existsAsync", ExistsAsync);
	Nan::SetPrototypeMethod(cons, "getAsync", GetAsync);
	Nan::SetPrototypeMethod(cons, "info", Info);
	Nan::SetPrototypeMethod(cons, "indexCreate", IndexCreate);
	Nan::SetPrototypeMethod(cons, "indexRemove", IndexRemove);
	Nan::SetPrototypeMethod(cons, "operateAsync", OperateAsync);
	Nan::SetPrototypeMethod(cons, "putAsync", PutAsync);
	Nan::SetPrototypeMethod(cons, "query", Query);
	Nan::SetPrototypeMethod(cons, "removeAsync", RemoveAsync);
	Nan::SetPrototypeMethod(cons, "scanBackground", ScanBackground);
	Nan::SetPrototypeMethod(cons, "scanAsync", ScanAsync);
	Nan::SetPrototypeMethod(cons, "scanInfo", ScanInfo);
	Nan::SetPrototypeMethod(cons, "selectAsync", SelectAsync);
	Nan::SetPrototypeMethod(cons, "udfRegister", Register);
	Nan::SetPrototypeMethod(cons, "udfRegisterWait", RegisterWait);
	Nan::SetPrototypeMethod(cons, "udfRemove", UDFRemove);
	Nan::SetPrototypeMethod(cons, "updateLogging", SetLogLevel);
	constructor.Reset(cons);
}
