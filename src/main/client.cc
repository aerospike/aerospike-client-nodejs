/*******************************************************************************
 * Copyright 2013-2023 Aerospike, Inc.
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
#include "js_bridge.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/as_async_proto.h>
#include <aerospike/as_cluster.h>
#include <aerospike/as_config.h>
#include <aerospike/as_key.h>
#include <aerospike/as_log.h>
#include <aerospike/as_record.h>
AS_EXTERN extern char* aerospike_client_version;
AS_EXTERN extern char* aerospike_client_language;
}

using namespace v8;

/*******************************************************************************
 *  Constructor and Destructor
 ******************************************************************************/

AerospikeClient::AerospikeClient() {}

AerospikeClient::~AerospikeClient()
{
	// The client's references; the C client keeps its own until it releases
	// the provider and hook.
	for (JsBridge *bridge : js_bridges) {
		bridge->ReleaseClient();
	}
	js_bridges.clear();
}

/*******************************************************************************
 *  Methods
 ******************************************************************************/

/**
 *  Constructor for AerospikeClient.
 */
NAN_METHOD(AerospikeClient::New)
{
	


	AerospikeClient *client = new AerospikeClient();
	client->as = (aerospike *)cf_malloc(sizeof(aerospike));

	// initialize the log to default values.
	client->log->fd = g_log_info.fd;
	client->log->level = g_log_info.level;


	// initialize the config to default values.
	as_config config;
	as_config_init(&config);


	Local<Object> v8Config = info[0].As<Object>();

	Local<Value> v8LogInfo =
		Nan::Get(v8Config, Nan::New("log").ToLocalChecked()).ToLocalChecked();
	if (v8LogInfo->IsObject()) {
		log_from_jsobject(client->log, v8LogInfo.As<Object>());
	}

	int result = config_from_jsobject(&config, v8Config, client, client->log);

	if (result != AS_NODE_PARAM_OK) {
		config_free_ip_map(&config);
		// Frees what was parsed, including a registered provider or translator.
		as_config_destroy(&config);
		if(client->as){
			cf_free(client->as);
		}
		if(client->report_dir){
			cf_free(client->report_dir);
		}
		if(!client->enable_callback.IsEmpty()){
			client->enable_callback.Reset();
			client->snapshot_callback.Reset();
			client->node_close_callback.Reset();
			client->disable_callback.Reset();
		}

		delete client;
		info.GetReturnValue().Set(Nan::Undefined());
		Nan::ThrowError("Invalid client configuration");
		return;
	}

	aerospike_client_version = (char *)ADDON_VERSION;
	aerospike_client_language = (char*)"nodejs";

	client->ip_map = config.ip_map;
	client->ip_map_size = config.ip_map_size;
	aerospike_init(client->as, &config);
	as_v8_debug(client->log, "Aerospike client initialized successfully");
	client->Wrap(info.This());

	info.GetReturnValue().Set(info.This());
}

/**
 * Close the client and release its cluster. A closed client can't connect again.
 */
static void close_client(AerospikeClient *client)
{
	as_v8_debug(client->log, "Closing the connection to aerospike cluster");
	as_error err;
	// A JavaScript provider or hook waiting for the JavaScript thread returns
	// at once, so the C client's close thread doesn't wait refresh_timeout_ms.
	for (JsBridge *bridge : client->js_bridges) {
		bridge->MarkClosing();
	}
	events_callback_close(&client->as->config);

	aerospike_close(client->as, &err);
	aerospike_destroy(client->as);

	// Free only the array this client allocated; the cluster made its own
	// copy at connect.
	free_ip_map(client->ip_map, client->ip_map_size);
	client->ip_map = NULL;
	client->ip_map_size = 0;

	client->closed = true;

	if(!client->enable_callback.IsEmpty()){
		client->enable_callback.Reset();
		client->snapshot_callback.Reset();
		client->node_close_callback.Reset();
		client->disable_callback.Reset();
	}
	if(client->report_dir){
		cf_free(client->report_dir);
	}
}

/**
 * aerospike_connect() on a libuv worker thread, for a client with a JavaScript
 * seed provider or credentials hook. close() and destroy stay on the
 * JavaScript thread (the C client hands close's waiting to its own thread);
 * a close() asked for while connect runs is done when connect completes.
 */
