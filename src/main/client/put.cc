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

#define PUT_ARG_POS_KEY 0
#define PUT_ARG_POS_REC 1
#define PUT_ARG_POS_META 2
#define PUT_ARG_POS_WPOLICY 3 // Write policy position and callback position is not same 
#define PUT_ARG_POS_CB 4  // for every invoke of put. If writepolicy is not passed from node
// application, argument position for callback changes.

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
    as_policy_write policy;
    as_key key;
    as_record rec;
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
    HandleScope scope;

    // Unwrap 'this'
    AerospikeClient * client    = ObjectWrap::Unwrap<AerospikeClient>(args.This());

    // Build the async data
    AsyncData * data            = new AsyncData;
    data->as                    = &client->as;
    // Local variables
    as_key *    key             = &data->key;
    as_record * rec             = &data->rec;
    as_policy_write * policy    = &data->policy;
    LogInfo * log               = data->log = &client->log;
    data->param_err             = 0;
    int arglength = args.Length();
    int meta_present = 0;

    if ( args[arglength-1]->IsFunction()) {
        data->callback = Persistent<Function>::New(Local<Function>::Cast(args[arglength-1]));
        as_v8_detail(log, "Node.js Callback Registered");
    } else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }
    if ( args[PUT_ARG_POS_KEY]->IsObject()) {
        if (key_from_jsobject(key, args[PUT_ARG_POS_KEY]->ToObject(), log) != AS_NODE_PARAM_OK ) {
            as_v8_error(log,"Parsing as_key(C structure) from key object failed");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    } else {
        as_v8_error(log, "Key should be an object");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }


    if ( args[PUT_ARG_POS_REC]->IsObject() ) {
        if (recordbins_from_jsobject(rec, args[PUT_ARG_POS_REC]->ToObject(), log) != AS_NODE_PARAM_OK) { 
            as_v8_error(log, "Parsing as_record(C structure) from record object failed");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    } else {
        as_v8_error(log, "Record should be an object"); 
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if ( args[PUT_ARG_POS_META]->IsObject() ) {
        if (recordmeta_from_jsobject(rec, args[PUT_ARG_POS_META]->ToObject(), log) != AS_NODE_PARAM_OK) { 
            as_v8_error(log, "Parsing metadata structure from metadata object failed"); 
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
        meta_present = 1;
    } else {
        as_v8_error(log, "Metadata should be an object");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if ( arglength > 3 ) {
        int wpolicy_pos = PUT_ARG_POS_WPOLICY;
        if ( 0 == meta_present) {
            as_v8_debug(log, "Argument list does not contain metadata, default values will be used");
            wpolicy_pos = PUT_ARG_POS_WPOLICY - 1;
        }
        if ( args[wpolicy_pos]->IsObject() &&
                writepolicy_from_jsobject(policy, args[wpolicy_pos]->ToObject(), log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "writepolicy shoule be an object");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        } 
    } else {
        // When node application does not pass any write policy should be 
        // initialized to defaults,
        as_v8_debug(log, "Argument list does not contain writepolicy, default writepolicy will be used");
        as_policy_write_init(policy);
    }

    as_v8_debug(log, "Parsing node.js Data Structures : Success");
    scope.Close(Undefined());
    return data;

Err_Return:
    data->param_err = 1;
    scope.Close(Undefined());
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
    as_key *    key          = &data->key;
    as_record * rec          = &data->rec;
    as_policy_write * policy = &data->policy;
    LogInfo * log            = data->log;

    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        as_v8_error(log, "Not connected to cluster to put record");
    }

    if ( data->param_err == 0) {
        as_v8_debug(log, "Invoking aerospike put with");
        DETAIL(log, BINS, rec);
        DETAIL(log, META, rec);
        DEBUG(log, _KEY,  key);
        aerospike_key_put(as, err, policy, key, rec);
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
    // Scope for the callback operation.
    HandleScope scope;

    // Fetch the AsyncData structure
    AsyncData * data    = reinterpret_cast<AsyncData *>(req->data);
    as_error *  err     = &data->err;
    as_key *    key     = &data->key;
    as_record * rec     = &data->rec;
    LogInfo * log       = data->log;
    as_v8_debug(log, "Put operation : response is");
    DEBUG(log, ERROR, err);

    Handle<Value> argv[3];
    // Build the arguments array for the callback
    if (data->param_err == 0) {
        argv[0] = error_to_jsobject(err, log);
        argv[1] = recordmeta_to_jsobject(rec, log);
        argv[2] = key_to_jsobject(key, log);
        DETAIL(log, META, rec);
        DEBUG(log, _KEY,  key);
    }
    else {
        err->func = NULL;
        as_v8_debug(log, "Parameter error for put operation");
        argv[0] = error_to_jsobject(err, log);
        argv[1] = Null();
        argv[2] = Null();
    }   

    // Surround the callback in a try/catch for safety
    TryCatch try_catch;

    // Execute the callback.
    if ( data->callback != Null() ) {
        data->callback->Call(Context::GetCurrent()->Global(), 3, argv);
        as_v8_debug(log, "Invoked Put callback");
    }

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
        as_v8_debug(log, "Cleaned up record and key structures");
    }

    delete data;
    delete req;
    scope.Close(Undefined());
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'put()' Operation
 */
Handle<Value> AerospikeClient::Put(const Arguments& args)
{
    return async_invoke(args, prepare, execute, respond);
}
