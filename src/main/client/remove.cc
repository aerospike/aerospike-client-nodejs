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

#define REMOVE_ARG_POS_KEY     0
#define REMOVE_ARG_POS_WPOLICY 1 // remove policy position and callback position is not same 
#define REMOVE_ARG_POS_CB      2 // for every invoke of remove. If removepolicy is not passed from node
							     // application, argument position for callback changes.
						  

/*******************************************************************************
 *	TYPES
 ******************************************************************************/

/**
 *	AsyncData — Data to be used in async calls.
 */
typedef struct AsyncData {
	int param_err;
	aerospike * as;
	as_error err;
	as_key key;
	as_policy_remove policy;
	Persistent<Function> callback;
} AsyncData;

/*******************************************************************************
 *	FUNCTIONS
 ******************************************************************************/

/**
 *	prepare() — Function to prepare AsyncData, for use in `execute()` and `respond()`.
 *  
 *	This should only keep references to V8 or V8 structures for use in 
 *	`respond()`, because it is unsafe for use in `execute()`.
 */
static void * prepare(const Arguments& args)
{
	// The current scope of the function
	HandleScope scope;

	AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());

	// Build the async data
	AsyncData *	data = new AsyncData;
	data->as = &client->as;

	data->param_err = 0;
	// Local variables
	as_key *	key = &data->key;

	as_policy_remove * policy = &data->policy;
	int arglength = args.Length();

	if ( args[ REMOVE_ARG_POS_KEY ]->IsObject() ) {
		if (key_from_jsobject(key, args[ REMOVE_ARG_POS_KEY]->ToObject()) != AS_NODE_PARAM_OK ) {
			data->param_err = 1;
		}
	}
	else {
		data->param_err = 1;
	}

	if ( arglength > 2 ) {
		if ( args[REMOVE_ARG_POS_WPOLICY]->IsObject() ) {
			if (removepolicy_from_jsobject( policy, args[REMOVE_ARG_POS_WPOLICY]->ToObject() ) != AS_NODE_PARAM_OK) {
				data->param_err = 1;
			}
		} else {
			data->param_err = 1;
		}
	} else {
		as_policy_remove_init(policy);
	}
	if ( data->param_err == 1) {
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_CLIENT);
	}
	data->callback = Persistent<Function>::New(Local<Function>::Cast(args[arglength-1]));
		
	return data;
}
/**
 *	execute() — Function to execute inside the worker-thread.
 *  
 *	It is not safe to access V8 or V8 data structures here, so everything
 *	we need for input and output should be in the AsyncData structure.
 */
static void execute(uv_work_t * req)
{
	// Fetch the AsyncData structure
	AsyncData * data = reinterpret_cast<AsyncData *>(req->data);

	// Data to be used.
	aerospike *	as	= data->as;
	as_error *	err	= &data->err;
	as_key *	key	= &data->key;
	as_policy_remove * policy = &data->policy;	


	// Invoke the blocking call.
	// The error is handled in the calling JS code.
	if ( data->param_err == 0) {
		aerospike_key_remove(as, err, policy, key);	
	}

}

/**
 *	respond() — Function to be called after `execute()`. Used to send response
 *  to the callback.
 *  
 *	This function will be run inside the main event loop so it is safe to use 
 *	V8 again. This is where you will convert the results into V8 types, and 
 *	call the callback function with those results.
 */
static void respond(uv_work_t * req, int status)
{
	// Scope for the callback operation.
	HandleScope scope;

	// Fetch the AsyncData structure
	AsyncData *	data	= reinterpret_cast<AsyncData *>(req->data);
	
	as_error *	err		= &data->err;
	as_key *	key		= &data->key;

	int nargs=2;
	Handle<Value> argv[nargs];
	// Build the arguments array for the callback
	if( data->param_err == 0) {	
		argv[0] = error_to_jsobject(err),
		argv[1] = key_to_jsobject(key);
	
	}
	else {
		err->func = NULL;
		err->line = NULL;
		err->file = NULL;
		argv[0] = error_to_jsobject(err);
		argv[1] = Null();
	}

	// Surround the callback in a try/catch for safety
	TryCatch try_catch;

	// Execute the callback.
	data->callback->Call(Context::GetCurrent()->Global(), 2, argv);

	// Process the exception, if any
	if ( try_catch.HasCaught() ) {
		node::FatalException(try_catch);
	}
	
	// Dispose the Persistent handle so the callback
	// function can be garbage-collected
	data->callback.Dispose();

	// clean up any memory we allocated

	if( data->param_err == 0) {	
		as_key_destroy(key);
	}
	delete data;
	delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *	The 'remove()' Operation
 */
Handle<Value> AerospikeClient::Remove(const Arguments& args)
{
	return async_invoke(args, prepare, execute, respond);
}
