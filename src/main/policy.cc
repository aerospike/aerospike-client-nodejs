/*******************************************************************************
 * Copyright 2013-2022 Aerospike Inc.
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
#include <node.h>

#include "policy.h"
#include "conversions.h"
#include "expressions.h"

extern "C" {
#include <aerospike/as_policy.h>
#include <aerospike/as_event.h>
}

using namespace v8;

int eventpolicy_from_jsobject(as_policy_event *policy, Local<Object> obj,
							  const LogInfo *log)
{
	if (obj->IsUndefined() || obj->IsNull()) {
		return AS_NODE_PARAM_ERR;
	}
	int rc = 0;
	as_policy_event_init(policy);
	if ((rc = get_optional_int32_property(&policy->max_commands_in_process,
										  NULL, obj, "maxCommandsInProcess",
										  log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->max_commands_in_queue, NULL,
										   obj, "maxCommandsInQueue", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->queue_initial_capacity,
										   NULL, obj, "queueInitialCapacity",
										   log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing event policy: success");
	return AS_NODE_PARAM_OK;
}

int basepolicy_from_jsobject(as_policy_base *policy, Local<Object> obj,
							 const LogInfo *log)
{
	int rc = 0;
	if ((rc = get_optional_uint32_property(&policy->socket_timeout, NULL, obj,
										   "socketTimeout", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->total_timeout, NULL, obj,
										   "totalTimeout", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->max_retries, NULL, obj,
										   "maxRetries", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	
	Local<Value> exp_val =
		Nan::Get(obj, Nan::New("filterExpression").ToLocalChecked())
			.ToLocalChecked();
	if (exp_val->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if ((rc = compile_expression(exp_ary, &policy->filter_exp, log)) !=
			AS_NODE_PARAM_OK) {
			return rc;
		}
	}
	else if (exp_val->IsNull() || exp_val->IsUndefined()) {
		// no-op
	}
	else {
		as_v8_error(log, "Invalid filter expression value");
		return AS_NODE_PARAM_ERR;
	}

	if ((rc = get_optional_bool_property(&policy->compress, NULL, obj,
										 "compress", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}

	return AS_NODE_PARAM_OK;
}

int readpolicy_from_jsobject(as_policy_read *policy, Local<Object> obj,
							 const LogInfo *log)
{
	int rc = 0;
	as_policy_read_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->key, NULL, obj,
										   "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->replica, NULL,
										   obj, "replica", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->read_mode_ap,
										   NULL, obj, "readModeAP", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->read_mode_sc,
										   NULL, obj, "readModeSC", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->deserialize, NULL, obj,
										 "deserialize", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing read policy: success");
	return AS_NODE_PARAM_OK;
}

int writepolicy_from_jsobject(as_policy_write *policy, Local<Object> obj,
							  const LogInfo *log)
{
	int rc = 0;
	as_policy_write_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->key, NULL, obj,
										   "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->replica, NULL,
										   obj, "replica", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->commit_level,
										   NULL, obj, "commitLevel", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->gen, NULL, obj,
										   "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->exists, NULL,
										   obj, "exists", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->compression_threshold, NULL,
										   obj, "compressionThreshold", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj,
										 "durableDelete", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing write policy: success");
	return AS_NODE_PARAM_OK;
}

int applypolicy_from_jsobject(as_policy_apply *policy, Local<Object> obj,
							  const LogInfo *log)
{
	int rc = 0;
	as_policy_apply_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->key, NULL, obj,
										   "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->replica, NULL,
										   obj, "replica", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->commit_level,
										   NULL, obj, "commitLevel", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->ttl, NULL, obj, "ttl",
										   log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj,
										 "durableDelete", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing apply policy: success");
	return AS_NODE_PARAM_OK;
}

int operatepolicy_from_jsobject(as_policy_operate *policy, Local<Object> obj,
								const LogInfo *log)
{
	int rc = 0;
	as_policy_operate_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->key, NULL, obj,
										   "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->replica, NULL,
										   obj, "replica", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->read_mode_ap,
										   NULL, obj, "readModeAP", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->read_mode_sc,
										   NULL, obj, "readModeSC", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->commit_level,
										   NULL, obj, "commitLevel", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->gen, NULL, obj,
										   "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->exists, NULL,
										   obj, "exists", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->deserialize, NULL, obj,
										 "deserialize", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj,
										 "durableDelete", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing operate policy: success");
	return AS_NODE_PARAM_OK;
}

int removepolicy_from_jsobject(as_policy_remove *policy, Local<Object> obj,
							   const LogInfo *log)
{
	int rc = 0;
	as_policy_remove_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->key, NULL, obj,
										   "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->replica, NULL,
										   obj, "replica", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->commit_level,
										   NULL, obj, "commitLevel", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->gen, NULL, obj,
										   "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint16_property((uint16_t *)&policy->generation,
										   NULL, obj, "generation", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj,
										 "durableDelete", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing remove policy: success");
	return AS_NODE_PARAM_OK;
}

int batchpolicy_from_jsobject(as_policy_batch *policy, Local<Object> obj,
							  const LogInfo *log)
{
	int rc = 0;
	as_policy_batch_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->replica, NULL,
										   obj, "replica", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->read_mode_ap,
										   NULL, obj, "readModeAP", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->read_mode_sc,
										   NULL, obj, "readModeSC", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->concurrent, NULL, obj,
										 "concurrent", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->allow_inline, NULL, obj,
										 "allowInline", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->allow_inline_ssd, NULL, obj,
										 "allowInlineSSD", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->respond_all_keys, NULL, obj,
										 "respondAllKeys", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->send_set_name, NULL, obj,
										 "sendSetName", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->deserialize, NULL, obj,
										 "deserialize", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing batch policy: success");
	return AS_NODE_PARAM_OK;
}

int batchread_policy_from_jsobject(as_policy_batch_read *policy,
								   v8::Local<v8::Object> obj,
								   const LogInfo *log)
{
	int rc = 0;

	as_policy_batch_read_init(policy);

	Local<Value> exp_val =
		Nan::Get(obj, Nan::New("filterExpression").ToLocalChecked())
			.ToLocalChecked();
	if (exp_val->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if (compile_expression(exp_ary, &policy->filter_exp, log) !=
			AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}

	if ((rc = get_optional_uint32_property((uint32_t *)&policy->read_mode_ap,
										   NULL, obj, "readModeAP", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->read_mode_sc,
										   NULL, obj, "readModeSC", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}

	return rc;
}

int batchwrite_policy_from_jsobject(as_policy_batch_write *policy,
									v8::Local<v8::Object> obj,
									const LogInfo *log)
{
	int rc = 0;

	as_policy_batch_write_init(policy);

	Local<Value> exp_val =
		Nan::Get(obj, Nan::New("filterExpression").ToLocalChecked())
			.ToLocalChecked();
	if (exp_val->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if (compile_expression(exp_ary, &policy->filter_exp, log) !=
			AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->key, NULL, obj,
										   "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->commit_level,
										   NULL, obj, "commitLevel", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->gen, NULL, obj,
										   "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->exists, NULL,
										   obj, "exists", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj,
										 "durableDelete", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	return rc;
}

int batchapply_policy_from_jsobject(as_policy_batch_apply *policy,
									v8::Local<v8::Object> obj,
									const LogInfo *log)
{
	int rc = 0;

	as_policy_batch_apply_init(policy);

	Local<Value> exp_val =
		Nan::Get(obj, Nan::New("filterExpression").ToLocalChecked())
			.ToLocalChecked();
	if (exp_val->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if (compile_expression(exp_ary, &policy->filter_exp, log) !=
			AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->key, NULL, obj,
										   "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->commit_level,
										   NULL, obj, "commitLevel", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->ttl, NULL, obj,
										   "ttl", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj,
										 "durableDelete", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}

	return rc;
}

int batchremove_policy_from_jsobject(as_policy_batch_remove *policy,
									 v8::Local<v8::Object> obj,
									 const LogInfo *log)
{
	int rc = 0;

	as_policy_batch_remove_init(policy);

	Local<Value> exp_val =
		Nan::Get(obj, Nan::New("filterExpression").ToLocalChecked())
			.ToLocalChecked();
	if (exp_val->IsArray()) {
		Local<Array> exp_ary = Local<Array>::Cast(exp_val);
		if (compile_expression(exp_ary, &policy->filter_exp, log) !=
			AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->key, NULL, obj,
										   "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->commit_level,
										   NULL, obj, "commitLevel", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->gen, NULL, obj,
										   "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->generation,
										   NULL, obj, "generation", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj,
										 "durableDelete", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	return rc;
}

int querypolicy_from_jsobject(as_policy_query *policy, Local<Object> obj,
							  const LogInfo *log)
{
	int rc = 0;
	as_policy_query_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->info_timeout,
										   NULL, obj, "infoTimeout", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->fail_on_cluster_change, NULL,
										 obj, "failOnClusterChange", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->deserialize, NULL, obj,
										 "deserialize", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->short_query, NULL, obj,
										 "shortQuery", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->fail_on_cluster_change, NULL, obj, "failOnClusterChange", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->info_timeout, NULL, obj, "infoTimeout", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail( log, "Parsing query policy : success");
	return AS_NODE_PARAM_OK;
}

int scanpolicy_from_jsobject(as_policy_scan *policy, Local<Object> obj,
							 const LogInfo *log)
{
	int rc = 0;
	as_policy_scan_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t *)&policy->max_records,
										   NULL, obj, "maxRecords", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(
			 (uint32_t *)&policy->records_per_second, NULL, obj,
			 "recordsPerSecond", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj,
										 "durableDelete", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing scan policy: success");
	return AS_NODE_PARAM_OK;
}

int infopolicy_from_jsobject(as_policy_info *policy, Local<Object> obj,
							 const LogInfo *log)
{
	if (obj->IsUndefined() || obj->IsNull()) {
		return AS_NODE_PARAM_ERR;
	}
	int rc = 0;
	as_policy_info_init(policy);
	if ((rc = get_optional_uint32_property(&policy->timeout, NULL, obj,
										   "timeout", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->send_as_is, NULL, obj,
										 "sendAsIs", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->check_bounds, NULL, obj,
										 "checkBounds", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing info policy: success");
	return AS_NODE_PARAM_OK;
}

int partitions_from_jsobject(as_partition_filter *pf, bool *defined,
							 v8::Local<v8::Object> obj, const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;

	*defined = false;
	if ((rc = get_optional_bool_property(defined, NULL, obj, "pfEnabled",
										 log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	if (!*defined) {
		return AS_NODE_PARAM_OK;
	}

	*defined = true;
	if (Nan::Has(obj, Nan::New("partFilter").ToLocalChecked()).FromJust()) {
		Local<Value> pf_obj =
			Nan::Get(obj, Nan::New("partFilter").ToLocalChecked())
				.ToLocalChecked();
		if (!pf_obj->IsUndefined() && pf_obj->IsObject()) {
			if ((rc = get_optional_uint32_property((uint32_t *)&pf->begin, NULL,
												   pf_obj.As<Object>(), "begin",
												   log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if ((rc = get_optional_uint32_property((uint32_t *)&pf->count, NULL,
												   pf_obj.As<Object>(), "count",
												   log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			int len = AS_DIGEST_VALUE_SIZE;
			bool digest_defined = false;
			if ((rc = get_optional_bytes_property(
					 (uint8_t **)&pf->digest.value, &len, &digest_defined,
					 pf_obj.As<Object>(), "digest", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			else {
				if (digest_defined) {
					pf->digest.init = true;
				}
			}
		}
		else {
			return AS_NODE_PARAM_ERR;
		}
	}
	else {
		return AS_NODE_PARAM_ERR;
	}

	as_v8_detail(log, "Parsing scan partition: success");

	return rc;
}