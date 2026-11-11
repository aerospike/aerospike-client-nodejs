#pragma once

#include <atomic>
#include <cstdint>
#include "command.h"
#include "conversions.h"

extern "C" {
#include <aerospike/as_queue_mt.h>
}

enum MetricsEventType {
	METRICS_EVENT_ENABLE,
	METRICS_EVENT_SNAPSHOT,
	METRICS_EVENT_NODE_CLOSE,
	METRICS_EVENT_DISABLE
};

// One metrics listener call. The C client calls the listeners on its own
// threads, so the data is copied there and the JS listener runs later on the
// event-loop thread.
struct MetricsEvent {
	MetricsEventType type;
	bool is_config;
	MetricsClusterSnapshot* cluster;
	MetricsNodeSnapshot* node;
};

class MetricsCommand : public AerospikeCommand {
public:
  MetricsCommand(AerospikeClient *client, v8::Local<v8::Function> callback_);
  ~MetricsCommand();

	// Called from any thread: queue an event for the event-loop thread.
	void Push(MetricsEvent* event);

	// Event-loop thread only: run the JS listeners for the queued events. The
	// disable event deletes this command, unless keep_command is set; then it
	// is left for the async callback.
	void Deliver(bool keep_command);

	bool* client_closed;
	AerospikeClient* client;

	// Read by the C client's threads.
	std::atomic<bool> disabled{false};
	char* report_dir = NULL;
	as_metrics_policy* policy = NULL;

	Nan::Persistent<v8::Function> enable_callback;
	Nan::Persistent<v8::Function> snapshot_callback;
	Nan::Persistent<v8::Function> node_close_callback;
	Nan::Persistent<v8::Function> disable_callback;

private:
	uv_async_t* async;
	as_queue_mt events;

	void Invoke(Nan::Persistent<v8::Function> &callback, const char* name, int argc, v8::Local<v8::Value> argv[]);
};

// C listeners
as_status enable_listener(as_error* err, void* udata);
as_status snapshot_listener(as_error* err, struct as_cluster_s* cluster, void* udata);
as_status node_close_listener(as_error* err, struct as_node_s* node, void* udata);
as_status disable_listener(as_error* err, struct as_cluster_s* cluster, void* udata);

as_status enable_listener_config(as_error* err, void* udata);
as_status snapshot_listener_config(as_error* err, struct as_cluster_s* cluster, void* udata);
as_status node_close_listener_config(as_error* err, struct as_node_s* node, void* udata);
as_status disable_listener_config(as_error* err, struct as_cluster_s* cluster, void* udata);
