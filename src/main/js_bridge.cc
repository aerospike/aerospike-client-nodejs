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

#include "js_bridge.h"

#include <algorithm>
#include <chrono>
#include <set>

#include "log.h"

extern "C" {
#include <aerospike/as_error.h>
#include <aerospike/as_host.h>
#include <aerospike/as_vector.h>
}

using namespace v8;

// Every live bridge, so the environment cleanup hook can stop them at process
// exit: after it, the event loop is gone and uv_async_send() is not safe.
static std::mutex g_bridges_mutex;
static std::set<JsBridge *> *g_bridges = NULL;
static bool g_cleanup_registered = false;

JsBridge::JsBridge(Kind kind_) : kind(kind_), async(NULL) {}

JsBridge::~JsBridge()
{
	spec.Reset();
}

JsBridge *JsBridge::Create(Kind kind, Local<Object> spec)
{
	JsBridge *bridge = new JsBridge(kind);
	bridge->spec.Reset(spec);
	if (kind == PROVIDER) {
		Local<Value> limit = Nan::Get(spec, Nan::New("waitLimitMs").ToLocalChecked()).ToLocalChecked();
		if (limit->IsNumber()) {
			double ms = Nan::To<double>(limit).FromMaybe(0);
			bridge->wait_limit_ms = ms > 0 && ms < 4294967295.0 ? (uint32_t)ms : 0;
		}
	}

	bridge->async = new uv_async_t;
	uv_async_init(uv_default_loop(), bridge->async, AsyncCallback);
	bridge->async->data = bridge;
	// A provider or hook must not keep the process alive.
	uv_unref(reinterpret_cast<uv_handle_t *>(bridge->async));

	std::lock_guard<std::mutex> guard(g_bridges_mutex);
	if (!g_bridges) {
		g_bridges = new std::set<JsBridge *>();
	}
	g_bridges->insert(bridge);
	if (!g_cleanup_registered) {
		node::AddEnvironmentCleanupHook(Isolate::GetCurrent(), Cleanup, NULL);
		g_cleanup_registered = true;
	}
	return bridge;
}

void JsBridge::Cleanup(void *)
{
	StopAll();
}

void JsBridge::StopAll()
{
	std::lock_guard<std::mutex> guard(g_bridges_mutex);
	if (!g_bridges) {
		return;
	}
	for (JsBridge *bridge : *g_bridges) {
		std::lock_guard<std::mutex> lock(bridge->mutex);
		bridge->loop_alive = false;
		bridge->closing = true;
		bridge->cond.notify_all();
	}
}

void JsBridge::MarkClosing()
{
	bool keep;
	{
		std::lock_guard<std::mutex> lock(mutex);
		closing = true;
		cond.notify_all();
		keep = kind == PROVIDER && loop_alive && !close_called;
	}
	if (keep) {
		// JavaScript thread: until the provider's close() has run.
		KeepAlive(true);
	}
}

// JavaScript thread only (uv_ref and uv_unref).
void JsBridge::KeepAlive(bool keep)
{
	if (keep == kept_alive) {
		return;
	}
	kept_alive = keep;
	if (keep) {
		uv_ref(reinterpret_cast<uv_handle_t *>(async));
	}
	else {
		uv_unref(reinterpret_cast<uv_handle_t *>(async));
	}
}

void JsBridge::AbortPending()
{
	std::lock_guard<std::mutex> lock(mutex);
	if (has_request && !has_result) {
		aborted = true;
		cond.notify_all();
	}
}

void JsBridge::ReleaseClient()
{
	std::unique_lock<std::mutex> lock(mutex);
	Release(lock);
}

void JsBridge::ReleaseOwner()
{
	std::unique_lock<std::mutex> lock(mutex);
	// No C client call can come any more.
	released = true;
	closing = true;
	Release(lock);
}

// Called with the lock held. The bridge is freed on the JavaScript thread.
void JsBridge::Release(std::unique_lock<std::mutex> &)
{
	refs--;
	if (loop_alive) {
		uv_async_send(async);
	}
}

// Called with the lock held, on the C client's thread: starts a request and
// returns its id, or 0 when no call can be made.
uint64_t JsBridge::Begin(std::unique_lock<std::mutex> &)
{
	if (closing || !loop_alive) {
		return 0;
	}
	request_id = ++next_id;
	has_request = true;
	dispatched = false;
	aborted = false;
	has_result = false;
	uv_async_send(async);
	return request_id;
}

