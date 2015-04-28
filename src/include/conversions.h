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

#pragma once

#include <node.h>
#include <cstdlib>
#include <unistd.h>

extern "C" {
	#include <aerospike/aerospike.h>
	#include <aerospike/aerospike_key.h>
	#include <aerospike/as_config.h>
	#include <aerospike/as_key.h>
	#include <aerospike/as_record.h>
	#include <aerospike/as_scan.h>
	#include <aerospike/aerospike_batch.h>
	#include <aerospike/aerospike_scan.h>
	#include <aerospike/as_arraylist.h>
	#include <citrusleaf/cf_queue.h>
}

#include "client.h"

using namespace v8;

/****************************************************************************
 * MACROS
 ****************************************************************************/ 

#define COPY_ERR_MESSAGE(__err,__message) \
    strcpy(__err.message, #__message); \
__err.code = __message;\
__err.line = __LINE__; \
__err.file = __FILE__; \
__err.func = __func__;

#define V8INTEGER_TO_CINTEGER(__num) \
    __num->ToNumber()->Value();

#define AS_NODE_PARAM_ERR -1
#define AS_NODE_PARAM_OK   0
#define HOST_ADDRESS_SIZE 50

/*******************************************************************************
 * STRUCTURES
 *******************************************************************************/
// This structure is used by query and scan async handles.
// To process the records from the callback and pass it to nodejs
typedef struct AsyncCallbackData {
	Persistent<Function> data_cb;
	Persistent<Function> error_cb;
	Persistent<Function> end_cb;
	cf_queue * result_q;
	int max_q_size;
	LogInfo * log;
	int signal_interval;
	uv_async_t async_handle;
}AsyncCallbackData;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

// Functions to convert C client structure to v8 object(map)
Handle<Object> error_to_jsobject(as_error * error, LogInfo *log);
Handle<Value> val_to_jsvalue(as_val * val, LogInfo *log );
Handle<Object> recordbins_to_jsobject(const as_record * record, LogInfo * log );  
Handle<Object> recordmeta_to_jsobject(const as_record * record, LogInfo * log );
Handle<Object> record_to_jsobject(const as_record * record, const as_key * key, LogInfo * log );
Handle<Object> key_to_jsobject(const as_key * key, LogInfo * log );
Handle<Object> scaninfo_to_jsobject(const as_scan_info * info, LogInfo * log );


// Functions to convert v8 objects(maps) to C client structures
int config_from_jsobject(as_config * config, Local<Object> obj, LogInfo * log );
int host_from_jsobject( Local<Object> obj, char **addr, uint16_t * port, LogInfo * log);
int log_from_jsobject( LogInfo * log, Local<Object> obj);
int recordbins_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log );
int recordmeta_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log );
int key_from_jsobject(as_key * key, Local<Object> obj, LogInfo * log );
int key_from_jsarray(as_key * key, Local<Array> arr, LogInfo * log );
int batch_from_jsarray(as_batch * batch, Local<Array> arr, LogInfo * log );
int operations_from_jsarray(as_operations * ops, Local<Array> arr, LogInfo * log ); 
int udfargs_from_jsobject( char** filename, char** funcname, as_arraylist** args, Local<Object> obj, LogInfo * log);

//clone functions for record and key
bool record_clone(const as_record * src, as_record ** dest, LogInfo * log );
bool key_clone(const as_key* src, as_key** dest, LogInfo * log, bool alloc_key = true );
as_val* asval_clone( as_val* val, LogInfo * log);

// Functions to convert v8 policies to C structures
int writepolicy_from_jsobject(as_policy_write * policy, Local<Object> obj, LogInfo * log );
int readpolicy_from_jsobject( as_policy_read* policy, Local<Object> obj, LogInfo * log );
int removepolicy_from_jsobject( as_policy_remove* policy, Local<Object> obj, LogInfo * log );
int batchpolicy_from_jsobject( as_policy_batch * policy, Local<Object> obj, LogInfo * log );
int operatepolicy_from_jsobject( as_policy_operate * policy, Local<Object> obj, LogInfo * log );
int infopolicy_from_jsobject ( as_policy_info * policy, Local<Object> obj, LogInfo * log );
int applypolicy_from_jsobject( as_policy_apply * policy, Local<Object> obj, LogInfo * log);
int scanpolicy_from_jsobject( as_policy_scan * policy, Local<Object> obj, LogInfo * log);
int querypolicy_from_jsobject( as_policy_query * policy, Local<Object> obj, LogInfo * log);
int adminpolicy_from_jsobject( as_policy_admin * policy, Local<Object> obj, LogInfo * log);

int writepolicy_from_config( as_policies* configpolicy, as_policy_write * policy, LogInfo * log );
int readpolicy_from_config( as_policies* configpolicy, as_policy_read* policy, LogInfo * log );
int removepolicy_from_config( as_policies* configpolicy, as_policy_remove* policy, LogInfo * log );
int batchpolicy_from_config( as_policies* configpolicy, as_policy_batch * policy, LogInfo * log );
int operatepolicy_from_config( as_policies* configpolicy, as_policy_operate * policy, LogInfo * log );
int infopolicy_from_config( as_policies* configpolicy, as_policy_info * policy, LogInfo * log );
int applypolicy_from_config( as_policies* configpolicy, as_policy_apply * policy, LogInfo * log);
int scanpolicy_from_config( as_policies* configpolicy, as_policy_scan * policy, LogInfo * log);
int querypolicy_from_config( as_policies* configpolicy, as_policy_query * policy, LogInfo * log);
int adminpolicy_from_config( as_policies* configpolicy, as_policy_admin * policy, LogInfo * log);

// Functions to handle query and scan kind of API which returns a bunch of records.
// Callback that's invoked when an async signal is sent by a scan or query callback.
void async_callback( ResolveAsyncCallbackArgs);
// Process each element in the queue and call the nodejs callback with the processed data.
void async_queue_process( AsyncCallbackData * data);
// Push the result from C callback into a queue.
bool async_queue_populate(const as_val * val, AsyncCallbackData* data);

// Functions to set metadata of the record.
int setTTL ( Local<Object> obj, uint32_t *ttl, LogInfo * log );
int setGeneration( Local<Object> obj, uint16_t * generation, LogInfo * log );


