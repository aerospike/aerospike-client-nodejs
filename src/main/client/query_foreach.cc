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
#include <aerospike/aerospike_query.h>
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
#include <sys/time.h>

#include "query.h"
#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"
using namespace v8;
#define QUEUE_SZ 100000
/*******************************************************************************
 *  TYPES
 ******************************************************************************/
typedef struct AsyncData {
    int param_err;
    aerospike * as;
    asQueryType type;
    uint64_t  scan_id;
    QueryScan* query_scan;
    as_error err;
    union {
        as_policy_query* query;
        as_policy_scan* scan;
    } policy;
    as_status res;
    LogInfo * log;
    AsyncCallbackData* query_cbdata;
} AsyncData;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

// Clone the as_val into a new val. And push the cloned value 
// into the queue. When the queue size reaches 1/20th of total queue size
// send an async signal to v8 thread to process the records in the queue.


// This is common function used by both scan and query.
// scan populates only as_val of type record.
// In case of query it can be record - in case of query without aggregation
// In query aggregation, the value can be any as_val.

bool async_queue_populate(const as_val* val, AsyncCallbackData * data)
{
    if(data->result_q == NULL)
    {
        // in case result_q is not initialized, return from the callback.
        // But this should never happen.
        as_v8_error(data->log,"Internal Error: Queue not initialized");
        return false;
    }

    // if the record queue is full sleep for n microseconds.
    if( cf_queue_sz(data->result_q) > data->max_q_size) {
        // why 20 - no reason right now.
        usleep(20);
    }
    as_val_t type = as_val_type(val);
    switch(type)
    {
        case AS_REC:
            {
                as_record* p_rec = as_record_fromval(val);
                as_record* rec   = NULL;
                if( !p_rec) {
                    as_v8_error(data->log, "record returned in the callback is NULL");
                    return false;
                }
                uint16_t numbins = as_record_numbins(p_rec);
                rec         = as_record_new(numbins);
                // clone the record into Asyncdata structure here.
                // as_val is freed up after the callback. We need to retain a copy of this
                // as_val until we pass this structure to nodejs
                record_clone( p_rec, &rec, data->log);

                as_val* clone_rec = as_record_toval(rec);
                if( cf_queue_sz( data->result_q) >= data->max_q_size)
                {
                    sleep(1);
                }
                cf_queue_push( data->result_q, &clone_rec);
                data->signal_interval++;
                break;
            }
        case AS_NIL:
        case AS_BOOLEAN:
        case AS_INTEGER:
        case AS_STRING:
        case AS_BYTES:
        case AS_LIST:
        case AS_MAP:
            {
                as_val* clone = asval_clone((as_val*) val, data->log);
                if( cf_queue_sz( data->result_q) >= data->max_q_size)
                {
                    sleep(1);
                }
                cf_queue_push( data->result_q, &clone);
                data->signal_interval++;
                break;
            }
        default:
            as_v8_debug(data->log, "Query returned - unrecognizable type");
            break;

    }
    int async_signal_sz = (data->max_q_size)/20;
    if ( data->signal_interval% async_signal_sz == 0) {
        data->signal_interval = 0;
        async_send( &data->async_handle);
    }
    return true;
}

void async_queue_process(AsyncCallbackData * data)
{

    int rv;
    as_val * val = NULL;
    // Pop each record from the queue and invoke the node callback with this record.
    while(data->result_q && cf_queue_sz(data->result_q) > 0) {
        if (cf_queue_sz(data->result_q) > data->max_q_size) {

        }
        rv = cf_queue_pop( data->result_q, &val, CF_QUEUE_FOREVER);
        if( rv == CF_QUEUE_OK) {
            Nan::HandleScope scope;
            Local<Function> cb = Nan::New<Function>(data->data_cb);
            if(as_val_type(val) == AS_REC)
            {
                as_record* record = as_record_fromval(val);
                Local<Object> jsrecord = Nan::New<Object>();
                jsrecord->Set(Nan::New("bins").ToLocalChecked(),recordbins_to_jsobject(record, data->log));
                jsrecord->Set(Nan::New("meta").ToLocalChecked(),recordmeta_to_jsobject(record, data->log));
                jsrecord->Set(Nan::New("key").ToLocalChecked(),key_to_jsobject(&record->key, data->log));
                as_record_destroy(record);
                Local<Value> cbinfo[1] = { (jsrecord)};
                Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 1, cbinfo);
            }
            else
            {
                Local<Value> cbinfo[1] = { (val_to_jsvalue(val, data->log))};
                as_val_destroy(val);
                Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 1, cbinfo);
            }
        }
    }
}