as_status JsBridge::Refresh(as_error *err, const as_seed_candidate_context *context,
							as_seed_candidates *candidates, void *udata)
{
	JsBridge *bridge = static_cast<JsBridge *>(udata);
	std::unique_lock<std::mutex> lock(bridge->mutex);

	bridge->has_cluster_name = context->cluster_name != NULL;
	bridge->cluster_name = context->cluster_name ? context->cluster_name : "";
	bridge->seeds.clear();
	if (context->configured_seeds) {
		for (uint32_t i = 0; i < context->configured_seeds->size; i++) {
			as_host *host = static_cast<as_host *>(
				as_vector_get(const_cast<as_vector *>(context->configured_seeds), i));
			Host seed;
			seed.addr = host->name ? host->name : "";
			seed.port = host->port;
			seed.has_tls_name = host->tls_name != NULL;
			seed.tls_name = host->tls_name ? host->tls_name : "";
			bridge->seeds.push_back(seed);
		}
	}
	bridge->tend_iteration = context->tend_iteration;

	if (bridge->closing || !bridge->loop_alive) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									"JavaScript seed provider not called: the client is closing");
	}

	// An earlier call past its wait limit hasn't settled: the provider is
	// never called twice at once.
	if (bridge->running > 0) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									"JavaScript seed provider not called: its previous call is still running");
	}

	if (bridge->Begin(lock) == 0) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									"JavaScript seed provider not called: the client is closing");
	}

	auto answered = [bridge] {
		return bridge->has_result || bridge->aborted || bridge->closing;
	};
	if (bridge->wait_limit_ms == 0) {
		bridge->cond.wait(lock, answered);
	}
	else if (!bridge->cond.wait_for(lock, std::chrono::milliseconds(bridge->wait_limit_ms), answered)) {
		// Its answer, if it ever comes, is dropped.
		bridge->has_request = false;
		return as_error_update(err, AEROSPIKE_ERR_TIMEOUT,
							   "JavaScript seed provider did not answer within %u ms",
							   bridge->wait_limit_ms);
	}
	bridge->has_request = false;

	if (!bridge->has_result) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									bridge->aborted
										? "JavaScript seed provider call abandoned: connect failed"
										: "JavaScript seed provider call abandoned: the client is closing");
	}
	bridge->has_result = false;

	if (!bridge->result_ok) {
		return as_error_update(err, AEROSPIKE_ERR_CLIENT, "%s", bridge->result_error.c_str());
	}

	for (size_t i = 0; i < bridge->result_hosts.size(); i++) {
		const Host &host = bridge->result_hosts[i];
		if (!as_seed_candidates_append(candidates, host.addr.c_str(),
									   host.has_tls_name ? host.tls_name.c_str() : NULL,
									   (uint16_t)host.port)) {
			return as_error_update(err, AEROSPIKE_ERR_CLIENT,
								   "invalid host at index %u", (uint32_t)i);
		}
	}
	return AEROSPIKE_OK;
}

static void clear_string(std::string &value)
{
	std::fill(value.begin(), value.end(), '\0');
	value.clear();
}

