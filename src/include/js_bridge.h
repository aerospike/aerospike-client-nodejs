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

#pragma once

#include <node.h>
#include <nan.h>
#include <uv.h>

#include <condition_variable>
#include <mutex>
#include <string>
#include <vector>

#include "log.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/as_config.h>
#include <aerospike/as_discovery.h>
}

/**
 * Hands calls from the C client's discovery thread to a JavaScript function on
 * the JavaScript thread, and the answer back: one bridge per JavaScript seed
 * provider or AWS credentials hook of a client.
 *
 * The C client calls Refresh() or GetCredentials() on its discovery thread.
 * The call is queued with uv_async_send() (the handle is unref'd, so it never
 * keeps the process alive) and the thread waits. On the JavaScript thread the
 * spec from lib/discovery_bridge.js calls the user's function, waits for its
 * Promise, checks the result and calls done(), which wakes the waiting thread.
 *
 * Refresh() has no timeout of its own: the C client bounds the first refresh
 * with refresh_timeout_ms and publishes late results. GetCredentials() waits at
 * most the timeout_ms the C client passes, the time left of the refresh.
 *
 * References: one per C client reference (its registration and the provider
 * instance its factory built, released by DestroyRegistration() and Destroy(),
 * which may run on any thread and after the client closed), one for the client
 * (released when it closes or is collected), and one per JavaScript call still
 * running. The provider's close() runs once on the JavaScript thread after the
 * C client released every reference and the last call settled; the bridge is
 * freed on the JavaScript thread when the last reference goes.
 */
class JsBridge {
  public:
	enum Kind { PROVIDER, CREDENTIALS_HOOK };

	// JavaScript thread. spec is the object built by lib/discovery_bridge.js.
	static JsBridge *Create(Kind kind, v8::Local<v8::Object> spec);

	// JavaScript thread: a later or waiting call fails at once. For a
	// provider, also keeps the event loop alive until its close() has run, so
	// a script that ends right after client.close() still closes it.
	void MarkClosing();
	// JavaScript thread, after a failed connect: wakes the waiting call, whose
	// answer is then dropped. Connect can be retried; while that JavaScript
	// call hasn't settled, the provider isn't called again (calls never
	// overlap), so a retry meanwhile fails at once.
	void AbortPending();
	// JavaScript thread: the client's reference.
	void ReleaseClient();
	// JavaScript thread, when registering with the C client failed: the C
	// client never took its reference.
	void ReleaseOwner();

	// Stops every bridge at process exit: waiting calls return at once and no
	// call is queued any more. Runs from the 'exit' event of process.exit(),
	// before the worker threads are joined, and from the environment cleanup
	// hook of a normal shutdown.
	static void StopAll();

	// C client callbacks.
	static as_status Refresh(as_error *err, const as_seed_candidate_context *context,
							 as_seed_candidates *candidates, void *udata);
	static as_status GetCredentials(as_error *err, uint32_t timeout_ms,
									as_aws_credentials *credentials, void *udata);
	// The instance's destroy: no call comes from it any more.
	static void Destroy(void *udata);

	// The factory of a provider registered in code: the C client calls it once,
	// on the registering thread, and the instance it builds is this bridge
	// with one more C reference.
	static as_status Factory(as_error *err, const as_map *options, as_seed_provider *provider,
							 void *udata);
	// The registration's destroy, when the C client ends it.
	static void DestroyRegistration(void *udata);
	// Fills provider's function table with this bridge as the instance. With
	// new_reference the instance takes one more C reference; without, it takes
	// the C reference the bridge was created with.
	void FillProvider(as_seed_provider *provider, bool new_reference);

  private:
	struct Host {
		std::string addr;
		int port;
		bool has_tls_name;
		std::string tls_name;
	};

	struct Credentials {
		std::string access_key_id;
		std::string secret_access_key;
		bool has_session_token;
		std::string session_token;
		uint64_t expiration_ms;
	};

