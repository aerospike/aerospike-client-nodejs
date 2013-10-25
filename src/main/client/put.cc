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
	AerospikeClient * client	= ObjectWrap::Unwrap<AerospikeClient>(args.This());

	// Build the async data
	AsyncData * data			= new AsyncData;
	data->as					= &client->as;

	// Local variables
	as_key *    key				= &data->key;
	as_record * rec				= &data->rec;
	as_policy_write * policy	= &data->policy;
	data->param_err				= 0;
	int arglength = args.Length();
	if ( args[0]->IsArray() ) {
		Local<Array> arr = Local<Array>::Cast(args[0]);
		key_from_jsarray(key, arr);
	}
	else if ( args[0]->IsObject() ) {
		key_from_jsobject(key, args[0]->ToObject());
	} 
	else {
		data->param_err = 1;
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
	}
	

	if ( args[1]->IsObject() ) {
		record_from_jsobject(rec, args[1]->ToObject());
	} else {
		data->param_err = 1;
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
	}

	if ( arglength > 3 ) {
		if ( args[2]->IsObject() ) {
			writepolicy_from_jsobject(policy, args[2]->ToObject());
		} else {
			data->param_err = 1;
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
		}
	} else {
		// When node application does not pass any write policy where should the default be 
		// initialized,
		// 1. Initialize in v8.
		// 2. Pass a NULL and let C initialize
		// Which is better way..
		as_policy_write_init(policy);
	}

	data->callback = Persistent<Function>::New(Local<Function>::Cast(args[arglength-1]));
	
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
	AsyncData * data		 = reinterpret_cast<AsyncData *>(req->data);
	aerospike * as			 = data->as;
	as_error *  err			 = &data->err;
	as_key *    key			 = &data->key;
	as_record * rec			 = &data->rec;
	as_policy_write * policy = &data->policy;

	// Invoke the blocking call.
	// The error is handled in the calling JS code.
	if (as->cluster == NULL) {
		data->param_err = 1;
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_CLIENT);
	}
	
	if ( data->param_err == 0) {
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
	AsyncData * data	= reinterpret_cast<AsyncData *>(req->data);
	as_error *	err		= &data->err;
	as_key *    key		= &data->key;
	as_record *	rec		= &data->rec;

	Handle<Value> argv[3];
	// Build the arguments array for the callback
	if (data->param_err == 0) {
		argv[0] = error_to_jsobject(err);
		argv[1] = recordmeta_to_jsobject(rec);
		argv[2] = key_to_jsobject(key);
	}
	else {
		err->func = NULL;
		err->line = NULL;
		err->file = NULL;
		argv[0] = error_to_jsobject(err);
		argv[1] = Null();
		argv[2] = Null();
	}	

	// Surround the callback in a try/catch for safety
	TryCatch try_catch;

	// Execute the callback.
	data->callback->Call(Context::GetCurrent()->Global(), 3, argv);

	// Process the exception, if any
	if ( try_catch.HasCaught() ) {
		node::FatalException(try_catch);
	}

	// Dispose the Persistent handle so the callback
	// function can be garbage-collected
	data->callback.Dispose();

	// clean up any memory we allocated
	
	as_key_destroy(key);
	as_record_destroy(rec);

	delete data;
	delete req;
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
