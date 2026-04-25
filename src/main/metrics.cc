/*******************************************************************************
 * Copyright 2025 Aerospike, Inc.
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


#include <cstdint>
#include "async.h"
#include "metrics.h"
#include "conversions.h"

using namespace v8;
using MetricsInvoker = std::function<void(MetricsCommand*)>;

MetricsCommand::MetricsCommand(AerospikeClient *client, v8::Local<v8::Function> callback_)
  : AerospikeCommand("Metrics", client, callback_) {
    this->client = client;
    this->client_closed = (&(client->closed));
}

MetricsCommand::~MetricsCommand() {
  Nan::HandleScope scope;

  if (policy != NULL) {
    if (report_dir) {
      cf_free(report_dir);
    }
    as_metrics_policy_destroy(policy);
    cf_free(policy);
  }

  enable_callback.Reset();
  snapshot_callback.Reset();
  node_close_callback.Reset();
  disable_callback.Reset();
}

void MetricsCommand::Enable_Callback(const int argc, v8::Local<v8::Value> argv[]) {
		Nan::HandleScope scope;
		as_v8_debug(log, "Executing Enable callback");

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New(enable_callback);

		runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}
}

void MetricsCommand::Enable_Callback_Config(const int argc, v8::Local<v8::Value> argv[]) {
		Nan::HandleScope scope;
		as_v8_debug(log, "Executing Enable callback");

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New(client->enable_callback);

		runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}
}

void MetricsCommand::Snapshot_Callback(const int argc, v8::Local<v8::Value> argv[]) {
		Nan::HandleScope scope;
		as_v8_debug(log, "Executing Snapshot callback");

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New(snapshot_callback);

		runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}
}

void MetricsCommand::Snapshot_Callback_Config(const int argc, v8::Local<v8::Value> argv[]) {
		Nan::HandleScope scope;
		as_v8_debug(log, "Executing Snapshot callback");

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New(client->snapshot_callback);

		runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}
}

void MetricsCommand::Node_Close_Callback(const int argc, v8::Local<v8::Value> argv[]) {
	Nan::HandleScope scope;
	as_v8_debug(log, "Executing Node Close callback");

	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New(node_close_callback);
	
	runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}
}

void MetricsCommand::Node_Close_Callback_Config(const int argc, v8::Local<v8::Value> argv[]) {
	Nan::HandleScope scope;
	as_v8_debug(log, "Executing Node Close callback");

	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New(client->node_close_callback);
	
	runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}
}

void MetricsCommand::Disable_Callback(const int argc, v8::Local<v8::Value> argv[]) {
	Nan::HandleScope scope;
	as_v8_debug(log, "Executing Disable Callback");

	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New(disable_callback);

	MaybeLocal<Value> retval = cb->Call(Nan::GetCurrentContext(), Nan::GetCurrentContext()->Global(), argc, argv);
	if (retval.IsEmpty()) {
		Nan::FatalException(try_catch);
	}
}

void MetricsCommand::Disable_Callback_Config(const int argc, v8::Local<v8::Value> argv[]) {
	Nan::HandleScope scope;
	as_v8_debug(log, "Executing Disable Callback");

	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New(client->disable_callback);
	
	runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}
}

// PREPARE CALLBACKS

/*
 * Parses Aerospike C++ Cluster and Node object into V8 Object.
 */
Local<Value> prepare_disable_cluster_arg(MetricsCommand* cmd, as_metrics_policy* policy) {
		Nan::EscapableHandleScope scope;
		cmd->disabled = true;
		cmd->v8_cluster_disable = Nan::New<Object>();
		cluster_to_jsobject(cmd->cluster, cmd->v8_cluster_disable, policy, cmd->log);
    return scope.Escape(cmd->v8_cluster_disable);
}

Local<Value> prepare_cluster_arg(MetricsCommand* cmd, as_metrics_policy* policy) {
		Nan::EscapableHandleScope scope;
		cmd->v8_cluster = Nan::New<Object>();
		cluster_to_jsobject(cmd->cluster, cmd->v8_cluster, policy, cmd->log);
    return scope.Escape(cmd->v8_cluster);
}

Local<Value> prepare_node_arg(MetricsCommand* cmd) {
		Nan::EscapableHandleScope scope;
		Local<Object> v8_node = Nan::New<Object>();
		node_to_jsobject(cmd->node, v8_node, cmd->log);
    return scope.Escape(v8_node);
}


// EXECUTE CALLBACKS
static void execute_nothing(uv_work_t *req)
{

}


// Listeners provided through a Command-Level Policy

void enable_response(uv_work_t *req, int status)
{
	MetricsInvoker invoker = [](MetricsCommand* cmd) {
    Local<Value> argv[] = {Nan::Null()};
    cmd->Enable_Callback(1, argv);
  };

  respond_generic(req, status, invoker, "Executing Metrics Enable Callback", false);
}

