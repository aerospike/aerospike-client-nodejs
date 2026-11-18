/*******************************************************************************
 * Copyright 2026 Aerospike, Inc.
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

/*
 * _conformance(op, ...): the L1 conformance runner's entry into the C client
 * (test/discovery/l1/runner.ts), for the aerospike-client-conformance fixture
 * set. Internal, for that runner only, and not part of the public API.
 *
 *   translate(translation, endpoint)    -> {host, port, tlsName} | {error}
 *   collision(translation, peers)       -> {nodes, errors} | {error}
 *   merge(policy, statics, results)     -> {snapshots} | {error}
 *   providerCreate(config)              -> id | {error}
 *   providerRefresh(id)                 -> {status, message, hosts}
 *   providerDestroy(id)
 *   tlsMatch(pemPath, identifier)       -> 'none' | 'strict' | 'legacy' | {error}
 *
 * translation is {kind: 'static-map' | 'port-map' | 'pass-through',
 * onMiss: 'passThrough' | 'strict', map: {orig: alt}}, built by the runner from
 * the row's config after Node's own config validation. A host is
 * {host, port, tlsName}. providerCreate takes a Node config object and builds
 * its discovery provider through the same code a client uses.
 */

#include <map>
#include <string>
#include <vector>

#include <openssl/bio.h>
#include <openssl/pem.h>
#include <openssl/x509.h>

extern "C" {
#include <aerospike/as_config.h>
#include <aerospike/as_discovery.h>
#include <aerospike/as_host.h>
#include <aerospike/as_tls.h>
#include <aerospike/as_vector.h>
}

#include "config.h"
#include "conformance.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

namespace {

std::string str(Local<Value> value)
{
	if (!value->IsString()) {
		return std::string();
	}
	Nan::Utf8String text(value);
	return std::string(*text, text.length());
}

Local<Value> get(Local<Object> obj, const char *key)
{
	return Nan::Get(obj, Nan::New(key).ToLocalChecked()).ToLocalChecked();
}

void set(Local<Object> obj, const char *key, Local<Value> value)
{
	Nan::Set(obj, Nan::New(key).ToLocalChecked(), value);
}

Local<Value> text(const char *s)
{
	if (!s) {
		return Nan::Null();
	}
	return Nan::New(s).ToLocalChecked();
}

Local<Object> error_object(const as_error *err)
{
	Local<Object> result = Nan::New<Object>();
	Local<Object> error = Nan::New<Object>();
	set(error, "code", Nan::New(err->code));
	set(error, "message", Nan::New(err->message).ToLocalChecked());
	set(result, "error", error);
	return result;
}

Local<Object> error_object(const char *message)
{
	as_error err;
	as_error_update(&err, AEROSPIKE_ERR_PARAM, "%s", message);
	return error_object(&err);
}

// A translation from its JS form, holding the strings the C struct points to.
struct Translation {
	as_conformance_translation c;
	std::vector<std::string> strings;
	std::vector<as_addr_map> map;

	bool init(Local<Value> value, std::string &problem)
	{
		memset(&c, 0, sizeof(c));
		if (!value->IsObject()) {
			problem = "translation must be an object";
			return false;
		}
		Local<Object> obj = value.As<Object>();
		std::string kind = str(get(obj, "kind"));
		if (kind == "static-map") {
			c.kind = AS_TRANSLATOR_STATIC_MAP;
		}
		else if (kind == "port-map") {
			c.kind = AS_TRANSLATOR_PORT_MAP;
		}
		else if (kind == "pass-through") {
			c.kind = AS_TRANSLATOR_PASS_THROUGH;
		}
		else {
			problem = "unknown translation kind '" + kind + "'";
			return false;
		}
		c.on_miss = str(get(obj, "onMiss")) == "strict" ? AS_TRANSLATION_STRICT
														  : AS_TRANSLATION_PASS_THROUGH;
		Local<Value> map_value = get(obj, "map");
		if (map_value->IsObject()) {
			Local<Object> map_obj = map_value.As<Object>();
			Local<Array> keys = Nan::GetOwnPropertyNames(map_obj).ToLocalChecked();
			strings.reserve(keys->Length() * 2);
			for (uint32_t i = 0; i < keys->Length(); i++) {
				Local<Value> key = Nan::Get(keys, i).ToLocalChecked();
				strings.push_back(str(key));
				strings.push_back(str(Nan::Get(map_obj, key).ToLocalChecked()));
			}
			for (size_t i = 0; i < strings.size(); i += 2) {
				as_addr_map entry;
				entry.orig = (char *)strings[i].c_str();
				entry.alt = (char *)strings[i + 1].c_str();
				map.push_back(entry);
			}
		}
		c.map = map.empty() ? NULL : map.data();
		c.map_size = (uint32_t)map.size();
		return true;
	}
};

// An endpoint from {nodeName, tlsName, host, port, sourceList}.
struct Endpoint {
	as_endpoint c;
	std::string node_name, tls_name, host;
	bool has_node_name, has_tls_name;

