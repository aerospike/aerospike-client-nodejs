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
    #include <aerospike/as_config.h>
    #include <aerospike/aerospike_info.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"

#define INFO_REQUEST_LEN  50
#define MAX_CLUSTER_SIZE  128

using namespace v8;

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

typedef struct node_info_result_s {
    char * response;
    char node[AS_NODE_NAME_MAX_SIZE];
} node_info_result;

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
    char * req;
    char * res;
    char * addr;
    uint16_t port;
    int num_nodes;
    node_info_result info_result_list[MAX_CLUSTER_SIZE];
    LogInfo * log;
    Nan::Persistent<Function> callback;
    Nan::Persistent<Function> done;
} AsyncData;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

bool aerospike_info_cluster_callback(const as_error * error, const as_node * node, const char * info_req, char * response, void *udata)
{
    // Scope for the callback operation.

    // Fetch the AsyncData structure
    AsyncData * data            = reinterpret_cast<AsyncData *>(udata);
    LogInfo * log               = data->log;
    node_info_result * results  = data->info_result_list;
    node_info_result * result   = NULL;

    if ( data->num_nodes >= 128 ) {
        as_v8_info(log, "Node's response could not be stored --cluster size exceeded");
        return false;
    }

    result = &results[data->num_nodes];

    if ( node->name != NULL) {
        as_v8_debug(log, "Response from node %s", node->name);
        strcpy(result->node, node->name);
    }
    else {
        result->node[0] = '\0';
        as_v8_debug(log, "No host name from cluster");
    }

    if ( response != NULL) {
        as_v8_debug(log, "Response is %s", response);
        result->response = (char*) cf_malloc(strlen(response) + 1);
        strcpy(result->response, response);
    }
    else {
        result->response = NULL;
        as_v8_debug(log,"No response from cluster");
    }

    data->num_nodes++;
    return true;
}

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

    // Build the async data
    AsyncData * data            = new AsyncData();
    data->as                    = client->as;
    data->param_err             = 0;
    data->num_nodes             = 0;
    data->addr                  = NULL;
    data->port                  = 0;
    data->policy                = NULL;
    LogInfo * log = data->log   = client->log;

    Local<Value> maybe_request = info[0];
    Local<Value> maybe_host = info[1];
    Local<Value> maybe_policy = info[2];
    Local<Value> maybe_info_callback = info[3];
    Local<Value> maybe_done_callback = info[4];

    if (maybe_request->IsString()) {
        data->req = (char*) malloc(INFO_REQUEST_LEN);
        strncpy(data->req, *String::Utf8Value(maybe_request->ToString()), INFO_REQUEST_LEN);
    } else if (maybe_request->IsNull() || maybe_request->IsUndefined()) {
        // request string is an optional parameter - ignore if missing
    } else {
        as_v8_error(log, "Request should be a String");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_host->IsObject()) {
        int rc = host_from_jsobject(maybe_host->ToObject(), &data->addr, &data->port, log);
        if (rc != AS_NODE_PARAM_OK ) {
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            as_v8_debug(log, "host parameter is invalid");
            data->param_err = 1;
        }
        // Why do we need this?
        data->num_nodes = 1;
    } else if (maybe_host->IsNull() || maybe_host->IsUndefined()) {
        // host is an optional parameter - ignore if missing
    } else {
        as_v8_error(log, "Host should be an object");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_policy->IsObject()) {
        data->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
        if (infopolicy_from_jsobject(data->policy, maybe_policy->ToObject(), log) != AS_NODE_PARAM_OK ) {
            as_v8_debug(log, "policy parameter is invalid");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            data->param_err = 1;
        }
    } else if (maybe_policy->IsNull() || maybe_policy->IsUndefined()) {
        // policy is an optional parameter - ignore if missing
    } else {
        as_v8_error(log, "Readpolicy should be an object");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_info_callback->IsFunction()) {
        data->callback.Reset(maybe_info_callback.As<Function>());
    } else {
        data->callback.Reset(Nan::New<FunctionTemplate>()->GetFunction());
    }

    if (maybe_done_callback->IsFunction()) {
        data->done.Reset(maybe_done_callback.As<Function>());
    } else {
        data->done.Reset(Nan::New<FunctionTemplate>()->GetFunction());
    }

    return data;

