/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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
	#include <aerospike/as_job.h>
	#include <aerospike/as_key.h>
	#include <aerospike/as_record.h>
	#include <aerospike/as_scan.h>
	#include <aerospike/aerospike_batch.h>
	#include <aerospike/aerospike_scan.h>
	#include <aerospike/as_list.h>
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

#define AS_NODE_PARAM_ERR -1
#define AS_NODE_PARAM_OK   0
#define HOST_ADDRESS_SIZE 50


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

// Functions dealing with Double values
bool is_double_value(Local<Value> value);
double double_value(Local<Value> value);

// Utility functions to extract property values from V8 Object instances
int get_list_property(as_list** list, Local<Object> obj, char const* prop, const LogInfo* log);
int get_bool_property(bool* boolp, Local<Object> obj, char const* prop, const LogInfo* log);
int get_int64_property(int64_t* intp, Local<Object> obj, char const* prop, const LogInfo* log);
int get_asval_property(as_val** value, Local<Object> obj, const char* prop, const LogInfo* log);
int get_string_property(char** strp, Local<Object> obj, char const* prop, const LogInfo* log);
int get_optional_asval_property(as_val** value, bool* defined, Local<Object> obj, const char* prop, const LogInfo* log);
int get_optional_bool_property(bool* boolp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log);
int get_optional_int64_property(int64_t* intp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log);
int get_optional_string_property(char** strp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log);
int get_optional_uint32_property(uint32_t* intp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log);

// Functions to convert C client structure to v8 object(map)
Local<Object> error_to_jsobject(as_error* error, const LogInfo* log);
Local<Value> val_to_jsvalue(as_val* val, const LogInfo* log);
Local<Object> recordbins_to_jsobject(const as_record* record, const LogInfo* log );
Local<Object> recordmeta_to_jsobject(const as_record* record, const LogInfo* log );
Local<Object> record_to_jsobject(const as_record* record, const as_key* key, const LogInfo* log);
Local<Array> batch_records_to_jsarray(const as_batch_read_records* record, const LogInfo* log);
Local<Object> key_to_jsobject(const as_key* key, const LogInfo* log);
Local<Object> jobinfo_to_jsobject(const as_job_info* info, const LogInfo* log);

// Functions to convert v8 objects(maps) to C client structures
int host_from_jsobject(Local<Object> obj, char** addr, uint16_t* port, const LogInfo* log);
int log_from_jsobject(LogInfo* log, Local<Object> obj);
int recordbins_from_jsobject(as_record* rec, Local<Object> obj, const LogInfo* log);
int recordmeta_from_jsobject(as_record* rec, Local<Object> obj, const LogInfo* log);
int key_from_jsobject(as_key* key, Local<Object> obj, const LogInfo* log);
int key_from_jsarray(as_key* key, Local<Array> arr, const LogInfo* log);
int bins_from_jsarray(char*** bins, uint32_t* num_bins, Local<Array> arr, const LogInfo* log);
int batch_from_jsarray(as_batch* batch, Local<Array> arr, const LogInfo* log);
int batch_read_records_from_jsarray(as_batch_read_records** batch, Local<Array> arr, const LogInfo* log);
int udfargs_from_jsobject(char** filename, char** funcname, as_list** args, Local<Object> obj, const LogInfo* log);
int extract_blob_from_jsobject(uint8_t** data, int* len, Local<Object> obj, const LogInfo* log);
int list_from_jsarray(as_list** list, Local<Array> array, const LogInfo* log);
int map_from_jsobject(as_map** map, Local<Object> obj, const LogInfo* log);
int asval_from_jsvalue(as_val** value, Local<Value> v8value, const LogInfo* log);

//clone functions for record and key
bool record_clone(const as_record* src, as_record** dest, const LogInfo* log);
bool key_clone(const as_key* src, as_key** dest, const LogInfo* log, bool alloc_key = true );
as_val* asval_clone(const as_val* val, const LogInfo* log);

void free_batch_records(as_batch_read_records* records);

// Functions to set metadata of the record.
int setTTL(Local<Object> obj, uint32_t* ttl, const LogInfo* log);
int setGeneration(Local<Object> obj, uint16_t* generation, const LogInfo* log);
