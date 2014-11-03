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
	#include <citrusleaf/cf_queue.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>
#include <time.h>

#include "scan.h"
#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"
using namespace v8;
#define QUEUE_SZ 10000
/*******************************************************************************
 *  TYPES
 ******************************************************************************/

/**
 *  AsyncData — Data to be used in async calls.
 */
typedef struct ScanCallbackData{
    Persistent<Function> record_cb;
    Persistent<Function> error_cb;
    Persistent<Function> end_cb;
	cf_queue * record_q;
	int q_size;
    LogInfo * log;
	int delta;
	uv_async_t async_handle;
} ScanCallbackData;


typedef struct AsyncData {
    int param_err;
    aerospike * as;
	as_scan * scan;
    as_error err;
    as_policy_scan policy;
    LogInfo * log;
	ScanCallbackData* scan_cbdata;
} AsyncData;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/
// callback for scan here.
// Queue the record into a common queue and generate an event 
// when the queue size reaches 1/20th of the total size of the queue.
// @TO-DO
// Who destroys the as_val in the callback, caller or callee.

bool aerospike_scan_callback(const as_val * val, void* udata)
{
	ScanCallbackData *scan_cbdata = reinterpret_cast<ScanCallbackData*>(udata);
	as_record* p_rec = as_record_fromval(val);
	as_record  *scan_rec = NULL;
	if( !p_rec) {
		return false;
	}
	int numbins	= p_rec->bins.size;
	scan_rec	= as_record_new(numbins);

	// clone the record into Asyncdata structure here.
	record_clone( p_rec, &scan_rec, scan_cbdata->log);

	if( scan_cbdata->record_q == NULL) 
	{
		// in case record_q is not initialized, return from the callback.
		// But this should never happen.
		return false;
	}
	
	// if the record queue is full sleep for n microseconds.
	if( cf_queue_sz(scan_cbdata->record_q) > scan_cbdata->q_size) {
		// why 20 - no reason right now.
		usleep(20);
	}

	//put the records in the queue.
	cf_queue_push( scan_cbdata->record_q, &scan_rec); 
	scan_cbdata->delta++;

	int async_signal_sz = (scan_cbdata->q_size)/20;
	if ( scan_cbdata->delta % async_signal_sz == 0) {
		scan_cbdata->async_handle.data		= scan_cbdata;
		async_send( &scan_cbdata->async_handle);	
	}
	return true;
}

void empty_record_queue( ScanCallbackData * data)
{	
	int rv;
	as_record* record = NULL;

	// Pop each record from the queue and invoke the node callback with this record.
	while(data->record_q && cf_queue_sz(data->record_q) > 0) {
		rv = cf_queue_pop( data->record_q, &record, CF_QUEUE_FOREVER);
		if( rv == CF_QUEUE_OK) {
			Handle<Value> cbargs[3] = { recordbins_to_jsobject(record, data->log),
										recordmeta_to_jsobject(record, data->log),
										key_to_jsobject(&record->key, data->log)};
			data->record_cb->Call(Context::GetCurrent()->Global(), 3, cbargs);
			as_record_destroy(record);
		}
	}
	return;
}
//dequeues record from the queue and invokes the callback in node.js application with this record.
void async_callback( uv_async_t * handle, int status)
{
	ScanCallbackData * data = reinterpret_cast<ScanCallbackData *>(handle->data);	

	if (data == NULL && data->record_q == NULL)
	{
		return;
	}
	empty_record_queue(data);
	return;
}

