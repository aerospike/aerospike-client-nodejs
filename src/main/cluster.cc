/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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
#include "conversions.h"
#include "events.h"
#include "log.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/as_async_proto.h>
#include <aerospike/as_cluster.h>
}

using namespace v8;

/**
 * Connect to an Aerospike Cluster
 */
NAN_METHOD(AerospikeClient::Connect)
{
    Nan::HandleScope scope;
    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

    Local<Function> callback;
    if (info.Length() > 0 && info[0]->IsFunction()) {
        callback = Local<Function>::Cast(info[0]);
    } else {
        as_v8_error(client->log, "Callback function required");
        return Nan::ThrowError("Callback function required");
    }

    as_error err;
    aerospike_connect(client->as, &err);
    if (err.code != AEROSPIKE_OK) {
        as_v8_error(client->log, "Connecting to Cluster Failed: %s", err.message);
    } else {
        as_v8_debug(client->log, "Connecting to Cluster: Success");
    }

    const int argc = 1;
    Local<Value> argv[argc] = { error_to_jsobject(&err, client->log) };
    Nan::MakeCallback(Nan::GetCurrentContext()->Global(), callback, argc, argv);
}

/**
 *  Close the connections to the Aeropsike cluster.
 */
NAN_METHOD(AerospikeClient::Close)
{
	Nan::HandleScope scope;
	AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

	as_v8_debug(client->log, "Closing the connection to aerospike cluster");
	as_error err;
	events_callback_close(&client->as->config);
	aerospike_close(client->as, &err);
	aerospike_destroy(client->as);
	free(client->as);
	free(client->log);
}

/**
 * Is cluster connected to any server nodes.
 */
NAN_METHOD(AerospikeClient::IsConnected)
{
    Nan::HandleScope scope;
    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

    bool connected = aerospike_cluster_is_connected(client->as);

	info.GetReturnValue().Set(Nan::New(connected));
}

/**
 * Are there any pending async commands.
 */
NAN_METHOD(AerospikeClient::HasPendingAsyncCommands)
{
	Nan::HandleScope scope;
	AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

	bool pending = as_async_get_pending(client->as->cluster) > 0;

	info.GetReturnValue().Set(Nan::New(pending));
}

/**
 * Adds a seed host to the cluster.
 */
NAN_METHOD(AerospikeClient::AddSeedHost)
{
	Nan::HandleScope scope;
	AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

	TYPE_CHECK_REQ(info[0], IsString, "hostname must be a string");
	TYPE_CHECK_REQ(info[1], IsNumber, "port must be a number");

	String::Utf8Value hostname(info[0]->ToString());
	uint16_t port = (uint16_t) info[1]->ToInteger()->Value();

	as_cluster_add_seed(client->as->cluster, *hostname, NULL, port);
}

/**
 * Removes a seed host from the cluster.
 */
NAN_METHOD(AerospikeClient::RemoveSeedHost)
{
	Nan::HandleScope scope;
	AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

	TYPE_CHECK_REQ(info[0], IsString, "hostname must be a string");
	TYPE_CHECK_REQ(info[1], IsNumber, "port must be a number");

	String::Utf8Value hostname(info[0]->ToString());
	uint16_t port = (uint16_t) info[1]->ToInteger()->Value();

	as_cluster_remove_seed(client->as->cluster, *hostname, port);
}
