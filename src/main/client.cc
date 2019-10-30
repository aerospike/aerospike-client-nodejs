/*******************************************************************************
 * Copyright 2013-2019 Aerospike, Inc.
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
#include "command.h"
#include "conversions.h"
#include "config.h"
#include "events.h"
#include "log.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/as_async_proto.h>
#include <aerospike/as_cluster.h>
#include <aerospike/as_config.h>
#include <aerospike/as_key.h>
#include <aerospike/as_log.h>
#include <aerospike/as_record.h>
}

using namespace v8;

/*******************************************************************************
 *  Constructor and Destructor
 ******************************************************************************/

AerospikeClient::AerospikeClient() {}

AerospikeClient::~AerospikeClient() {}

/*******************************************************************************
 *  Methods
 ******************************************************************************/

/**
 *  Constructor for AerospikeClient.
 */
NAN_METHOD(AerospikeClient::New)
{
	AerospikeClient* client = new AerospikeClient();
	client->as = (aerospike*) cf_malloc(sizeof(aerospike));
	client->log = (LogInfo*) cf_malloc(sizeof(LogInfo));

	// initialize the log to default values.
	client->log->fd = g_log_info.fd;
	client->log->level = g_log_info.level;

	// initialize the config to default values.
	as_config config;
	as_config_init(&config);

	Local<Object> v8Config = info[0].As<Object>();

	Local<Value> v8LogInfo = Nan::Get(v8Config, Nan::New("log").ToLocalChecked()).ToLocalChecked();
	if (v8LogInfo->IsObject()) {
		log_from_jsobject(client->log, v8LogInfo.As<Object>());
	}

	int result = config_from_jsobject(&config, v8Config, client->log);
	if (result != AS_NODE_PARAM_OK) {
		Nan::ThrowError("Invalid client configuration");
	}

	aerospike_init(client->as, &config);
	as_v8_debug(client->log, "Aerospike client initialized successfully");
	client->Wrap(info.This());
	info.GetReturnValue().Set(info.This());
}

/**
 * Connect to an Aerospike Cluster
 */
NAN_METHOD(AerospikeClient::Connect)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	Local<Function> callback = info[0].As<Function>();
	AerospikeCommand* cmd = new AerospikeCommand("Connect", client, callback);

	as_error err;
	if (aerospike_connect(client->as, &err) != AEROSPIKE_OK) {
		cmd->ErrorCallback(&err);
	} else {
		as_v8_debug(client->log, "Successfully connected to cluster: Enjoy your cake!");
		cmd->Callback(0, {});
	}

	delete cmd;
}

/**
 *  Close the connections to the Aeropsike cluster.
 */
NAN_METHOD(AerospikeClient::Close)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	as_v8_debug(client->log, "Closing the connection to aerospike cluster");
	as_error err;
	events_callback_close(&client->as->config);
	aerospike_close(client->as, &err);
	aerospike_destroy(client->as);
	free(client->as);
	free(client->log);
	client->closed = true;
}

/**
 * Is cluster connected to any server nodes.
 */
NAN_METHOD(AerospikeClient::IsConnected)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	bool connected = aerospike_cluster_is_connected(client->as);

	info.GetReturnValue().Set(Nan::New(connected));
}

/**
 * Are there any pending async commands.
 */
NAN_METHOD(AerospikeClient::HasPendingAsyncCommands)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	bool pending = as_async_get_pending(client->as->cluster) > 0;

	info.GetReturnValue().Set(Nan::New(pending));
}

/**
 * Get all node names in the cluster.
 */
NAN_METHOD(AerospikeClient::GetNodes)
{
	Nan::HandleScope scope;
	AerospikeClient* client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

	as_nodes* nodes = as_nodes_reserve(client->as->cluster);
	Local<Array> v8_nodes = Nan::New<Array>(nodes->size);

	for (uint32_t i = 0; i < nodes->size; i++) {
		as_node* node = nodes->array[i];
		// reserve node if it will be for a significant period of time.
		as_node_reserve(node);
		Local<Object> node_obj = Nan::New<Object>();
		Nan::Set(node_obj, Nan::New("name").ToLocalChecked(),
				Nan::New<String>(node->name).ToLocalChecked());
		Nan::Set(node_obj, Nan::New("address").ToLocalChecked(),
				Nan::New<String>(as_node_get_address_string(node))
				.ToLocalChecked());
		Nan::Set(v8_nodes, i, node_obj);
		as_node_release(node);
	}

	as_nodes_release(nodes);
	info.GetReturnValue().Set(v8_nodes);
}

/**
 * Adds a seed host to the cluster.
 */
NAN_METHOD(AerospikeClient::AddSeedHost)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	TYPE_CHECK_REQ(info[0], IsString, "hostname must be a string");
	TYPE_CHECK_REQ(info[1], IsNumber, "port must be a number");

	Nan::Utf8String hostname(info[0].As<String>());
	uint16_t port = (uint16_t) Nan::To<uint32_t>(info[1]).FromJust();

	as_cluster_add_seed(client->as->cluster, *hostname, NULL, port);
}

