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
#include "log.h"

extern "C" {
#include <aerospike/as_policy.h>
#include <aerospike/as_partition_filter.h>
#include <aerospike/as_event.h>
#include <aerospike/as_metrics_writer.h>
#include <aerospike/as_metrics.h>
}

// Functions to convert v8 policies to C structures
int eventpolicy_from_jsobject(as_policy_event *policy,
							  v8::Local<v8::Object> obj, const LogInfo *log);
int writepolicy_from_jsobject(as_policy_write *policy,
							  v8::Local<v8::Object> obj, const LogInfo *log);
int readpolicy_from_jsobject(as_policy_read *policy, v8::Local<v8::Object> obj,
							 const LogInfo *log);
int removepolicy_from_jsobject(as_policy_remove *policy,
							   v8::Local<v8::Object> obj, const LogInfo *log);
int batchpolicy_from_jsobject(as_policy_batch *policy,
							  v8::Local<v8::Object> obj, const LogInfo *log);
int batchread_policy_from_jsobject(as_policy_batch_read *policy,
								   v8::Local<v8::Object> obj,
								   const LogInfo *log);
int batchwrite_policy_from_jsobject(as_policy_batch_write *policy,
									v8::Local<v8::Object> obj,
									const LogInfo *log);
int batchapply_policy_from_jsobject(as_policy_batch_apply *policy,
									v8::Local<v8::Object> obj,
									const LogInfo *log);
int batchremove_policy_from_jsobject(as_policy_batch_remove *policy,
									 v8::Local<v8::Object> obj,
									 const LogInfo *log);
int operatepolicy_from_jsobject(as_policy_operate *policy,
								v8::Local<v8::Object> obj, const LogInfo *log);
int infopolicy_from_jsobject(as_policy_info *policy, v8::Local<v8::Object> obj,
							 const LogInfo *log);
int adminpolicy_from_jsobject(as_policy_admin *policy, v8::Local<v8::Object> obj,
							 const LogInfo *log);
int metricspolicy_from_jsobject_with_listeners(as_metrics_policy *policy, v8::Local<v8::Object> obj,
							 as_metrics_listeners* listeners, const LogInfo *log);
int applypolicy_from_jsobject(as_policy_apply *policy,
							  v8::Local<v8::Object> obj, const LogInfo *log);
int scanpolicy_from_jsobject(as_policy_scan *policy, v8::Local<v8::Object> obj,
							 const LogInfo *log);
int querypolicy_from_jsobject(as_policy_query *policy,
							  v8::Local<v8::Object> obj, const LogInfo *log);
int partitions_from_jsobject(as_partition_filter *pf, bool *defined,
							 v8::Local<v8::Object> obj, const LogInfo *log);