void snapshot_response(uv_work_t *req, int status)
{
	MetricsInvoker invoker = [](MetricsCommand* cmd) {
    Local<Value> argv[] = {prepare_cluster_arg(cmd, cmd->policy)};
  	cmd->Snapshot_Callback(1, argv);
  };

  respond_generic(req, status, invoker, "Executing Metrics Snapshot Callback", false);
}

void node_close_response(uv_work_t *req, int status)
{
	MetricsInvoker invoker = [](MetricsCommand* cmd) {
    Local<Value> argv[] = {prepare_node_arg(cmd)};
  	cmd->Node_Close_Callback(1, argv);
  };

  respond_generic(req, status, invoker, "Executing Metrics Node Close Callback", false);
}

void disable_response(uv_work_t *req, int status)
{
	MetricsInvoker invoker = [](MetricsCommand* cmd) {
    Local<Value> argv[] = {prepare_disable_cluster_arg(cmd, cmd->policy)};
    cmd->Disable_Callback(1, argv);
  };

  respond_generic(req, status, invoker, "Executing Metrics Disable Snapshot", true);
}

// Listeners provided through a Config-Level Policy

void enable_response_config(uv_work_t *req, int status)
{
	MetricsInvoker invoker = [](MetricsCommand* cmd) {
    Local<Value> argv[] = {Nan::Null()};
    cmd->Enable_Callback_Config(1, argv);
  };

  respond_generic(req, status, invoker, "Executing Metrics Enable Callback", false);
}

void snapshot_response_config(uv_work_t *req, int status)
{
	MetricsInvoker invoker = [](MetricsCommand* cmd) {
    Local<Value> argv[] = {prepare_cluster_arg(cmd, &(cmd->client->as->config.policies.metrics))};
    cmd->Snapshot_Callback_Config(1, argv);
  };

  respond_generic(req, status, invoker, "Executing Metrics Snapshot Callback", false);
}



void node_close_response_config(uv_work_t *req, int status)
{
	MetricsInvoker invoker = [](MetricsCommand* cmd) {
    Local<Value> argv[] = {prepare_node_arg(cmd)};
    cmd->Node_Close_Callback_Config(1, argv);
  };

  respond_generic(req, status, invoker, "Executing Metrics Node Close Callback", false);
}

void disable_response_config(uv_work_t *req, int status)
{
	MetricsInvoker invoker = [](MetricsCommand* cmd) {
    Local<Value> argv[] = {prepare_disable_cluster_arg(cmd, &(cmd->client->as->config.policies.metrics))};
    cmd->Disable_Callback_Config(1, argv);
  };

  respond_generic(req, status, invoker, "Executing Metrics Disable Snapshot", true);
}


void respond_generic(uv_work_t *req, int status, MetricsInvoker invoker, const char* message, bool delete_cmd)
{
  Nan::HandleScope scope;
  MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);
  if (cmd && (!(cmd->disabled)) && (!(*(cmd->client_closed)))) {
		LogInfo *log = cmd->log;
		as_v8_debug(log, message);

		invoker(cmd); 
  }

  if (cmd && delete_cmd){
  	delete cmd;
  }
  delete req;
}



as_status enable_listener(as_error* err, void* udata) {
	return run_metrics_listener(err, udata, enable_response, NULL, NULL, false, false);
}

as_status snapshot_listener(as_error* err, struct as_cluster_s* cluster, void* udata) {
	return run_metrics_listener(err, udata, snapshot_response, cluster, NULL, true, false);
}

as_status node_close_listener(as_error* err, struct as_node_s* node, void* udata) {
	return run_metrics_listener(err, udata, node_close_response, NULL, node, false, false);
}

as_status disable_listener(as_error* err, struct as_cluster_s* cluster, void* udata) {
	return run_metrics_listener(err, udata, disable_response, cluster, NULL, false, false);
}

as_status enable_listener_config(as_error* err, void* udata) {
	return run_metrics_listener(err, udata, enable_response_config, NULL, NULL, false, false);
}

as_status snapshot_listener_config(as_error* err, struct as_cluster_s* cluster, void* udata) {
	return run_metrics_listener(err, udata, snapshot_response_config, cluster, NULL, true, true);
}

as_status node_close_listener_config(as_error* err, struct as_node_s* node, void* udata) {
	return run_metrics_listener(err, udata, node_close_response_config, NULL, node, false, false);
}

as_status disable_listener_config(as_error* err, struct as_cluster_s* cluster, void* udata) {
	return run_metrics_listener(err, udata, disable_response_config, cluster, NULL, false, true);
}



as_status run_metrics_listener(as_error* err, void* udata, void (*callback)(uv_work_t*, int), struct as_cluster_s* cluster, struct as_node_s* node, bool is_snapshot, bool is_config) {
	MetricsCommand* cmd = reinterpret_cast<MetricsCommand *>(udata);
	if(!cmd || cmd->disabled){
		return (as_status) 0;
	}

	if(cluster) {
		cmd->cluster = cluster;
	}

	if(node) {
		cmd->node = node;
	}



	async_invoke_metrics(cmd, execute_nothing, callback);

	return (as_status) 0;
}