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
#include <aerospike/as_config.h>
#include <aerospike/aerospike_info.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>

#include "../client.h"
#include "../util/async.h"
#include "../util/conversions.h"
#include "../util/log.h"

#define INFO_ARG_POS_HOST    0
#define INFO_ARG_POS_PORT    1
#define INFO_ARG_POS_REQ     2
#define INFO_ARG_POS_IPOLICY 3 //Info  policy position and callback position is not same 
#define INFO_ARG_POS_CB      4 // for every invoke of info. If infopolicy is not passed from node
// application, argument position for callback changes.
#define HOST_ADDRESS_SIZE 50
#define INFO_REQUEST_LEN  50
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
	as_policy_info policy;
	char *addr;
	uint16_t port;
	char * req;
	char * res;
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
	char **addr			= &data->addr;
	uint16_t * port				= &data->port;
	as_policy_info * policy		= &data->policy;
	data->param_err				= 0;
	int arglength = args.Length();

	if ( args[arglength-1]->IsFunction()) {
		data->callback = Persistent<Function>::New(Local<Function>::Cast(args[arglength-1]));
	} else {
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
		goto Err_Return;
	}

	if ( args[INFO_ARG_POS_HOST]->IsString()) {
		(*addr) =  (char*) malloc(HOST_ADDRESS_SIZE);
		strcpy( *addr, *String::Utf8Value(args[INFO_ARG_POS_HOST]->ToString()));
	} else {
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
		goto Err_Return;
	}

	if ( args[INFO_ARG_POS_PORT]->IsNumber() ) {
		(*port) = V8INTEGER_TO_CINTEGER(args[INFO_ARG_POS_PORT]);	
	} else {
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
		goto Err_Return;
	}

	if ( args[INFO_ARG_POS_REQ]->IsString()) {
		data->req = (char*) malloc( INFO_REQUEST_LEN);
		strcpy( data->req, *String::Utf8Value(args[INFO_ARG_POS_REQ]->ToString()));
	}
	if ( arglength > 4 ) {
		if ( args[INFO_ARG_POS_IPOLICY]->IsObject() &&
				infopolicy_from_jsobject(policy, args[INFO_ARG_POS_IPOLICY]->ToObject()) != AS_NODE_PARAM_OK) {
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			goto Err_Return;
		} 
	} else {
		// When node application does not pass any write policy should be 
		// initialized to defaults,
		as_policy_info_init(policy);
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
	AsyncData * data		 = reinterpret_cast<AsyncData *>(req->data);
	aerospike * as			 = data->as;
	as_error *  err			 = &data->err;
	char *addr				 = data->addr;
	uint16_t port			 = data->port;
	char * request			 = data->req;
	as_policy_info * policy  = &data->policy;
	char **response			 = &data->res;

	// Invoke the blocking call.
	// The error is handled in the calling JS code.
	if (as->cluster == NULL) {
		data->param_err = 1;
		COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
	}

	if ( data->param_err == 0) {
		aerospike_info_host(as, err, policy, addr, port, request, response);
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
	char * response     = data->res;
	Handle<Value> argv[2];
	// Build the arguments array for the callback
	if (data->param_err == 0) {
		argv[0]			   = error_to_jsobject(err);
		Handle<Object> obj = Object::New();
		if ( response != NULL && strlen(response) > 0 )	{
			obj->Set(String::NewSymbol("Response"), String::NewSymbol((const char*)data->res));
			argv[1]			   = obj;
		} else {
			argv[1] = Null();
		}
	}
	else {
		err->func = NULL;
		argv[0] = error_to_jsobject(err);
		argv[1] = Null();
	}	

	// Surround the callback in a try/catch for safety
	TryCatch try_catch;

	// Execute the callback.
	if ( data->callback != Null() ) {
		data->callback->Call(Context::GetCurrent()->Global(), 2, argv);
	}

	// Process the exception, if any
	if ( try_catch.HasCaught() ) {
		node::FatalException(try_catch);
	}

	// Dispose the Persistent handle so the callback
	// function can be garbage-collected
	data->callback.Dispose();

	// clean up any memory we allocated


	delete data;
	delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'info()' Operation
 */
Handle<Value> AerospikeClient::Info(const Arguments& args)
{
	return async_invoke(args, prepare, execute, respond);
}
