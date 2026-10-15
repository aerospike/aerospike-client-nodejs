/*******************************************************************************
 * Copyright 2026 Aerospike, Inc.
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
#include "log.h"

extern "C" {
#include <aerospike/as_metrics.h>
#include <aerospike/as_status.h>
}

using namespace v8;

class MetricsSnapshotCommand : public AerospikeCommand {
  public:
	MetricsSnapshotCommand(AerospikeClient *client, Local<Function> callback_)
		: AerospikeCommand("MetricsSnapshot", client, callback_)
	{
	}

	~MetricsSnapshotCommand()
	{
		if (snapshot != NULL)
			as_metrics_snapshot_destroy(snapshot);
	}

	as_metrics_snapshot *snapshot = NULL;
};

static void set(Local<Object> obj, const char *name, Local<Value> value)
{
	Nan::Set(obj, Nan::New(name).ToLocalChecked(), value);
}

static Local<Value> num(uint64_t value)
{
	return Nan::New<Number>((double)value);
}

static Local<Value> str(const char *value)
{
	return Nan::New(value ? value : "").ToLocalChecked();
}

static Local<Object> conn_to_jsobject(const as_metrics_conn_snapshot *conn)
{
	Local<Object> obj = Nan::New<Object>();
	set(obj, "inUse", num(conn->in_use));
	set(obj, "inPool", num(conn->in_pool));
	set(obj, "opened", num(conn->opened));
	set(obj, "closed", num(conn->closed));
	set(obj, "recovered", num(conn->recovered));
	set(obj, "aborted", num(conn->aborted));
	return obj;
}

static Local<Object>
namespace_to_jsobject(const as_metrics_namespace_snapshot *ns)
{
	Local<Object> obj = Nan::New<Object>();
	set(obj, "name", str(ns->name));
	set(obj, "errors", num(ns->errors));
	set(obj, "clientTimeouts", num(ns->client_timeouts));
	set(obj, "serverTimeouts", num(ns->server_timeouts));
	set(obj, "keyBusy", num(ns->key_busy));
	set(obj, "recordTooBig", num(ns->record_too_big));
	set(obj, "deviceOverload", num(ns->device_overload));
	set(obj, "bytesIn", num(ns->bytes_in));
	set(obj, "bytesOut", num(ns->bytes_out));
	return obj;
}

static Local<Object> node_to_jsobject(const as_metrics_node_snapshot *node)
{
	Local<Object> obj = Nan::New<Object>();
	set(obj, "name", str(node->name));
	set(obj, "address", str(node->address));
	set(obj, "port", num(node->port));
	set(obj, "syncConnections", conn_to_jsobject(&node->sync));
	set(obj, "asyncConnections", conn_to_jsobject(&node->async));
	set(obj, "connectionOpenFailures", num(node->conn_open_failures));
	set(obj, "connectionTlsHandshakeFailures",
		num(node->conn_tls_handshake_failures));
	set(obj, "connectionAuthFailures", num(node->conn_auth_failures));

	Local<Array> namespaces = Nan::New<Array>(node->namespace_count);
	for (uint32_t i = 0; i < node->namespace_count; i++) {
		Nan::Set(namespaces, i, namespace_to_jsobject(&node->namespaces[i]));
	}
	set(obj, "namespaces", namespaces);
	return obj;
}

static Local<Array> nodes_to_jsarray(as_metrics_node_snapshot **nodes,
									 uint32_t count)
{
	Local<Array> arr = Nan::New<Array>(count);
	for (uint32_t i = 0; i < count; i++) {
		Nan::Set(arr, i, node_to_jsobject(nodes[i]));
	}
	return arr;
}

static Local<Object> snapshot_to_jsobject(const as_metrics_snapshot *snap)
{
	Local<Object> obj = Nan::New<Object>();
	set(obj, "timestamp", str(snap->timestamp));
	set(obj, "metricsEnabled", Nan::New(snap->metrics_enabled));
	set(obj, "operationalMetricsEnabled",
		Nan::New(snap->operational_metrics_enabled));
	set(obj, "usageMetricsEnabled", Nan::New(snap->usage_metrics_enabled));
	set(obj, "clusterName", str(snap->cluster_name));
	set(obj, "clientType", str(snap->client_type));
	set(obj, "clientVersion", str(snap->client_version));
	set(obj, "appId", str(snap->app_id));

	Local<Object> labels = Nan::New<Object>();
	for (uint32_t i = 0; i < snap->label_count; i++) {
		set(labels, snap->labels[i].name, str(snap->labels[i].value));
	}
	set(obj, "labels", labels);

	set(obj, "recoverQueueSize", num(snap->recover_queue_size));
	set(obj, "invalidNodeCount", num(snap->invalid_node_count));
	set(obj, "delayQueueTimeoutCount", num(snap->delay_queue_timeout_count));
	set(obj, "commandCount", num(snap->command_count));
	set(obj, "commandRetries", num(snap->retry_count));
	set(obj, "validationOpenFailures", num(snap->validation_open_failures));
	set(obj, "validationTlsHandshakeFailures",
		num(snap->validation_tls_handshake_failures));
	set(obj, "validationAuthFailures", num(snap->validation_auth_failures));

	Local<Object> usage = Nan::New<Object>();
	set(usage, "blocking", num(snap->api_blocking));
	set(usage, "deferred", num(snap->api_deferred));
	set(usage, "background", num(snap->api_background));
	set(obj, "usage", usage);

	set(obj, "cpuPercent", num(snap->cpu));
	set(obj, "memoryBytes", num(snap->mem));

	Local<Array> loops = Nan::New<Array>(snap->event_loop_count);
	for (uint32_t i = 0; i < snap->event_loop_count; i++) {
		Local<Object> loop = Nan::New<Object>();
		set(loop, "processSize", Nan::New(snap->event_loops[i].process_size));
		set(loop, "queueSize", num(snap->event_loops[i].queue_size));
		Nan::Set(loops, i, loop);
	}
	set(obj, "eventLoops", loops);

	set(obj, "nodes", nodes_to_jsarray(snap->nodes, snap->nodes_count));
	set(obj, "nodesDeparted",
		nodes_to_jsarray(snap->nodes_departed, snap->nodes_departed_count));

	set(obj, "latencyUnit", num(snap->latency_unit));
	set(obj, "latencyColumns", num(snap->latency_columns));
	set(obj, "latencyShift", num(snap->latency_shift));
	return obj;
}

static void *prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	return new MetricsSnapshotCommand(client, info[0].As<Function>());
}

static void execute(uv_work_t *req)
{
	MetricsSnapshotCommand *cmd =
		reinterpret_cast<MetricsSnapshotCommand *>(req->data);

	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(cmd->log, "Executing MetricsSnapshot command");
	aerospike_get_metrics_snapshot(cmd->as, &cmd->err, &cmd->snapshot);
}

static void respond(uv_work_t *req, int status)
{
	Nan::HandleScope scope;
	MetricsSnapshotCommand *cmd =
		reinterpret_cast<MetricsSnapshotCommand *>(req->data);

	if (cmd->IsError()) {
		cmd->ErrorCallback();
	}
	else if (cmd->snapshot == NULL) {
		CmdErrorCallback(cmd, AEROSPIKE_ERR_CLIENT, "Client is not connected");
	}
	else {
		Local<Value> argv[] = {Nan::Null(), snapshot_to_jsobject(cmd->snapshot)};
		cmd->Callback(2, argv);
	}

	delete cmd;
	delete req;
}

NAN_METHOD(AerospikeClient::MetricsSnapshot)
{
	TYPE_CHECK_REQ(info[0], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
