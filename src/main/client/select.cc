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
    #include <citrusleaf/alloc.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"

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
    as_policy_read* policy;
    Nan::Persistent<Function> callback;
    LogInfo * log;
    uint32_t num_bins;
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
static void * prepare(ResolveArgs(info))
{

	Nan::HandleScope scope;
    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(info.This());

    // Build the async data
    AsyncData * data = new AsyncData;
    data->as = client->as;
    LogInfo* log = data->log = client->log; 
    // Local variables
    as_key *    key = &data->key;
    as_record * rec = &data->rec;
	data->policy					= NULL;
    data->param_err = 0;

    int arglength = info.Length();

    if ( info[arglength-1]->IsFunction()) {
		 
        data->callback.Reset(info[arglength-1].As<Function>());
        as_v8_detail(log, "Node.js callback registered");
    }
    else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }
    if ( info[SELECT_ARG_POS_KEY]->IsObject() ) {
        if (key_from_jsobject(key, info[SELECT_ARG_POS_KEY]->ToObject(), log) != AS_NODE_PARAM_OK) {
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
    if ( info[SELECT_ARG_POS_BINS]->IsArray() ) {
		Local<Array> v8bins = Local<Array>::Cast(info[SELECT_ARG_POS_BINS]);
		int res = bins_from_jsarray(&data->bins, &data->num_bins, v8bins, log);
		if ( res != AS_NODE_PARAM_OK) 
		{
			as_v8_error(log,"Parsing bins failed in select ");
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			goto Err_Return;
		}
    }
    else {
        as_v8_error(log, "Bin names should be an array of string");
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
        goto Err_Return;
    }

    if ( arglength > 3) {
        if ( info[SELECT_ARG_POS_RPOLICY]->IsObject() ) {
			data->policy = (as_policy_read*) cf_malloc(sizeof(as_policy_read));
            if (readpolicy_from_jsobject( data->policy, info[SELECT_ARG_POS_RPOLICY]->ToObject(), log) != AS_NODE_PARAM_OK) {
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
    as_policy_read * policy = data->policy;
    LogInfo * log   = data->log;
    
    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        as_v8_error(log, "Not connected to Cluster to perform the operation");
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }

    if ( data->param_err == 0 ) {
        aerospike_key_select(as, err, policy, key, (const char **)data->bins, &rec);

        for ( uint32_t i = 0; i < data->num_bins; i++) {
            cf_free(data->bins[i]);
        }
        cf_free(data->bins);
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
    as_key *    key     = &data->key;
    as_record * rec     = &data->rec;
    LogInfo * log       = data->log;

    as_v8_debug(log, "Select operation : the response is");
    // AS_DEBUG(log, ERROR, err);

    // Build the arguments array for the callback
    Local<Value> argv[4];
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
        argv[1] = Nan::Null();
        argv[2] = Nan::Null();
        argv[3] = Nan::Null();
    }

    // Surround the callback in a try/catch for safety
    Nan::TryCatch try_catch;

    // Execute the callback.
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 4, argv);

    as_v8_debug(log, "Invoked Exists callback");
    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        Nan::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
	data->callback.Reset();

    // clean up any memory we allocated
    if ( data->param_err == 0) {
        as_key_destroy(key);
        as_record_destroy(rec);
		if( data->policy != NULL)
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
 *  The 'select()' Operation
 */

NAN_METHOD(AerospikeClient::Select)
{
    async_invoke(info, prepare, execute, respond);
}



