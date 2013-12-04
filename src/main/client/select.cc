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
	HandleScope scope;

	AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());

	// Build the async data
	AsyncData * data = new AsyncData;
	data->as = &client->as;

	// Local variables
	as_key *    key = &data->key;
	as_record * rec = &data->rec;
	as_policy_read * policy = &data->policy;
	data->param_err = 0;

	int arglength = args.Length();

	if ( args[arglength-1]->IsFunction()) {
		data->callback = Persistent<Function>::New(Local<Function>::Cast(args[arglength-1]));
	}else {
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
		goto Err_Return;
	}
	if ( args[SELECT_ARG_POS_KEY]->IsObject() ) {
		if (key_from_jsobject(key, args[SELECT_ARG_POS_KEY]->ToObject()) != AS_NODE_PARAM_OK) {
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			goto Err_Return;
		}
	} else {
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
		for (int i=0; i < num_bins; i++) {
			Local<Value> bname = barray->Get(i);
			data->bins[i] = (char*) malloc(AS_BIN_NAME_MAX_SIZE);
			strncpy(data->bins[i],  *String::Utf8Value(bname), AS_BIN_NAME_MAX_SIZE);
		}
		// The last entry should be NULL because we are passing to aerospike_key_select
		data->bins[num_bins] = NULL;
	} else {
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
		goto Err_Return;
	}

	if ( arglength > 3) {
		if ( args[SELECT_ARG_POS_RPOLICY]->IsObject() ) {
			if (readpolicy_from_jsobject( policy, args[SELECT_ARG_POS_RPOLICY]->ToObject()) != AS_NODE_PARAM_OK) {
				COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
				goto Err_Return;
			}
		} else {
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			goto Err_Return;
		}
	} else {
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

	// Invoke the blocking call.
	// The error is handled in the calling JS code.
	if (as->cluster == NULL) {
		data->param_err = 1;
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
	}

	if ( data->param_err == 0 ) {
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
	HandleScope scope;

	// Fetch the AsyncData structure
	AsyncData * data    = reinterpret_cast<AsyncData *>(req->data);
	as_error *  err     = &data->err;
	as_key *    key     = &data->key;
	as_record * rec     = &data->rec;

	// Build the arguments array for the callback
	Handle<Value> argv[4];
	if ( data->param_err == 0 )
	{
		argv[0] = error_to_jsobject(err);
		argv[1] = recordbins_to_jsobject(rec );
		argv[2] = recordmeta_to_jsobject(rec);
		argv[3] = key_to_jsobject(key);
	} else {
		err->func = NULL;
		argv[0] = error_to_jsobject(err);
		argv[1] = Null();
		argv[2] = Null();
		argv[3] = Null();
	}
	// Surround the callback in a try/catch for safety
	TryCatch try_catch;

	// Execute the callback.
	data->callback->Call(Context::GetCurrent()->Global(), 4, argv);

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



