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
    #include <aerospike/aerospike_batch.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>
#include <iostream>
#include <vector>

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"

#define BGET_ARG_POS_KEY     0
#define BGET_ARG_POS_BPOLICY 1 // Batch policy position and callback position is not same 
#define BGET_ARG_POS_CB      2 // in the argument list for every invoke of batch_get. If 
// writepolicy is not passed from node application, argument 
// position for callback changes.

using namespace v8;

/*******************************************************************************
 *      TYPES
 ******************************************************************************/

/**
 *      AsyncData — Data to be used in async calls.
 */
typedef struct AsyncData {
    aerospike * as;
    int node_err;            // To Keep track of the parameter errors from Nodejs 
    as_error err;
    as_policy_batch policy;
    as_batch batch;          // Passed as input to aerospike_batch_get
    as_batch_read  *results;// Results from a aerospike_batch_get operation
    LogInfo * log;
    uint32_t n;
    Persistent<Function> callback;
} AsyncData;



/*******************************************************************************
 *      FUNCTIONS
 ******************************************************************************/

bool batch_exists_callback(const as_batch_read * results, uint32_t n, void * udata)
{
    // Fetch the AsyncData structure
    AsyncData *     data    = reinterpret_cast<AsyncData *>(udata);
    LogInfo * log           = data->log;

    //copy the batch result to the shared data structure AsyncData,
    //so that response can send it back to nodejs layer
    //as_batch_read  *batch_result = &data->results;
    if( results != NULL ) {
        as_v8_debug(log, "Bridge callback invoked in V8 for a batch request of %d records", n); 
        data->n = n;
        data->results = (as_batch_read *)calloc(n, sizeof(as_batch_read));
        for ( uint32_t i = 0; i < n; i++ ) {
            data->results[i].result = results[i].result;
            key_clone(results[i].key, (as_key**) &data->results[i].key, log); 
            if (results[i].result == AEROSPIKE_OK) {            
                as_record * rec = NULL;
                rec = &data->results[i].record; 
                as_v8_debug(log, "record[%d]", i);
                record_clone(&results[i].record, &rec, log);
            } 
        }
        return true;
    }
    else {
        as_v8_info(log, "Brigde callback in v8 for batch called with no batch results");
        data->n = 0;
        data->results = NULL;
    }
    return false;
}
/**
 *      prepare() — Function to prepare AsyncData, for use in `execute()` and `respond()`.
 *  
 *      This should only keep references to V8 or V8 structures for use in 
 *      `respond()`, because it is unsafe for use in `execute()`.
 */
