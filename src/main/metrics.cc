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
	
	runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
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
		//if(is_snapshot){
		//	if(is_config){
		//		prepare_snapshot(err, cluster, &(cmd->client->as->config.policies.metrics), udata);
		//	}
		//	else{
		//		prepare_snapshot(err, cluster, cmd->policy, udata);
		//	}
		//}
		//else{
		//	if(is_config){
		//		prepare_disable(err, cluster, &(cmd->client->as->config.policies.metrics), udata);
		//	}
		//	else{
		//		prepare_disable(err, cluster, cmd->policy, udata);
		//	}
		//}
	}

	if(node) {
		cmd->node = node;
	}



	async_invoke_metrics(cmd, execute_nothing, callback);

	return (as_status) 0;
}

/*
void prepare_disable(as_error* err, struct as_cluster_s* cluster, as_metrics_policy* policy,  void* udata) {
	Nan::HandleScope scope;
	MetricsCommand* cmd = reinterpret_cast<MetricsCommand *>(udata);

	cmd->disabled = true;

	cmd->v8_cluster_disable = Nan::New<Object>();

  cluster_to_jsobject(cmd->cluster, cmd->v8_cluster_disable, policy, cmd->log);
}

void prepare_snapshot(as_error* err, struct as_cluster_s* cluster, as_metrics_policy* policy,  void* udata) {
	Nan::HandleScope scope;
	MetricsCommand* cmd = reinterpret_cast<MetricsCommand *>(udata);

	cmd->v8_cluster = Nan::New<Object>();

  cluster_to_jsobject(cmd->cluster, cmd->v8_cluster, policy, cmd->log);
}
*/

/*
void prepare_disable(as_error* err, struct as_cluster_s* cluster, void* udata) {
	MetricsCommand* cmd = reinterpret_cast<MetricsCommand *>(udata);

	cmd->disabled = true;
	cmd->cluster = cluster;

	as_nodes* nodes = as_nodes_reserve(cluster);
	cmd->nodes_size = nodes->size;

	uint32_t i, j;

	for (i = 0; i < nodes->size; i++) {

		as_node* node = nodes->array[i];

		cmd->metrics_size = node->metrics_size;
		cmd->ns_metrics = (as_ns_metrics**) cf_malloc(sizeof(as_ns_metrics*) * cmd->metrics_size);

		for (uint8_t k = 0; k < cmd->metrics_size; ++k)
		{

			as_ns_metrics* node_metrics = node->metrics[k];

			number_of_buckets = 0;

			as_latency* conn_buckets = as_latency_reserve(node_metrics->latency[0]);
			as_latency* write_buckets = as_latency_reserve(node_metrics->latency[1]);
			as_latency* read_buckets = as_latency_reserve(node_metrics->latency[2]);
			as_latency* batch_buckets = as_latency_reserve(node_metrics->latency[3]);
			as_latency* query_buckets = as_latency_reserve(node_metrics->latency[4]);

	    number_of_buckets += conn_buckets->size;
	    number_of_buckets += write_buckets->size;
	    number_of_buckets += read_buckets->size;
	    number_of_buckets += batch_buckets->size;
	    number_of_buckets += query_buckets->size;


			as_ns_metrics* ns_metrics =  (as_ns_metrics*)cf_malloc(sizeof(as_ns_metrics) + (sizeof(uint32_t) * number_of_buckets));


	    cmd->latency_buckets_set = true;

	    for (j = 0; j < conn_buckets->size; j++) {
	       ns_metrics->latency[0].buckets[j] = (uint32_t) as_latency_get_bucket(conn_buckets, j);
	    }

	    for (j = 0; j < write_buckets->size; j++) {
	       ns_metrics->latency[1].buckets[j] = (uint32_t) as_latency_get_bucket(write_buckets, j);
	    }

	    for (j = 0; j < read_buckets->size; j++) {
	       ns_metrics->latency[2].buckets[j] = (uint32_t) as_latency_get_bucket(read_buckets, j);
	    }

	    for (j = 0; j < batch_buckets->size; j++) {
	       ns_metrics->latency[3].buckets[j] = (uint32_t) as_latency_get_bucket(batch_buckets, j);
	    }

	    for (j = 0; j < query_buckets->size; j++) {
	       ns_metrics->latency[4].buckets[j] = (uint32_t) as_latency_get_bucket(query_buckets, j);
	    }


	    as_latency_release(conn_buckets);
	    as_latency_release(write_buckets);
	    as_latency_release(read_buckets);
	    as_latency_release(batch_buckets);
	    as_latency_release(query_buckets);

			ns_metrics->ns = strdup(node_metrics->ns);
			ns_metrics->bytes_in = node_metrics->bytes_in;
			ns_metrics->bytes_out = node_metrics->bytes_out;
			ns_metrics->error_count = node_metrics->error_count;
			ns_metrics->timeout_count = node_metrics->timeout_count;
			ns_metrics->key_busy_count = node_metrics->key_busy_count;



			cmd->ns_metrics[k] = ns_metrics;
			


	  }
	}

	as_nodes_release(nodes);
}
*/