	void init(Local<Object> obj)
	{
		Local<Value> node = get(obj, "nodeName");
		Local<Value> tls = get(obj, "tlsName");
		has_node_name = node->IsString();
		has_tls_name = tls->IsString();
		node_name = str(node);
		tls_name = str(tls);
		host = str(get(obj, "host"));
		memset(&c, 0, sizeof(c));
		c.node_name = has_node_name ? node_name.c_str() : NULL;
		c.tls_name = has_tls_name ? tls_name.c_str() : NULL;
		c.host = host.c_str();
		c.port = (uint16_t)Nan::To<uint32_t>(get(obj, "port")).FromJust();
		c.source = str(get(obj, "sourceList")) == "alternate" ? AS_ENDPOINT_SOURCE_ALTERNATE
															  : AS_ENDPOINT_SOURCE_STANDARD;
	}
};

Local<Object> host_object(const as_host *host)
{
	Local<Object> obj = Nan::New<Object>();
	set(obj, "host", text(host->name));
	set(obj, "port", Nan::New(host->port));
	set(obj, "tlsName", text(host->tls_name));
	return obj;
}

Local<Array> hosts_array(const as_vector *hosts)
{
	uint32_t size = hosts ? hosts->size : 0;
	Local<Array> array = Nan::New<Array>(size);
	for (uint32_t i = 0; i < size; i++) {
		Nan::Set(array, i, host_object((as_host *)as_vector_get((as_vector *)hosts, i)));
	}
	return array;
}

// Hosts from [{host, port, tlsName}], with the strings they point to.
struct Hosts {
	as_vector v;
	std::vector<std::string> strings;

	void init(Local<Value> value)
	{
		Local<Array> list = value->IsArray() ? value.As<Array>() : Nan::New<Array>();
		as_vector_init(&v, sizeof(as_host), list->Length() > 0 ? list->Length() : 1);
		strings.reserve(list->Length() * 2);
		std::vector<bool> has_tls;
		for (uint32_t i = 0; i < list->Length(); i++) {
			Local<Object> obj = Nan::Get(list, i).ToLocalChecked().As<Object>();
			strings.push_back(str(get(obj, "host")));
			Local<Value> tls = get(obj, "tlsName");
			strings.push_back(str(tls));
			has_tls.push_back(tls->IsString());
		}
		for (uint32_t i = 0; i < list->Length(); i++) {
			Local<Object> obj = Nan::Get(list, i).ToLocalChecked().As<Object>();
			as_host host;
			host.name = (char *)strings[i * 2].c_str();
			host.tls_name = has_tls[i] ? (char *)strings[i * 2 + 1].c_str() : NULL;
			host.port = (uint16_t)Nan::To<uint32_t>(get(obj, "port")).FromJust();
			as_vector_append(&v, &host);
		}
	}

