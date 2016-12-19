/*******************************************************************************
 * Copyright 2013-2016 Aerospike Inc.
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

	Local<Value> maybe_hosts = configObj->Get(Nan::New("hosts").ToLocalChecked());
	if (maybe_hosts->IsString()) {
		String::Utf8Value hosts(maybe_hosts);
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
				port = maybe_port->IntegerValue();
			} else if (maybe_port->IsUndefined()) {
				// use default value
			} else {
				as_v8_error(log, "host[%d].port should be an integer", i);
				return AS_NODE_PARAM_ERR;
			}

			if (maybe_addr->IsString()) {
				String::Utf8Value addr(maybe_addr);
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

	if (configObj->Has(Nan::New("policies").ToLocalChecked())) {

		Local<Value> policy_val = configObj->Get(Nan::New("policies").ToLocalChecked());

		if (policy_val->IsObject()){
			Local<Object> policies = policy_val->ToObject();
			if ((rc = get_optional_uint32_property(&config->policies.timeout, NULL, policies, "timeout", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if ((rc = get_optional_uint32_property(&config->policies.retry, NULL, policies, "retry", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if ((rc = get_optional_uint32_property((uint32_t*) &config->policies.key, NULL, policies, "key", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if ((rc = get_optional_uint32_property((uint32_t*) &config->policies.exists, NULL, policies, "exists", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if ((rc = get_optional_uint32_property((uint32_t*) &config->policies.gen, NULL, policies, "gen", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if ((rc = get_optional_uint32_property((uint32_t*) &config->policies.replica, NULL, policies, "replica", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if ((rc = get_optional_uint32_property((uint32_t*) &config->policies.consistency_level, NULL, policies, "consistencyLevel", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if ((rc = get_optional_uint32_property((uint32_t*) &config->policies.commit_level, NULL, policies, "commitLevel", log)) != AS_NODE_PARAM_OK) {
				return rc;
			}
			if (policies->Has(Nan::New("read").ToLocalChecked())) {
				Local<Value> readpolicy = policies->Get(Nan::New("read").ToLocalChecked());
				if ((rc = readpolicy_from_jsobject(&config->policies.read, readpolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
			if (policies->Has(Nan::New("write").ToLocalChecked())) {
				Local<Value> writepolicy = policies->Get(Nan::New("write").ToLocalChecked());
				if ((rc = writepolicy_from_jsobject(&config->policies.write, writepolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
			if (policies->Has(Nan::New("remove").ToLocalChecked())) {
				Local<Value> removepolicy = policies->Get(Nan::New("remove").ToLocalChecked());
				if ((rc = removepolicy_from_jsobject(&config->policies.remove, removepolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
			if (policies->Has(Nan::New("batch").ToLocalChecked())) {
				Local<Value> batchpolicy = policies->Get(Nan::New("batch").ToLocalChecked());
				if ((rc = batchpolicy_from_jsobject(&config->policies.batch, batchpolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
			if (policies->Has(Nan::New("operate").ToLocalChecked())) {
				Local<Value> operatepolicy = policies->Get(Nan::New("operate").ToLocalChecked());
				if ((rc = operatepolicy_from_jsobject(&config->policies.operate, operatepolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
			if (policies->Has(Nan::New("info").ToLocalChecked())) {
				Local<Value> infopolicy = policies->Get(Nan::New("info").ToLocalChecked());
				if ((rc = infopolicy_from_jsobject(&config->policies.info, infopolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
			if (policies->Has(Nan::New("admin").ToLocalChecked())) {
				Local<Value> adminpolicy = policies->Get(Nan::New("admin").ToLocalChecked());
				if ((rc = adminpolicy_from_jsobject(&config->policies.admin, adminpolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
			if (policies->Has(Nan::New("scan").ToLocalChecked())) {
				Local<Value> scanpolicy = policies->Get(Nan::New("scan").ToLocalChecked());
				if ((rc = scanpolicy_from_jsobject(&config->policies.scan, scanpolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
			if (policies->Has(Nan::New("query").ToLocalChecked())) {
				Local<Value> querypolicy = policies->Get(Nan::New("query").ToLocalChecked());
				if ((rc = querypolicy_from_jsobject(&config->policies.query, querypolicy->ToObject(), log)) != AS_NODE_PARAM_OK) {
					return rc;
				}
			}
		}
		as_v8_debug(log, "Parsing global policies: success");
	}

	// stores information about mod-lua userpath and systempath.
	bool syspath_set = false;
	bool usrpath_set = false;

	// If modlua path is passed in config object, set those values here
	if (configObj->Has(Nan::New("modlua").ToLocalChecked())) {
		Local<Object> modlua = configObj->Get(Nan::New("modlua").ToLocalChecked())->ToObject();

		char* system_path;
		if ((rc = get_optional_string_property(&system_path, &syspath_set, modlua, "systemPath", log)) != AS_NODE_PARAM_OK) {
			return rc;
		} else if (syspath_set) {
			strcpy(config->lua.system_path, system_path);
		}

		char* user_path;
		if ((rc = get_optional_string_property(&user_path, &usrpath_set, modlua, "userPath", log)) != AS_NODE_PARAM_OK) {
			return rc;
		} else if (usrpath_set) {
			strcpy(config->lua.user_path, user_path);
		}
	}

	// Modlua system and user path is not passed in a config object.
	// Set them to default values here.
	if (!syspath_set) {
#ifdef __linux
		char const * syspath = "./node_modules/aerospike/aerospike-client-c/package/opt/aerospike/client/sys/udf/lua/";
#elif __APPLE__
		char const * syspath = "./node_modules/aerospike/aerospike-client-c/package/usr/local/aerospike/client/sys/udf/lua/";
#endif
		int rc = access(syspath, R_OK);
		if (rc == 0) {
			strcpy(config->lua.system_path, syspath);
		} else {
#ifdef __linux
			char const * syspath = "./aerospike-client-c/package/opt/aerospike/client/sys/udf/lua/";
#elif __APPLE__
			char const * syspath = "./aerospike-client-c/package/usr/local/aerospike/client/sys/udf/lua/";
#endif
			rc = access(syspath, R_OK);
			if (rc== 0) {
				strcpy(config->lua.system_path, syspath);
			} else {
				as_v8_debug(log,"Could not find a valid LUA system path %s", syspath);
			}
		}
	}
	if (!usrpath_set) {
#ifdef __linux
		char const * usrpath = "./node_modules/aerospike/aerospike-client-c/package/opt/aerospike/client/usr/udf/lua/";
#elif __APPLE__
		char const * usrpath = "./node_modules/aerospike/aerospike-client-c/package/usr/local/aerospike/client/usr/udf/lua/";
#endif
		int rc = access(usrpath, R_OK);
		if (rc == 0) {
			strcpy(config->lua.user_path, usrpath);
		} else {
#ifdef __linux
			char const * usrpath = "./aerospike-client-c/package/opt/aerospike/client/usr/udf/lua";
#elif __APPLE__
			char const * usrpath = "./aerospike-client-c/package/usr/local/aerospike/client/usr/udf/lua";
#endif
			rc = access(usrpath, R_OK);
			if (rc == 0) {
				strcpy(config->lua.user_path, usrpath);
			} else {
				as_v8_debug(log, "Could not find valid LUA user path %s", usrpath);
			}
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
