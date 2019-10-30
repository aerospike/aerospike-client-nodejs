/*******************************************************************************
 * Copyright 2013-2019 Aerospike, Inc.
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
	uint32_t default_port = DEFAULT_PORT;
	char* cluster_name = NULL;
	char* user = NULL;
	char* password = NULL;
	char* user_path = NULL;

	Local<Value> v8_hosts = Nan::Get(configObj, Nan::New("hosts").ToLocalChecked()).ToLocalChecked();
	Local<Value> policies_val = Nan::Get(configObj, Nan::New("policies").ToLocalChecked()).ToLocalChecked();
	Local<Value> v8_tls_config = Nan::Get(configObj, Nan::New("tls").ToLocalChecked()).ToLocalChecked();
	Local<Value> v8_modlua = Nan::Get(configObj, Nan::New("modlua").ToLocalChecked()).ToLocalChecked();
	Local<Value> v8_sharedMemory = Nan::Get(configObj, Nan::New("sharedMemory").ToLocalChecked()).ToLocalChecked();

	if ((rc = get_optional_string_property(&cluster_name, &defined, configObj, "clusterName", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	} else if (defined) {
		as_v8_detail(log, "Setting Cluster Name: \"%s\"", cluster_name);
		as_config_set_cluster_name(config, cluster_name);
	}

	if ((rc = get_optional_uint32_property(&default_port, NULL, configObj, "port", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}

	if ((rc = get_optional_uint32_property((uint32_t*) &config->auth_mode, NULL, configObj, "authMode", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}

	if (v8_hosts->IsString()) {
		Nan::Utf8String hosts(v8_hosts);
		as_v8_detail(log, "setting seed hosts: \"%s\"", *hosts);
		if (as_config_add_hosts(config, *hosts, default_port) == false) {
			as_v8_error(log, "invalid hosts string: \"%s\"", *hosts);
			rc = AS_NODE_PARAM_ERR;
			goto Cleanup;
		}
	} else if (v8_hosts->IsArray()) {
		Local<Array> host_list = Local<Array>::Cast(v8_hosts);
		for (uint32_t i = 0; i < host_list->Length(); i++) {
			Local<Object> host = Nan::Get(host_list, i).ToLocalChecked().As<Object>();
			Local<Value> v8_addr = Nan::Get(host, Nan::New("addr").ToLocalChecked()).ToLocalChecked();
			Local<Value> v8_port = Nan::Get(host, Nan::New("port").ToLocalChecked()).ToLocalChecked();

			uint16_t port = default_port;
			if (v8_port->IsNumber()) {
				port = (uint16_t) Nan::To<uint32_t>(v8_port).FromJust();
			} else if (v8_port->IsUndefined()) {
				// use default value
			} else {
				as_v8_error(log, "host[%d].port should be an integer", i);
				rc = AS_NODE_PARAM_ERR;
				goto Cleanup;
			}

			if (v8_addr->IsString()) {
				Nan::Utf8String addr(v8_addr);
				as_config_add_host(config, *addr, port);
				as_v8_detail(log,"adding host, addr=\"%s\", port=%d", *addr, port);
			} else {
				as_v8_error(log, "host[%d].addr should be a string", i);
				rc = AS_NODE_PARAM_ERR;
				goto Cleanup;
			}
		}
	} else {
		as_v8_error(log, "'host' config must be a string or an array");
		rc = AS_NODE_PARAM_ERR;
		goto Cleanup;
	}

	if (v8_tls_config->IsObject()) {
		Local<Object> tls_config = v8_tls_config.As<Object>();
		config->tls.enable = true;

		if ((rc = get_optional_bool_property(&config->tls.enable, NULL, tls_config, "enable", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.cafile, &defined, tls_config, "cafile", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.capath, &defined, tls_config, "capath", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.protocols, &defined, tls_config, "protocols", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.cipher_suite, &defined, tls_config, "cipherSuite", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.cert_blacklist, &defined, tls_config, "certBlacklist", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.keyfile, &defined, tls_config, "keyfile", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.keyfile_pw, &defined, tls_config, "keyfilePassword", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.certfile, &defined, tls_config, "certfile", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_bool_property(&config->tls.crl_check, NULL, tls_config, "crlCheck", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_bool_property(&config->tls.crl_check_all, NULL, tls_config, "crlCheckAll", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_bool_property(&config->tls.log_session_info, NULL, tls_config, "logSessionInfo", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_bool_property(&config->tls.for_login_only, NULL, tls_config, "forLoginOnly", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
	} else if (v8_tls_config->IsUndefined()) {
		// ignore
	} else {
		as_v8_error(log, "'tls' config must be an object");
		return AS_NODE_PARAM_ERR;
	}

	if (policies_val->IsObject()) {
		Local<Object> policies_obj = policies_val.As<Object>();
		as_policies *policies = &config->policies;

		Local<Value> policy_val = Nan::Get(policies_obj, Nan::New("apply").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = applypolicy_from_jsobject(&policies->apply, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("batch").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = batchpolicy_from_jsobject(&policies->batch, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("info").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = infopolicy_from_jsobject(&policies->info, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("operate").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = operatepolicy_from_jsobject(&policies->operate, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("read").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = readpolicy_from_jsobject(&policies->read, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("remove").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = removepolicy_from_jsobject(&policies->remove, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("scan").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = scanpolicy_from_jsobject(&policies->scan, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("query").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = querypolicy_from_jsobject(&policies->query, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("write").ToLocalChecked()).ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = writepolicy_from_jsobject(&policies->write, policy_val.As<Object>(), log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		as_v8_debug(log, "Parsing global policies: success");
	}

	// If modlua path is passed in config object, set those values here
	if (v8_modlua->IsObject()) {
		Local<Object> modlua = v8_modlua.As<Object>();
		if ((rc = get_optional_string_property(&user_path, &defined, modlua, "userPath", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		} else if (defined) {
			strcpy(config->lua.user_path, user_path);
		} else {
			as_v8_debug(log, "Using default Lua user path: %s", AS_CONFIG_LUA_USER_PATH);
		}
	}

	if ((rc = get_optional_string_property(&user, &defined, configObj, "user", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	} else if (defined) {
		if ((rc = get_string_property(&password, configObj, "password", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		} else {
			if (!as_config_set_user(config, user, password)) {
				as_v8_error(log, "Failed to set user");
				rc = AS_NODE_PARAM_ERR;
				goto Cleanup;
			}
		}
	}

	if (v8_sharedMemory->IsObject()) {
		Local<Object> shmConfigObj = v8_sharedMemory.As<Object>();
		config->use_shm = true;
		if ((rc = get_optional_bool_property(&config->use_shm, NULL, shmConfigObj, "enable", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if ((rc = get_optional_uint32_property((uint32_t*) &config->shm_key, NULL, shmConfigObj, "key", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if ((rc = get_optional_uint32_property(&config->shm_max_nodes, NULL, shmConfigObj, "maxNodes", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if ((rc = get_optional_uint32_property(&config->shm_max_namespaces, NULL, shmConfigObj, "maxNamespaces", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if ((rc = get_optional_uint32_property(&config->shm_takeover_threshold_sec, NULL, shmConfigObj, "takeoverThresholdSeconds", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
	}

	if ((rc = get_optional_uint32_property(&config->conn_timeout_ms, NULL, configObj, "connTimeoutMs", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->login_timeout_ms, NULL, configObj, "loginTimeoutMs", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->tender_interval, NULL, configObj, "tendInterval", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->async_max_conns_per_node, NULL, configObj, "maxConnsPerNode", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->max_conns_per_node, NULL, configObj, "maxConnsPerNodeSync", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_bool_property(&config->use_services_alternate, NULL, configObj, "useAlternateAccessAddress", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_bool_property(&config->rack_aware, NULL, configObj, "rackAware", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_int_property(&config->rack_id, NULL, configObj, "rack_id", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}

Cleanup:
	if (cluster_name) free(cluster_name);
	if (user) free(user);
	if (password) free(password);
	if (user_path) free(user_path);
	as_v8_debug(log, "Built as_config instance from JS config object");
	return rc;
}
