#pragma once

#include <cstdint>
#include "command.h"

class MetricsCommand : public AerospikeCommand {
public:
  MetricsCommand(AerospikeClient *client, v8::Local<v8::Function> callback_);
  ~MetricsCommand();


	bool* client_closed;
	AerospikeClient* client;

	struct as_cluster_s* cluster = NULL;

	struct as_node_s* node = NULL;

	bool disabled = false;
	char* report_dir = NULL;
	as_metrics_policy* policy = NULL;
	v8::Local<v8::Object> v8_cluster;
	v8::Local<v8::Object> v8_cluster_disable;
	v8::Local<v8::Object> v8_node;


	Nan::Persistent<v8::Function> enable_callback;
	Nan::Persistent<v8::Function> snapshot_callback;
	Nan::Persistent<v8::Function> node_close_callback;
	Nan::Persistent<v8::Function> disable_callback;

  void Enable_Callback(const int argc, v8::Local<v8::Value> argv[]);
  void Snapshot_Callback(const int argc, v8::Local<v8::Value> argv[]);
  void Node_Close_Callback(const int argc, v8::Local<v8::Value> argv[]);
  void Disable_Callback(const int argc, v8::Local<v8::Value> argv[]);


  void Enable_Callback_Config(const int argc, v8::Local<v8::Value> argv[]);
  void Snapshot_Callback_Config(const int argc, v8::Local<v8::Value> argv[]);
  void Node_Close_Callback_Config(const int argc, v8::Local<v8::Value> argv[]);
  void Disable_Callback_Config(const int argc, v8::Local<v8::Value> argv[]);


};

using MetricsInvoker = std::function<void(MetricsCommand*)>;

void enable_response(uv_work_t *req, int status);
void snapshot_response(uv_work_t *req, int status);
void node_close_response(uv_work_t *req, int status);
void disable_response(uv_work_t *req, int status);

void enable_response_config(uv_work_t *req, int status);
void snapshot_response_config(uv_work_t *req, int status);
void node_close_response_config(uv_work_t *req, int status);
void disable_response_config(uv_work_t *req, int status);

void respond_generic(uv_work_t *req, int status, MetricsInvoker invoker, const char* message, bool delete_cmd = false);


// C listeners
as_status enable_listener(as_error* err, void* udata);
as_status snapshot_listener(as_error* err, struct as_cluster_s* cluster, void* udata);
as_status node_close_listener(as_error* err, struct as_node_s* node, void* udata);
as_status disable_listener(as_error* err, struct as_cluster_s* cluster, void* udata);

as_status enable_listener_config(as_error* err, void* udata);
as_status snapshot_listener_config(as_error* err, struct as_cluster_s* cluster, void* udata);
as_status node_close_listener_config(as_error* err, struct as_node_s* node, void* udata);
as_status disable_listener_config(as_error* err, struct as_cluster_s* cluster, void* udata);

as_status run_metrics_listener(as_error* err, void* udata, void (*callback)(uv_work_t*, int),  struct as_cluster_s* cluster, struct as_node_s* node, bool is_disable, bool is_disable_config);
//void prepare_disable(as_error* err, struct as_cluster_s* cluster, as_metrics_policy* policy,  void* udata);
//void prepare_snapshot(as_error* err, struct as_cluster_s* cluster, as_metrics_policy* policy,  void* udata);

v8::Local<v8::Value> prepare_disable_cluster_arg(MetricsCommand* cmd, as_metrics_policy* policy);
v8::Local<v8::Value> prepare_cluster_arg(MetricsCommand* cmd, as_metrics_policy* policy);
v8::Local<v8::Value> prepare_node_arg(MetricsCommand* cmd);