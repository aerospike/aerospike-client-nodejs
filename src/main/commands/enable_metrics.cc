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

#include "client.h"
#include "command.h"
#include "async.h"
#include "conversions.h"
#include "policy.h"
#include "log.h"

#include <node.h>
#include <nan.h>
#include <uv.h>


extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/as_config.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
}

using namespace v8;




class MetricsCommand : public AerospikeCommand {
  public:
	MetricsCommand(AerospikeClient *client, Local<Function> callback_)
		: AerospikeCommand("Metrics", client, callback_)
	{	
		client_closed = &(client->closed);
	}

	~MetricsCommand()
	{
		Nan::HandleScope scope;
		if (listeners != NULL){
			cf_free(listeners);
		}
		if (policy != NULL) {
			cf_free(policy);
		}
		if (latency_buckets != NULL) {
			for (uint32_t i = 0; i < nodes_size; ++i)
			{
				cf_free(latency_buckets[i].connection);
				cf_free(latency_buckets[i].read);
				cf_free(latency_buckets[i].write);
				cf_free(latency_buckets[i].batch);
				cf_free(latency_buckets[i].query);
			}
			cf_free(latency_buckets);
		}

		enable_callback.Reset();
		snapshot_callback.Reset();
		node_close_callback.Reset();
		disable_callback.Reset();
	}
	
	bool* client_closed;
	bool disabled = false;
  as_metrics_listeners* listeners = NULL;
	as_metrics_policy* policy = NULL;
	as_cluster* cluster = NULL;
	as_node* node = NULL;
	latency* latency_buckets = NULL;
	uint32_t bucket_max = 0;
	uint32_t nodes_size = 0;

	Nan::Persistent<v8::Function> enable_callback;
	Nan::Persistent<v8::Function> snapshot_callback;
	Nan::Persistent<v8::Function> node_close_callback;
	Nan::Persistent<v8::Function> disable_callback;

	void Enable_Callback(const int argc, Local<Value> argv[])
	{
		Nan::HandleScope scope;
		as_v8_debug(log, "Executing Enable callback");

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New(enable_callback);

		runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}
	}

	void Snapshot_Callback(const int argc, Local<Value> argv[])
	{
		Nan::HandleScope scope;
		as_v8_debug(log, "Executing Snapshot callback");

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New(snapshot_callback);

		runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}
	}

	void Node_Close_Callback(const int argc, Local<Value> argv[])
	{
		Nan::HandleScope scope;
		as_v8_debug(log, "Executing Node Close callback");

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New(node_close_callback);
		
		runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}

	}

	void Disable_Callback(const int argc, Local<Value> argv[])
	{
		Nan::HandleScope scope;
		as_v8_debug(log, "Executing Disable Callback");

		Nan::TryCatch try_catch;
		Local<Function> cb = Nan::New(disable_callback);
		
		runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
		if (try_catch.HasCaught()) {
			Nan::FatalException(try_catch);
		}

	}

};

/*
 * Parses Aerospike C++ Cluster and Node object into V8 Object.
 */
static Local<Value> prepare_disable_cluster_arg(MetricsCommand* cmd) {
		Nan::EscapableHandleScope scope;
    Local<Object> v8_cluster = Nan::New<Object>();
    cluster_to_jsobject(cmd->cluster, v8_cluster, cmd->latency_buckets, cmd->bucket_max);
    return scope.Escape(v8_cluster);
}

static Local<Value> prepare_cluster_arg(MetricsCommand* cmd) {
		Nan::EscapableHandleScope scope;
    Local<Object> v8_cluster = Nan::New<Object>();
    cluster_to_jsobject(cmd->cluster, v8_cluster, NULL, 0);
    return scope.Escape(v8_cluster);
}

static Local<Value> prepare_node_arg(MetricsCommand* cmd) {
		Nan::EscapableHandleScope scope;
		Local<Object> v8_node = Nan::New<Object>();
		node_to_jsobject(cmd->node, v8_node, NULL, 0);
    return scope.Escape(v8_node);
}

/**
 *  Setup an asynchronous invocation of a function using uv worker threads.
 * 
 *  Since the metrics operations will be firing in the background, queueing the work to run asynchronously is necessary to avoid segmentation faults.
 */
