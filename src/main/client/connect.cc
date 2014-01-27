/*******************************************************************************
 * Copyright 2013 Aerospike Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
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

#include "../client.h"
#include "../util/async.h"
#include "../util/conversions.h"
#include "../util/log.h"

using namespace v8;

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 * Connect to an Aerospike Cluster
 */
Handle<Value> AerospikeClient::Connect(const Arguments& args)
{
    NODE_ISOLATE_DECL;
    HANDLESCOPE;

    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());
    
    Local<Function> callback;
    
    if (args.Length() > 0 && args[0]->IsFunction()) {
        callback = Local<Function>::Cast(args[0]);
    }
    else {
        as_v8_error(client->log, " Callback not provided, Parameter error");
        return Null();
    }

    as_error err;

    aerospike_connect(client->as, &err);

    Handle<Value> argv[2];

    argv[0] = error_to_jsobject(&err, client->log);

    if (err.code != AEROSPIKE_OK) {
        client->as->cluster = NULL;
        argv[1] = Null();
        as_v8_error(client->log, "Connecting to Cluster Failed");
        callback->Call(Context::GetCurrent()->Global(), 2, argv);
        return scope.Close(Null());
    }
    else {
        argv[1] = client->handle_;
        as_v8_debug(client->log, "Connecting to Cluster: Success");
        callback->Call(Context::GetCurrent()->Global(), 2, argv);
        return scope.Close(client->handle_);
    }
}
