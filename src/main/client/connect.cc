/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
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

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/aerospike_key.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_key.h>
    #include <aerospike/as_record.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 * Connect to an Aerospike Cluster
 */
NAN_METHOD(AerospikeClient::Connect)
{
	NanScope();
    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());
    
    Local<Function> callback;
    
    if (args.Length() > 0 && args[0]->IsFunction()) {
        callback = Local<Function>::Cast(args[0]);
    }
    else {
        as_v8_error(client->log, " Callback not provided, Parameter error");
        NanReturnNull();
    }

    as_error err;

    aerospike_connect(client->as, &err);

    Handle<Value> argv[2];

    argv[0] = error_to_jsobject(&err, client->log);

    if (err.code != AEROSPIKE_OK) {
        client->as->cluster = NULL;
        argv[1] = args.Holder();
        as_v8_error(client->log, "Connecting to Cluster Failed");
		NanMakeCallback(NanGetCurrentContext()->Global(), callback, 2, argv);
        NanReturnNull();
    }
    else {
        argv[1] = args.Holder();
        as_v8_debug(client->log, "Connecting to Cluster: Success");
		NanMakeCallback(NanGetCurrentContext()->Global(), callback, 2, argv);
        NanReturnValue(args.Holder());
    }
}