as_status JsBridge::GetCredentials(as_error *err, uint32_t timeout_ms,
								   as_aws_credentials *credentials, void *udata)
{
	JsBridge *bridge = static_cast<JsBridge *>(udata);
	std::unique_lock<std::mutex> lock(bridge->mutex);
	bridge->timeout_ms = timeout_ms;

	if (bridge->closing || !bridge->loop_alive) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									"JavaScript credentials hook not called: the client is closing");
	}

	// An earlier call past its timeout hasn't settled: the hook is never
	// called twice at once.
	if (bridge->running > 0) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									"JavaScript credentials hook not called: its previous call is still running");
	}

	if (bridge->Begin(lock) == 0) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									"JavaScript credentials hook not called: the client is closing");
	}

	// The hook gets the time left of the refresh, and is bounded by it.
	bool answered = bridge->cond.wait_for(lock, std::chrono::milliseconds(timeout_ms), [bridge] {
		return bridge->has_result || bridge->aborted || bridge->closing;
	});
	bridge->has_request = false;

	if (!answered) {
		return as_error_update(err, AEROSPIKE_ERR_TIMEOUT,
							   "JavaScript credentials hook did not answer within %u ms",
							   timeout_ms);
	}
	if (!bridge->has_result) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									"JavaScript credentials hook call abandoned");
	}
	bridge->has_result = false;

	if (!bridge->result_ok) {
		return as_error_update(err, AEROSPIKE_ERR_CLIENT, "%s", bridge->result_error.c_str());
	}

	Credentials &creds = bridge->result_credentials;
	bool ok = as_aws_credentials_set(credentials, creds.access_key_id.c_str(),
									 creds.secret_access_key.c_str(),
									 creds.has_session_token ? creds.session_token.c_str() : NULL,
									 creds.expiration_ms);
	clear_string(creds.access_key_id);
	clear_string(creds.secret_access_key);
	clear_string(creds.session_token);

	if (!ok) {
		return as_error_set_message(err, AEROSPIKE_ERR_CLIENT,
									"JavaScript credentials hook returned invalid credentials");
	}
	return AEROSPIKE_OK;
}

void JsBridge::Destroy(void *udata)
{
	JsBridge *bridge = static_cast<JsBridge *>(udata);
	// Any thread, possibly after the client closed: never blocks, never calls
	// into JavaScript. The provider's close() runs on the JavaScript thread.
	std::unique_lock<std::mutex> lock(bridge->mutex);
	bridge->released = true;
	bridge->closing = true;
	bridge->cond.notify_all();
	bridge->Release(lock);
}

void JsBridge::AsyncCallback(uv_async_t *handle)
{
	JsBridge *bridge = static_cast<JsBridge *>(handle->data);
	if (bridge) {
		bridge->RunOnLoop();
	}
}

void JsBridge::CloseCallback(uv_handle_t *handle)
{
	JsBridge *bridge = static_cast<JsBridge *>(handle->data);
	delete reinterpret_cast<uv_async_t *>(handle);
	delete bridge;
}

// JavaScript thread. uv_async_send() coalesces, so this checks every state:
// a request to dispatch, the provider's close() to call, the bridge to free.
// Nothing calls into JavaScript once the process is exiting.
void JsBridge::RunOnLoop()
{
	Nan::HandleScope scope;
	uint64_t id = 0;
	bool alive;
	{
		std::lock_guard<std::mutex> lock(mutex);
		alive = loop_alive;
		if (alive && has_request && !dispatched && !aborted && !closing) {
			dispatched = true;
			id = request_id;
			running++;
			refs++;
		}
	}
	if (!alive) {
		return;
	}
	if (id) {
		Dispatch(id);
	}

	bool call_close = false;
	bool free_now = false;
	bool waiting_on_js = false;
	{
		std::lock_guard<std::mutex> lock(mutex);
		if (kind == PROVIDER && released && running == 0 && !close_called) {
			close_called = true;
			call_close = true;
		}
		// refs reaches 0 only once the C client released the bridge. Never in
		// the pass that calls close(): the pass after it frees the bridge.
		else if (refs == 0 && running == 0 && !freeing && (kind != PROVIDER || close_called)) {
			freeing = true;
			free_now = true;
		}
		waiting_on_js = released && running > 0;
	}

	if (waiting_on_js) {
		// A call that hasn't settled may never settle: don't hold the process
		// for it (close() then runs only if it settles while the process runs).
		KeepAlive(false);
	}

	if (call_close) {
		Local<Object> spec_obj = Nan::New(spec);
		Local<Value> close_fn = Nan::Get(spec_obj, Nan::New("close").ToLocalChecked()).ToLocalChecked();
		if (close_fn->IsFunction()) {
			Local<Value> argv[1] = {Nan::New<Function>(Warn)};
			Nan::TryCatch try_catch;
			Nan::Call(close_fn.As<Function>(), spec_obj, 1, argv);
			if (try_catch.HasCaught()) {
				Nan::Utf8String message(try_catch.Exception());
				as_v8_warn(&g_log_info, "JavaScript seed provider close() failed: %s",
						   *message ? *message : "unknown error");
			}
		}
		KeepAlive(false);
		// The bridge may now be free.
		RunOnLoop();
		return;
	}

	if (free_now) {
		KeepAlive(false);
		{
			std::lock_guard<std::mutex> guard(g_bridges_mutex);
			if (g_bridges) {
				g_bridges->erase(this);
			}
		}
		uv_close(reinterpret_cast<uv_handle_t *>(async), CloseCallback);
	}
}

