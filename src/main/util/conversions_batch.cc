/*******************************************************************************
 * Copyright 2022 Aerospike, Inc.
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

#include <cstdint>
#include <complex>
#include <node.h>
#include <node_buffer.h>

#if defined(_MSC_VER)
	#include "io.h"
	#include "fcntl.h"
#endif

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/aerospike_batch.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
#include <aerospike/as_record_iterator.h>
#include <aerospike/aerospike_scan.h>
#include <aerospike/as_arraylist.h>
#include <aerospike/as_arraylist_iterator.h>
#include <aerospike/as_boolean.h>
#include <aerospike/as_geojson.h>
#include <aerospike/as_hashmap.h>
#include <aerospike/as_hashmap_iterator.h>
#include <aerospike/as_pair.h>
#include <aerospike/as_scan.h>
#include <aerospike/as_map.h>
#include <aerospike/as_nil.h>
#include <aerospike/as_stringmap.h>
#include <aerospike/as_vector.h>
#include <citrusleaf/alloc.h>
}

#include "client.h"
#include "conversions.h"
#include "operations.h"
#include "log.h"
#include "enums.h"
#include "string.h"
#include "policy.h"

using namespace node;
using namespace v8;

void batch_read_record_free(as_batch_read_record *record, const LogInfo *log)
{
	if (record->policy) {
		if (record->policy->filter_exp) {
			as_exp_destroy(record->policy->filter_exp);
		}
		cf_free((void *)record->policy);
	}
	if (record->ops) {
		as_operations_destroy(record->ops);
	}
	if (record->n_bin_names > 0) {
		for (uint32_t j = 0; j < record->n_bin_names; j++) {
			cf_free(record->bin_names[j]);
		}
		cf_free(record->bin_names);
	}
}

int batch_read_record_from_jsobject(as_batch_records *records,
									v8::Local<v8::Object> obj,
									const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	as_batch_read_record *record;

	record = as_batch_read_reserve(records);

	record->type = AS_BATCH_READ;
	record->has_write = false;
	record->in_doubt = false;

	Local<Object> key = Nan::Get(obj, Nan::New("key").ToLocalChecked())
							.ToLocalChecked()
							.As<Object>();
	if (key_from_jsobject(&record->key, key, log) != AS_NODE_PARAM_OK) {
		as_v8_error(log, "Parsing batch keys failed");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> policy_val =
		Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (policy_val->IsObject()) {
		record->policy =
			(as_policy_batch_read *)cf_malloc(sizeof(as_policy_batch_read));
		if ((rc = batchread_policy_from_jsobject(
				 (as_policy_batch_read *)record->policy,
				 policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
	}

	Local<Value> maybeOps =
		Nan::Get(obj, Nan::New("ops").ToLocalChecked()).ToLocalChecked();
	// TYPE_CHECK_OPT(maybeOps, IsArray, "ops must be an array");
	if (maybeOps->IsArray()) {
		Local<Array> ops = maybeOps.As<Array>();
		as_v8_debug(log, "Adding operations to batch read record");
		record->ops = as_operations_new(ops->Length());
		if (operations_from_jsarray(record->ops, ops, (LogInfo *)log) !=
			AS_NODE_PARAM_OK) {
			as_v8_error(
				log,
				"Parsing ops arguments for batch read record object failed");
			Nan::ThrowTypeError("Error in parsing the operations");
		}
	}

	Local<Value> v8_bins =
		Nan::Get(obj, Nan::New("bins").ToLocalChecked()).ToLocalChecked();
	if (v8_bins->IsArray()) {
		char **bin_names;
		uint32_t n_bin_names;
		if (bins_from_jsarray(&bin_names, &n_bin_names,
							  Local<Array>::Cast(v8_bins),
							  log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing batch bin names failed");
			return AS_NODE_PARAM_ERR;
		}
		record->bin_names = bin_names;
		record->n_bin_names = n_bin_names;
	}

	Local<Value> v8_readAllBins =
		Nan::Get(obj, Nan::New("readAllBins").ToLocalChecked())
			.ToLocalChecked();
	if (v8_readAllBins->IsBoolean()) {
		record->read_all_bins = Nan::To<bool>(v8_readAllBins).FromJust();
	}

	return rc;
}

void batch_write_record_free(as_batch_write_record *record, const LogInfo *log)
{
	if (record->policy) {
		if (record->policy->filter_exp) {
			as_exp_destroy(record->policy->filter_exp);
		}
		cf_free((void *)record->policy);
	}
	if (record->ops) {
		as_operations_destroy(record->ops);
	}
}

int batch_write_record_from_jsobject(as_batch_records *batch_records,
									 v8::Local<v8::Object> obj,
									 const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	as_batch_write_record *record;

	record = as_batch_write_reserve(batch_records);

	record->type = AS_BATCH_WRITE;
	record->has_write = true;
	record->in_doubt = false;

	Local<Object> key = Nan::Get(obj, Nan::New("key").ToLocalChecked())
							.ToLocalChecked()
							.As<Object>();
	if (key_from_jsobject(&record->key, key, log) != AS_NODE_PARAM_OK) {
		as_v8_error(log, "Parsing batch keys failed");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> policy_val =
		Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (policy_val->IsObject()) {
		record->policy =
			(as_policy_batch_write *)cf_malloc(sizeof(as_policy_batch_write));
		if ((rc = batchwrite_policy_from_jsobject(
				 (as_policy_batch_write *)record->policy,
				 policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
	}

	Local<Value> maybeOps =
		Nan::Get(obj, Nan::New("ops").ToLocalChecked()).ToLocalChecked();
	// TYPE_CHECK_OPT(maybeOps, IsArray, "ops must be an array");
	if (maybeOps->IsArray()) {
		Local<Array> ops = maybeOps.As<Array>();
		as_v8_debug(log, "Adding operations to batch write record");
		record->ops = as_operations_new(ops->Length());
		if (operations_from_jsarray(record->ops, ops, (LogInfo *)log) !=
			AS_NODE_PARAM_OK) {
			as_v8_error(
				log,
				"Parsing ops arguments for batch write record object failed");
			Nan::ThrowTypeError("Error in parsing the operations");
		}
	}

	return rc;
}

void batch_apply_record_free(as_batch_apply_record *record, const LogInfo *log)
{
	if (record->policy) {
		if (record->policy->filter_exp) {
			as_exp_destroy(record->policy->filter_exp);
		}
		cf_free((void *)record->policy);
	}
	if (record->module) {
		cf_free((void *)record->module);
	}
	if (record->function) {
		cf_free((void *)record->function);
	}
	if (record->arglist) {
		as_list_destroy(record->arglist);
	}
}

int batch_apply_record_from_jsobject(as_batch_records *batch_records,
									 v8::Local<v8::Object> obj,
									 const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	as_batch_apply_record *record;

	record = as_batch_apply_reserve(batch_records);

	record->type = AS_BATCH_APPLY;
	record->has_write = false;
	record->in_doubt = false;

	Local<Object> key = Nan::Get(obj, Nan::New("key").ToLocalChecked())
							.ToLocalChecked()
							.As<Object>();
	if (key_from_jsobject(&record->key, key, log) != AS_NODE_PARAM_OK) {
		as_v8_error(log, "Parsing batch keys failed");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> policy_val =
		Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (policy_val->IsObject()) {
		record->policy =
			(as_policy_batch_apply *)cf_malloc(sizeof(as_policy_batch_apply));
		if ((rc = batchapply_policy_from_jsobject(
				 (as_policy_batch_apply *)record->policy,
				 policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
	}

	Local<Value> udf =
		Nan::Get(obj, Nan::New("udf").ToLocalChecked()).ToLocalChecked();
	if (udf->IsObject()) {
		if (udfargs_from_jsobject((char **)&record->module,
								  (char **)&record->function, &record->arglist,
								  obj, log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "UDF args object invalid");
			return AS_NODE_PARAM_ERR;
		}
	}

	return rc;
}

void batch_remove_record_free(as_batch_remove_record *record,
							  const LogInfo *log)
{
	if (record->policy) {
		if (record->policy->filter_exp) {
			as_exp_destroy(record->policy->filter_exp);
		}
		cf_free((void *)record->policy);
	}
}

int batch_remove_record_from_jsobject(as_batch_records *batch_records,
									  v8::Local<v8::Object> obj,
									  const LogInfo *log)

{
	int rc = AS_NODE_PARAM_OK;
	as_batch_remove_record *record;

	record = as_batch_remove_reserve(batch_records);

	record->type = AS_BATCH_REMOVE;
	record->has_write = false;
	record->in_doubt = false;

	Local<Object> key = Nan::Get(obj, Nan::New("key").ToLocalChecked())
							.ToLocalChecked()
							.As<Object>();
	if (key_from_jsobject(&record->key, key, log) != AS_NODE_PARAM_OK) {
		as_v8_error(log, "Parsing batch keys failed");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> policy_val =
		Nan::Get(obj, Nan::New("policy").ToLocalChecked()).ToLocalChecked();
	if (policy_val->IsObject()) {
		record->policy =
			(as_policy_batch_remove *)cf_malloc(sizeof(as_policy_batch_remove));
		if ((rc = batchremove_policy_from_jsobject(
				 (as_policy_batch_remove *)record->policy,
				 policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
	}

	return rc;
}

void batch_records_free(as_batch_records *records, const LogInfo *log)
{
	const as_vector *list = &records->list;
	for (uint32_t i = 0; i < list->size; i++) {
		as_batch_base_record *batch_record =
			(as_batch_base_record *)as_vector_get((as_vector *)list, i);
		switch (batch_record->type) {
		case AS_BATCH_READ:
			batch_read_record_free((as_batch_read_record *)batch_record, log);
			break;
		case AS_BATCH_WRITE:
			batch_write_record_free((as_batch_write_record *)batch_record, log);
			break;
		case AS_BATCH_APPLY:
			batch_apply_record_free((as_batch_apply_record *)batch_record, log);
			break;
		case AS_BATCH_REMOVE:
			batch_remove_record_free((as_batch_remove_record *)batch_record,
									 log);
			break;
		}
	}

	as_batch_records_destroy(records);

	return;
}

int batch_records_from_jsarray(as_batch_records **records, Local<Array> arr,
							   const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	uint32_t no_records = arr->Length();
	uint32_t type = 0;

	*records = as_batch_records_create(no_records);

	for (uint32_t i = 0; i < no_records; i++) {
		Local<Object> obj = Nan::Get(arr, i).ToLocalChecked().As<Object>();

		if ((rc = get_uint32_property((uint32_t *)&type, obj, "type", log)) !=
			AS_NODE_PARAM_OK) {
			break;
		}

		switch (type) {
		case AS_BATCH_READ:
			rc = batch_read_record_from_jsobject(*records, obj, log);
			break;
		case AS_BATCH_WRITE:
			rc = batch_write_record_from_jsobject(*records, obj, log);
			break;
		case AS_BATCH_APPLY:
			rc = batch_apply_record_from_jsobject(*records, obj, log);
			break;
		case AS_BATCH_REMOVE:
			rc = batch_remove_record_from_jsobject(*records, obj, log);
			break;
		default:
			rc = AS_NODE_PARAM_ERR;
			as_v8_error(log, "Invalid batch record type");
			break;
		}

		if (rc != AS_NODE_PARAM_OK) {
			break;
		}
	}

	if (rc != AS_NODE_PARAM_OK) {
		batch_records_free(*records, log);
		*records = NULL;
	}

	return rc;
}

int batch_read_records_from_jsarray(as_batch_read_records **records,
									Local<Array> arr, const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	uint32_t no_records = arr->Length();

	*records = as_batch_read_create(no_records);

	for (uint32_t i = 0; i < no_records; i++) {
		Local<Object> obj = Nan::Get(arr, i).ToLocalChecked().As<Object>();
		rc = batch_read_record_from_jsobject(*records, obj, log);
		if (rc != AS_NODE_PARAM_OK) {
			break;
		}
	}

	if (rc != AS_NODE_PARAM_OK) {
		batch_records_free(*records, log);
		*records = NULL;
	}

	return rc;
}

Local<Array> batch_records_to_jsarray(const as_batch_records *records,
									  const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	const as_vector *list = &records->list;
	Local<Array> results = Nan::New<Array>(list->size);

	for (uint32_t i = 0; i < list->size; i++) {
		as_batch_base_record *batch_record =
			(as_batch_base_record *)as_vector_get((as_vector *)list, i);
		as_status status = batch_record->result;
		as_record *record = &batch_record->record;
		as_key *key = &batch_record->key;

		Local<Object> result = Nan::New<Object>();
		Nan::Set(result, Nan::New("status").ToLocalChecked(), Nan::New(status));
		Nan::Set(result, Nan::New("key").ToLocalChecked(),
				 key_to_jsobject(key ? key : &record->key, log));
		if (status == AEROSPIKE_OK) {
			Nan::Set(result, Nan::New("meta").ToLocalChecked(),
					 recordmeta_to_jsobject(record, log));
			Nan::Set(result, Nan::New("bins").ToLocalChecked(),
					 recordbins_to_jsobject(record, log));
		}
		Nan::Set(result, Nan::New("inDoubt").ToLocalChecked(),
				batch_record->in_doubt ? Nan::True() : Nan::False());

		Nan::Set(results, i, result);
	}

	return scope.Escape(results);
}
