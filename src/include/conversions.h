/*******************************************************************************
 * Copyright 2013-2023 Aerospike, Inc.
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

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/aerospike_batch.h>
#include <aerospike/aerospike_stats.h>
#include <aerospike/as_metrics_writer.h>
#include <aerospike/as_job.h>
#include <aerospike/as_node.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
#include <aerospike/as_scan.h>
#include <aerospike/aerospike_batch.h>
#include <aerospike/aerospike_scan.h>
#include <aerospike/as_list.h>
#include <aerospike/as_map.h>
#include <aerospike/as_map_operations.h>
#include <aerospike/as_exp.h>
#include <aerospike/as_admin.h>
#include <aerospike/as_txn.h>
}

#include "client.h"

/****************************************************************************
 * MACROS
 ****************************************************************************/

#define AS_NODE_PARAM_ERR -1
#define AS_NODE_PARAM_OK 0
#define HOST_ADDRESS_SIZE 50

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

bool instanceof (v8::Local<v8::Value> value, const char *type);

// Functions dealing with Double values
bool is_double_value(v8::Local<v8::Value> value);
double double_value(v8::Local<v8::Value> value);

bool is_transaction_value(v8::Local<v8::Value> value);

bool is_geojson_value(v8::Local<v8::Value> value);

char *geojson_as_string(v8::Local<v8::Value> value);

// Utility functions to extract property values from V8 v8::Object instances
int get_bool_property(bool *boolp, v8::Local<v8::Object> obj, char const *prop,
					  const LogInfo *log);
int get_bytes_property(uint8_t **bytes, int *size, v8::Local<v8::Object> obj,
					   char const *prop, const LogInfo *log);
int get_list_property(as_list **list, v8::Local<v8::Object> obj,
					  char const *prop, const LogInfo *log);
int get_int_property(int *intp, v8::Local<v8::Object> obj, char const *prop,
					 const LogInfo *log);
int get_int64_property(int64_t *intp, v8::Local<v8::Object> obj,
					   char const *prop, const LogInfo *log);
int get_uint64_property(uint64_t *intp, v8::Local<v8::Object> obj,
						char const *prop, const LogInfo *log);
int get_uint32_property(uint32_t *intp, v8::Local<v8::Object> obj,
						char const *prop, const LogInfo *log);
void get_inf_property(as_val **value, const LogInfo *log);
void get_wildcard_property(as_val **value, const LogInfo *log);
int get_asval_property(as_val **value, v8::Local<v8::Object> obj,
					   const char *prop, const LogInfo *log);
int get_string_property(char **strp, v8::Local<v8::Object> obj,
						char const *prop, const LogInfo *log);
int get_optional_asval_property(as_val **value, bool *defined,
								v8::Local<v8::Object> obj, const char *prop,
								const LogInfo *log);
int get_optional_bool_property(bool *boolp, bool *defined,
							   v8::Local<v8::Object> obj, char const *prop,
							   const LogInfo *log);
int get_optional_transaction_property(as_txn **txn, bool *defined,
								v8::Local<v8::Object> obj, char const *prop,
								const LogInfo *log);
int get_optional_bytes_property(uint8_t **bytes, int *size, bool *defined,
								v8::Local<v8::Object> obj, char const *prop,
								const LogInfo *log);
int get_optional_rack_ids_property(as_config *config, bool *defined, v8::Local<v8::Object> obj,
							  char const *prop, const LogInfo *log);
int get_optional_int_property(int *intp, bool *defined,
							  v8::Local<v8::Object> obj, char const *prop,
							  const LogInfo *log);
int get_optional_int32_property(int32_t *intp, bool *defined,
								v8::Local<v8::Object> obj, char const *prop,
								const LogInfo *log);
int get_optional_int64_property(int64_t *intp, bool *defined,
								v8::Local<v8::Object> obj, char const *prop,
								const LogInfo *log);
int get_optional_string_property(char **strp, bool *defined,
								 v8::Local<v8::Object> obj, char const *prop,
								 const LogInfo *log);
int get_optional_uint64_property(uint64_t *intp, bool *defined,
								 v8::Local<v8::Object> obj, char const *prop,
								 const LogInfo *log);
int get_optional_uint32_property(uint32_t *intp, bool *defined,
								 v8::Local<v8::Object> obj, char const *prop,
								 const LogInfo *log);
int get_optional_uint16_property(uint16_t *intp, bool *defined,
								 v8::Local<v8::Object> obj, char const *prop,
								 const LogInfo *log);
int get_float_property(double *floatp, v8::Local<v8::Object> obj,
					   char const *prop, const LogInfo *log);
bool get_optional_list_policy(as_list_policy *policy, bool *has_policy,
							  v8::Local<v8::Object> obj, const LogInfo *log);
bool get_map_policy(as_map_policy *policy, v8::Local<v8::Object> obj,
					const LogInfo *log);
int get_optional_report_dir_property(char **report_dir, bool *defined,
								v8::Local<v8::Object> obj, const char *prop,
								const LogInfo *log);

// Functions to convert C client structure to v8 object(map)
v8::Local<v8::Object> error_to_jsobject(as_error *error, const LogInfo *log);
v8::Local<v8::Value> val_to_jsvalue(as_val *val, const LogInfo *log);
v8::Local<v8::Object> recordbins_to_jsobject(const as_record *record,
											 const LogInfo *log);
v8::Local<v8::Object> recordmeta_to_jsobject(const as_record *record,
											 const LogInfo *log);