NAN_METHOD(JsBridge::Warn)
{
	Nan::HandleScope scope;
	Nan::Utf8String message(info.Length() > 0 ? info[0] : Nan::Undefined().As<Value>());
	as_v8_warn(&g_log_info, "JavaScript seed provider close() failed: %s",
			   *message ? *message : "unknown error");
}

static Local<Object> host_object(const std::string &addr, int port, bool has_tls_name,
								 const std::string &tls_name)
{
	Local<Object> obj = Nan::New<Object>();
	Nan::Set(obj, Nan::New("addr").ToLocalChecked(), Nan::New(addr).ToLocalChecked());
	Nan::Set(obj, Nan::New("port").ToLocalChecked(), Nan::New(port));
	if (has_tls_name) {
		Nan::Set(obj, Nan::New("tlsname").ToLocalChecked(), Nan::New(tls_name).ToLocalChecked());
	}
	return obj;
}

void JsBridge::Dispatch(uint64_t id)
{
	// Copied under the lock; the JavaScript objects are built after it.
	Kind call_kind = kind;
	bool with_cluster_name;
	std::string name;
	std::vector<Host> configured;
	uint64_t iteration;
	uint32_t timeout;
	{
		std::lock_guard<std::mutex> lock(mutex);
		with_cluster_name = has_cluster_name;
		name = cluster_name;
		configured = seeds;
		iteration = tend_iteration;
		timeout = timeout_ms;
	}

	Local<Object> spec_obj = Nan::New(spec);
	// done() is single use. Its data is freed when the function is collected,
	// so a done() called again, or never, can't double free or leak it.
	DoneData *data = new DoneData();
	data->bridge = this;
	data->id = id;
	data->called = false;
	// A plain function, not a FunctionTemplate: V8 never frees templates.
	Local<Function> done = Nan::New<Function>(Done, Nan::New<External>(data));
	data->function.Reset(done);
	data->function.SetWeak(data, DoneCollected, Nan::WeakCallbackType::kParameter);

	Local<Value> argv[2];
	Local<Value> fn;
	if (call_kind == PROVIDER) {
		Local<Object> ctx = Nan::New<Object>();
		if (with_cluster_name) {
			Nan::Set(ctx, Nan::New("clusterName").ToLocalChecked(), Nan::New(name).ToLocalChecked());
		}
		else {
			Nan::Set(ctx, Nan::New("clusterName").ToLocalChecked(), Nan::Null());
		}
		Local<Array> list = Nan::New<Array>((int)configured.size());
		for (size_t i = 0; i < configured.size(); i++) {
			Nan::Set(list, (uint32_t)i,
					 host_object(configured[i].addr, configured[i].port,
								 configured[i].has_tls_name, configured[i].tls_name));
		}
		Nan::Set(ctx, Nan::New("configuredSeeds").ToLocalChecked(), list);
		Nan::Set(ctx, Nan::New("tendIteration").ToLocalChecked(), Nan::New<Number>((double)iteration));
		argv[0] = ctx;
		fn = Nan::Get(spec_obj, Nan::New("refresh").ToLocalChecked()).ToLocalChecked();
	}
	else {
		argv[0] = Nan::New(timeout);
		fn = Nan::Get(spec_obj, Nan::New("get").ToLocalChecked()).ToLocalChecked();
	}
	argv[1] = done;

	Nan::TryCatch try_catch;
	if (fn->IsFunction()) {
		Nan::Call(fn.As<Function>(), spec_obj, 2, argv);
	}
	if ((!fn->IsFunction() || try_catch.HasCaught()) && !data->called) {
		// The wrapper catches the user's errors, so this is a bridge failure.
		data->called = true;
		Finish(id, "JavaScript bridge call failed", Nan::Undefined());
	}
}

void JsBridge::DoneCollected(const Nan::WeakCallbackInfo<DoneData> &info)
{
	DoneData *data = info.GetParameter();
	if (!data->called) {
		// Nothing can call done() any more: the call can never settle. It is
		// released, so later calls and close() aren't held back by it.
		data->called = true;
		data->bridge->CallLost(data->id);
	}
	delete data;
}

