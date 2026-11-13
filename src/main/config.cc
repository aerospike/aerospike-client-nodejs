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

#include <cstdint>
#include <string>
#include <vector>
#include <node.h>

#include "policy.h"
#include "config.h"
#include "conversions.h"

extern "C" {
#include <aerospike/as_config.h>
#include <aerospike/as_discovery.h>
}

using namespace v8;

const uint16_t DEFAULT_PORT = 3000;

void config_free_ip_map(as_config *config)
{
	if (config->ip_map) {
		for (uint32_t i = 0; i < config->ip_map_size; i++) {
			cf_free(config->ip_map[i].orig);
			cf_free(config->ip_map[i].alt);
		}
		cf_free(config->ip_map);
	}
	config->ip_map = NULL;
	config->ip_map_size = 0;
}

/**
 * ipMap is an object of { "advertised host": "host to use instead" }.
 * The C client deep-copies it on connect but never frees it.
 */
static int get_optional_ip_map_property(as_config *config, Local<Object> obj,
										const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New("ipMap").ToLocalChecked()).ToLocalChecked();

	if (value->IsUndefined() || value->IsNull()) {
		as_v8_detail(log, "ipMap => undefined");
		return AS_NODE_PARAM_OK;
	}

	if (!value->IsObject() || value->IsArray()) {
		as_v8_error(log, "Type error: ipMap property should be an object");
		return AS_NODE_PARAM_ERR;
	}

	Local<Object> map = value.As<Object>();
	Local<Array> keys = Nan::GetOwnPropertyNames(map).ToLocalChecked();
	uint32_t size = keys->Length();

	if (size == 0) {
		as_v8_detail(log, "ipMap => {}");
		return AS_NODE_PARAM_OK;
	}

	config->ip_map = (as_addr_map *)cf_calloc(size, sizeof(as_addr_map));

	for (uint32_t i = 0; i < size; i++) {
		Local<Value> key = Nan::Get(keys, i).ToLocalChecked();
		Local<Value> alt = Nan::Get(map, key).ToLocalChecked();

		// Count the entry first, so a partially built map frees cleanly.
		config->ip_map_size++;

		if (!alt->IsString()) {
			as_v8_error(log, "Type error: ipMap values should be strings");
			config_free_ip_map(config);
			return AS_NODE_PARAM_ERR;
		}

		Nan::Utf8String orig_str(key);
		Nan::Utf8String alt_str(alt);

		if (orig_str.length() == 0 || alt_str.length() == 0) {
			as_v8_error(log, "ipMap keys and values must be non-empty strings");
			config_free_ip_map(config);
			return AS_NODE_PARAM_ERR;
		}

		config->ip_map[i].orig = (char *)cf_strdup(*orig_str);
		config->ip_map[i].alt = (char *)cf_strdup(*alt_str);
		as_v8_detail(log, "ipMap => %s -> %s", *orig_str, *alt_str);
	}

	return AS_NODE_PARAM_OK;
}

/**
 * Reads an optional string property that must be one of the given values.
 * Sets *index to the position of the matched value.
 */
static int get_optional_enum_property(int *index, bool *defined, Local<Object> obj,
									  const char *prop, const char *const *values,
									  int count, const LogInfo *log)
{
	*defined = false;
	Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();

	if (value->IsUndefined() || value->IsNull()) {
		return AS_NODE_PARAM_OK;
	}

	if (value->IsString()) {
		Nan::Utf8String str(value);
		for (int i = 0; i < count; i++) {
			if (strcmp(*str, values[i]) == 0) {
				*index = i;
				*defined = true;
				return AS_NODE_PARAM_OK;
			}
		}
	}

	as_v8_error(log, "Invalid value for %s", prop);
	return AS_NODE_PARAM_ERR;
}

/**
 * Reads an optional array of non-empty strings.
 */
