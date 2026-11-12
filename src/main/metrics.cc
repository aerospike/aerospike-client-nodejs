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

static void metrics_async_cb(uv_async_t *handle)
{
	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(handle->data);
	if (cmd) {
		cmd->Deliver(false);
	}
}

static void metrics_async_close_cb(uv_handle_t *handle)
{
	delete reinterpret_cast<uv_async_t *>(handle);
}

static void free_event(MetricsEvent *event)
{
	delete event->cluster;
	delete event->node;
}

MetricsCommand::MetricsCommand(AerospikeClient *client, v8::Local<v8::Function> callback_)
  : AerospikeCommand("Metrics", client, callback_) {
    this->client = client;
    this->client_closed = (&(client->closed));

	as_queue_mt_init(&events, sizeof(MetricsEvent), 4);
	// The C client calls the listeners on its own threads, where only
	// uv_async_send() is safe.
	async = new uv_async_t;
	uv_async_init(uv_default_loop(), async, metrics_async_cb);
	async->data = this;
	// Metrics must not keep the process alive.
	uv_unref(reinterpret_cast<uv_handle_t *>(async));
}

MetricsCommand::~MetricsCommand() {
  Nan::HandleScope scope;

	async->data = NULL;
	uv_close(reinterpret_cast<uv_handle_t *>(async), metrics_async_close_cb);

	MetricsEvent event;
	while (as_queue_mt_pop(&events, &event, 0)) {
		free_event(&event);
	}
	as_queue_mt_destroy(&events);

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

void MetricsCommand::Push(MetricsEvent *event)
{
	as_queue_mt_push(&events, event);
	uv_async_send(async);
}

void MetricsCommand::Invoke(Nan::Persistent<v8::Function> &callback, const char *name,
							int argc, v8::Local<v8::Value> argv[])
{
	Nan::HandleScope scope;
	as_v8_debug(log, "Executing %s callback", name);

	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New(callback);

	runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}
}

void MetricsCommand::Deliver(bool keep_command)
{
	Nan::HandleScope scope;
	MetricsEvent event;

	while (as_queue_mt_pop(&events, &event, 0)) {
		if (event.type == METRICS_EVENT_DISABLE && keep_command) {
			// The caller still uses this command, so leave the disable event,
			// which deletes it, to the async callback.
			as_queue_mt_push(&events, &event);
			uv_async_send(async);
			return;
		}

		// Listeners don't run once metrics are disabled or the client is closed.
		if (!disabled && !(*client_closed)) {
			switch (event.type) {
			case METRICS_EVENT_ENABLE: {
				Local<Value> argv[] = {Nan::Null()};
				Invoke(event.is_config ? client->enable_callback : enable_callback,
					   "Enable", 1, argv);
				break;
			}
			case METRICS_EVENT_SNAPSHOT: {
				Local<Object> v8_cluster = Nan::New<Object>();
				cluster_snapshot_to_jsobject(event.cluster, v8_cluster, log);
				Local<Value> argv[] = {v8_cluster};
				Invoke(event.is_config ? client->snapshot_callback : snapshot_callback,
					   "Snapshot", 1, argv);
				break;
			}
			case METRICS_EVENT_NODE_CLOSE: {
				Local<Object> v8_node = Nan::New<Object>();
				node_snapshot_to_jsobject(event.node, v8_node, log);
				Local<Value> argv[] = {v8_node};
				Invoke(event.is_config ? client->node_close_callback : node_close_callback,
					   "Node Close", 1, argv);
				break;
			}
			case METRICS_EVENT_DISABLE: {
				disabled = true;
				Local<Object> v8_cluster = Nan::New<Object>();
				cluster_snapshot_to_jsobject(event.cluster, v8_cluster, log);
				Local<Value> argv[] = {v8_cluster};
				Invoke(event.is_config ? client->disable_callback : disable_callback,
					   "Disable", 1, argv);
				break;
			}
			}
		}

		bool last = event.type == METRICS_EVENT_DISABLE;
		free_event(&event);

		if (last) {
			// Metrics are off and the C client won't call the listeners again.
			delete this;
			return;
		}
	}
}

// Runs on the C client thread that calls the listener: copy what the JS
// listener needs while the cluster and node are still valid.
static as_status queue_metrics_event(void *udata, MetricsEventType type, bool is_config,
									 struct as_cluster_s *cluster, struct as_node_s *node)
{
	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(udata);
	if (!cmd || cmd->disabled) {
		return AEROSPIKE_OK;
	}

	MetricsEvent event = {type, is_config, NULL, NULL};

	if (cluster) {
		as_metrics_policy *policy = is_config
			? &cmd->client->as->config.policies.metrics
			: cmd->policy;
		event.cluster = new MetricsClusterSnapshot();
		metrics_cluster_snapshot(cluster, policy, event.cluster);
	}

	if (node) {
		event.node = new MetricsNodeSnapshot();
		metrics_node_snapshot(node, event.node);
	}

	cmd->Push(&event);
	return AEROSPIKE_OK;
}

// Listeners provided through a Command-Level Policy

as_status enable_listener(as_error* err, void* udata) {
	return queue_metrics_event(udata, METRICS_EVENT_ENABLE, false, NULL, NULL);
}

as_status snapshot_listener(as_error* err, struct as_cluster_s* cluster, void* udata) {
	return queue_metrics_event(udata, METRICS_EVENT_SNAPSHOT, false, cluster, NULL);
}

as_status node_close_listener(as_error* err, struct as_node_s* node, void* udata) {
	return queue_metrics_event(udata, METRICS_EVENT_NODE_CLOSE, false, NULL, node);
}

as_status disable_listener(as_error* err, struct as_cluster_s* cluster, void* udata) {
	return queue_metrics_event(udata, METRICS_EVENT_DISABLE, false, cluster, NULL);
}

// Listeners provided through a Config-Level Policy

as_status enable_listener_config(as_error* err, void* udata) {
	return queue_metrics_event(udata, METRICS_EVENT_ENABLE, true, NULL, NULL);
}

as_status snapshot_listener_config(as_error* err, struct as_cluster_s* cluster, void* udata) {
	return queue_metrics_event(udata, METRICS_EVENT_SNAPSHOT, true, cluster, NULL);
}

as_status node_close_listener_config(as_error* err, struct as_node_s* node, void* udata) {
	return queue_metrics_event(udata, METRICS_EVENT_NODE_CLOSE, true, NULL, node);
}

as_status disable_listener_config(as_error* err, struct as_cluster_s* cluster, void* udata) {
	return queue_metrics_event(udata, METRICS_EVENT_DISABLE, true, cluster, NULL);
}
