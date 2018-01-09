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
 *      BatchExistsCmd — Data to be used in async calls.
 */
typedef struct BatchExistsCmd {
    aerospike * as;
    int node_err;            // To Keep track of the parameter errors from Nodejs
    as_error err;
    as_policy_batch* policy;
    as_batch batch;          // Passed as input to aerospike_batch_get
    as_batch_read  *results;// Results from a aerospike_batch_get operation
    LogInfo * log;
    uint32_t n;
    Nan::Persistent<Function> callback;
} BatchExistsCmd;



/*******************************************************************************
 *      FUNCTIONS
 ******************************************************************************/

bool batch_exists_callback(const as_batch_read * results, uint32_t n, void * udata)
{
    BatchExistsCmd* cmd = reinterpret_cast<BatchExistsCmd*>(udata);
    LogInfo* log = cmd->log;

    //copy the batch result to the shared data structure BatchExistsCmd,
    //so that response can send it back to nodejs layer
    //as_batch_read* batch_result = &cmd->results;
    if( results != NULL ) {
        as_v8_debug(log, "Bridge callback invoked in V8 for a batch request of %d records", n);
        cmd->n = n;
        cmd->results = (as_batch_read*) calloc(n, sizeof(as_batch_read));
        for ( uint32_t i = 0; i < n; i++ ) {
            cmd->results[i].result = results[i].result;
            key_clone(results[i].key, (as_key**) &cmd->results[i].key, log);
            if (results[i].result == AEROSPIKE_OK) {
                as_record* rec = &cmd->results[i].record;
                as_v8_debug(log, "record[%d]", i);
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
 *      prepare() — Function to prepare BatchExistsCmd, for use in `execute()` and `respond()`.
 *
 *      This should only keep references to V8 or V8 structures for use in
 *      `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{
    Nan::HandleScope scope;
    AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

    BatchExistsCmd* cmd = new BatchExistsCmd();
    cmd->as = client->as;
    cmd->node_err = 0;
    cmd->n = 0;
    cmd->results = NULL;
    cmd->policy = NULL;
    LogInfo* log = cmd->log = client->log;

    Local<Value> maybe_keys = info[0];
    Local<Value> maybe_policy = info[1];
    Local<Value> maybe_callback = info[2];

    if (maybe_callback->IsFunction()) {
        cmd->callback.Reset(maybe_callback.As<Function>());
        as_v8_detail(log, "batch_exists callback registered");
    } else {
        as_v8_error(log, "Arglist must contain a callback function");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_keys->IsArray()) {
        Local<Array> keys = Local<Array>::Cast(maybe_keys);
        if (batch_from_jsarray(&cmd->batch, keys, log) != AS_NODE_PARAM_OK) {
            as_v8_debug(log, "parsing batch keys failed");
            COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
            goto Err_Return;
        }
    } else {
        as_v8_debug(log, "Batch key must be an array of key objects");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if (maybe_policy->IsObject()) {
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
 *      we need for input and output should be in the BatchExistsCmd structure.
 */
static void execute(uv_work_t * req)
{
    // Fetch the BatchExistsCmd structure
    BatchExistsCmd* cmd = reinterpret_cast<BatchExistsCmd *>(req->data);

    // Data to be used.
    aerospike* as = cmd->as;
    as_error* err = &cmd->err;
    as_batch* batch = &cmd->batch;
    as_policy_batch* policy = cmd->policy;
    LogInfo* log = cmd->log;

    if( as->cluster == NULL) {
        as_v8_debug(log, "Cluster Object is NULL, can't perform the operation");
        cmd->node_err = 1;
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
    }
    // Invoke the blocking call.
    // Check for no parameter errors from Nodejs
    if (cmd->node_err == 0) {
        as_v8_debug(log, "Submitting batch request to server with %d keys", batch->keys.size);
        aerospike_batch_exists(as, err, policy, batch, batch_exists_callback, (void*) req->data);
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
    // Fetch the BatchExistsCmd structure
    BatchExistsCmd* cmd = reinterpret_cast<BatchExistsCmd*>(req->data);
    as_error*  err = &cmd->err;
    uint32_t num_rec = cmd->n;
    as_batch_read* batch_results = cmd->results;

    LogInfo* log = cmd->log;

    // maintain a linked list of pointers to be freed after the nodejs callback is called
    // Buffer object is not garbage collected by v8 gc. Have to delete explicitly
    // to avoid memory leak.

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
    Local<Function> cb = Nan::New<Function>(cmd->callback);

    Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 2, argv);

    as_v8_debug(log,"Invoked the callback");

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        Nan::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    cmd->callback.Reset();

    // clean up any memory we allocated
    if (cmd->node_err == 1) {
        free(cmd->results);
    }
    if (batch_results != NULL) {
        free(batch_results);
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
 *      The 'batchExists()' Operation
 */
NAN_METHOD(AerospikeClient::BatchExists)
{
    async_invoke(info, prepare, execute, respond);
}