void
async_invoke_metrics_callback(MetricsCommand *cmd, void (*execute)(uv_work_t *req), void (*respond)(uv_work_t *req, int status))
{

	// Create an async work request and prepare the command
	uv_work_t *req = new uv_work_t;
	req->data = cmd;

	// Pass the work request to libuv to be run when a
	// worker-thread is available to process it.
	uv_queue_work(uv_default_loop(), // event loop
				  req,				 // work token
				  execute,			 // execute work, nothing since no C Code must be executed
				  respond			 // respond to callback by running the appropriate metrics callback
	);

}

/* Asynchronous functions passed to the worker threads which execute the metrics callbacks provided by the user.  */

static void respond_enable(uv_work_t *req, int status)
{
	Nan::HandleScope scope;
	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);

	if(!cmd || cmd->disabled || *(cmd->client_closed)){
		delete req;
		return;
	}

	LogInfo *log = cmd->log;

	as_v8_debug(log, "Executing Metrics Enable Callback");

	Local<Value> argv[] = {};

	cmd->Enable_Callback(0, argv);

	delete req;
}

static void respond_snapshot(uv_work_t *req, int status)
{
	Nan::HandleScope scope;

	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);

	if(!cmd || cmd->disabled || *(cmd->client_closed)){
		delete req;
		return;
	}

	LogInfo *log = cmd->log;

	as_v8_debug(log, "Executing Metrics Snapshot Callback");

	Local<Value> argv[] = {prepare_cluster_arg(cmd)};

	cmd->Snapshot_Callback(1, argv);	


	delete req;

}

static void respond_node_close(uv_work_t *req, int status)
{
	Nan::HandleScope scope;

	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);

	if(!cmd || cmd->disabled || *(cmd->client_closed)){
		delete req;
		return;
	}

	LogInfo *log = cmd->log;

	as_v8_debug(log, "Executing Metrics Node Close Callback");

	Local<Value> argv[] = {prepare_node_arg(cmd)};

	cmd->Node_Close_Callback(1, argv);


	delete req;

}


static void respond_disable(uv_work_t *req, int status)
{
	Nan::HandleScope scope;

	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);
	if(*(cmd->client_closed)){
		delete req;
		delete cmd;
		return;
	}

	LogInfo *log = cmd->log;

	as_v8_debug(log, "Executing Metrics Disables Snapshot");

	Local<Value> argv[] = {prepare_disable_cluster_arg(cmd)};

	cmd->Disable_Callback(1, argv);

	delete req;
	delete cmd;
}

static void execute_nothing(uv_work_t *req)
{

}

/* C Listeners used in AS_METRICS_POLICY */ 

as_status enable_listener(as_error* err, void* udata) {
	MetricsCommand* cmd = reinterpret_cast<MetricsCommand *>(udata);

	if(!cmd || cmd->disabled){
		return (as_status) 0;
	}

	async_invoke_metrics_callback(cmd, execute_nothing, respond_enable);

	return (as_status) 0;
}


as_status snapshot_listener(as_error* err, struct as_cluster_s* cluster, void* udata) {
	MetricsCommand* cmd = reinterpret_cast<MetricsCommand *>(udata);

	if(!cmd || cmd->disabled){
		return (as_status) 0;
	}
	cmd->cluster = cluster;


	async_invoke_metrics_callback(cmd, execute_nothing, respond_snapshot);
	
	return (as_status) 0;
}



as_status node_close_listener(as_error* err, struct as_node_s* node, void* udata) {
	MetricsCommand* cmd = reinterpret_cast<MetricsCommand *>(udata);

	if(!cmd || cmd->disabled){
		return (as_status) 0;
	}
	cmd->node = node;


	async_invoke_metrics_callback(cmd, execute_nothing, respond_node_close);

	


	return (as_status) 0;
}