class ConnectWorker : public Nan::AsyncWorker {
  public:
	ConnectWorker(Nan::Callback *callback, AerospikeClient *client)
	  : Nan::AsyncWorker(callback, "aerospike:connect"), client(client), status(AEROSPIKE_OK)
	{
		as_error_init(&err);
	}

	void Execute() override
	{
		status = aerospike_connect(client->as, &err);
	}

	void HandleOKCallback() override
	{
		Nan::HandleScope scope;
		client->connecting = false;
		AerospikeCommand *cmd = new AerospikeCommand("Connect", client, callback->GetFunction());

		if (client->close_pending) {
			// close() was called while connect ran: connect fails with that,
			// whatever aerospike_connect() returned (closing the bridge can
			// itself make it fail).
			close_client(client);
			as_error closed;
			as_error_init(&closed);
			as_error_update(&closed, AEROSPIKE_ERR_CLIENT, "Client closed while connecting");
			cmd->ErrorCallback(&closed);
		}
		else if (status != AEROSPIKE_OK) {
			// The C client keeps the provider registered, so connect can be
			// retried; a discovery thread still waiting is woken.
			for (JsBridge *bridge : client->js_bridges) {
				bridge->AbortPending();
			}
			events_callback_close(&client->as->config);
			cmd->ErrorCallback(&err);
		}
		else {
			as_v8_debug(client->log, "Successfully connected to cluster: Enjoy your cake!");
			cmd->Callback(0, {});
		}
		delete cmd;
	}

  private:
	AerospikeClient *client;
	as_error err;
	as_status status;
};

/**
 * Connect to an Aerospike Cluster
 */
NAN_METHOD(AerospikeClient::Connect)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	Local<Function> callback = info[0].As<Function>();
	AerospikeCommand *cmd = new AerospikeCommand("Connect", client, callback);

	as_error err;
	if (client->closed) {
		// Close released the cluster, so this client can't connect again.
		as_error_update(&err, AEROSPIKE_ERR_CLIENT,
						"Client is closed. Create a new client to connect again.");
		cmd->ErrorCallback(&err);
	}
	else if (client->connecting) {
		as_error_update(&err, AEROSPIKE_ERR_CLIENT,
						"Connect is already running on this client");
		cmd->ErrorCallback(&err);
	}
	else if (!client->js_bridges.empty()) {
		// A JavaScript provider or hook answers the C client's first refresh
		// on the JavaScript thread, so that thread must not wait inside
		// aerospike_connect(): connect runs on a worker thread instead.
		client->connecting = true;
		ConnectWorker *worker = new ConnectWorker(new Nan::Callback(callback), client);
		worker->SaveToPersistent("client", info.This());
		Nan::AsyncQueueWorker(worker);
	}
	else if (aerospike_connect(client->as, &err) != AEROSPIKE_OK) {
		// A failed connect leaves no cluster, so connect can be retried on
		// this client. Release the event handle so it doesn't keep the
		// process alive; the next connect sets it up again.
		events_callback_close(&client->as->config);
		cmd->ErrorCallback(&err);
	}
	else {
		as_v8_debug(client->log,
					"Successfully connected to cluster: Enjoy your cake!");
		cmd->Callback(0, {});
	}

	delete cmd;
}

/**
 *  Close the connections to the Aerospike cluster.
 */
NAN_METHOD(AerospikeClient::Close)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	if (client->connecting) {
		// Never wait for the worker here: its connect may need this thread.
		client->close_pending = true;
		for (JsBridge *bridge : client->js_bridges) {
			bridge->MarkClosing();
		}
		return;
	}

	if (client->closed) {
		return;
	}

	close_client(client);
}

/**
 * Is cluster connected to any server nodes.
 */
NAN_METHOD(AerospikeClient::IsConnected)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	bool connected = aerospike_cluster_is_connected(client->as);

	info.GetReturnValue().Set(Nan::New(connected));
}

/**
 * Are there any pending async commands.
 */
