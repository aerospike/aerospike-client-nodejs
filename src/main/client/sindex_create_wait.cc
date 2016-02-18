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
    #include <aerospike/as_config.h>
    #include <aerospike/aerospike_index.h>
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
 *  TYPES
 ******************************************************************************/

/**
 *  AsyncData — Data to be used in async calls.
 *
 *  libuv allows us to pass around a pointer to an arbitraty object when
 *  running asynchronous functions. We create a data structure to hold the
 *  data we need during and after async work.
 */
typedef struct AsyncData {
    aerospike * as;
    int param_err;
    as_error err;
    as_index_task task;
    uint32_t interval_ms;
    LogInfo * log;
    Nan::Persistent<Function> callback;
} AsyncData;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

/**
 *  prepare() — Function to prepare AsyncData, for use in `execute()` and `respond()`.
 *
 *  This should only keep references to V8 or V8 structures for use in
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void * prepare(ResolveArgs(info))
{
    Nan::HandleScope scope;

    AerospikeClient * client    = ObjectWrap::Unwrap<AerospikeClient>(info.This());

    AsyncData * data            = new AsyncData();
    data->as                    = client->as;
    data->param_err             = 0;
    data->task.as               = client->as;
    LogInfo * log = data->log   = client->log;

    Local<Value> maybe_ns = info[0];
    Local<Value> maybe_index_name = info[1];
    Local<Value> maybe_interval = info[2];
    Local<Value> maybe_callback = info[3];

    if (maybe_callback->IsFunction()) {
        data->callback.Reset(maybe_callback.As<Function>());
        as_v8_detail(log, "Node.js Callback Registered");
    } else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        data->param_err = 1;
        return data;
    }

    if (maybe_ns->IsString()) {
        strcpy(data->task.ns, *String::Utf8Value(maybe_ns->ToString()));
        as_v8_detail(log, "The index creation status for namespace %s", data->task.ns);
    } else {
        as_v8_error(log, "namespace should be string");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        data->param_err = 1;
        return data;
    }

    if (maybe_index_name->IsString()) {
        strcpy(data->task.name, *String::Utf8Value(maybe_index_name->ToString()));
        as_v8_detail(log, "The index creation status to be checked for %s", data->task.name);
    } else {
        as_v8_error(log, "index name should be passed as a string");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        data->param_err = 1;
        return data;
    }

    if(maybe_interval->IsInt32()) {
        data->interval_ms = maybe_interval->ToInt32()->Value();
        as_v8_detail(log, "Index creation status - polling interval %u", data->interval_ms);
    } else {
        as_v8_error(log, "Index creation wait - polling interval should be of type int32");
        data->param_err = 1;
        return data;
    }

    return data;
}

/**
 *  execute() — Function to execute inside the worker-thread.
 *
 *  It is not safe to access V8 or V8 data structures here, so everything
 *  we need for input and output should be in the AsyncData structure.
 */
static void execute(uv_work_t * req)
{
    // Fetch the AsyncData structure
    AsyncData * data         = reinterpret_cast<AsyncData *>(req->data);
    aerospike * as           = data->as;
    as_error *  err          = &data->err;
    LogInfo * log            = data->log;
    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        as_v8_error(log, "Not connected to cluster to put record");
    }

    if ( data->param_err == 0) {
        as_error_init(err);
        as_v8_debug(log, "Invoking aerospike index create wait");
        aerospike_index_create_wait( err, &data->task, data->interval_ms);
    }

}

/**
 *  AfterWork — Function to execute when the Work is complete
 *
 *  This function will be run inside the main event loop so it is safe to use
 *  V8 again. This is where you will convert the results into V8 types, and
 *  call the callback function with those results.
 */
static void respond(uv_work_t * req, int status)
{

    Nan::HandleScope scope;
    // Fetch the AsyncData structure
    AsyncData * data    = reinterpret_cast<AsyncData *>(req->data);
    as_error *  err     = &data->err;
    LogInfo * log       = data->log;
    as_v8_debug(log, "SINDEX creation wait : response ");

    Local<Value> argv[1];
    // Build the arguments array for the callback
    if (data->param_err == 0) {
        argv[0] = error_to_jsobject(err, log);
    }
    else {
        err->func = NULL;
        as_v8_debug(log, "Parameter error for put operation");
        argv[0] = error_to_jsobject(err, log);
    }

    // Surround the callback in a try/catch for safety
    Nan::TryCatch try_catch;

    Local<Function> cb = Nan::New<Function>(data->callback);
    // Execute the callback.
    if ( !cb->IsNull() ) {
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 1, argv);
        as_v8_debug(log, "Invoked index create wait callback");
    }

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        Nan::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    data->callback.Reset();

    // clean up any memory we allocated

    if ( data->param_err == 0) {
        as_v8_debug(log, "Cleaned up all the structures");
    }

    delete data;
    delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'put()' Operation
 */
NAN_METHOD(AerospikeClient::sindexCreateWait)
{
    async_invoke(info, prepare, execute, respond);
}
