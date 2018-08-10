/*******************************************************************************
 * Copyright 2013-2018 Aerospike, Inc.
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
#include "config.h"
#include "conversions.h"

extern "C" {
#include <aerospike/as_config.h>
}

using namespace v8;

const uint16_t DEFAULT_PORT = 3000;

int config_from_jsobject(as_config* config, Local<Object> configObj, const LogInfo* log)
{
	bool defined;
	int rc;

	char* cluster_name;
	if ((rc = get_optional_string_property(&cluster_name, &defined, configObj, "clusterName", log)) != AS_NODE_PARAM_OK) {
		return rc;
	} else if (defined) {
		as_v8_detail(log, "Setting Cluster Name: \"%s\"", cluster_name);
		as_config_set_cluster_name(config, cluster_name);
	}

	uint32_t default_port = DEFAULT_PORT;
	if ((rc = get_optional_uint32_property(&default_port, NULL, configObj, "port", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	if ((rc = get_optional_uint32_property((uint32_t*) &config->auth_mode, NULL, configObj, "authMode", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	Local<Value> maybe_hosts = configObj->Get(Nan::New("hosts").ToLocalChecked());
	if (maybe_hosts->IsString()) {
		Nan::Utf8String hosts(maybe_hosts);
		as_v8_detail(log, "setting seed hosts: \"%s\"", *hosts);
		if (as_config_add_hosts(config, *hosts, default_port) == false) {
			as_v8_error(log, "invalid hosts string: \"%s\"", *hosts);
			return AS_NODE_PARAM_ERR;
		}
	} else if (maybe_hosts->IsArray()) {
		Local<Array> host_list = Local<Array>::Cast(maybe_hosts);
		for (uint32_t i = 0; i < host_list->Length(); i++) {
			Local<Object> host = host_list->Get(i)->ToObject();
			Local<Value> maybe_addr = host->Get(Nan::New("addr").ToLocalChecked());
			Local<Value> maybe_port = host->Get(Nan::New("port").ToLocalChecked());

			uint16_t port = default_port;
			if (maybe_port->IsNumber()) {
				port = (uint16_t) maybe_port->IntegerValue();
			} else if (maybe_port->IsUndefined()) {
				// use default value
			} else {
				as_v8_error(log, "host[%d].port should be an integer", i);
				return AS_NODE_PARAM_ERR;
			}

			if (maybe_addr->IsString()) {
				Nan::Utf8String addr(maybe_addr);
				as_config_add_host(config, *addr, port);
				as_v8_detail(log,"adding host, addr=\"%s\", port=%d", *addr, port);
			} else {
				as_v8_error(log, "host[%d].addr should be a string", i);
				return AS_NODE_PARAM_ERR;
			}
		}
	} else {
		as_v8_error(log, "'host' config must be a string or an array");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> policies_val = configObj->Get(Nan::New("policies").ToLocalChecked());
	if (policies_val->IsObject()) {
		Local<Object> policies_obj = policies_val->ToObject();
		as_policies *policies = &config->policies;

		Local<Value> policy_val = policies_obj->Get(Nan::New("apply").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = applypolicy_from_jsobject(&policies->apply, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		policy_val = policies_obj->Get(Nan::New("batch").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = batchpolicy_from_jsobject(&policies->batch, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		policy_val = policies_obj->Get(Nan::New("info").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = infopolicy_from_jsobject(&policies->info, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		policy_val = policies_obj->Get(Nan::New("operate").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = operatepolicy_from_jsobject(&policies->operate, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		policy_val = policies_obj->Get(Nan::New("read").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = readpolicy_from_jsobject(&policies->read, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		policy_val = policies_obj->Get(Nan::New("remove").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = removepolicy_from_jsobject(&policies->remove, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		policy_val = policies_obj->Get(Nan::New("scan").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = scanpolicy_from_jsobject(&policies->scan, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		policy_val = policies_obj->Get(Nan::New("query").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = querypolicy_from_jsobject(&policies->query, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		policy_val = policies_obj->Get(Nan::New("write").ToLocalChecked());
		if (policy_val->IsObject()) {
			if ((rc = writepolicy_from_jsobject(&policies->write, policy_val->ToObject(), log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
		}

		as_v8_debug(log, "Parsing global policies: success");
	}

	// If modlua path is passed in config object, set those values here
	if (configObj->Has(Nan::New("modlua").ToLocalChecked())) {
		Local<Object> modlua = configObj->Get(Nan::New("modlua").ToLocalChecked())->ToObject();

		char* user_path;
		bool usrpath_set = false;
		if ((rc = get_optional_string_property(&user_path, &usrpath_set, modlua, "userPath", log)) != AS_NODE_PARAM_OK) {
			return rc;
		} else if (usrpath_set) {
			strcpy(config->lua.user_path, user_path);
		} else {
			as_v8_debug(log, "Using default Lua user path: %s", AS_CONFIG_LUA_USER_PATH);
		}
	}

	char* user;
	if ((rc = get_optional_string_property(&user, &defined, configObj, "user", log)) != AS_NODE_PARAM_OK) {
		return rc;
	} else if (defined) {
		char* password;
		if ((rc = get_string_property(&password, configObj, "password", log)) != AS_NODE_PARAM_OK) {
			return rc;
		} else {
			if (!as_config_set_user(config, user, password)) {
				as_v8_error(log, "Failed to set user");
				return AS_NODE_PARAM_ERR;
			}
		}
	}

	if (configObj->Has(Nan::New("sharedMemory").ToLocalChecked())) {
		Local<Object> shmConfigObj = configObj->Get(Nan::New("sharedMemory").ToLocalChecked())->ToObject();
		config->use_shm = true;
		if ((rc = get_optional_bool_property(&config->use_shm, NULL, shmConfigObj, "enable", log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
		if ((rc = get_optional_uint32_property((uint32_t*) &config->shm_key, NULL, shmConfigObj, "key", log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
		if ((rc = get_optional_uint32_property(&config->shm_max_nodes, NULL, shmConfigObj, "maxNodes", log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
		if ((rc = get_optional_uint32_property(&config->shm_max_namespaces, NULL, shmConfigObj, "maxNamespaces", log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
		if ((rc = get_optional_uint32_property(&config->shm_takeover_threshold_sec, NULL, shmConfigObj, "takeoverThresholdSeconds", log)) != AS_NODE_PARAM_OK) {
			return rc;
		}
	}

	if ((rc = get_optional_uint32_property(&config->conn_timeout_ms, NULL, configObj, "connTimeoutMs", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&config->login_timeout_ms, NULL, configObj, "loginTimeoutMs", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&config->tender_interval, NULL, configObj, "tendInterval", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&config->async_max_conns_per_node, NULL, configObj, "maxConnsPerNode", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&config->max_conns_per_node, NULL, configObj, "maxConnsPerNodeSync", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	return AS_NODE_PARAM_OK;
}
