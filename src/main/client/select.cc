/*******************************************************************************
 *
 *   Copyright 2013-2014 Aerospike, Inc.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
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

#define SELECT_ARG_POS_KEY     0
#define SELECT_ARG_POS_BINS    1
#define SELECT_ARG_POS_RPOLICY 2 // Read policy position and callback position is not same 
#define SELECT_ARG_POS_CB      3 // for every invoke of select. If readpolicy is not passed from node
// application, argument position for callback changes.

using namespace v8;

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

/**
 *  AsyncData — Data to be used in async calls.
 */

typedef struct AsyncData {
    aerospike * as;
    int param_err;
    as_error err;
    as_key key;
    as_record rec;
    as_policy_read policy;
    Persistent<Function> callback;
    LogInfo * log;
    int num_bins;
    char** bins;
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
    data->as = client->as;
    LogInfo* log = data->log = client->log; 
    // Local variables
    as_key *    key = &data->key;
    as_record * rec = &data->rec;
    as_policy_read * policy = &data->policy;
    data->param_err = 0;

    int arglength = args.Length();

    if ( args[arglength-1]->IsFunction()) {
        data->callback = Persistent<Function>::New(NODE_ISOLATE_PRE Local<Function>::Cast(args[arglength-1]));
        as_v8_detail(log, "Node.js callback registered");
    }
    else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }
    if ( args[SELECT_ARG_POS_KEY]->IsObject() ) {
        if (key_from_jsobject(key, args[SELECT_ARG_POS_KEY]->ToObject(), log) != AS_NODE_PARAM_OK) {
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

    as_record_init(rec, 0);
    // To select the values of given bin, not complete record.
    if ( args[SELECT_ARG_POS_BINS]->IsArray() ) {

        Local<Array> barray = Local<Array>::Cast(args[1]);
        int num_bins = barray->Length();
        data->num_bins = num_bins;
        data->bins = (char **)calloc(sizeof(char *), num_bins+1);
        as_v8_debug(log, "Number of bins requested %d", num_bins);
        for (int i=0; i < num_bins; i++) {
            Local<Value> bname = barray->Get(i);
            data->bins[i] = (char*) malloc(AS_BIN_NAME_MAX_SIZE);
            strncpy(data->bins[i],  *String::Utf8Value(bname), AS_BIN_NAME_MAX_SIZE);
            as_v8_detail(log, "bin[%d] : %s", i, data->bins[i]);
        }
        // The last entry should be NULL because we are passing to aerospike_key_select
        data->bins[num_bins] = NULL;
    }
    else {
        as_v8_error(log, "Bin names should be an array of string");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if ( arglength > 3) {
        if ( args[SELECT_ARG_POS_RPOLICY]->IsObject() ) {
            if (readpolicy_from_jsobject( policy, args[SELECT_ARG_POS_RPOLICY]->ToObject(), log) != AS_NODE_PARAM_OK) {
                as_v8_error(log, "Parsing of readpolicy from object failed");
                COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
                goto Err_Return;
            }
        }
        else {
            as_v8_error(log, "Readpolicy should be an object");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    }
    else {
        as_v8_detail(log, "Argument list does not contain read policy, using default values for read policy");
        as_policy_read_init(policy);
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
    as_record * rec = &data->rec;
    as_policy_read * policy = &data->policy;
    LogInfo * log   = data->log;
    
    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        as_v8_error(log, "Not connected to Cluster to perform the operation");
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }

    if ( data->param_err == 0 ) {
        // DEBUG(log, _KEY,  key);
        aerospike_key_select(as, err, policy, key, (const char **)data->bins, &rec);

        for ( int i = 0; i < data->num_bins; i++) {
            free(data->bins[i]);
        }
        free(data->bins);
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
    AsyncData * data    = reinterpret_cast<AsyncData *>(req->data);
    as_error *  err     = &data->err;
    as_key *    key     = &data->key;
    as_record * rec     = &data->rec;
    LogInfo * log       = data->log;

    as_v8_debug(log, "Select operation : the response is");
    // DEBUG(log, ERROR, err);

    // Build the arguments array for the callback
    Handle<Value> argv[4];
    if ( data->param_err == 0 )
    {
        argv[0] = error_to_jsobject(err, log);
        argv[1] = recordbins_to_jsobject(rec, log);
        argv[2] = recordmeta_to_jsobject(rec, log);
        argv[3] = key_to_jsobject(key, log);
    }
    else {
        err->func = NULL;
        as_v8_debug(log, "Parameter error while parsing the arguments");
        argv[0] = error_to_jsobject(err, log);
        argv[1] = Null();
        argv[2] = Null();
        argv[3] = Null();
    }

    // Surround the callback in a try/catch for safety
    TryCatch try_catch;

    // Execute the callback.
    data->callback->Call(Context::GetCurrent()->Global(), 4, argv);

    as_v8_debug(log, "Invoked Exists callback");
    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        node::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    data->callback.Dispose();

    // clean up any memory we allocated
    if ( data->param_err == 0) {
        as_key_destroy(key);
        as_record_destroy(rec);
        as_v8_debug(log, "Cleaned up the structures");
    }

    delete data;
    delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'select()' Operation
 */

Handle<Value> AerospikeClient::Select(const Arguments& args)
{
    return async_invoke(args, prepare, execute, respond);
}