/**
 *  prepare() — Function to prepare AsyncData, for use in `execute()` and `respond()`.
 *  
 *  This should only keep references to V8 or V8 structures for use in 
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void * prepare(const Arguments& args)
{
    // The current scope of the function
    NODE_ISOLATE_DECL;
    HANDLESCOPE;

    AerospikeScan* scan				= ObjectWrap::Unwrap<AerospikeScan>(args.This());
    // Build the async data
    AsyncData * data				= new AsyncData;
	ScanCallbackData* scan_cbdata	= new ScanCallbackData;
    data->as						= scan->as;
	data->scan						= &scan->scan;
    LogInfo * log					= data->log = scan->log;

	scan_cbdata->log				= log;
	scan_cbdata->delta				= 0;
	scan_cbdata->record_q			= cf_queue_create(sizeof(as_record*), false);
	scan_cbdata->q_size				= scan->q_size ? scan->q_size : QUEUE_SZ;
	data->scan_cbdata				= scan_cbdata;
    data->param_err					= 0;
    // Local variables
    as_policy_scan * policy			= &data->policy;

    int arglength					= args.Length();

	if(args[0]->IsFunction())
	{
		scan_cbdata->record_cb	= Persistent<Function>::New(NODE_ISOLATE_PRE Local<Function>::Cast(args[0]));
	}
	else 
	{
		as_v8_error(log, "Callback not passed to process the scanned record");
		goto ErrReturn;
	}
    
	if(args[1]->IsFunction())
	{
		scan_cbdata->error_cb	= Persistent<Function>::New(NODE_ISOLATE_PRE Local<Function>::Cast(args[1]));
	}
	else 
	{
		as_v8_error(log, "Callback not passed to process the error message");
		goto ErrReturn;
	}
	if(args[2]->IsFunction())
	{
		scan_cbdata->end_cb	= Persistent<Function>::New(NODE_ISOLATE_PRE Local<Function>::Cast(args[2]));
	}
	else 
	{
		as_v8_error(log, "Callback not passed to notify the end of scan");
		goto ErrReturn;
	}


    if ( arglength > 4 ) 
	{
        if ( args[3]->IsObject()) 
		{
            if (scanpolicy_from_jsobject( policy, args[3]->ToObject(), log) != AS_NODE_PARAM_OK) 
			{
                as_v8_error(log, "Parsing of readpolicy from object failed");
                COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
				data->param_err = 1;
				goto ErrReturn;
            }
        }
        else 
		{
            as_v8_error(log, "Readpolicy should be an object");
            COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
			data->param_err = 1;
			goto ErrReturn;
        }
    }
    else 
	{
        as_v8_detail(log, "Argument list does not contain read policy, using default values for read policy");
        as_policy_scan_init(policy);
    }

	

ErrReturn:
	scope.Close(Undefined());
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
    as_policy_scan* policy  = &data->policy;

    LogInfo * log           = data->log;

    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        as_v8_error(log, "Not connected to Cluster to perform the operation");
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }

    if ( data->param_err == 0 ) {
		// register the uv_async_init event here, for the scan callback to be invoked at regular interval.
		async_init(&data->scan_cbdata->async_handle, async_callback);
		data->scan_cbdata->async_handle.data = data->scan_cbdata;
        as_v8_debug(log, "Invoking get with ");
        //Invoke the as_scan_foreach function here.
		aerospike_scan_foreach( as, err, policy, data->scan, aerospike_scan_callback, (void*) data->scan_cbdata); 

		// send an async signal here. If at all there's any residual records left in the record_q,
		// this signal's callback will send it to node layer.
		data->scan_cbdata->async_handle.data = data->scan_cbdata;
		async_send(&data->scan_cbdata->async_handle);
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
    NODE_ISOLATE_DECL;
    HANDLESCOPE;

    // Fetch the AsyncData structure
    AsyncData * data			= reinterpret_cast<AsyncData *>(req->data);

	ScanCallbackData* scan_data = data->scan_cbdata;
    LogInfo * log				= data->log;

	// Check the queue size for zero.
	// if the queue has some records to passed to node layer,
	// Pass the record to node layer
	if (scan_data->record_q && !CF_Q_EMPTY(scan_data->record_q))	
	{
		empty_record_queue(scan_data);
	}
	// Surround the callback in a try/catch for safety
	TryCatch try_catch;
	
	Handle<Value> argv[1] = { String::New("Finished scan !!!") };

	// Execute the callback.
	if ( scan_data->end_cb!= Null()) {
		scan_data->end_cb->Call(Context::GetCurrent()->Global(), 1, argv);
		as_v8_debug(log, "Invoked Get callback");
	}

	// Process the exception, if any
	if ( try_catch.HasCaught() ) {
		node::FatalException(try_catch);
	}

	// Dispose the Persistent handle so the callback
	// function can be garbage-collected
	scan_data->record_cb.Dispose();
	scan_data->error_cb.Dispose();
	scan_data->end_cb.Dispose();

	async_close(&scan_data->async_handle);
	if(scan_data->record_q != NULL) 
	{
		cf_queue_destroy(scan_data->record_q);
		scan_data->record_q = NULL;
	}

	delete scan_data;
	delete data;
	delete req;

    as_v8_debug(log, "Scan operation done");

    scope.Close(Undefined());
	return;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'get()' Operation
 */
Handle<Value> AerospikeScan::foreach(const Arguments& args)
{
    return async_invoke(args, prepare, execute, respond);
}