as_status disable_listener(as_error* err, struct as_cluster_s* cluster, void* udata) {
	MetricsCommand* cmd = reinterpret_cast<MetricsCommand *>(udata);

	cmd->disabled = true;
	
	cmd->cluster = cluster;

	as_nodes* nodes = as_nodes_reserve(cluster);
	cmd->nodes_size = nodes->size;
	cmd->latency_buckets = (latency *)cf_malloc(nodes->size * sizeof(latency));
	uint32_t i, j;
	for (i = 0; i < nodes->size; i++) {

		as_node* node = nodes->array[i];

		as_node_metrics* node_metrics = node->metrics;

		as_latency_buckets* buckets = &node_metrics->latency[0];

	    cmd->bucket_max = buckets->latency_columns;

	    cmd->latency_buckets[i].connection = (uint32_t *)cf_malloc(cmd->bucket_max * sizeof(uint32_t));
	    cmd->latency_buckets[i].write = (uint32_t *)cf_malloc(cmd->bucket_max * sizeof(uint32_t));
	    cmd->latency_buckets[i].read = (uint32_t *)cf_malloc(cmd->bucket_max * sizeof(uint32_t));
	    cmd->latency_buckets[i].batch = (uint32_t *)cf_malloc(cmd->bucket_max * sizeof(uint32_t));
	    cmd->latency_buckets[i].query = (uint32_t *)cf_malloc(cmd->bucket_max * sizeof(uint32_t));



	    for (j = 0; j < cmd->bucket_max; j++) {
	       cmd->latency_buckets[i].connection[j] = (uint32_t) as_latency_get_bucket(buckets, i);
	    }

	    buckets = &node_metrics->latency[1];
	    
	    for (j = 0; j < cmd->bucket_max; j++) {
	        cmd->latency_buckets[i].write[j] = (uint32_t) as_latency_get_bucket(buckets, i);
	    }

	    buckets = &node_metrics->latency[2];
	    
	    for (j = 0; j < cmd->bucket_max; j++) {
	        cmd->latency_buckets[i].read[j] = (uint32_t) as_latency_get_bucket(buckets, i);
	    }

	    buckets = &node_metrics->latency[3];
	    
	    for (j = 0; j < cmd->bucket_max; j++) {
	        cmd->latency_buckets[i].batch[j] = (uint32_t) as_latency_get_bucket(buckets, i);
	    }

	    buckets = &node_metrics->latency[4];
	    
	    for (j = 0; j < cmd->bucket_max; j++) {
	        cmd->latency_buckets[i].query[j] = (uint32_t) as_latency_get_bucket(buckets, i);
	    }

	}

	as_nodes_release(nodes);

	async_invoke_metrics_callback(cmd, execute_nothing, respond_disable);
	
	return (as_status) 0;
}

static void *prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	MetricsCommand *cmd =
		new MetricsCommand(client, info[5].As<Function>());
	LogInfo *log = client->log;


	if (info[1]->IsFunction()) {
		if (info[2]->IsFunction() && info[3]->IsFunction() && info[4]->IsFunction()) {

			cmd->enable_callback.Reset(info[1].As<Function>());
			cmd->snapshot_callback.Reset(info[2].As<Function>());
			cmd->node_close_callback.Reset(info[3].As<Function>());
			cmd->disable_callback.Reset(info[4].As<Function>());

			cmd->listeners = (as_metrics_listeners *)cf_malloc(sizeof(as_metrics_listeners));

			cmd->listeners->enable_listener = enable_listener;
			cmd->listeners->snapshot_listener = snapshot_listener;
			cmd->listeners->node_close_listener = node_close_listener;
			cmd->listeners->disable_listener = disable_listener;
			cmd->listeners->udata = cmd;

		}
		else {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM, "If one metrics callback is set, all metrics callbacks must be set");
		}
	}

	cmd->policy = (as_metrics_policy *)cf_malloc(sizeof(as_metrics_policy));
	if (info[0]->IsObject()) {
		if (metricspolicy_from_jsobject_with_listeners(cmd->policy, info[0].As<Object>(), cmd->listeners, log) !=
			AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Metrics policy parameter invalid");
		}
	}
	else{
		as_metrics_policy_init(cmd->policy);
	}

	return cmd;
}

static void execute(uv_work_t *req)
{

	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);
	LogInfo *log = cmd->log;


	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Executing MetricsCommand command, enabling Metrics");
	aerospike_enable_metrics(cmd->as, &cmd->err, cmd->policy);
}

static void respond(uv_work_t *req, int status)
{
	Nan::HandleScope scope;

	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);


	Local<Value> argv[] = {Nan::Null(), Nan::Null()};
	if (!(cmd->IsError())){
		cmd->Callback(2, argv);
	}
	else {
		cmd->ErrorCallback();
	}
	delete req;
}


NAN_METHOD(AerospikeClient::EnableMetrics)
{
	TYPE_CHECK_OPT(info[0], IsObject, "policy must be an object");
	TYPE_CHECK_OPT(info[1], IsFunction, "enableListener must be a function");
	TYPE_CHECK_OPT(info[2], IsFunction, "snapshotListener must be a function");
	TYPE_CHECK_OPT(info[3], IsFunction, "nodeCloseListener must be a function");
	TYPE_CHECK_OPT(info[4], IsFunction, "disableListener must be a function");
	TYPE_CHECK_OPT(info[5], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}



