/*******************************************************************************
 * Copyright 2013-2018 Aerospike, Inc.
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
 *      BatchSelectCmd — Data to be used in async calls.
 */
typedef struct BatchSelectCmd {
    aerospike * as;
    int node_err;            // To Keep track of the parameter errors from Nodejs
    as_error err;
    as_policy_batch* policy;
    as_batch batch;          // Passed as input to aerospike_batch_get
    as_batch_read  *results; // Results from a aerospike_batch_get operation
    uint32_t n;
    uint32_t numbins;
    char** bins;
    LogInfo * log;
    Nan::Persistent<Function> callback;
} BatchSelectCmd;

/*******************************************************************************
 *      FUNCTIONS
 ******************************************************************************/

bool batch_select_callback(const as_batch_read * results, uint32_t n, void * udata)
{
    // Fetch the BatchSelectCmd structure
    BatchSelectCmd* cmd = reinterpret_cast<BatchSelectCmd*>(udata);
    LogInfo* log = cmd->log;
    //copy the batch result to the shared data structure BatchSelectCmd,
    //so that response can send it back to nodejs layer
    if( results != NULL ) {
        as_v8_debug(log, "Bridge callback invoked in V8 for the batch request of %d records ", n);
        cmd->n = n;
        cmd->results = (as_batch_read*) cf_calloc(n, sizeof(as_batch_read));
        for ( uint32_t i = 0; i < n; i++ ) {
            cmd->results[i].result = results[i].result;
            as_v8_debug(log, "batch result for the key");
            key_clone(results[i].key, (as_key**) &cmd->results[i].key, log);
            if (results[i].result == AEROSPIKE_OK) {
                as_record* rec = &cmd->results[i].record;

                as_v8_detail(log, "Record[%d]", i);

                as_record_init(rec, results[i].record.bins.size);
                record_clone(&results[i].record, &rec, log);
            }
        }
        return true;
    }
    else {
        as_v8_info(log, "Brigde callback in v8 for batch called with no batch results");
        cmd->n = 0;
        cmd->results = NULL;
    }
    return false;
}

/**
 *      prepare() — Function to prepare BatchSelectCmd, for use in `execute()` and `respond()`.
 *
 *      This should only keep references to V8 or V8 structures for use in
 *      `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
    Nan::HandleScope scope;

    AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

    // Build the async data
    BatchSelectCmd* cmd = new BatchSelectCmd();
    cmd->as = client->as;
    cmd->node_err = 0;
    cmd->n = 0;
    cmd->results = NULL;
    cmd->policy = NULL;
    LogInfo* log = cmd->log = client->log;

    Local<Value> maybe_keys = info[0];
    Local<Value> maybe_bins = info[1];
    Local<Value> maybe_policy = info[2];
    Local<Value> maybe_callback = info[3];

    if (maybe_callback->IsFunction()) {
        cmd->callback.Reset(maybe_callback.As<Function>());
        as_v8_detail(log, "batch_get callback registered");
    } else {
        as_v8_error(log, "Arglist must contain a callback function");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_keys->IsArray()) {
        Local<Array> keys = Local<Array>::Cast(maybe_keys);
        if (batch_from_jsarray(&cmd->batch, keys, log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "parsing batch keys failed");
            COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    } else {
        as_v8_error(log, "Batch key must be an array of key objects");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_bins->IsArray() ) {
        Local<Array> bins = Local<Array>::Cast(maybe_bins);
        int res = bins_from_jsarray(&cmd->bins, &cmd->numbins, bins, log);
        if (res != AS_NODE_PARAM_OK) {
            as_v8_error(log,"Parsing bins failed in select ");
            COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    } else {
        as_v8_error(log, "Bin names should be an array of string");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;

    }

    if (maybe_policy->IsObject() ) {
        cmd->policy = (as_policy_batch*) cf_malloc(sizeof(as_policy_batch));
        if (batchpolicy_from_jsobject(cmd->policy, maybe_policy->ToObject(), log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "Parsing batch policy failed");
            COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    } else if (maybe_policy->IsNull() || maybe_policy->IsUndefined()) {
        // policy is an optional parameter - ignore if missing
    } else {
        as_v8_error(log, "Batch policy must be an object");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    return cmd;

Err_Return:
    cmd->node_err = 1;
    return cmd;
}

/**
 *      execute() — Function to execute inside the worker-thread.
 *
 *      It is not safe to access V8 or V8 data structures here, so everything
 *      we need for input and output should be in the BatchSelectCmd structure.
 */