void async_callback(ResolveAsyncCallbackArgs)
{
    AsyncCallbackData * data = reinterpret_cast<AsyncCallbackData *>(handle->data);

    if (data == NULL && data->result_q == NULL)
    {    
        as_v8_error(data->log, "Internal error: data or result q is not initialized");
        return;
    }    
    async_queue_process(data);
    return;

}

// callback for query here.
// Queue the record into a common queue and generate an event 
// when the queue size reaches 1/20th of the total size of the queue.

bool aerospike_query_callback(const as_val * val, void* udata)
{
    AsyncCallbackData *query_cbdata = reinterpret_cast<AsyncCallbackData*>(udata);

    if(val == NULL) 
    {
        as_v8_debug(query_cbdata->log, "value returned by query callback is NULL");
        return false;
    }

    // push the record from the server to a queue.
    // Why? Here the record cannot be directly passed on from scan callback to v8 thread.
    // Because v8 objects can only be created inside a v8 context. This callback is in 
    // C client thread, which is not aware of the v8 context.
    // So store this records in a temporary queue.
    // When a queue reaches a certain size, signal v8 thread to process this queue.
    return async_queue_populate(val, query_cbdata);
}

/**
 *  prepare() — Function to prepare AsyncData, for use in `execute()` and `respond()`.
 *  
 *  This should only keep references to V8 or V8 structures for use in 
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void * prepare(ResolveArgs(info))
{
    Nan::HandleScope scope;

    AerospikeQuery* query			= ObjectWrap::Unwrap<AerospikeQuery>(info.This());
    // Build the async data
    AsyncData * data				= new AsyncData;
    AsyncCallbackData* query_cbdata	= new AsyncCallbackData;
    data->as						= query->as;
    LogInfo * log					= data->log = query->log;
    data->query_cbdata				= query_cbdata;
    data->query_cbdata->log			= log;
    data->param_err					= 0;
    data->type						= query->type;
    data->res						= AEROSPIKE_OK;
    data->policy.scan				= NULL;
    data->policy.query				= NULL;
    int curr_arg_pos				= 0;
    int res							= 0;
    int arglength					= info.Length();
    data->query_scan                = &query->query_scan;


    //scan background - no need to create a result queue.
    if(data->type == SCANUDF)
    {
        data->scan_id					= 0;
        // for scan_background callback for data is NULL.
        if(!info[curr_arg_pos]->IsNull())
        {
            as_v8_error(log, "Data callback must be NULL for scan background job");
            data->param_err = 1;
            goto ErrReturn;
        }
        curr_arg_pos++;
    }
    else // queue creation job for scan_foreground, scan_aggregation, query and query aggregation.
    {
        // For query, aggregation and scan foreground data callback must be present
        if(!info[curr_arg_pos]->IsFunction())
        {
            as_v8_error(log, "Callback not passed to process the  query results");
            data->param_err = 1;
            goto ErrReturn;
        }
        query_cbdata->signal_interval	= 0;
        query_cbdata->result_q			= cf_queue_create(sizeof(as_val*), true);
        query_cbdata->max_q_size		= query->q_size ? query->q_size : QUEUE_SZ;
         
        query_cbdata->data_cb.Reset(info[curr_arg_pos].As<Function>());
        curr_arg_pos++;

        // Should be registered in prepare.
        // Reason. async_init is not thread safe. Prepare and respond are single threaded and 
        // execute is multi threaded (4 uv_workers does the execute work here).
        async_init(&data->query_cbdata->async_handle, async_callback);
        data->query_cbdata->async_handle.data = data->query_cbdata;
    }

    // check for error callback 
    if(info[curr_arg_pos]->IsFunction())
    {
         
        query_cbdata->error_cb.Reset(info[curr_arg_pos].As<Function>());
        curr_arg_pos++;
    }
    else 
    {
        as_v8_error(log, "Callback not passed to process the error message");
        data->param_err = 1;
        goto ErrReturn;
    }

    // check for termination callback
    if(info[curr_arg_pos]->IsFunction())
    {
         
        query_cbdata->end_cb.Reset(info[curr_arg_pos].As<Function>());
        curr_arg_pos++;
    }
    else 
    {
        as_v8_error(log, "Callback not passed to notify the end of query");
        data->param_err = 1;
        goto ErrReturn;
    }


    // If it's a query, then there are 3 callbacks and one optional policy objects.
    if (arglength > 3)  
    {
        if ( info[curr_arg_pos]->IsObject()) 
        {
            if (isQuery(data->type))
            {
                data->policy.query = (as_policy_query*) cf_malloc(sizeof(as_policy_query));
                res = querypolicy_from_jsobject( data->policy.query, info[curr_arg_pos]->ToObject(), log);
                if(res != AS_NODE_PARAM_OK) 
                {
                    as_v8_error(log, "Parsing of querypolicy from object failed");
                    COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
                    data->param_err = 1;
                    goto ErrReturn;
                }
                else
                {
                    as_v8_debug(log, "querypolicy parsed successfully");
                }
            }
            else 			
            {
                data->policy.scan = (as_policy_scan*) cf_malloc(sizeof(as_policy_scan));
                res = scanpolicy_from_jsobject( data->policy.scan, info[curr_arg_pos]->ToObject(), log);
                if( res != AS_NODE_PARAM_OK)
                {
                    as_v8_error(log, "Parsing of scanpolicy from object failed");
                    COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
                    data->param_err = 1;
                    goto ErrReturn;
                }
                else
                {
                    as_v8_debug(log, "scanpolicy parsed successfully");
                }
            }
        }
        else 
        {
            as_v8_error(log, "Policy should be an object");
            COPY_ERR_MESSAGE( data->err, AEROSPIKE_ERR_PARAM );
            data->param_err = 1;
            goto ErrReturn;
        }
    }



ErrReturn:
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
    aerospike * as					 = data->as;
    as_error *  err					 = &data->err;
    LogInfo * log					 = data->log;

    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        as_v8_error(log, "Not connected to Cluster to perform the operation");
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }

    if ( data->param_err == 0 ) {
        // it's a query with a where clause or a scan aggregation(query without a where clause)
        if( data->type == SCANAGGREGATION || isQuery(data->type))
        {
            as_v8_debug(log, "Invoking aerospike_query_foreach  ");

            data->res = aerospike_query_foreach( as, err, data->policy.query, data->query_scan->query, aerospike_query_callback, 
                    (void*) data->query_cbdata); 

            // send an async signal here. If at all there's any residual records left in the result_q,
            // this signal's callback will send it to node layer.
            async_send(&data->query_cbdata->async_handle);
        }
        else if(data->type == SCANUDF ) // query without where clause, becomes a scan background.
        {
            // generating a 32 bit random number. 
            // Because when converting from node.js integer, the last two digits precision is lost.
            data->scan_id    = 0;
            int32_t dummy_id = 0;

            // For seeding the random generator system's microseconds.
            // If two scan requests are processed in the same microsecond, then same scan id
            // is generated for both of them.
            struct timeval time; 
            gettimeofday(&time,NULL);
            srand((time.tv_sec * 1000000) + (time.tv_usec ));
            dummy_id = rand();
            data->scan_id = dummy_id;
            as_v8_debug(log, "The random number generated for scan_id %d ", data->scan_id);

            as_v8_debug(log, "Scan id generated is %d", data->scan_id);
            data->res = aerospike_scan_background( as, err, data->policy.scan, data->query_scan->scan, &data->scan_id);
        }
        else if(data->type == SCAN )
        {
            as_v8_debug(log, "Invoking scan foreach with percent %u", data->query_scan->scan->percent);

            aerospike_scan_foreach( as, err, data->policy.scan, data->query_scan->scan, aerospike_query_callback, (void*) data->query_cbdata); 

            // send an async signal here. If at all there's any residual records left in the queue,
            // this signal's callback will parse and send it to node layer.
            async_send(&data->query_cbdata->async_handle);

        }
        else
        {
            as_v8_error(log, "Request is neither a query nor a scan ");
        }


    }
    else
    {
        as_v8_debug(log, "Parameter error - Not making the call to Aerospike Cluster");
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
    AsyncData * data			= reinterpret_cast<AsyncData *>(req->data);

    AsyncCallbackData* query_data = data->query_cbdata;
    LogInfo * log				= data->log;
    Local<Function> error_cb = Nan::New<Function>(query_data->error_cb);

    if(data->param_err == 1)
    {
        Local<Value> err_info[1] = { error_to_jsobject( &data->err, log)};
        if(  !error_cb->IsUndefined() && !error_cb->IsNull())
        {
            Nan::MakeCallback(Nan::GetCurrentContext()->Global(), error_cb, 1, err_info);
        }
    }
    // If query returned an error invoke error callback
    if( data->res != AEROSPIKE_OK)
    {
        as_v8_debug(log,"An error occured in C API invocation");
        Local<Value> err_info[1] = { error_to_jsobject( &data->err, log)};
        if(  !error_cb->IsUndefined() && !error_cb->IsNull())
        {
            Nan::MakeCallback(Nan::GetCurrentContext()->Global(), error_cb, 1, err_info);
        }
    }

    // Check the queue size for zero.
    // if the queue has some records to passed to node layer,
    // Pass the record to node layer
    // If it's a query, not a background scan and query call returned AEROSPIKE_OK
    // then empty the queue.
    if( data->type == SCANUDF )
    {
        as_v8_debug(log, "scan background request completed");
    }
    else if(data->res == AEROSPIKE_OK 
            && query_data->result_q && !CF_Q_EMPTY(query_data->result_q))	
    {
        async_queue_process(query_data);
    }
    // Surround the callback in a try/catch for safety
    Nan::TryCatch try_catch;

    Local<Value> argv[1];
    if( data->type == SCANUDF)
    {
        as_v8_debug(log, "Invoking scan background callback with scan id %d", data->scan_id);
        argv[0] = Nan::New((double)data->scan_id);

    }
    else
    {
        as_v8_debug(log, "Invoking query callback");
        argv[0] = Nan::New("Finished query!!!").ToLocalChecked();
    }

    // Execute the callback
    Local<Function> end_cb = Nan::New<Function>(query_data->end_cb);

    if ( !end_cb->IsUndefined() && !end_cb->IsNull()) {
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), end_cb, 1, argv);
    }

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        Nan::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
     
    query_data->error_cb.Reset();
     
    query_data->end_cb.Reset();
    if( data->type == SCANUDF)
    {
        as_v8_debug(log,"scan background no need to clean up the queue structure");
        delete query_data;
    }
    else 
    {
         
        query_data->data_cb.Reset();
        if(query_data->result_q != NULL) 
        {
            cf_queue_destroy(query_data->result_q);
            query_data->result_q = NULL;
        }
        async_close(&query_data->async_handle);
    }

    /*~~~~~~~DO NOT USE query_data structure after this line ~~~~~~~~~~*/
    /* query_data is cleaned up/ deleted inside async_close function */

    if( data->type == SCAN || data->type == SCANUDF)
    {
        cf_free(data->query_scan->scan);
    }
    else 
    {
        // @TO-DO A bug in c-client query destroy doesn't destroy the bin value
        // for string type queries.
        as_query_destroy(data->query_scan->query);

        cf_free(data->query_scan->query);
    }
    if(data->policy.scan != NULL)
    {
        cf_free(data->policy.scan);
    }
    else if( data->policy.query != NULL)
    {
        cf_free(data->policy.query);
    }

    delete data;
    delete req;

    as_v8_debug(log, "Query operation done");
    return;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'query.foreach()' Operation
 */
NAN_METHOD(AerospikeQuery::foreach)
{
    (async_invoke(info, prepare, execute, respond));
}