static int get_optional_string_array_property(std::vector<std::string> *out, Local<Object> obj,
											  const char *prop, const LogInfo *log)
{
	Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();

	if (value->IsUndefined() || value->IsNull()) {
		return AS_NODE_PARAM_OK;
	}

	if (!value->IsArray()) {
		as_v8_error(log, "%s must be an array of strings", prop);
		return AS_NODE_PARAM_ERR;
	}

	Local<Array> array = value.As<Array>();
	for (uint32_t i = 0; i < array->Length(); i++) {
		Local<Value> item = Nan::Get(array, i).ToLocalChecked();
		if (!item->IsString() || item.As<String>()->Length() == 0) {
			as_v8_error(log, "%s must contain only non-empty strings", prop);
			return AS_NODE_PARAM_ERR;
		}
		out->push_back(*Nan::Utf8String(item));
	}

	return AS_NODE_PARAM_OK;
}

static int set_dns_seed_provider(as_config *config, Local<Object> obj, const LogInfo *log)
{
	Local<Value> value = Nan::Get(obj, Nan::New("dns").ToLocalChecked()).ToLocalChecked();

	if (!value->IsObject() || value->IsArray()) {
		as_v8_error(log, "discovery.dns must be an object when discovery.provider is 'dns'");
		return AS_NODE_PARAM_ERR;
	}

	Local<Object> dns_obj = value.As<Object>();
	as_dns_seed_provider_config dns;
	as_dns_seed_provider_config_init(&dns);

	std::vector<std::string> names;
	std::vector<std::string> servers;
	char *tls_name = NULL;
	bool defined = false;
	int rc;

	if ((rc = get_optional_string_array_property(&names, dns_obj, "names", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_string_array_property(&servers, dns_obj, "servers", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}

	static const char *const record_types[] = {"A", "SRV"};
	int record_type = 0;
	if ((rc = get_optional_enum_property(&record_type, &defined, dns_obj, "recordType",
										 record_types, 2, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (defined) {
		dns.record_type = record_type == 0 ? AS_DNS_RECORD_A : AS_DNS_RECORD_SRV;
	}

	uint32_t port = dns.port;
	if ((rc = get_optional_uint32_property(&port, NULL, dns_obj, "port", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if (port == 0 || port > 65535) {
		as_v8_error(log, "discovery.dns.port must be from 1 to 65535");
		return AS_NODE_PARAM_ERR;
	}
	dns.port = (uint16_t)port;
	if ((rc = get_optional_uint32_property(&dns.timeout_ms, NULL, dns_obj, "timeoutMs", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_string_property(&tls_name, NULL, dns_obj, "tlsName", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}

	std::vector<const char *> name_ptrs;
	for (const auto &name : names) {
		name_ptrs.push_back(name.c_str());
	}
	std::vector<const char *> server_ptrs;
	for (const auto &server : servers) {
		server_ptrs.push_back(server.c_str());
	}

	dns.names = name_ptrs.empty() ? NULL : name_ptrs.data();
	dns.names_size = (uint32_t)name_ptrs.size();
	dns.servers = server_ptrs.empty() ? NULL : server_ptrs.data();
	dns.servers_size = (uint32_t)server_ptrs.size();
	dns.tls_name = tls_name;

	// The C client validates and copies the configuration.
	as_error err;
	as_error_init(&err);
	as_status status = as_config_set_dns_seed_provider(config, &dns, &err);

	if (tls_name) {
		cf_free(tls_name);
	}

	if (status != AEROSPIKE_OK) {
		as_v8_error(log, "Invalid discovery.dns: %s", err.message);
		return AS_NODE_PARAM_ERR;
	}

	return AS_NODE_PARAM_OK;
}

/**
 * aws is { region, filters: [{ name, values }], addressField, port, tlsName,
 * timeoutMs, endpoint, caFile, caPath, accessKeyId, secretAccessKey,
 * sessionToken }.
 */
static int set_aws_seed_provider(as_config *config, Local<Object> obj, const LogInfo *log)
{
	Local<Value> value = Nan::Get(obj, Nan::New("aws").ToLocalChecked()).ToLocalChecked();

	if (!value->IsObject() || value->IsArray()) {
		as_v8_error(log, "discovery.aws must be an object when discovery.provider is 'aws-tags'");
		return AS_NODE_PARAM_ERR;
	}

	Local<Object> aws_obj = value.As<Object>();
	as_aws_seed_provider_config aws;
	as_aws_seed_provider_config_init(&aws);
	// The Java client's default, so that it fits within the default
	// refresh_timeout_ms.
	aws.timeout_ms = 2000;

	// Strings read from the object; the C client copies them.
	const char *string_props[] = {"region", "tlsName", "endpoint", "caFile", "caPath",
								  "accessKeyId", "secretAccessKey", "sessionToken"};
	const int string_count = sizeof(string_props) / sizeof(string_props[0]);
	char *strings[string_count] = {NULL};
	std::vector<std::string> filter_names;
	std::vector<std::vector<std::string>> filter_values;
	std::vector<std::vector<const char *>> filter_value_ptrs;
	std::vector<as_aws_filter> filters;
	int rc = AS_NODE_PARAM_OK;
	bool defined = false;
	int index = 0;

	for (int i = 0; i < string_count; i++) {
		if ((rc = get_optional_string_property(&strings[i], NULL, aws_obj, string_props[i],
											   log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
	}

	{
		Local<Value> filters_value =
			Nan::Get(aws_obj, Nan::New("filters").ToLocalChecked()).ToLocalChecked();
		if (!filters_value->IsArray()) {
			as_v8_error(log, "discovery.aws.filters must be an array");
			rc = AS_NODE_PARAM_ERR;
			goto Cleanup;
		}
		Local<Array> filters_array = filters_value.As<Array>();
		uint32_t count = filters_array->Length();
		filter_values.resize(count);
		for (uint32_t i = 0; i < count; i++) {
			Local<Value> item = Nan::Get(filters_array, i).ToLocalChecked();
			if (!item->IsObject() || item->IsArray()) {
				as_v8_error(log, "discovery.aws.filters entries must be objects");
				rc = AS_NODE_PARAM_ERR;
				goto Cleanup;
			}
			Local<Object> filter = item.As<Object>();
			Local<Value> name = Nan::Get(filter, Nan::New("name").ToLocalChecked()).ToLocalChecked();
			if (!name->IsString()) {
				as_v8_error(log, "discovery.aws.filters entry name must be a string");
				rc = AS_NODE_PARAM_ERR;
				goto Cleanup;
			}
			filter_names.push_back(*Nan::Utf8String(name));
			if ((rc = get_optional_string_array_property(&filter_values[i], filter, "values",
														 log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}
		filter_value_ptrs.resize(count);
		filters.resize(count);
		for (uint32_t i = 0; i < count; i++) {
			for (const auto &v : filter_values[i]) {
				filter_value_ptrs[i].push_back(v.c_str());
			}
			filters[i].name = filter_names[i].c_str();
			filters[i].values = filter_value_ptrs[i].empty() ? NULL : filter_value_ptrs[i].data();
			filters[i].values_size = (uint32_t)filter_value_ptrs[i].size();
		}
	}

	{
		static const char *const address_fields[] = {"privateIp", "publicIp", "privateDns",
													  "publicDns"};
		if ((rc = get_optional_enum_property(&index, &defined, aws_obj, "addressField",
											 address_fields, 4, log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if (defined) {
			static const as_aws_address_field fields[] = {
				AS_AWS_ADDRESS_PRIVATE_IP, AS_AWS_ADDRESS_PUBLIC_IP, AS_AWS_ADDRESS_PRIVATE_DNS,
				AS_AWS_ADDRESS_PUBLIC_DNS};
			aws.address_field = fields[index];
		}

		uint32_t port = aws.port;
		if ((rc = get_optional_uint32_property(&port, NULL, aws_obj, "port", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if (port == 0 || port > 65535) {
			as_v8_error(log, "discovery.aws.port must be from 1 to 65535");
			rc = AS_NODE_PARAM_ERR;
			goto Cleanup;
		}
		aws.port = (uint16_t)port;
		if ((rc = get_optional_uint32_property(&aws.timeout_ms, NULL, aws_obj, "timeoutMs",
											   log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
	}

	aws.region = strings[0];
	aws.tls_name = strings[1];
	aws.endpoint = strings[2];
	aws.ca_file = strings[3];
	aws.ca_path = strings[4];
	aws.access_key_id = strings[5];
	aws.secret_access_key = strings[6];
	aws.session_token = strings[7];
	aws.filters = filters.empty() ? NULL : filters.data();
	aws.filters_size = (uint32_t)filters.size();

	{
		// The C client validates and copies the configuration.
		as_error err;
		as_error_init(&err);
		if (as_config_set_aws_seed_provider(config, &aws, &err) != AEROSPIKE_OK) {
			as_v8_error(log, "Invalid discovery.aws: %s", err.message);
			rc = AS_NODE_PARAM_ERR;
		}
	}

Cleanup:
	for (int i = 0; i < string_count; i++) {
		if (strings[i]) {
			cf_free(strings[i]);
		}
	}
	return rc;
}

/**
 * discovery is { provider, dns, aws, mergePolicy, executionMode,
 * refreshIntervalMs, refreshTimeoutMs, tendRefreshDeadlineMs }.
 */
static int get_optional_discovery_property(as_config *config, Local<Object> obj,
										   const LogInfo *log)
{
	Local<Value> value = Nan::Get(obj, Nan::New("discovery").ToLocalChecked()).ToLocalChecked();

	if (value->IsUndefined() || value->IsNull()) {
		return AS_NODE_PARAM_OK;
	}

	if (!value->IsObject() || value->IsArray()) {
		as_v8_error(log, "discovery must be an object");
		return AS_NODE_PARAM_ERR;
	}

	Local<Object> discovery = value.As<Object>();
	bool defined = false;
	int index = 0;
	int rc;

	static const char *const modes[] = {"thread", "tend"};
	if ((rc = get_optional_enum_property(&index, &defined, discovery, "executionMode",
										 modes, 2, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (defined) {
		config->discovery.execution_mode = index == 0 ? AS_DISCOVERY_EXECUTION_THREAD
													  : AS_DISCOVERY_EXECUTION_TEND;
	}

	static const char *const merge_policies[] = {"merge", "replace", "discoveryOnly"};
	if ((rc = get_optional_enum_property(&index, &defined, discovery, "mergePolicy",
										 merge_policies, 3, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (defined) {
		static const as_seed_merge_policy policies[] = {
			AS_SEED_MERGE, AS_SEED_REPLACE, AS_SEED_DISCOVERY_ONLY};
		config->discovery.merge_policy = policies[index];
	}

	if ((rc = get_optional_uint32_property(&config->discovery.refresh_interval_ms, NULL,
										   discovery, "refreshIntervalMs", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&config->discovery.refresh_timeout_ms, NULL,
										   discovery, "refreshTimeoutMs", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = get_optional_uint32_property(&config->discovery.tend_refresh_deadline_ms, NULL,
										   discovery, "tendRefreshDeadlineMs", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}

	// The provider is registered last, after the execution mode is set.
	// 'static' (the configured hosts only) registers nothing.
	static const char *const providers[] = {"static", "dns", "aws-tags"};
	if ((rc = get_optional_enum_property(&index, &defined, discovery, "provider",
										 providers, 3, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (defined && index == 1) {
		return set_dns_seed_provider(config, discovery, log);
	}
	if (defined && index == 2) {
		return set_aws_seed_provider(config, discovery, log);
	}

	return AS_NODE_PARAM_OK;
}

static int set_port_map_translator(as_config *config, Local<Object> obj, const LogInfo *log)
{
	Local<Value> value = Nan::Get(obj, Nan::New("portMap").ToLocalChecked()).ToLocalChecked();

	if (!value->IsObject() || value->IsArray()) {
		as_v8_error(log, "translation.portMap must be an object when translation.provider is 'port-map'");
		return AS_NODE_PARAM_ERR;
	}

	Local<Object> port_map = value.As<Object>();
	Local<Array> keys = Nan::GetOwnPropertyNames(port_map).ToLocalChecked();
	std::vector<std::string> strings;
	strings.reserve(keys->Length() * 2);

	for (uint32_t i = 0; i < keys->Length(); i++) {
		Local<Value> key = Nan::Get(keys, i).ToLocalChecked();
		Local<Value> alt = Nan::Get(port_map, key).ToLocalChecked();
		if (!alt->IsString()) {
			as_v8_error(log, "translation.portMap values must be strings");
			return AS_NODE_PARAM_ERR;
		}
		strings.push_back(*Nan::Utf8String(key));
		strings.push_back(*Nan::Utf8String(alt));
	}

	std::vector<as_addr_map> entries(keys->Length());
	for (uint32_t i = 0; i < entries.size(); i++) {
		entries[i].orig = (char *)strings[i * 2].c_str();
		entries[i].alt = (char *)strings[i * 2 + 1].c_str();
	}

	// The C client validates the entries (host:port or node name to host:port)
	// and copies them.
	as_error err;
	as_error_init(&err);
	if (as_config_set_port_map_translator(config, entries.empty() ? NULL : entries.data(),
										  (uint32_t)entries.size(), &err) != AEROSPIKE_OK) {
		as_v8_error(log, "Invalid translation.portMap: %s", err.message);
		return AS_NODE_PARAM_ERR;
	}

	return AS_NODE_PARAM_OK;
}

/**
 * translation is { provider, portMap, onMiss }.
 */
static int get_optional_translation_property(as_config *config, Local<Object> obj,
											 const LogInfo *log)
{
	Local<Value> value = Nan::Get(obj, Nan::New("translation").ToLocalChecked()).ToLocalChecked();

	if (value->IsUndefined() || value->IsNull()) {
		return AS_NODE_PARAM_OK;
	}

	if (!value->IsObject() || value->IsArray()) {
		as_v8_error(log, "translation must be an object");
		return AS_NODE_PARAM_ERR;
	}

	Local<Object> translation = value.As<Object>();
	bool defined = false;
	int index = 0;
	int rc;

	static const char *const miss_policies[] = {"passThrough", "strict"};
	if ((rc = get_optional_enum_property(&index, &defined, translation, "onMiss",
										 miss_policies, 2, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (defined) {
		config->translation.on_miss = index == 0 ? AS_TRANSLATION_PASS_THROUGH
												 : AS_TRANSLATION_STRICT;
	}

	static const char *const providers[] = {"port-map", "pass-through"};
	if ((rc = get_optional_enum_property(&index, &defined, translation, "provider",
										 providers, 2, log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if (!defined) {
		return AS_NODE_PARAM_OK;
	}

	if (index == 0) {
		return set_port_map_translator(config, translation, log);
	}

	as_error err;
	as_error_init(&err);
	if (as_config_set_pass_through_translator(config, &err) != AEROSPIKE_OK) {
		as_v8_error(log, "Invalid translation: %s", err.message);
		return AS_NODE_PARAM_ERR;
	}

	return AS_NODE_PARAM_OK;
}

int config_from_jsobject(as_config *config, Local<Object> configObj, AerospikeClient *client, const LogInfo *log)
{
	bool defined;
	int rc;
	uint32_t default_port = DEFAULT_PORT;
	char *cluster_name = NULL;
	char *user = NULL;
	char *password = NULL;
	char *user_path = NULL;
	char* app_id = NULL;
	char* config_provider_path = NULL;

	Local<Value> v8_config_provider =
		Nan::Get(configObj, Nan::New("configProvider").ToLocalChecked())
			.ToLocalChecked();
	Local<Value> v8_hosts =
		Nan::Get(configObj, Nan::New("hosts").ToLocalChecked())
			.ToLocalChecked();
	Local<Value> policies_val =
		Nan::Get(configObj, Nan::New("policies").ToLocalChecked())
			.ToLocalChecked();
	Local<Value> v8_tls_config =
		Nan::Get(configObj, Nan::New("tls").ToLocalChecked()).ToLocalChecked();
	Local<Value> v8_modlua =
		Nan::Get(configObj, Nan::New("modlua").ToLocalChecked())
			.ToLocalChecked();
	Local<Value> v8_sharedMemory =
		Nan::Get(configObj, Nan::New("sharedMemory").ToLocalChecked())
			.ToLocalChecked();


	if (v8_config_provider->IsObject()) {

		Local<Object> config_provider = v8_config_provider.As<Object>();

		if ((rc = get_optional_string_property(&config_provider_path, &defined, config_provider,
											   "path", log)) !=
			AS_NODE_PARAM_OK) {

			goto Cleanup;
		}
		else if (defined) {
			as_config_provider_set_path(config, config_provider_path);
		}

		if ((rc = get_optional_uint32_property(&config->config_provider.interval, &defined, config_provider,
										   	   "interval", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

	}


	if ((rc = get_optional_string_property(&cluster_name, &defined, configObj,
										   "clusterName", log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	else if (defined) {
		as_v8_detail(log, "Setting Cluster Name: \"%s\"", cluster_name);
		as_config_set_cluster_name(config, cluster_name);
	}

	if ((rc = get_optional_uint32_property(&default_port, NULL, configObj,
										   "port", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}

	if ((rc = get_optional_uint32_property((uint32_t *)&config->auth_mode, NULL,
										   configObj, "authMode", log)) !=
		AS_NODE_PARAM_OK) {
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
	}
	else if (v8_hosts->IsArray()) {
		Local<Array> host_list = Local<Array>::Cast(v8_hosts);
		for (uint32_t i = 0; i < host_list->Length(); i++) {
			Local<Object> host =
				Nan::Get(host_list, i).ToLocalChecked().As<Object>();
			Local<Value> v8_addr =
				Nan::Get(host, Nan::New("addr").ToLocalChecked())
					.ToLocalChecked();
			Local<Value> v8_port =
				Nan::Get(host, Nan::New("port").ToLocalChecked())
					.ToLocalChecked();
			Local<Value> v8_tlsname =
				Nan::Get(host, Nan::New("tlsname").ToLocalChecked())
					.ToLocalChecked();

			uint16_t port = default_port;
			if (v8_port->IsNumber()) {
				port = (uint16_t)Nan::To<uint32_t>(v8_port).FromJust();
			}
			else if (v8_port->IsUndefined()) {
				// use default value
			}
			else {
				as_v8_error(log, "host[%d].port should be an integer", i);
				rc = AS_NODE_PARAM_ERR;
				goto Cleanup;
			}

			if (v8_addr->IsString()) {
				Nan::Utf8String addr(v8_addr);
				if (v8_tlsname->IsString()) {
					Nan::Utf8String tlsname(v8_tlsname);
					as_config_tls_add_host(config, *addr, *tlsname, port);
					as_v8_detail(
						log,
						"adding TLS host, addr=\"%s\", port=%d, tlsname=\"%s\"",
						*addr, port, *tlsname);
				}
				else {
					as_config_add_host(config, *addr, port);
					as_v8_detail(log, "adding host, addr=\"%s\", port=%d",
								 *addr, port);
				}
			}
			else {
				as_v8_error(log, "host[%d].addr should be a string", i);
				rc = AS_NODE_PARAM_ERR;
				goto Cleanup;
			}
		}
	}
	else {
		as_v8_error(log, "'host' config must be a string or an array");
		rc = AS_NODE_PARAM_ERR;
		goto Cleanup;
	}

	if (v8_tls_config->IsObject()) {
		Local<Object> tls_config = v8_tls_config.As<Object>();
		config->tls.enable = true;

		if ((rc = get_optional_bool_property(&config->tls.enable, NULL,
											 tls_config, "enable", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.cafile, &defined,
											   tls_config, "cafile", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.capath, &defined,
											   tls_config, "capath", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.protocols, &defined,
											   tls_config, "protocols", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(
				 &config->tls.cipher_suite, &defined, tls_config, "cipherSuite",
				 log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(
				 &config->tls.cert_blacklist, &defined, tls_config,
				 "certBlacklist", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.keyfile, &defined,
											   tls_config, "keyfile", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(
				 &config->tls.keyfile_pw, &defined, tls_config,
				 "keyfilePassword", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_string_property(&config->tls.certfile, &defined,
											   tls_config, "certfile", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_bool_property(&config->tls.crl_check, NULL,
											 tls_config, "crlCheck", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_bool_property(&config->tls.crl_check_all, NULL,
											 tls_config, "crlCheckAll", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_bool_property(&config->tls.log_session_info,
											 NULL, tls_config, "logSessionInfo",
											 log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}

		if ((rc = get_optional_bool_property(&config->tls.for_login_only, NULL,
											 tls_config, "forLoginOnly",
											 log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
	}
	else if (v8_tls_config->IsUndefined()) {
		// ignore
	}
	else {
		as_v8_error(log, "'tls' config must be an object");
		return AS_NODE_PARAM_ERR;
	}

	if (policies_val->IsObject()) {
		Local<Object> policies_obj = policies_val.As<Object>();
		as_policies *policies = &config->policies;

		Local<Value> policy_val =
			Nan::Get(policies_obj, Nan::New("apply").ToLocalChecked())
				.ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = applypolicy_from_jsobject(&policies->apply,
												policy_val.As<Object>(),
												log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("batch").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = batchpolicy_from_jsobject(&policies->batch,
												policy_val.As<Object>(),
												log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("batchWrite").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = batchwrite_policy_from_jsobject(&policies->batch_write,
												policy_val.As<Object>(),
												log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("batchParentWrite").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = batchpolicy_from_jsobject(&policies->batch_parent_write,
												policy_val.As<Object>(),
												log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("txnRoll").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = batchpolicy_from_jsobject(&policies->txn_roll,
												policy_val.As<Object>(),
												log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("txnVerify").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = batchpolicy_from_jsobject(&policies->txn_verify,
												policy_val.As<Object>(),
												log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("info").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = infopolicy_from_jsobject(&policies->info,
											   policy_val.As<Object>(), log)) !=
				AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val =
			Nan::Get(policies_obj, Nan::New("operate").ToLocalChecked())
				.ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = operatepolicy_from_jsobject(&policies->operate,
												  policy_val.As<Object>(),
												  log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("read").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = readpolicy_from_jsobject(&policies->read,
											   policy_val.As<Object>(), log)) !=
				AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("remove").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = removepolicy_from_jsobject(&policies->remove,
												 policy_val.As<Object>(),
												 log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("scan").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = scanpolicy_from_jsobject(&policies->scan,
											   policy_val.As<Object>(), log)) !=
				AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("query").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = querypolicy_from_jsobject(&policies->query,
												policy_val.As<Object>(),
												log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("write").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {
			if ((rc = writepolicy_from_jsobject(&policies->write,
												policy_val.As<Object>(),
												log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		policy_val = Nan::Get(policies_obj, Nan::New("metrics").ToLocalChecked())
						 .ToLocalChecked();
		if (policy_val->IsObject()) {

			if ((rc = metricspolicy_from_jsobject(&policies->metrics, policy_val.As<Object>(), &(client->report_dir),
												  client->enable_callback, client->snapshot_callback, client->node_close_callback,
												  client->disable_callback, true, log)) != AS_NODE_PARAM_OK) {
				goto Cleanup;
			}
		}

		as_v8_debug(log, "Parsing global policies: success");
	}

	// If modlua path is passed in config object, set those values here
	if (v8_modlua->IsObject()) {
		Local<Object> modlua = v8_modlua.As<Object>();
		if ((rc = get_optional_string_property(&user_path, &defined, modlua,
											   "userPath", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		else if (defined) {
			snprintf(config->lua.user_path, AS_CONFIG_PATH_MAX_SIZE, "%s", user_path);
		}
		else {
			as_v8_debug(log, "Using default Lua user path: %s",
						AS_CONFIG_LUA_USER_PATH);
		}
	}

	if ((rc = get_optional_int32_property((int32_t *)&config->auth_mode, NULL,
										  configObj, "authMode", log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}

	if ((rc = get_optional_string_property(&user, &defined, configObj, "user",
										   log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	else if (defined) {
		if ((rc = get_string_property(&password, configObj, "password", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		else {
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
		if ((rc = get_optional_bool_property(&config->use_shm, NULL,
											 shmConfigObj, "enable", log)) !=
			AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if ((rc = get_optional_uint32_property((uint32_t *)&config->shm_key,
											   NULL, shmConfigObj, "key",
											   log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if ((rc = get_optional_uint32_property(&config->shm_max_nodes, NULL,
											   shmConfigObj, "maxNodes",
											   log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if ((rc = get_optional_uint32_property(
				 &config->shm_max_namespaces, NULL, shmConfigObj,
				 "maxNamespaces", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
		if ((rc = get_optional_uint32_property(
				 &config->shm_takeover_threshold_sec, NULL, shmConfigObj,
				 "takeoverThresholdSeconds", log)) != AS_NODE_PARAM_OK) {
			goto Cleanup;
		}
	}

	if ((rc = get_optional_uint32_property(&config->conn_timeout_ms, NULL,
										   configObj, "connTimeoutMs", log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->login_timeout_ms, NULL,
										   configObj, "loginTimeoutMs", log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->max_socket_idle, NULL,
										   configObj, "maxSocketIdle", log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->tender_interval, NULL,
										   configObj, "tenderInterval", log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->async_max_conns_per_node,
										   NULL, configObj, "maxConnsPerNode",
										   log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->max_error_rate,
										   &defined, configObj, "maxErrorRate",
										   log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->error_rate_window,
										   NULL, configObj, "errorRateWindow",
										   log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->async_min_conns_per_node,
										   NULL, configObj, "minConnsPerNode",
										   log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->max_conns_per_node, NULL,
										   configObj, "maxConnsPerNodeSync",
										   log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_uint32_property(&config->min_conns_per_node, NULL,
										   configObj, "minConnsPerNodeSync",
										   log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_bool_property(&config->use_services_alternate, NULL,
										 configObj, "useAlternateAccessAddress",
										 log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_bool_property(&config->rack_aware, NULL, configObj,
										 "rackAware", log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_int_property(&config->rack_id, NULL, configObj,
										"rackId", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_rack_ids_property(config, NULL, configObj,
										"rackIds", log)) != AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_ip_map_property(config, configObj, log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}


	if ((rc = get_optional_string_property(&app_id, &defined, configObj, 
										   "appId", log)) != AS_NODE_PARAM_OK) {
		if(app_id){
			cf_free(app_id);
		}
		goto Cleanup;
	}
	else if (defined){
		as_config_set_app_id(config, app_id);
		cf_free(app_id);
	}

	// The Java client's default refresh timeout; the C client's is 10000.
	config->discovery.refresh_timeout_ms = 2000;
	if ((rc = get_optional_discovery_property(config, configObj, log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}
	if ((rc = get_optional_translation_property(config, configObj, log)) !=
		AS_NODE_PARAM_OK) {
		goto Cleanup;
	}


Cleanup:
	if (cluster_name)
		cf_free(cluster_name);
	if (user)
		cf_free(user);
	if (password)
		cf_free(password);
	if (user_path)
		cf_free(user_path);
	if (config_provider_path)
		cf_free(config_provider_path);

	as_v8_debug(log, "Built as_config instance from JS config object");
	return rc;
}
