/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "policy.h"
#include "log.h"

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/aerospike_key.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_key.h>
    #include <aerospike/as_record.h>
    #include <aerospike/aerospike_batch.h>
}

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
    as_policy_batch* policy;
    as_batch batch;          // Passed as input to aerospike_batch_get
    as_batch_read  *results;// Results from a aerospike_batch_get operation
    LogInfo * log;
    uint32_t n;
    Nan::Persistent<Function> callback;
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
                as_record* rec = &data->results[i].record;
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
static void * prepare(ResolveArgs(info))
{
    Nan::HandleScope scope;
    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

    AsyncData * data = new AsyncData();
    data->as = client->as;
    data->node_err = 0;
    data->n = 0;
    data->results = NULL;
    data->policy = NULL;
    LogInfo * log = data->log = client->log;

    Local<Value> maybe_keys = info[0];
    Local<Value> maybe_policy = info[1];
    Local<Value> maybe_callback = info[2];

    if (maybe_callback->IsFunction()) {
        data->callback.Reset(maybe_callback.As<Function>());
        as_v8_detail(log, "batch_exists callback registered");
    } else {
        as_v8_error(log, "Arglist must contain a callback function");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_keys->IsArray()) {
        Local<Array> keys = Local<Array>::Cast(maybe_keys);
        if( batch_from_jsarray(&data->batch, keys, log) != AS_NODE_PARAM_OK) {
            as_v8_debug(log, "parsing batch keys failed");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    } else {
        as_v8_debug(log, "Batch key must be an array of key objects");
        COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_policy->IsObject()) {
        data->policy = (as_policy_batch*) cf_malloc(sizeof(as_policy_batch));
        if (batchpolicy_from_jsobject(data->policy, maybe_policy->ToObject(), log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "Parsing batch policy failed");
            COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    } else if (maybe_policy->IsNull() || maybe_policy->IsUndefined()) {
        // policy is an optional parameter - ignore if missing
    } else {
        as_v8_error(log, "Batch policy must be an object");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
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
    as_policy_batch * policy= data->policy;
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
    Nan::HandleScope scope;
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
    Local<Value> argv[2];

    if ( data->node_err == 1 ) {
        // Sets the err->code and err->message in the 'err' variable
        err->func = NULL;
        err->line = 0;
        err->file = NULL;
        argv[0] = error_to_jsobject(err, log);
        argv[1] = Nan::Null();
    }
    else if ( num_rec == 0 || batch_results == NULL ) {
        argv[0] = error_to_jsobject(err, log);
        argv[1] = Nan::Null();
    }
    else {

        int rec_found = 0;

        // the result is an array of batch results
        Local<Array> results = Nan::New<Array>(num_rec);

        for ( uint32_t i = 0; i< num_rec; i++) {

            as_status status = batch_results[i].result;
            as_record * record = &batch_results[i].record;
            const as_key * key = batch_results[i].key;

            // a batch result object attributes:
            //   - status
            //   - key
            //   - metadata
            Local<Object> result = Nan::New<Object>();

            // status attribute
            result->Set(Nan::New("status").ToLocalChecked(), Nan::New(status));

            // key attribute - should always be sent
            result->Set(Nan::New("key").ToLocalChecked(), key_to_jsobject(key, log));

            if(batch_results[i].result == AEROSPIKE_OK) {

                // metadata attribute
                result->Set(Nan::New("meta").ToLocalChecked(), recordmeta_to_jsobject(record, log));

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
    Nan::TryCatch try_catch;

    // Execute the callback.
    Local<Function> cb = Nan::New<Function>(data->callback);

    Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 2, argv);

    as_v8_debug(log,"Invoked the callback");

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        Nan::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    data->callback.Reset();

    // clean up any memory we allocated
    if (data->node_err == 1) {
        free(data->results);
    }
    if (batch_results != NULL) {
        free(batch_results);
    }
    if (data->policy != NULL) {
        cf_free(data->policy);
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
    async_invoke(info, prepare, execute, respond);
}

