/*******************************************************************************
 * Copyright 2018 Aerospike, Inc.
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

//==========================================================
// Includes.
//

#include <node.h>

#include "client.h"

extern "C" {
#include <aerospike/aerospike_stats.h>
}

using namespace v8;

//==========================================================
// Typedefs & constants.
//

//==========================================================
// Globals.
//

//==========================================================
// Forward Declarations.
//

static Local<Object> build_cluster_stats(as_cluster_stats* stats);
static Local<Object> build_conn_stats(as_conn_stats* stats);
static Local<Object> build_event_loop_stats(as_event_loop_stats* stats);
static Local<Object> build_node_stats(as_node_stats* stats);

//==========================================================
// Inlines and Macros.
//

//==========================================================
// Public API.
//

NAN_METHOD(AerospikeClient::GetStats)
{
	Nan::HandleScope scope;
	AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	if (client->closed) return;

	as_cluster_stats cluster_stats;
	aerospike_stats(client->as, &cluster_stats);
	Local<Object> stats = build_cluster_stats(&cluster_stats);
	aerospike_stats_destroy(&cluster_stats);
	info.GetReturnValue().Set(stats);
}

//==========================================================
// Local helpers.
//

static Local<Object>
build_event_loop_stats(as_event_loop_stats* event_loop_stats)
{
	Local<Object> stats = Nan::New<Object>();
	Nan::Set(stats, Nan::New("inFlight").ToLocalChecked(), Nan::New<Int32>(event_loop_stats->process_size));
	Nan::Set(stats, Nan::New("queued").ToLocalChecked(), Nan::New<Uint32>(event_loop_stats->queue_size));
	return stats;
}

static Local<Object>
build_conn_stats(as_conn_stats* conn)
{
	Local<Object> stats = Nan::New<Object>();
	Nan::Set(stats, Nan::New("inPool").ToLocalChecked(), Nan::New<Int32>(conn->in_pool));
	Nan::Set(stats, Nan::New("inUse").ToLocalChecked(), Nan::New<Int32>(conn->in_use));
	return stats;
}

static Local<Object>
build_node_stats(as_node_stats* node)
{
	Local<Object> stats = Nan::New<Object>();
	Nan::Set(stats, Nan::New("name").ToLocalChecked(), Nan::New(node->node->name).ToLocalChecked());
	Nan::Set(stats, Nan::New("syncConnections").ToLocalChecked(), build_conn_stats(&node->sync));
	Nan::Set(stats, Nan::New("asyncConnections").ToLocalChecked(), build_conn_stats(&node->async));
	return stats;
}

static Local<Object>
build_cluster_stats(as_cluster_stats* cluster)
{
	Local<Object> stats = Nan::New<Object>();
	Nan::Set(stats, Nan::New("commands").ToLocalChecked(), build_event_loop_stats(&cluster->event_loops[0]));
	Local<Array> nodes = Nan::New<Array>();
	for (uint32_t i = 0; i < cluster->nodes_size; i++) {
		Nan::Set(nodes, i, build_node_stats(&cluster->nodes[i]));
	}
	Nan::Set(stats, Nan::New("nodes").ToLocalChecked(), nodes);
	return stats;
}