static void * prepare(ResolveArgs(args))
{
	NanScope();
    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());

    // Build the async data
    AsyncData *     data = new AsyncData;
    data->as = client->as;
    data->node_err = 0;
    data->n = 0;
    data->results = NULL;
    LogInfo * log = data->log = client->log;

    // Local variables
    as_batch * batch = &data->batch;
    as_policy_batch * policy = &data->policy;

    int arglength = args.Length();

    if ( args[arglength-1]->IsFunction()) {
		NanAssignPersistent(data->callback, args[arglength-1].As<Function>());
        as_v8_detail(log, "batch_exists callback registered");
    }
    else {
        as_v8_error(log, "Arglist must contain a callback function");
        COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if ( args[BGET_ARG_POS_KEY]->IsArray() ) {
        Local<Array> keys = Local<Array>::Cast(args[BGET_ARG_POS_KEY]);
        if( batch_from_jsarray(batch, keys, log) != AS_NODE_PARAM_OK) {
            as_v8_debug(log, "parsing batch keys failed");
            COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    }
    else {
        as_v8_debug(log, "Batch key must be an array of key objects");
        //Parameter passed is not an array of Key Objects "ERROR..!"
        COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (arglength > 2 ) {
        if ( args[BGET_ARG_POS_BPOLICY]->IsObject() ) {
            if (batchpolicy_from_jsobject(policy, args[BGET_ARG_POS_BPOLICY]->ToObject(), log) != AS_NODE_PARAM_OK) {
                as_v8_error(log, "Parsing batch policy failed");
                COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM);
                goto Err_Return;
            }
        }
        else {
            as_v8_error(log, "Batch policy must be an object");
            COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    }
    else {
        as_v8_detail(log, "Arglist does not contain batch policy, using policy values from global config");
        //as_policy_batch_init(policy);
		batchpolicy_from_config(&data->as->config.policies, policy, log);
    }

    return data;

Err_Return:
    data->node_err = 1;
    return data;
}
/**
 *      execute() — Function to execute inside the worker-thread.
 *  
 *      It is not safe to access V8 or V8 data structures here, so everything
 *      we need for input and output should be in the AsyncData structure.
 */
static void execute(uv_work_t * req)
{
    // Fetch the AsyncData structure
    AsyncData * data = reinterpret_cast<AsyncData *>(req->data);

    // Data to be used.
    aerospike *     as      = data->as;
    as_error  *     err     = &data->err;
    as_batch  *     batch   = &data->batch;
    as_policy_batch * policy= &data->policy;
    LogInfo *       log     = data->log;

    if( as->cluster == NULL) {
        as_v8_debug(log, "Cluster Object is NULL, can't perform the operation");
        data->node_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }
    // Invoke the blocking call.
    // Check for no parameter errors from Nodejs 
    if( data->node_err == 0) {
        as_v8_debug(log, "Submitting batch request to server with %d keys", batch->keys.size);
        aerospike_batch_exists(as, err, policy, batch, batch_exists_callback, (void*) req->data);
        if( err->code != AEROSPIKE_OK) {
            // DEBUG(log, ERROR, err);
            data->results = NULL;
            data->n = 0;
        }
        as_batch_destroy(batch);
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
    uint32_t num_rec    = data->n;
    as_batch_read * batch_results = data->results;

    LogInfo * log = data->log;

    // maintain a linked list of pointers to be freed after the nodejs callback is called
    // Buffer object is not garbage collected by v8 gc. Have to delete explicitly 
    // to avoid memory leak.

    // Build the arguments array for the callback
    Handle<Value> argv[2];

    if ( data->node_err == 1 ) {
        // Sets the err->code and err->message in the 'err' variable
        err->func = NULL;
        err->line = 0;
        err->file = NULL;
        argv[0] = error_to_jsobject(err, log);
        argv[1] = NanNull();
    }
    else if ( num_rec == 0 || batch_results == NULL ) {
        argv[0] = error_to_jsobject(err, log);
        argv[1] = NanNull();
    }
    else {

        int rec_found = 0;

        // the result is an array of batch results
        Handle<Array> results = NanNew<Array>(num_rec);

        for ( uint32_t i = 0; i< num_rec; i++) {

            as_status status = batch_results[i].result;
            as_record * record = &batch_results[i].record;
            const as_key * key = batch_results[i].key;

            // a batch result object attributes:
            //   - status 
            //   - key
            //   - metadata
            Handle<Object> result = NanNew<Object>();

            // status attribute
            result->Set(NanNew("status"), NanNew(status));

            // key attribute - should always be sent
            result->Set(NanNew("key"), key_to_jsobject(key, log));

            if(batch_results[i].result == AEROSPIKE_OK) {
                
                // metadata attribute
                result->Set(NanNew("metadata"), recordmeta_to_jsobject(record, log));

                rec_found++;
            }
            else {
                as_v8_debug(log, "Record[%d] not returned by server ", i);
            }

            // clean up
            as_key_destroy((as_key *) key);
            as_record_destroy(record);

            // append to the result array
            results->Set(i, result);
        }

        as_v8_debug(log, "%d record objects are present in the batch array",  rec_found);
        argv[0] = error_to_jsobject(err, log);
        argv[1] = results;  
    }

    // Surround the callback in a try/catch for safety`
    TryCatch try_catch;

    // Execute the callback.
	Local<Function> cb = NanNew<Function>(data->callback);

	NanMakeCallback(NanGetCurrentContext()->Global(), cb, 2, argv);

    as_v8_debug(log,"Invoked the callback");

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        node::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    NanDisposePersistent(data->callback);

    // clean up any memory we allocated
    if ( data->node_err == 1) {
        free(data->results);    
    }
    if (batch_results != NULL) {
        free(batch_results);
    }


    as_v8_debug(log, "Cleaned up the resources");
    delete data;
    delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *      The 'batchExists()' Operation
 */
NAN_METHOD(AerospikeClient::BatchExists)
{
	
    V8_RETURN(async_invoke(args, prepare, execute, respond));
}

