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
    as_policy_read* policy;
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

    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

    // Build the async data
    AsyncData * data = new AsyncData;
    data->as = client->as;

    LogInfo * log = data->log = client->log;

    data->param_err = 0;
    // Local variables
    as_key *    key         = &data->key;
    as_record * rec         = &data->rec;
	data->policy					= NULL;


    int arglength = info.Length();

    if ( info[arglength-1]->IsFunction()) {
		//NanAssignPersistent(data->callback, info[arglength-1].As<Function>());
        data->callback.Reset(info[arglength-1].As<Function>());
        as_v8_detail(log, "Node.js callback registered");
    }
    else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
        goto Err_Return;
    }

    if ( info[GET_ARG_POS_KEY]->IsObject() ) {
        if (key_from_jsobject(key, info[GET_ARG_POS_KEY]->ToObject(), log) != AS_NODE_PARAM_OK ) {
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
        if ( info[GET_ARG_POS_RPOLICY]->IsObject() ) {
			data->policy = (as_policy_read*) cf_malloc(sizeof(as_policy_read));
            if (readpolicy_from_jsobject( data->policy, info[GET_ARG_POS_RPOLICY]->ToObject(), log) != AS_NODE_PARAM_OK) {
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
    as_policy_read* policy  = data->policy;

    LogInfo * log           = data->log;


    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        as_v8_error(log, "Not connected to Cluster to perform the operation");
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }

    if ( data->param_err == 0 ) {
        as_v8_debug(log, "Invoking get with ");
        // AS_DEBUG(log, _KEY,  key);
        aerospike_key_get(as, err, policy, key, &rec);  
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
	Nan::HandleScope scope;
    // Fetch the AsyncData structure
    AsyncData * data        = reinterpret_cast<AsyncData *>(req->data);

    as_error *  err         = &data->err;
    as_key *    key         = &data->key;
    as_record * rec         = &data->rec;
    LogInfo * log           = data->log;
    as_v8_debug(log, "Get operations' the response is");
    // AS_DEBUG(log, ERROR, err);
    
    Local<Value> argv[4];
    // Build the arguments array for the callback
    if( data->param_err == 0) {
        argv[0] = Nan::New<Value>(error_to_jsobject(err, log)),
        argv[1] = Nan::New<Value>(recordbins_to_jsobject(rec, log)),
        argv[2] = Nan::New<Value>(recordmeta_to_jsobject(rec, log)),
        argv[3] = Nan::New<Value>(key_to_jsobject(key, log));
    }
    else {
        err->func = NULL;
        as_v8_debug(log, "Parameter error while parsing the arguments");
        argv[0] = Nan::New<Value>(error_to_jsobject(err, log));
        argv[1] = Nan::Null();
        argv[2] = Nan::Null();
        argv[3] = Nan::Null();
    }

    // Surround the callback in a try/catch for safety
    TryCatch try_catch;

    // Execute the callback.
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 4, argv);
    as_v8_debug(log, "Invoked Get callback");

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        node::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
	data->callback.Reset();

    // clean up any memory we allocated

    if( data->param_err == 0) { 
        as_key_destroy(key);
        as_record_destroy(rec);
		if(data->policy != NULL)
		{
			cf_free(data->policy);
		}
        as_v8_debug(log, "Cleaned up the structures");
    }

    delete data;
    delete req;


}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'get()' Operation
 */
NAN_METHOD(AerospikeClient::Get)
{
     async_invoke(info, prepare, execute, respond);
}