	// One call's done(): single use, freed when the function is collected.
	struct DoneData {
		JsBridge *bridge;
		uint64_t id;
		bool called;
		Nan::Persistent<v8::Function> function;
	};

	explicit JsBridge(Kind kind);
	static bool Periodic(void *udata);
	~JsBridge();

	uint64_t Begin(std::unique_lock<std::mutex> &lock);
	void Release(std::unique_lock<std::mutex> &lock);
	void RunOnLoop();
	void Dispatch(uint64_t id);
	void Finish(uint64_t id, const char *error, v8::Local<v8::Value> value);
	void CallLost(uint64_t id);

	static void AsyncCallback(uv_async_t *handle);
	static void CloseCallback(uv_handle_t *handle);
	static NAN_METHOD(Done);
	static NAN_METHOD(Warn);
	static void DoneCollected(const Nan::WeakCallbackInfo<DoneData> &info);
	void KeepAlive(bool keep);
	static void Cleanup(void *arg);

	Kind kind;
	Nan::Persistent<v8::Object> spec;
	// JavaScript calls run in it, as callbacks, so Node runs the microtasks
	// after each (Promise reactions) and async hooks see them.
	Nan::AsyncResource *resource = NULL;
	uv_async_t *async;

	std::mutex mutex;
	std::condition_variable cond;

	int refs = 2;
	// The C client's references, counted in refs too.
	int c_refs = 1;
	int running = 0;
	bool loop_alive = true;
	bool closing = false;
	bool released = false;
	bool close_called = false;
	bool freeing = false;
	// The handle is ref'd while a provider's close() is due (see MarkClosing).
	bool kept_alive = false;
	// How long Refresh() waits for one JavaScript call (0: no limit).
	uint32_t wait_limit_ms = 0;
	// A provider's name and whether it refreshes periodically; set once in
	// Create(), read by the C client from any thread.
	std::string name;
	bool periodic = true;

	// The one request: the C client never overlaps calls of one registration.
	uint64_t next_id = 0;
	uint64_t request_id = 0;
	bool has_request = false;
	bool dispatched = false;
	bool aborted = false;
	bool has_cluster_name = false;
	std::string cluster_name;
	std::vector<Host> seeds;
	uint64_t tend_iteration = 0;
	uint32_t timeout_ms = 0;

	// Its answer.
	bool has_result = false;
	bool result_ok = false;
	std::string result_error;
	std::vector<Host> result_hosts;
	Credentials result_credentials;
};

/**
 * A JavaScript seed provider factory registered by name with
 * Aerospike.registerSeedProvider(), offered to the C client with
 * as_config_register_binding_seed_provider(). When the config file selects
 * the name (static.client.discovery.provider), the C client calls Factory()
 * on the thread that loads the file: in Node.js the JavaScript thread, inside
 * aerospike_init() during new Client(). Factory() calls the JavaScript factory
 * with the file's options and wraps the provider it returns in a new bridge,
 * which then works as a provider set in code.
 *
 * The client owns this object and frees it on the JavaScript thread. The C
 * client gets no destroy for it, so the C client's close thread never touches
 * it.
 */
class JsNamedProvider {
  public:
	// JavaScript thread. build is the function lib/discovery_bridge.js made
	// for the name; bridges is the client's list, which takes each new bridge.
	JsNamedProvider(const std::string &name, v8::Local<v8::Function> build,
					std::vector<JsBridge *> *bridges, const LogInfo *log);
	~JsNamedProvider();

	static as_status Factory(as_error *err, const as_map *options, as_seed_provider *provider,
							 void *udata);

	std::string name;
	// The client's aerospike object, set before aerospike_init(): the factory
	// reads the timings the config file set.
	aerospike *as = NULL;

  private:
	Nan::Persistent<v8::Function> build;
	std::vector<JsBridge *> *bridges;
	const LogInfo *log;
	uv_thread_t thread;
};
