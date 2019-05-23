/*******************************************************************************
 * Copyright 2013-2019 Aerospike Inc.
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

extern "C" {
#include <aerospike/as_policy.h>
#include <aerospike/as_event.h>
}

using namespace v8;

int eventpolicy_from_jsobject(as_policy_event* policy, Local<Object> obj, const LogInfo* log)
{
	if (obj->IsUndefined() || obj->IsNull()) {
		return AS_NODE_PARAM_ERR;
	}
	int rc = 0;
	as_policy_event_init(policy);
	if ((rc = get_optional_int32_property(&policy->max_commands_in_process, NULL, obj, "maxCommandsInProcess", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->max_commands_in_queue, NULL, obj, "maxCommandsInQueue", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->queue_initial_capacity, NULL, obj, "queueInitialCapacity", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing event policy: success");
	return  AS_NODE_PARAM_OK;
}

int infopolicy_from_jsobject(as_policy_info* policy, Local<Object> obj, const LogInfo* log)
{
	if (obj->IsUndefined() || obj->IsNull()) {
		return AS_NODE_PARAM_ERR;
	}
	int rc = 0;
	as_policy_info_init(policy);
	if ((rc = get_optional_uint32_property(&policy->timeout, NULL, obj, "timeout", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->timeout, NULL, obj, "totalTimeout", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->send_as_is, NULL, obj, "sendAsIs", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->check_bounds, NULL, obj, "checkBounds", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing info policy: success");
	return  AS_NODE_PARAM_OK;
}

int basepolicy_from_jsobject(as_policy_base* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	if ((rc = get_optional_uint32_property(&policy->socket_timeout, NULL, obj, "socketTimeout", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->total_timeout, NULL, obj, "timeout", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->total_timeout, NULL, obj, "totalTimeout", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->max_retries, NULL, obj, "retry", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	return AS_NODE_PARAM_OK;
}

int operatepolicy_from_jsobject(as_policy_operate* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	as_policy_operate_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->exists, NULL, obj, "exists", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->gen, NULL, obj, "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->key, NULL, obj, "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->commit_level, NULL, obj, "commitLevel", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->replica, NULL, obj, "replica", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->read_mode_ap, NULL, obj, "readModeAP", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->read_mode_sc, NULL, obj, "readModeSC", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->deserialize, NULL, obj, "deserialize", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj, "durableDelete", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing operate policy: success");
	return AS_NODE_PARAM_OK;
}

int batchpolicy_from_jsobject(as_policy_batch* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	as_policy_batch_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->read_mode_ap, NULL, obj, "readModeAP", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->read_mode_sc, NULL, obj, "readModeSC", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->deserialize, NULL, obj, "deserialize", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->allow_inline, NULL, obj, "allowInline", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->send_set_name, NULL, obj, "sendSetName", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing batch policy: success");
	return AS_NODE_PARAM_OK;
}

int removepolicy_from_jsobject(as_policy_remove* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	as_policy_remove_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->generation, NULL, obj, "generation", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->key, NULL, obj, "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->gen, NULL, obj, "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->commit_level, NULL, obj, "commitLevel", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj, "durableDelete", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing remove policy: success");
	return AS_NODE_PARAM_OK;
}

int readpolicy_from_jsobject(as_policy_read* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	as_policy_read_init( policy );
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->key, NULL, obj, "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->replica, NULL, obj, "replica", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->read_mode_ap, NULL, obj, "readModeAP", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->read_mode_sc, NULL, obj, "readModeSC", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->deserialize, NULL, obj, "deserialize", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing read policy: success");
	return AS_NODE_PARAM_OK;
}

int writepolicy_from_jsobject(as_policy_write* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	as_policy_write_init( policy );
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->gen, NULL, obj, "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->compression_threshold, NULL, obj, "compressionThreshold", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->key, NULL, obj, "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->exists, NULL, obj, "exists", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->commit_level, NULL, obj, "commitLevel", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj, "durableDelete", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail(log, "Parsing write policy: success");
	return AS_NODE_PARAM_OK;
}

int applypolicy_from_jsobject(as_policy_apply* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	as_policy_apply_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->gen, NULL, obj, "gen", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->key, NULL, obj, "key", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->commit_level, NULL, obj, "commitLevel", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&policy->ttl, NULL, obj, "ttl", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj, "durableDelete", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail( log, "Parsing apply policy: success");
	return AS_NODE_PARAM_OK;
}

int querypolicy_from_jsobject(as_policy_query* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	as_policy_query_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->deserialize, NULL, obj, "deserialize", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->fail_on_cluster_change, NULL, obj, "failOnClusterChange", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail( log, "Parsing query policy : success");
	return AS_NODE_PARAM_OK;
}

int scanpolicy_from_jsobject(as_policy_scan* policy, Local<Object> obj, const LogInfo* log)
{
	int rc = 0;
	as_policy_scan_init(policy);
	if ((rc = basepolicy_from_jsobject(&policy->base, obj, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj, "durableDelete", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->fail_on_cluster_change, NULL, obj, "failOnClusterChange", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	as_v8_detail( log, "Parsing scan policy: success");
	return AS_NODE_PARAM_OK;
}
