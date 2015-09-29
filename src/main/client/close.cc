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
#include "log.h"
#include "async.h"

using namespace v8;

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  Close the connections to the Aeropsike cluster.
 */
NAN_METHOD(AerospikeClient::Close)
{
    //should call aerospike_close and aerospike_destroy
    Nan::HandleScope scope;

    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());
    as_error err;
    as_v8_debug(client->log, "Closing the connection to aerospike cluster");
    aerospike_close( client->as, &err);
    as_v8_debug(client->log, "Destroying aeropsike object");
    aerospike_destroy( client->as);
    free(client->as);
    free(client->log);
    info.GetReturnValue().Set(Nan::Undefined());
}
