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

extern "C" {
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
 * References: one for the C client (released by Destroy(), which may run on
 * any thread and after the client closed), one for the client (released when
 * it closes or is collected), and one per JavaScript call still running. The
 * provider's close() runs once on the JavaScript thread after the C client
 * released it and the last call settled; the bridge is freed on the
 * JavaScript thread when the last reference goes.
 */
class JsBridge {
  public:
	enum Kind { PROVIDER, CREDENTIALS_HOOK };

	// JavaScript thread. spec is the object built by lib/discovery_bridge.js.
	static JsBridge *Create(Kind kind, v8::Local<v8::Object> spec);

	// JavaScript thread: a later or waiting call fails at once.
	void MarkClosing();
	// JavaScript thread, after a failed connect: wakes the waiting call, whose
	// answer is then dropped. Later calls work, so connect can be retried.
	void AbortPending();
	// JavaScript thread: the client's reference.
	void ReleaseClient();
	// JavaScript thread, when registering with the C client failed: the C
	// client never took its reference.
	void ReleaseOwner();

	// C client callbacks.
	static as_status Refresh(as_error *err, const as_seed_candidate_context *context,
							 as_seed_candidates *candidates, void *udata);
	static as_status GetCredentials(as_error *err, uint32_t timeout_ms,
									as_aws_credentials *credentials, void *udata);
	static void Destroy(void *udata);

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

	struct DoneData {
		JsBridge *bridge;
		uint64_t id;
	};

	explicit JsBridge(Kind kind);
	~JsBridge();

	uint64_t Begin(std::unique_lock<std::mutex> &lock);
	void Release(std::unique_lock<std::mutex> &lock);
	void RunOnLoop();
	void Dispatch(uint64_t id);
	void Finish(uint64_t id, const char *error, v8::Local<v8::Value> value);

	static void AsyncCallback(uv_async_t *handle);
	static void CloseCallback(uv_handle_t *handle);
	static NAN_METHOD(Done);
	static void Cleanup(void *arg);

	Kind kind;
	Nan::Persistent<v8::Object> spec;
	uv_async_t *async;

	std::mutex mutex;
	std::condition_variable cond;

	int refs = 2;
	int running = 0;
	bool loop_alive = true;
	bool closing = false;
	bool released = false;
	bool close_called = false;
	bool freeing = false;

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