Err_Return:
    data->param_err = 1;
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
    char * request           = data->req;
    as_policy_info * policy  = data->policy;
    char * addr              = data->addr;
    uint16_t port            = data->port;
    LogInfo * log            = data->log;

    if ( addr  == NULL && port == 0 ) {

        // Invoke the blocking call.
        // The error is handled in the calling JS code.

        if ( as->cluster == NULL ) {
            data->param_err = 1;
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            return;
        }

        as_v8_debug(log, "info request on entire cluster");
        aerospike_info_foreach(as, err, policy, request, aerospike_info_cluster_callback, (void*)data);
    }
    else {
        node_info_result * results = data->info_result_list;
        node_info_result * result = &results[0];
        result->response = NULL;
        result->node[0] = '\0';
        as_v8_debug(log, "info command request:%s on host:%s, port:%d", request, addr, port);
        aerospike_info_host(as, err, policy, addr, port, request, &(result->response));
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

    // callback arguments
    Local<Value> argv[3];

    // Fetch the AsyncData structure
    AsyncData * data    = reinterpret_cast<AsyncData *>(req->data);
    as_error *  err     = &data->err;
    LogInfo * log       = data->log;
    int num             = data->num_nodes;

    node_info_result * results = data->info_result_list;

    as_v8_debug(log, "num of responses %d", num);

    for ( int i = 0 ; i < num; i++) {

        node_info_result * result = &results[i];

        // Build the arguments array for the callback
        if ( data->param_err == 0 ) {

            const char* node_name = result->node;
            char* response = result->response;

            // error object parameter
            argv[0] = error_to_jsobject(err, log);

            // response string parameter
            if ( response != NULL && strlen(response) > 0 ) {
                as_v8_debug(log, "Response is %s", response);
                argv[1] = Nan::New((const char*)response).ToLocalChecked();
            }
            else {
                argv[1] = Nan::Null();
            }

            // host object parameter
            if ( data->addr != NULL && data->port != 0) {
                Local<Object> host = Nan::New<Object>();
                host->Set(Nan::New("addr").ToLocalChecked(), Nan::New(data->addr).ToLocalChecked());
                host->Set(Nan::New("port").ToLocalChecked(), Nan::New(data->port));
                argv[2] = (host);
            }
            else if( node_name != NULL && strlen(node_name) > 0 ) {
                Local<Object> host = Nan::New<Object>();
                as_v8_debug(log, "The host is %s", node_name);
                host->Set(Nan::New("node_id").ToLocalChecked(), Nan::New(node_name).ToLocalChecked());
                argv[2] = (host);
            }
            else {
                argv[2] = Nan::Null();
            }
        }
        else {
            err->func = NULL;
            argv[0] = error_to_jsobject(err, log);
            argv[1] = Nan::Null();
            argv[2] = Nan::Null();
        }

        // Surround the callback in a try/catch for safety
        Nan::TryCatch try_catch;

        // Execute the callback.
        Local<Function> cb = Nan::New<Function>(data->callback);
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 3, argv);

        // Process the exception, if any
        if ( try_catch.HasCaught() ) {
            Nan::FatalException(try_catch);
        }
    }

    // Surround the callback in a try/catch for safety
    // Execute the callback.
    Nan::TryCatch try_catch;

    Local<Value> done_argv[0];
    Local<Function> done_cb = Nan::New<Function>(data->done);
    Nan::MakeCallback(Nan::GetCurrentContext()->Global(), done_cb, 0, done_argv);

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        Nan::FatalException(try_catch);
    }

    data->done.Reset();

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    data->callback.Reset();


    for ( int i = 0; i < num; i++ ) {
        if( results[i].response != NULL) {
            cf_free(results[i].response);
        }
    }

    if(data->policy != NULL)
    {
        cf_free(data->policy);
    }

    // clean up any memory we allocated
    delete data;
    delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'info()' Operation
 */
NAN_METHOD(AerospikeClient::Info)
{
    async_invoke(info, prepare, execute, respond);
}