NAN_METHOD(AerospikeClient::HasPendingAsyncCommands)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	bool pending = as_async_get_pending(client->as->cluster) > 0;

	info.GetReturnValue().Set(Nan::New(pending));
}

/**
 * Get all node names in the cluster.
 */
NAN_METHOD(AerospikeClient::GetNodes)
{
	Nan::HandleScope scope;
	AerospikeClient *client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

	// No cluster yet, or one being built by a connect on a worker thread.
	if (client->connecting || client->closed || !client->as->cluster) {
		info.GetReturnValue().Set(Nan::New<Array>(0));
		return;
	}

	as_nodes *nodes = as_nodes_reserve(client->as->cluster);
	Local<Array> v8_nodes = Nan::New<Array>(nodes->size);

	for (uint32_t i = 0; i < nodes->size; i++) {
		as_node *node = nodes->array[i];
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
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	TYPE_CHECK_REQ(info[0], IsString, "hostname must be a string");
	TYPE_CHECK_REQ(info[1], IsNumber, "port must be a number");

	Nan::Utf8String hostname(info[0].As<String>());
	uint16_t port = (uint16_t)Nan::To<uint32_t>(info[1]).FromJust();

	as_cluster_add_seed(client->as->cluster, *hostname, NULL, port);
}

/**
 * Removes a seed host from the cluster.
 */
NAN_METHOD(AerospikeClient::RemoveSeedHost)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	TYPE_CHECK_REQ(info[0], IsString, "hostname must be a string");
	TYPE_CHECK_REQ(info[1], IsNumber, "port must be a number");

	Nan::Utf8String hostname(info[0].As<String>());
	uint16_t port = (uint16_t)Nan::To<uint32_t>(info[1]).FromJust();

	as_cluster_remove_seed(client->as->cluster, *hostname, port);
}

NAN_METHOD(AerospikeClient::SetLogLevel)
{
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.Holder());
	if (info[0]->IsObject()) {
		log_from_jsobject(client->log, info[0].As<v8::Object>());
	}
    info.GetReturnValue().Set(Nan::New<v8::Value>(info.Holder()));
}

/**
 * Setup event callback for cluster events.
 */
NAN_METHOD(AerospikeClient::SetupEventCb)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

	if (client->closed) {
		// Connect fails with a clear error instead.
		return;
	}

	if (client->connecting) {
		// A connect runs on a worker thread and uses the current handle; the
		// second connect fails with a clear error instead.
		return;
	}

	Local<Function> callback;
	if (info.Length() > 0 && info[0]->IsFunction()) {
		callback = info[0].As<Function>();
		events_callback_init(&client->as->config, callback, client->log);
	}
	else {
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
	Local<Value> argv[argc] = {config};
	Local<Function> cons = Nan::New<Function>(constructor());
	Nan::TryCatch try_catch;
	Nan::MaybeLocal<Object> instance = Nan::NewInstance(cons, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::ThrowError("Error instantiating Client in C++ addon");
		return Nan::Null();
	}
	return scope.Escape(instance.ToLocalChecked());
}

/**
 *  Initialize a client object.
 *  This creates a constructor function, and sets up the prototype.
 */
