/*******************************************************************************
 * Copyright 2013-2016 Aerospike, Inc.
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
#include "log.h"


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
			if (log_from_jsobject(client->log, log_val->ToObject()) == AS_NODE_PARAM_OK) {
				default_log_set = 1; // Log is passed as an argument; set the default value.
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
			Nan::ThrowError("Invalid client configuration");
		}
	}

	aerospike_init(client->as, &config);
	as_v8_debug(client->log, "Aerospike client initialized successfully");
	client->Wrap(info.This());
	info.GetReturnValue().Set(info.This());
}

/**
 *  Instantiate a new 'AerospikeClient(config)'
 */
Local<Value> AerospikeClient::NewInstance(Local<Object> info)
{
	Nan::EscapableHandleScope scope;
	const int argc = 1;
	Local<Value> argv[argc] = { info };
	Local<Function> cons = Nan::New<Function>(constructor());
	Nan::TryCatch try_catch;
	Nan::MaybeLocal<Object> instance = Nan::NewInstance(cons, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}
	return scope.Escape(instance.ToLocalChecked());
}

/**
 *  Initialize a client object.
 *  This creates a constructor function, and sets up the prototype.
 */
void AerospikeClient::Init()
{
	Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(AerospikeClient::New);
	tpl->SetClassName(Nan::New("AerospikeClient").ToLocalChecked());

	// A client object created in Node.js, holds reference to the wrapped C++
	// object using an internal field.
	tpl->InstanceTemplate()->SetInternalFieldCount(1);

	Nan::SetPrototypeMethod(tpl, "hasPendingAsyncCommands", HasPendingAsyncCommands);
	Nan::SetPrototypeMethod(tpl, "applyAsync", ApplyAsync);
	Nan::SetPrototypeMethod(tpl, "batchGet", BatchGet);
	Nan::SetPrototypeMethod(tpl, "batchExists", BatchExists);
	Nan::SetPrototypeMethod(tpl, "batchSelect", BatchSelect);
	Nan::SetPrototypeMethod(tpl, "batchRead", BatchReadAsync);
	Nan::SetPrototypeMethod(tpl, "close", Close);
	Nan::SetPrototypeMethod(tpl, "connect", Connect);
	Nan::SetPrototypeMethod(tpl, "isConnected", IsConnected);
	Nan::SetPrototypeMethod(tpl, "existsAsync", ExistsAsync);
	Nan::SetPrototypeMethod(tpl, "getAsync", GetAsync);
	Nan::SetPrototypeMethod(tpl, "info", Info);
	Nan::SetPrototypeMethod(tpl, "infoForeach", InfoForeach);
	Nan::SetPrototypeMethod(tpl, "indexCreate", IndexCreate);
	Nan::SetPrototypeMethod(tpl, "indexRemove", IndexRemove);
	Nan::SetPrototypeMethod(tpl, "jobInfo", JobInfo);
	Nan::SetPrototypeMethod(tpl, "operateAsync", OperateAsync);
	Nan::SetPrototypeMethod(tpl, "putAsync", PutAsync);
	Nan::SetPrototypeMethod(tpl, "queryApply", QueryApply);
	Nan::SetPrototypeMethod(tpl, "queryAsync", QueryAsync);
	Nan::SetPrototypeMethod(tpl, "queryBackground", QueryBackground);
	Nan::SetPrototypeMethod(tpl, "queryForeach", QueryForeach);
	Nan::SetPrototypeMethod(tpl, "removeAsync", RemoveAsync);
	Nan::SetPrototypeMethod(tpl, "scanBackground", ScanBackground);
	Nan::SetPrototypeMethod(tpl, "scanAsync", ScanAsync);
	Nan::SetPrototypeMethod(tpl, "selectAsync", SelectAsync);
	Nan::SetPrototypeMethod(tpl, "udfRegister", Register);
	Nan::SetPrototypeMethod(tpl, "udfRegisterWait", RegisterWait);
	Nan::SetPrototypeMethod(tpl, "udfRemove", UDFRemove);
	Nan::SetPrototypeMethod(tpl, "updateLogging", SetLogLevel);

	constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
}
