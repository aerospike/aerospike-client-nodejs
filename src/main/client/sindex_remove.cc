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

#define NS_NAME 0
#define INDEX_NAME 1
#define INFO_POLICY 2
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
    as_policy_info* policy;
    as_namespace ns;
    char * index;
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
    // Unwrap 'this'
    AerospikeClient * client    = ObjectWrap::Unwrap<AerospikeClient>(info.This());

    // Build the async data
    AsyncData * data            = new AsyncData;
    data->as                    = client->as;
    // Local variables
    data->policy                        = NULL;
    LogInfo * log               = data->log = client->log;
    data->param_err             = 0;
    int argc                    = info.Length();


    // The last argument should be a callback function.
    if ( info[argc-1]->IsFunction()) {
        //NanAssignPersistent(data->callback, info[argc-1].As<Function>());
        data->callback.Reset(info[argc-1].As<Function>());
        as_v8_detail(log, "Node.js Callback Registered");
    }
    else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        data->param_err = 1;
        return data;
    }

    // The first argument should be the namespace name.
    if ( info[NS_NAME]->IsString()) {
        strcpy( data->ns, *String::Utf8Value(info[NS_NAME]->ToString()));
        as_v8_detail(log, "The index creation on namespace %s", data->ns);
    }
    else {
        as_v8_error(log, "namespace should be string");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        data->param_err = 1;
        return data;
    }

    if ( info[INDEX_NAME]->IsString()) {
        data->index = strdup(*String::Utf8Value(info[INDEX_NAME]->ToString()));
        as_v8_detail(log, "The index to be created %s", data->index);
    }
    else
    {
        as_v8_error(log, "index name should be passed as a string");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        data->param_err = 1;
        return data;
    }

    if ( argc > 3 ) {
        if ( !info[INFO_POLICY]->IsUndefined() && !info[INFO_POLICY]->IsNull())
        {
            data->policy = (as_policy_info*)cf_malloc(sizeof(as_policy_info));
            if(infopolicy_from_jsobject(data->policy, info[INFO_POLICY]->ToObject(), log) != AS_NODE_PARAM_OK) {
                as_v8_error(log, "infopolicy shoule be an object");
                COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
                data->param_err = 1;
                return data;
            }
        }
    }

    as_v8_debug(log, "Parsing node.js Data Structures : Success");
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
    as_policy_info* policy   = data->policy;
    LogInfo * log            = data->log;

    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        as_v8_error(log, "Not connected to cluster ");
    }

    if ( data->param_err == 0) {
        as_v8_debug(log, "Invoking aerospike index remove");
        aerospike_index_remove(as, err, policy, data->ns, data->index);
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
    as_v8_debug(log, "SINDEX remove : response is");
    // AS_DEBUG(log, ERROR, err);

    Local<Value> argv[1];
    // Build the arguments array for the callback
    if (data->param_err == 0) {
        argv[0] = (error_to_jsobject(err, log));
        // AS_DEBUG(log, _KEY,  key);
    }
    else {
        err->func = NULL;
        as_v8_debug(log, "Parameter error for sindex remove");
        argv[0] = (error_to_jsobject(err, log));
    }

    // Surround the callback in a try/catch for safety
    Nan::TryCatch try_catch;
    
    Local<Function> cb = Nan::New<Function>(data->callback);
    // Execute the callback.
    if ( !cb->IsNull() ) {
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 1, argv);
        as_v8_debug(log, "Invoked sindex remove callback");
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
        if(data->policy != NULL)
        {
            cf_free(data->policy);
        }
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
NAN_METHOD(AerospikeClient::sindexRemove)
{
    async_invoke(info, prepare, execute, respond);
}