// JavaScript thread, from a weak callback: no JavaScript is called here.
void JsBridge::CallLost(uint64_t id)
{
	std::lock_guard<std::mutex> lock(mutex);
	running--;
	if (has_request && request_id == id && dispatched && !aborted && !has_result) {
		result_ok = false;
		result_error = "JavaScript call ended without an answer";
		result_hosts.clear();
		has_result = true;
		cond.notify_all();
	}
	refs--;
	if (loop_alive) {
		uv_async_send(async);
	}
}

NAN_METHOD(JsBridge::Done)
{
	Nan::HandleScope scope;
	DoneData *data = static_cast<DoneData *>(info.Data().As<External>()->Value());
	if (data->called) {
		return;
	}
	data->called = true;

	if (info.Length() > 0 && !info[0]->IsNull() && !info[0]->IsUndefined()) {
		Nan::Utf8String message(info[0]);
		data->bridge->Finish(data->id, *message && **message ? *message : "unknown error", Nan::Undefined());
	}
	else {
		data->bridge->Finish(data->id, NULL, info.Length() > 1 ? info[1] : Nan::Undefined().As<Value>());
	}
}

static std::string string_property(Local<Object> obj, const char *name, bool *present)
{
	Local<Value> value;
	if (!Nan::Get(obj, Nan::New(name).ToLocalChecked()).ToLocal(&value) || !value->IsString()) {
		*present = false;
		return "";
	}
	*present = true;
	Nan::Utf8String text(value);
	return std::string(*text, text.length());
}

// JavaScript thread: stores the answer of request id, when it is still the
// one waited for, and drops the call's reference.
void JsBridge::Finish(uint64_t id, const char *error, Local<Value> value)
{
	std::vector<Host> hosts;
	Credentials creds = {"", "", false, "", 0};
	std::string message = error ? error : "";
	bool ok = error == NULL;

	if (ok && kind == PROVIDER) {
		if (value->IsArray()) {
			Local<Array> list = value.As<Array>();
			for (uint32_t i = 0; i < list->Length() && ok; i++) {
				Local<Value> item;
				if (!Nan::Get(list, i).ToLocal(&item) || !item->IsObject()) {
					// lib/discovery_bridge.js already checked this; never crash on it.
					ok = false;
					message = "invalid host at index " + std::to_string(i);
					break;
				}
				Local<Object> obj = item.As<Object>();
				bool present = false;
				Host host;
				host.addr = string_property(obj, "addr", &present);
				Local<Value> port;
				host.port = Nan::Get(obj, Nan::New("port").ToLocalChecked()).ToLocal(&port)
					? Nan::To<int32_t>(port).FromMaybe(0) : 0;
				host.tls_name = string_property(obj, "tlsname", &host.has_tls_name);
				hosts.push_back(host);
			}
		}
		else {
			ok = false;
			message = "JavaScript seed provider returned no host list";
		}
	}
	else if (ok) {
		if (value->IsObject()) {
			Local<Object> obj = value.As<Object>();
			bool present = false;
			creds.access_key_id = string_property(obj, "accessKeyId", &present);
			creds.secret_access_key = string_property(obj, "secretAccessKey", &present);
			creds.session_token = string_property(obj, "sessionToken", &creds.has_session_token);
			Local<Value> expiration_value;
			double expiration = Nan::Get(obj, Nan::New("expiration").ToLocalChecked()).ToLocal(&expiration_value)
				? Nan::To<double>(expiration_value).FromMaybe(0) : 0;
			creds.expiration_ms = expiration > 0 && expiration <= 9007199254740991.0 ? (uint64_t)expiration : 0;
		}
		else {
			ok = false;
			message = "JavaScript credentials hook returned no credentials";
		}
	}

	{
		std::unique_lock<std::mutex> lock(mutex);
		running--;
		if (has_request && request_id == id && dispatched && !aborted && !has_result) {
			result_ok = ok;
			result_error = message;
			result_hosts.swap(hosts);
			result_credentials = creds;
			has_result = true;
			cond.notify_all();
		}
		refs--;
	}
	clear_string(creds.secret_access_key);
	clear_string(creds.session_token);

	// Close the provider or free the bridge, if this was the last call.
	RunOnLoop();
}
