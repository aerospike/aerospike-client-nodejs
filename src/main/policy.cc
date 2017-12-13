/*******************************************************************************
 * Copyright 2013-2017 Aerospike Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 ******************************************************************************/

#include <node.h>
#include <v8.h>

#include "policy.h"
#include "conversions.h"

extern "C" {
	#include <aerospike/as_policy.h>
}

using namespace v8;

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
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->consistency_level, NULL, obj, "consistencyLevel", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->durable_delete, NULL, obj, "durableDelete", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->linearize_read, NULL, obj, "linearizeRead", log)) != AS_NODE_PARAM_OK) {
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
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->consistency_level, NULL, obj, "consistencyLevel", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->allow_inline, NULL, obj, "allowInline", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->send_set_name, NULL, obj, "sendSetName", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->linearize_read, NULL, obj, "linearizeRead", log)) != AS_NODE_PARAM_OK) {
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
	if ((rc = get_optional_uint32_property((uint32_t*) &policy->consistency_level, NULL, obj, "consistencyLevel", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_bool_property(&policy->linearize_read, NULL, obj, "linearizeRead", log)) != AS_NODE_PARAM_OK) {
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
	if ((rc = get_optional_bool_property(&policy->linearize_read, NULL, obj, "linearizeRead", log)) != AS_NODE_PARAM_OK) {
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