/**
 * Removes a seed host from the cluster.
 */
NAN_METHOD(AerospikeClient::RemoveSeedHost)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	TYPE_CHECK_REQ(info[0], IsString, "hostname must be a string");
	TYPE_CHECK_REQ(info[1], IsNumber, "port must be a number");

	Nan::Utf8String hostname(info[0].As<String>());
	uint16_t port = (uint16_t) Nan::To<uint32_t>(info[1]).FromJust();

	as_cluster_remove_seed(client->as->cluster, *hostname, port);
}

NAN_METHOD(AerospikeClient::SetLogLevel)
{
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.Holder());
	if (info[0]->IsObject()) {
		log_from_jsobject(client->log, info[0].As<Object>());
	}
	info.GetReturnValue().Set(info.Holder());
}

/**
 * Setup event callback for cluster events.
 */
NAN_METHOD(AerospikeClient::SetupEventCb)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	Local<Function> callback;
	if (info.Length() > 0 && info[0]->IsFunction()) {
		callback = info[0].As<Function>();
		events_callback_init(&client->as->config, callback, client->log);
	} else {
		as_v8_error(client->log, "Callback function required");
		return Nan::ThrowError("Callback function required");
	}
}

/**
 *  Instantiate a new AerospikeClient.
 */
Local<Value> AerospikeClient::NewInstance(Local<Object> config)
{
	Nan::EscapableHandleScope scope;
	const int argc = 1;
	Local<Value> argv[argc] = { config };
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

	Nan::SetPrototypeMethod(tpl, "addSeedHost", AddSeedHost);
	Nan::SetPrototypeMethod(tpl, "applyAsync", ApplyAsync);
	Nan::SetPrototypeMethod(tpl, "batchExists", BatchExists);
	Nan::SetPrototypeMethod(tpl, "batchGet", BatchGet);
	Nan::SetPrototypeMethod(tpl, "batchRead", BatchReadAsync);
	Nan::SetPrototypeMethod(tpl, "batchSelect", BatchSelect);
	Nan::SetPrototypeMethod(tpl, "close", Close);
	Nan::SetPrototypeMethod(tpl, "connect", Connect);
	Nan::SetPrototypeMethod(tpl, "existsAsync", ExistsAsync);
	Nan::SetPrototypeMethod(tpl, "getAsync", GetAsync);
	Nan::SetPrototypeMethod(tpl, "getNodes", GetNodes);
	Nan::SetPrototypeMethod(tpl, "getStats", GetStats);
	Nan::SetPrototypeMethod(tpl, "hasPendingAsyncCommands", HasPendingAsyncCommands);
	Nan::SetPrototypeMethod(tpl, "indexCreate", IndexCreate);
	Nan::SetPrototypeMethod(tpl, "indexRemove", IndexRemove);
	Nan::SetPrototypeMethod(tpl, "infoAny", InfoAny);
	Nan::SetPrototypeMethod(tpl, "infoForeach", InfoForeach);
	Nan::SetPrototypeMethod(tpl, "infoHost", InfoHost);
	Nan::SetPrototypeMethod(tpl, "infoNode", InfoNode);
	Nan::SetPrototypeMethod(tpl, "isConnected", IsConnected);
	Nan::SetPrototypeMethod(tpl, "jobInfo", JobInfo);
	Nan::SetPrototypeMethod(tpl, "operateAsync", OperateAsync);
	Nan::SetPrototypeMethod(tpl, "putAsync", PutAsync);
	Nan::SetPrototypeMethod(tpl, "queryApply", QueryApply);
	Nan::SetPrototypeMethod(tpl, "queryAsync", QueryAsync);
	Nan::SetPrototypeMethod(tpl, "queryBackground", QueryBackground);
	Nan::SetPrototypeMethod(tpl, "queryForeach", QueryForeach);
	Nan::SetPrototypeMethod(tpl, "removeAsync", RemoveAsync);
	Nan::SetPrototypeMethod(tpl, "removeSeedHost", RemoveSeedHost);
	Nan::SetPrototypeMethod(tpl, "scanAsync", ScanAsync);
	Nan::SetPrototypeMethod(tpl, "scanBackground", ScanBackground);
	Nan::SetPrototypeMethod(tpl, "selectAsync", SelectAsync);
	Nan::SetPrototypeMethod(tpl, "setupEventCb", SetupEventCb);
	Nan::SetPrototypeMethod(tpl, "truncate", Truncate);
	Nan::SetPrototypeMethod(tpl, "udfRegister", Register);
	Nan::SetPrototypeMethod(tpl, "udfRemove", UDFRemove);
	Nan::SetPrototypeMethod(tpl, "updateLogging", SetLogLevel);

	constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
}
