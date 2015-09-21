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
	Nan::HandleScope scope;
    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());
    
    Local<Function> callback;
    
    if (info.Length() > 0 && info[0]->IsFunction()) {
        callback = Local<Function>::Cast(info[0]);
    }
    else {
        as_v8_error(client->log, " Callback not provided, Parameter error");
        //NanReturnNull();
        info.GetReturnValue().Set(info.Holder());
    }

    as_error err;

    aerospike_connect(client->as, &err);

    Local<Value> argv[2];

    argv[0] = Nan::New<Value>(error_to_jsobject(&err, client->log));

    if (err.code != AEROSPIKE_OK) {
        client->as->cluster = NULL;
        argv[1] = Nan::New<Value>(info.Holder());
        as_v8_error(client->log, "Connecting to Cluster Failed");
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), callback, 2, argv);
        //NanReturnNull();
        info.GetReturnValue().Set(info.Holder());
    }
    else {
        argv[1] = Nan::New<Value>(info.Holder());
        as_v8_debug(client->log, "Connecting to Cluster: Success");
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), callback, 2, argv);
        //NanReturnValue(info.Holder());
        info.GetReturnValue().Set(info.Holder());
    }
}
