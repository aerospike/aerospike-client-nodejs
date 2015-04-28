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
    #include <aerospike/as_record_iterator.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"

#define REMOVE_ARG_POS_KEY     0
#define REMOVE_ARG_POS_WPOLICY 1 // remove policy position and callback position is not same 
#define REMOVE_ARG_POS_CB      2 // for every invoke of remove. If removepolicy is not passed from node
// application, argument position for callback changes.

using namespace v8;


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
    as_policy_remove policy;
    Persistent<Function> callback;
    LogInfo * log;
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
static void * prepare(ResolveArgs(args))
{
	NanScope();

    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());

    // Build the async data
    AsyncData * data = new AsyncData;
    data->as = client->as;
    data->param_err = 0;
    // Local variables
    as_key *    key = &data->key;
    LogInfo * log  = data->log = client->log;

    as_policy_remove * policy = &data->policy;
    int arglength = args.Length();

    if ( args[arglength-1]->IsFunction() ){
		NanAssignPersistent(data->callback, args[arglength-1].As<Function>());
        as_v8_detail(log, "Node.js callback registered");
    }
    else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if ( args[ REMOVE_ARG_POS_KEY ]->IsObject() ) {
        if (key_from_jsobject(key, args[ REMOVE_ARG_POS_KEY]->ToObject(), log) != AS_NODE_PARAM_OK ) {
            as_v8_error(log, "Parsing of key (C structure) from key object failed");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    }
    else {
        as_v8_error(log, "Key should be an object");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if ( arglength > 2 ) {
        if ( args[REMOVE_ARG_POS_WPOLICY]->IsObject() ) {
            if (removepolicy_from_jsobject( policy, args[REMOVE_ARG_POS_WPOLICY]->ToObject(), log ) != AS_NODE_PARAM_OK) {
                as_v8_error(log, "Parsing of removepolicy from object failed");
                COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
                goto Err_Return;
            }
        }
        else {
            as_v8_error(log, "Removepolicy should be an object");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    }
    else {
        as_v8_detail(log, "Argument list does not contain remove policy, using default values for remove policy");
        //as_policy_remove_init(policy);
		removepolicy_from_config(&data->as->config.policies, policy, log);
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
    AsyncData * data = reinterpret_cast<AsyncData *>(req->data);

    // Data to be used.
    aerospike * as  = data->as;
    as_error *  err = &data->err;
    as_key *    key = &data->key;
    as_policy_remove * policy = &data->policy;  
    LogInfo  * log  = data->log;

    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        as_v8_error(log, "Not connected to Cluster to perform the operation");
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }

    if ( data->param_err == 0) {
        // DEBUG(log, _KEY,  key);
        aerospike_key_remove(as, err, policy, key); 
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
	NanScope();

    // Fetch the AsyncData structure
    AsyncData * data    = reinterpret_cast<AsyncData *>(req->data);

    as_error *  err     = &data->err;
    as_key *    key     = &data->key;
    LogInfo * log       = data->log;

    // DEBUG(log, ERROR, err);

    Handle<Value> argv[2];
    // Build the arguments array for the callback
    if( data->param_err == 0) { 
        as_v8_debug(log, "Delete operation succeeded for the key");
        // DEBUG(log, _KEY,  key);
        argv[0] = error_to_jsobject(err, log),
        argv[1] = key_to_jsobject(key, log);

    }
    else {
        err->func = NULL;
        err->line = 0;
        err->file = NULL;
        argv[0] = error_to_jsobject(err, log);
        as_v8_debug(log, "Parameter error while parsing the arguments");
        argv[1] = NanNull();
    }

    // Surround the callback in a try/catch for safety
    TryCatch try_catch;

    // Execute the callback.
	Local<Function> cb = NanNew<Function>(data->callback);
	NanMakeCallback(NanGetCurrentContext()->Global(), cb, 2, argv);

    as_v8_debug(log, "Invoked remove callback");
    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        node::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
	NanDisposePersistent(data->callback);

    // clean up any memory we allocated

    if( data->param_err == 0) { 
        as_key_destroy(key);
        as_v8_debug(log, "Cleaned up the structures");
    }
    delete data;
    delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'remove()' Operation
 */
NAN_METHOD(AerospikeClient::Remove)
{
    V8_RETURN(async_invoke(args, prepare, execute, respond));
}
