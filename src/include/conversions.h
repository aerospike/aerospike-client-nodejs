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
	#include <aerospike/aerospike_batch.h>
	#include <aerospike/as_config.h>
	#include <aerospike/as_job.h>
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
 *  FUNCTIONS
 ******************************************************************************/

// Functions dealing with Double values
bool is_double_value(Local<Value> value);
double double_value(Local<Value> value);

// Functions to convert C client structure to v8 object(map)
Local<Object> error_to_jsobject(as_error * error, LogInfo *log);
Local<Value> val_to_jsvalue(as_val * val, LogInfo *log );
Local<Object> recordbins_to_jsobject(const as_record * record, LogInfo * log );
Local<Object> recordmeta_to_jsobject(const as_record * record, LogInfo * log );
Local<Object> recordkey_to_jsobject(const as_record * record, LogInfo * log );
Local<Object> record_to_jsobject(const as_record * record, const as_key * key, LogInfo * log );
Local<Array> batch_records_to_jsarray(const as_batch_read_records* record, LogInfo* log );
Local<Object> key_to_jsobject(const as_key * key, LogInfo * log );
Local<Object> jobinfo_to_jsobject(const as_job_info* info, LogInfo* log);

// Functions to convert v8 objects(maps) to C client structures
int config_from_jsobject(as_config * config, Local<Object> obj, LogInfo * log );
int host_from_jsobject( Local<Object> obj, char **addr, uint16_t * port, LogInfo * log);
int log_from_jsobject( LogInfo * log, Local<Object> obj);
int recordbins_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log );
int recordmeta_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log );
int key_from_jsobject(as_key * key, Local<Object> obj, LogInfo * log );
int key_from_jsarray(as_key * key, Local<Array> arr, LogInfo * log );
int bins_from_jsarray(char*** bins, uint32_t* num_bins, Local<Array> arr, LogInfo * log);
int batch_from_jsarray(as_batch * batch, Local<Array> arr, LogInfo * log );
int batch_read_records_from_jsarray(as_batch_read_records** batch, Local<Array> arr, LogInfo* log);
int operations_from_jsarray(as_operations * ops, Local<Array> arr, LogInfo * log );
int udfargs_from_jsobject( char** filename, char** funcname, as_arraylist** args, Local<Object> obj, LogInfo * log);

//clone functions for record and key
bool record_clone(const as_record * src, as_record ** dest, LogInfo * log );
bool key_clone(const as_key* src, as_key** dest, LogInfo * log, bool alloc_key = true );
as_val* asval_clone(const as_val* val, LogInfo * log);

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


// Functions to set metadata of the record.
int setTTL ( Local<Object> obj, uint32_t *ttl, LogInfo * log );
int setGeneration( Local<Object> obj, uint16_t * generation, LogInfo * log );