static void execute(uv_work_t * req)
{
    // Fetch the BatchSelectCmd structure
    BatchSelectCmd* cmd = reinterpret_cast<BatchSelectCmd*>(req->data);

    // Data to be used.
    aerospike* as = cmd->as;
    as_error* err = &cmd->err;
    as_batch* batch = &cmd->batch;
    as_policy_batch* policy= cmd->policy;
    LogInfo* log = cmd->log;
    const char** bins = (const char**) cmd->bins;
    uint32_t numbins = cmd->numbins;

    if( as->cluster == NULL) {
        as_v8_error(log, "Cluster Object is NULL, can't perform the operation");
        cmd->node_err = 1;
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
    }

    // Invoke the blocking call.
    // Check for no parameter errors from Nodejs
    if (cmd->node_err == 0) {
        as_v8_debug(log, "Submitting batch request to server with %d keys", batch->keys.size);
        aerospike_batch_get_bins(as, err, policy, batch, bins, numbins, batch_select_callback, (void*) req->data);
        if( err->code != AEROSPIKE_OK) {
            cmd->results = NULL;
            cmd->n = 0;
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
    // Fetch the BatchSelectCmd structure
    BatchSelectCmd* cmd = reinterpret_cast<BatchSelectCmd*>(req->data);
    as_error* err = &cmd->err;
    uint32_t num_rec = cmd->n;
    as_batch_read* batch_results = cmd->results;

    LogInfo* log = cmd->log;

    // Build the arguments array for the callback
    Local<Value> argv[2];

    if (cmd->node_err == 1) {
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
            //   - record
            Local<Object> result = Nan::New<Object>();

            // status attribute
            result->Set(Nan::New("status").ToLocalChecked(), Nan::New(status));

            // key attribute - should always be sent
            result->Set(Nan::New("key").ToLocalChecked(), key_to_jsobject(key ? key : &record->key, log));

            if( batch_results[i].result == AEROSPIKE_OK ) {

                // metadata attribute
                result->Set(Nan::New("meta").ToLocalChecked(), recordmeta_to_jsobject(record, log));

                // record attribute
                result->Set(Nan::New("bins").ToLocalChecked(), recordbins_to_jsobject(record, log));

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
        argv[1] = (results);
    }

    // Surround the callback in a try/catch for safety`
    Nan::TryCatch try_catch;

    // Execute the callback.
    Local<Function> cb = Nan::New<Function>(cmd->callback);
    Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 2, argv);

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        Nan::FatalException(try_catch);
    }

    as_v8_debug(log,"Invoked the callback");
    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    cmd->callback.Reset();

    // clean up any memory we allocated
     for (uint32_t i = 0; i < cmd->numbins; i++) {
         cf_free(cmd->bins[i]);
     }
     cf_free(cmd->bins);

    if (cmd->node_err == 1) {
        cf_free(cmd->results);
    }
    if (batch_results != NULL) {
        cf_free(batch_results);
    }
    if (cmd->policy != NULL) {
        cf_free(cmd->policy);
    }

    as_v8_debug(log, "Cleaned up the resources");


    delete cmd;
    delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *      The 'batchGet()' Operation
 */
NAN_METHOD(AerospikeClient::BatchSelect)
{
    async_invoke(info, prepare, execute, respond);
}

