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
    #include <aerospike/as_record_iterator.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>

#include "../client.h"
#include "../util/async.h"
#include "../util/conversions.h"
#include "../util/log.h"

using namespace v8;
#define GET_ARG_POS_KEY     0
#define GET_ARG_POS_RPOLICY 1 // Write policy position and callback position is not same 
#define GET_ARG_POS_CB      2 // for every invoke of put. If writepolicy is not passed from node
// application, argument position for callback changes.

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

/**
 *  AsyncData — Data to be used in async calls.
 */
typedef struct AsyncData {
    int param_err;
    aerospike * as;
    as_error err;
    as_key key;
    as_record rec;
    as_policy_read policy;
    LogInfo * log;
    Persistent<Function> callback;
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
static void * prepare(const Arguments& args)
{
    // The current scope of the function
    NODE_ISOLATE_DECL;
    HANDLESCOPE;

    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());

    // Build the async data
    AsyncData * data = new AsyncData;
    data->as         = client->as;
    data->param_err  = 0;
    as_record * rec  = &data->rec;

    // Local variables
    as_key *    key         = &data->key;
    as_policy_read* policy  = &data->policy;

    LogInfo * log = data->log = client->log;
    int arglength = args.Length();

    if ( args[arglength-1]->IsFunction()) {
        data->callback = Persistent<Function>::New(NODE_ISOLATE_PRE Local<Function>::Cast(args[arglength-1]));
        as_v8_detail(log, "Node.js callback registered");
    }
    else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
        goto Err_Return;
    }

    if ( args[GET_ARG_POS_KEY]->IsObject() ) {
        if (key_from_jsobject(key, args[GET_ARG_POS_KEY]->ToObject(), log) != AS_NODE_PARAM_OK ) {
            as_v8_error(log, "Parsing of key (C structure) from key object failed");
            COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
            goto Err_Return;
        }
    }
    else {
        as_v8_error(log, "Key should be an object");
        COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
        goto Err_Return;
    }

    if ( arglength > 2 ) {
        if ( args[GET_ARG_POS_RPOLICY]->IsObject() ) {
            if (readpolicy_from_jsobject( policy, args[GET_ARG_POS_RPOLICY]->ToObject(), log) != AS_NODE_PARAM_OK) {
                as_v8_error(log, "Parsing of readpolicy from object failed");
                COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
                goto Err_Return;
            }
        }
        else {
            as_v8_error(log, "Readpolicy should be an object");
            COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
            goto Err_Return;
        }
    }
    else {
        as_v8_detail(log, "Argument list does not contain read policy, using default values for read policy");
        as_policy_read_init(policy);
    }
    
    as_record_init(rec, 0);
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
    AsyncData * data = reinterpret_cast<AsyncData *>(req->data);

    // Data to be used.
    aerospike * as          = data->as;
    as_error *  err         = &data->err;
    as_key *    key         = &data->key;
    as_record * rec         = &data->rec;
    as_policy_read* policy  = &data->policy;
    LogInfo *   log         = data->log;

    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        as_v8_error(log, "Not connected to Cluster to perform the operation");
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }

    if ( data->param_err == 0 ) {
        as_v8_debug(log, "Invoking aerospike exists");
        aerospike_key_exists(as, err, policy, key, &rec);
    }

}

/**
 *  respond() — Function to be called after `execute()`. Used to send response
 *  to the callback.
 *  
 *  This function will be run inside the main event loop so it is safe to use 
 *  V8 again. This is where you will convert the results into V8 types, and 
 *  call the callback function with those results.
 */
static void respond(uv_work_t * req, int status)
{
    // Scope for the callback operation.
    NODE_ISOLATE_DECL;
    HANDLESCOPE;

    // Fetch the AsyncData structure
    AsyncData * data        = reinterpret_cast<AsyncData *>(req->data);

    as_error *  err         = &data->err;
    as_key *    key         = &data->key;
    as_record * rec         = &data->rec;
    LogInfo * log           = data->log;

    Handle<Value> argv[3];

    as_v8_debug(log, "Exists operation : the response is");

    // Build the arguments array for the callback
    if ( data->param_err == 0) { 

        argv[0] = error_to_jsobject(err, log);
        as_v8_debug(log, "Return status %s %d", err->message, err->code);

        if ( rec != NULL && rec->gen != 0 ) {
            as_v8_debug(log, "Record found");
            argv[1] = recordmeta_to_jsobject(rec, log);
        }
        else {
            argv[1] = Null();
        }
        argv[2] = key_to_jsobject(key, log);
    }
    else {
        err->func = NULL;
        as_v8_debug(log, "Parameter error while parsing the arguments");
        argv[0] = error_to_jsobject(err, log);
        argv[1] = Null();
        argv[2] = Null();
    }

    // Surround the callback in a try/catch for safety
    TryCatch try_catch;

    // Execute the callback.
    data->callback->Call(Context::GetCurrent()->Global(), 3, argv);

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        node::FatalException(try_catch);
    }

    as_v8_debug(log, "Invoked exists callback");
    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    data->callback.Dispose();

    // clean up any memory we allocated

    if( data->param_err == 0) { 
        as_key_destroy(key);
        as_v8_debug(log, "Cleaned up the structures");
    }

    delete data;
    delete req;
    scope.Close(Undefined());
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'get()' Operation
 */
Handle<Value> AerospikeClient::Exists(const Arguments& args)
{
    return async_invoke(args, prepare, execute, respond);
}