void AerospikeClient::Init()
{
	Local<FunctionTemplate> tpl =
		Nan::New<FunctionTemplate>(AerospikeClient::New);
	tpl->SetClassName(Nan::New("AerospikeClient").ToLocalChecked());

	// A client object created in Node.js, holds reference to the wrapped C++
	// object using an internal field.
	tpl->InstanceTemplate()->SetInternalFieldCount(1);

	Nan::SetPrototypeMethod(tpl, "addSeedHost", AddSeedHost);
	Nan::SetPrototypeMethod(tpl, "applyAsync", ApplyAsync);
	Nan::SetPrototypeMethod(tpl, "batchExists", BatchExists);
	Nan::SetPrototypeMethod(tpl, "batchGet", BatchGet);
	Nan::SetPrototypeMethod(tpl, "batchRead", BatchReadAsync);
	Nan::SetPrototypeMethod(tpl, "batchWrite", BatchWriteAsync);
	Nan::SetPrototypeMethod(tpl, "batchApply", BatchApply);
	Nan::SetPrototypeMethod(tpl, "batchRemove", BatchRemove);
	Nan::SetPrototypeMethod(tpl, "batchSelect", BatchSelect);
	Nan::SetPrototypeMethod(tpl, "contextFromBase64", ContextFromBase64);
	Nan::SetPrototypeMethod(tpl, "contextToBase64", ContextToBase64);
	Nan::SetPrototypeMethod(tpl, "changePassword", ChangePassword);
	Nan::SetPrototypeMethod(tpl, "close", Close);
	Nan::SetPrototypeMethod(tpl, "connect", Connect);
	Nan::SetPrototypeMethod(tpl, "existsAsync", ExistsAsync);
	Nan::SetPrototypeMethod(tpl, "disableMetrics", DisableMetrics);
	Nan::SetPrototypeMethod(tpl, "enableMetrics", EnableMetrics);
	Nan::SetPrototypeMethod(tpl, "expressionToBase64", ExpressionToBase64);
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
	Nan::SetPrototypeMethod(tpl, "privilegeGrant", PrivilegeGrant);
	Nan::SetPrototypeMethod(tpl, "privilegeRevoke", PrivilegeRevoke);
	Nan::SetPrototypeMethod(tpl, "putAsync", PutAsync);
	Nan::SetPrototypeMethod(tpl, "queryApply", QueryApply);
	Nan::SetPrototypeMethod(tpl, "queryAsync", QueryAsync);
	Nan::SetPrototypeMethod(tpl, "queryBackground", QueryBackground);
	Nan::SetPrototypeMethod(tpl, "queryForeach", QueryForeach);
	Nan::SetPrototypeMethod(tpl, "queryPages", QueryPages);
	Nan::SetPrototypeMethod(tpl, "queryRole", QueryRole);
	Nan::SetPrototypeMethod(tpl, "queryRoles", QueryRoles);
	Nan::SetPrototypeMethod(tpl, "queryUser", QueryUser);
	Nan::SetPrototypeMethod(tpl, "queryUsers", QueryUsers);
	Nan::SetPrototypeMethod(tpl, "removeAsync", RemoveAsync);
	Nan::SetPrototypeMethod(tpl, "removeSeedHost", RemoveSeedHost);
	Nan::SetPrototypeMethod(tpl, "roleCreate", RoleCreate);
	Nan::SetPrototypeMethod(tpl, "roleDrop", RoleDrop);
	Nan::SetPrototypeMethod(tpl, "roleGrant", RoleGrant);
	Nan::SetPrototypeMethod(tpl, "roleRevoke", RoleRevoke);
	Nan::SetPrototypeMethod(tpl, "roleSetWhitelist", RoleSetWhitelist);
	Nan::SetPrototypeMethod(tpl, "roleSetQuotas", RoleSetQuotas);
	Nan::SetPrototypeMethod(tpl, "scanAsync", ScanAsync);
	Nan::SetPrototypeMethod(tpl, "scanPages", ScanPages);
	Nan::SetPrototypeMethod(tpl, "scanBackground", ScanBackground);
	Nan::SetPrototypeMethod(tpl, "selectAsync", SelectAsync);
	Nan::SetPrototypeMethod(tpl, "setPassword", SetPassword);
	Nan::SetPrototypeMethod(tpl, "setupEventCb", SetupEventCb);
	Nan::SetPrototypeMethod(tpl, "setXDRFilter", SetXDRFilter);
	Nan::SetPrototypeMethod(tpl, "transactionAbort", TransactionAbort);
	Nan::SetPrototypeMethod(tpl, "transactionCommit", TransactionCommit);
	Nan::SetPrototypeMethod(tpl, "truncate", Truncate);
	Nan::SetPrototypeMethod(tpl, "udfRegister", Register);
	Nan::SetPrototypeMethod(tpl, "udfRemove", UDFRemove);
	Nan::SetPrototypeMethod(tpl, "updateLogging", SetLogLevel);
	Nan::SetPrototypeMethod(tpl, "userCreate", UserCreate);
	Nan::SetPrototypeMethod(tpl, "userCreatePKI", UserCreatePKI);
	Nan::SetPrototypeMethod(tpl, "userDrop", UserDrop);

	constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
}