v8::Local<v8::Object> record_to_jsobject(const as_record *record,
										 const as_key *key, const LogInfo *log);
v8::Local<v8::Object> key_to_jsobject(const as_key *key, const LogInfo *log);
v8::Local<v8::Object> jobinfo_to_jsobject(const as_job_info *info,
										  const LogInfo *log);
v8::Local<v8::Object> query_bytes_to_jsobject(uint8_t* bytes, uint32_t bytes_size, const LogInfo *log);

v8::Local<v8::Array> as_users_to_jsobject(as_user** users, uint32_t users_size, const LogInfo *log);

v8::Local<v8::Array> as_roles_to_jsobject(as_role** roles, int roles_size, const LogInfo *log);

v8::Local<v8::Array> as_privileges_to_jsarray(as_privilege* privileges, int privileges_size, const LogInfo *log);

void load_bytes_size(v8::Local<v8::Object> saved_object, uint32_t* bytes_size, LogInfo *log);

void load_bytes(v8::Local<v8::Object> saved_object, uint8_t* bytes, uint32_t bytes_size, LogInfo *log);

// Functions to convert v8 objects(maps) to C client structures
int host_from_jsobject(v8::Local<v8::Object> obj, char **addr, uint16_t *port,
					   const LogInfo *log);
int datacenter_from_jsobject(v8::Local<v8::Value> v8_dc, char **dc,
					   const LogInfo *log);
int log_from_jsobject(LogInfo *log, v8::Local<v8::Object> obj);
int recordbins_from_jsobject(as_record *rec, v8::Local<v8::Object> obj,
							 const LogInfo *log);
int recordmeta_from_jsobject(as_record *rec, v8::Local<v8::Object> obj,
							 const LogInfo *log);
int key_from_jsobject(as_key *key, v8::Local<v8::Object> obj,
					  const LogInfo *log);
int bins_from_jsarray(char ***bins, uint32_t *num_bins,
					  v8::Local<v8::Array> arr, const LogInfo *log);
int batch_from_jsarray(as_batch *batch, v8::Local<v8::Array> arr,
					   const LogInfo *log);
int batch_read_records_from_jsarray(as_batch_read_records **batch,
									v8::Local<v8::Array> arr,
									const LogInfo *log);
v8::Local<v8::Array> batch_records_to_jsarray(const as_batch_records *records,
											  const LogInfo *log);
int batch_records_from_jsarray(as_batch_records **batch,
							   v8::Local<v8::Array> arr, const LogInfo *log);
int batch_read_record_from_jsobject(as_batch_records *batch,
									v8::Local<v8::Object> obj,
									const LogInfo *log);
int batch_write_record_from_jsobject(as_batch_records *batch,
									 v8::Local<v8::Object> obj,
									 const LogInfo *log);
int batch_apply_record_from_jsobject(as_batch_records *batch,
									 v8::Local<v8::Object> obj,
									 const LogInfo *log);
int batch_remove_record_from_jsobject(as_batch_records *batch,
									  v8::Local<v8::Object> obj,
									  const LogInfo *log);
void batch_records_free(as_batch_records *records, const LogInfo *log);
int udfargs_from_jsobject(char **filename, char **funcname, as_list **args,
						  v8::Local<v8::Object> obj, const LogInfo *log);

typedef struct {
    uint32_t *connection;
    uint32_t *write;
    uint32_t *read;
    uint32_t *batch;
    uint32_t *query;
} latency;

void cluster_to_jsobject(as_cluster_s* cluster, v8::Local<v8::Object> v8_cluster, latency* latency, uint32_t bucket_max);
void node_to_jsobject(as_node_s* node, v8::Local<v8::Object> v8_node, latency* latency, uint32_t bucket_max);
int extract_blob_from_jsobject(uint8_t **data, int *len,
							   v8::Local<v8::Object> obj, const LogInfo *log);
int list_from_jsarray(as_list **list, v8::Local<v8::Array> array,
					  const LogInfo *log);
int map_from_jsobject(as_map **map, v8::Local<v8::Object> obj,
					  const LogInfo *log);
int map_from_jsmap(as_map **map, v8::Local<v8::Map> obj,
					  const LogInfo *log);
int asval_from_jsvalue(as_val **value, v8::Local<v8::Value> v8value,
					   const LogInfo *log);
int string_from_jsarray(char*** roles, int roles_size, v8::Local<v8::Array> role_array, const LogInfo *log);

int privileges_from_jsarray(as_privilege*** privileges, int privileges_size, v8::Local<v8::Array>  privilege_array, const LogInfo *log); 

//clone functions for record and key
bool record_clone(const as_record *src, as_record **dest, const LogInfo *log);
bool key_clone(const as_key *src, as_key **dest, const LogInfo *log,
			   bool alloc_key = true);
as_val *asval_clone(const as_val *val, const LogInfo *log);

// Functions to set metadata of the record.
int setTTL(v8::Local<v8::Object> obj, uint32_t *ttl, const LogInfo *log);
int setGeneration(v8::Local<v8::Object> obj, uint16_t *generation,
				  const LogInfo *log);

size_t as_strlcpy(char *d, const char *s, size_t bufsize);

static inline void
as_conn_stats_init_internal(as_conn_stats* stats)
{
	stats->in_pool = 0;
	stats->in_use = 0;
	stats->opened = 0;
	stats->closed = 0;
};

void
as_conn_stats_sum_internal(as_conn_stats* stats, as_async_conn_pool* pool);