	~Hosts() { as_vector_destroy(&v); }
};

// Providers built by providerCreate, by id, until providerDestroy.
std::map<uint32_t, as_config *> providers;
uint32_t next_provider_id = 1;

void translate(Nan::NAN_METHOD_ARGS_TYPE info)
{
	Translation t;
	std::string problem;
	if (!t.init(info[1], problem) || !info[2]->IsObject()) {
		info.GetReturnValue().Set(error_object(problem.empty() ? "endpoint must be an object"
															   : problem.c_str()));
		return;
	}
	Endpoint e;
	e.init(info[2].As<Object>());
	as_error err;
	as_error_init(&err);
	as_host out;
	memset(&out, 0, sizeof(out));
	if (as_discovery_conformance_translate(&err, &t.c, &e.c, &out) != AEROSPIKE_OK) {
		info.GetReturnValue().Set(error_object(&err));
		return;
	}
	info.GetReturnValue().Set(host_object(&out));
	as_host_destroy(&out);
}

void collision(Nan::NAN_METHOD_ARGS_TYPE info)
{
	Translation t;
	std::string problem;
	if (!t.init(info[1], problem) || !info[2]->IsArray()) {
		info.GetReturnValue().Set(error_object(problem.empty() ? "peers must be an array"
															   : problem.c_str()));
		return;
	}
	Local<Array> list = info[2].As<Array>();
	std::vector<Endpoint> endpoints(list->Length());
	std::vector<as_endpoint> peers;
	for (uint32_t i = 0; i < list->Length(); i++) {
		endpoints[i].init(Nan::Get(list, i).ToLocalChecked().As<Object>());
	}
	for (uint32_t i = 0; i < list->Length(); i++) {
		peers.push_back(endpoints[i].c);
	}
	as_error err;
	as_error_init(&err);
	as_conformance_collisions out;
	memset(&out, 0, sizeof(out));
	if (as_discovery_conformance_collision(&err, &t.c, peers.data(), (uint32_t)peers.size(),
										   &out) != AEROSPIKE_OK) {
		info.GetReturnValue().Set(error_object(&err));
		return;
	}
	Local<Object> result = Nan::New<Object>();
	Local<Array> nodes = Nan::New<Array>(out.nodes_size);
	for (uint32_t i = 0; i < out.nodes_size; i++) {
		Nan::Set(nodes, i, text(out.nodes[i]));
	}
	Local<Array> errors = Nan::New<Array>(out.errors_size);
	for (uint32_t i = 0; i < out.errors_size; i++) {
		Nan::Set(errors, i, text(out.errors[i]));
	}
	set(result, "nodes", nodes);
	set(result, "errors", errors);
	as_conformance_collisions_destroy(&out);
	info.GetReturnValue().Set(result);
}

void merge(Nan::NAN_METHOD_ARGS_TYPE info)
{
	std::string policy_name = str(info[1]);
	as_seed_merge_policy policy;
	if (policy_name == "merge") {
		policy = AS_SEED_MERGE;
	}
	else if (policy_name == "replace") {
		policy = AS_SEED_REPLACE;
	}
	else if (policy_name == "discovery_only") {
		policy = AS_SEED_DISCOVERY_ONLY;
	}
	else {
		info.GetReturnValue().Set(error_object("unknown merge policy"));
		return;
	}
	Hosts statics;
	statics.init(info[2]);
	Local<Array> list = info[3]->IsArray() ? info[3].As<Array>() : Nan::New<Array>();
	uint32_t size = list->Length();
	std::vector<Hosts> results(size);
	std::vector<const as_vector *> pointers(size);
	for (uint32_t i = 0; i < size; i++) {
		Local<Value> value = Nan::Get(list, i).ToLocalChecked();
		if (value->IsNull()) {
			pointers[i] = NULL;
			as_vector_init(&results[i].v, sizeof(as_host), 1);
		}
		else {
			results[i].init(value);
			pointers[i] = &results[i].v;
		}
	}
	std::vector<as_seed_candidates> snapshots(size > 0 ? size : 1);
	as_error err;
	as_error_init(&err);
	if (as_discovery_conformance_merge(&err, policy, &statics.v, pointers.data(), size,
									   snapshots.data()) != AEROSPIKE_OK) {
		info.GetReturnValue().Set(error_object(&err));
		return;
	}
	Local<Array> out = Nan::New<Array>(size);
	for (uint32_t i = 0; i < size; i++) {
		Nan::Set(out, i, hosts_array(snapshots[i].hosts));
		as_seed_candidates_destroy(&snapshots[i]);
	}
	Local<Object> result = Nan::New<Object>();
	set(result, "snapshots", out);
	info.GetReturnValue().Set(result);
}

void provider_create(Nan::NAN_METHOD_ARGS_TYPE info)
{
	if (!info[1]->IsObject()) {
		info.GetReturnValue().Set(error_object("config must be an object"));
		return;
	}
	as_config *config = (as_config *)cf_malloc(sizeof(as_config));
	as_config_init(config);
	if (config_discovery_from_jsobject(config, info[1].As<Object>(), &g_log_info) !=
			AS_NODE_PARAM_OK ||
		!config->discovery.provider.refresh) {
		as_config_destroy(config);
		cf_free(config);
		info.GetReturnValue().Set(error_object("the config builds no discovery provider"));
		return;
	}
	uint32_t id = next_provider_id++;
	providers[id] = config;
	info.GetReturnValue().Set(Nan::New(id));
}

void provider_refresh(Nan::NAN_METHOD_ARGS_TYPE info)
{
	uint32_t id = Nan::To<uint32_t>(info[1]).FromMaybe(0);
	auto found = providers.find(id);
	if (found == providers.end()) {
		info.GetReturnValue().Set(error_object("unknown provider"));
		return;
	}
	as_seed_provider *provider = &found->second->discovery.provider;
	as_seed_candidate_context context;
	memset(&context, 0, sizeof(context));
	as_seed_candidates candidates;
	as_seed_candidates_init(&candidates, 4);
	as_error err;
	as_error_init(&err);
	as_status status = provider->refresh(&err, &context, &candidates, provider->udata);
	Local<Object> result = Nan::New<Object>();
	set(result, "status", Nan::New(status));
	set(result, "message", Nan::New(err.message).ToLocalChecked());
	set(result, "hosts", hosts_array(candidates.hosts));
	as_seed_candidates_destroy(&candidates);
	info.GetReturnValue().Set(result);
}

void provider_destroy(Nan::NAN_METHOD_ARGS_TYPE info)
{
	uint32_t id = Nan::To<uint32_t>(info[1]).FromMaybe(0);
	auto found = providers.find(id);
	if (found != providers.end()) {
		as_config_destroy(found->second);
		cf_free(found->second);
		providers.erase(found);
	}
}

void tls_match(Nan::NAN_METHOD_ARGS_TYPE info)
{
	std::string pem = str(info[1]);
	std::string identifier = str(info[2]);
	BIO *bio = BIO_new_file(pem.c_str(), "r");
	X509 *cert = bio ? PEM_read_bio_X509(bio, NULL, NULL, NULL) : NULL;
	if (bio) {
		BIO_free(bio);
	}
	if (!cert) {
		info.GetReturnValue().Set(error_object("cannot read the certificate"));
		return;
	}
	as_tls_match_kind kind = as_tls_match_identity(cert, identifier.c_str());
	X509_free(cert);
	const char *name = kind == AS_TLS_MATCH_STRICT ? "strict"
					   : kind == AS_TLS_MATCH_LEGACY ? "legacy"
													 : "none";
	info.GetReturnValue().Set(Nan::New(name).ToLocalChecked());
}

} // namespace

NAN_METHOD(conformance)
{
	Nan::HandleScope scope;
	std::string op = str(info[0]);
	if (op == "translate") {
		translate(info);
	}
	else if (op == "collision") {
		collision(info);
	}
	else if (op == "merge") {
		merge(info);
	}
	else if (op == "providerCreate") {
		provider_create(info);
	}
	else if (op == "providerRefresh") {
		provider_refresh(info);
	}
	else if (op == "providerDestroy") {
		provider_destroy(info);
	}
	else if (op == "tlsMatch") {
		tls_match(info);
	}
	else {
		Nan::ThrowError("unknown _conformance operation");
	}
}
