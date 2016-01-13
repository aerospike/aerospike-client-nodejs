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
    #include <aerospike/aerospike_scan.h>
    #include <citrusleaf/cf_queue.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>
#include <time.h>

#include "query.h"
#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"
using namespace v8;
#define QUEUE_SZ 10000
/*******************************************************************************
 *  TYPES
 ******************************************************************************/


typedef struct AsyncData {
    int param_err;
    aerospike * as;
    as_error err;
    as_policy_info* policy;
    uint64_t scan_id;
    as_scan_info scan_info;
    as_status  res;
    LogInfo * log;
    Nan::Persistent<Function> callback;
} AsyncData;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

static void * prepare(ResolveArgs(info))
{

    AerospikeQuery* query           = ObjectWrap::Unwrap<AerospikeQuery>(info.This());
    // Build the async data
    AsyncData * data                = new AsyncData();
    data->as                        = query->as;
    LogInfo * log                   = data->log = query->log;

    data->param_err                 = 0;
    // Local variables
    data->policy                            = NULL;
    int arglength                   = info.Length();
    int curr_arg_pos                = 0;

    if(info[arglength-1]->IsFunction())
    {
        data->callback.Reset(info[arglength-1].As<Function>());
    }
    else
    {
        as_v8_error(log, "Callback not passed to process the scanned record");
        goto ErrReturn;
    }

    if( info[curr_arg_pos]->IsNumber())
    {
        data->scan_id = info[curr_arg_pos]->ToInteger()->Value();
        as_v8_debug(log, "scan id to get info is %d ", data->scan_id);
        curr_arg_pos++;
    }

    if ( arglength > 2 )
    {
        if ( info[curr_arg_pos]->IsObject())
        {
            data->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
            if (infopolicy_from_jsobject( data->policy, info[3]->ToObject(), log) != AS_NODE_PARAM_OK)
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
    aerospike * as           = data->as;
    as_error *  err          = &data->err;
    as_policy_info * policy  = data->policy;
    uint64_t scan_id         = data->scan_id;
    as_scan_info * scan_info = &data->scan_info;
    LogInfo * log            = data->log;

    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        as_v8_error(log, "Not connected to Cluster to perform the operation");
        data->param_err = 1;
        COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
    }

    if ( data->param_err == 0 ) {
        as_v8_debug(log, "Invoking scan info to get the status of scan with id %d", scan_id);
        aerospike_scan_info(as, err, policy, scan_id, scan_info);
    }
    else {
        as_v8_debug(log, "Parameter error in the scan info");
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
    AsyncData * data            = reinterpret_cast<AsyncData *>(req->data);
    LogInfo * log               = data->log;
    as_scan_info * scan_info    = &data->scan_info;

    // Surround the callback in a try/catch for safety
    Nan::TryCatch try_catch;

    as_v8_detail(log, "Inside respond of scan info ");
    // Arguments to scan info callback.
    // Send status, progresPct and recScanned
    Local<Value> argv[2] = { scaninfo_to_jsobject(scan_info, log),
                              Nan::New((double)data->scan_id)};

    Local<Function> cb = Nan::New<Function>(data->callback);
    // Execute the callback.
    if ( !cb->IsNull()) {
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 2, argv);
        as_v8_debug(log, "Invoked scan info callback");
    }

    // Process the exception, if any
    if ( try_catch.HasCaught() ) {
        Nan::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    data->callback.Reset();

    if(data->policy != NULL)
    {
        cf_free(data->policy);
    }
    delete data;
    delete req;

    as_v8_debug(log, "Scan Info operation done");

    return;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'scan.foreach()' Operation
 */
NAN_METHOD(AerospikeQuery::queryInfo)
{
    async_invoke(info, prepare, execute, respond);
}
