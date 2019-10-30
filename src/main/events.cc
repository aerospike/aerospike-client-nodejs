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

//==========================================================
// Includes.
//

#include "events.h"

#include <node.h>
#include <nan.h>
#include <uv.h>

#include "log.h"

extern "C" {
	#include <aerospike/as_config.h>
	#include <aerospike/as_queue_mt.h>
}

using namespace v8;

//==========================================================
// Typedefs & constants.
//

class EventQueue : public Nan::AsyncResource {
	public:
		EventQueue(Local<Function> cb, LogInfo *p_log)
			: Nan::AsyncResource("aerospike:EventQueue") {
			as_queue_mt_init(&events, sizeof(as_cluster_event), 4);
			callback.Reset(cb);
			log = p_log;
		}

		~EventQueue() {
			as_queue_mt_destroy(&events);
			callback.Reset();
		}

		void push(as_cluster_event *event) {
			as_queue_mt_push(&events, event);
			as_v8_debug(log, "Cluster event %d triggered by node \"%s\" (%s)",
					event->type, event->node_name, event->node_address);
		}

		void process() {
			as_cluster_event event;
			while (as_queue_mt_pop(&events, &event, 0)) {
				Nan::TryCatch try_catch;
				Local<Value> argv[] = { convert(&event) };
				Local<Function> cb = Nan::New(callback);
				runInAsyncScope(Nan::GetCurrentContext()->Global(), cb, 1, argv);
				if (try_catch.HasCaught()) {
					Nan::FatalException(try_catch);
				}
			}
		}

	private:
		as_queue_mt events;
		Nan::Persistent<Function> callback;
		LogInfo *log;

		Local<Value> convert(as_cluster_event *event) {
			Nan::EscapableHandleScope scope;
			Local<Object> jsEvent = Nan::New<Object>();
			std::string name;
			switch (event->type) {
				case AS_CLUSTER_ADD_NODE:
					name = "nodeAdded";
					break;
				case AS_CLUSTER_REMOVE_NODE:
					name = "nodeRemoved";
					break;
				case AS_CLUSTER_DISCONNECTED:
					name = "disconnected";
					break;
			}
			Nan::Set(jsEvent, Nan::New("name").ToLocalChecked(),
					Nan::New(name).ToLocalChecked());
			Nan::Set(jsEvent, Nan::New("nodeName").ToLocalChecked(),
					Nan::New(event->node_name).ToLocalChecked());
			Nan::Set(jsEvent, Nan::New("nodeAddress").ToLocalChecked(),
					Nan::New(event->node_address).ToLocalChecked());
			return scope.Escape(jsEvent);
		}
};

//==========================================================
// Globals.
//

//==========================================================
// Forward Declarations.
//

static void cluster_event_callback(as_cluster_event *event);
static void cluster_event_async(uv_async_t *handle);
static void events_async_close(uv_handle_t *handle);

//==========================================================
// Inlines and Macros.
//

//==========================================================
// Public API.
//

void
events_callback_init(as_config *config, Local<Function> callback, LogInfo *log)
{
	Nan::HandleScope scope;
	uv_async_t *handle = (uv_async_t *) cf_malloc(sizeof(uv_async_t));
	uv_async_init(uv_default_loop(), handle, cluster_event_async);
	handle->data = new EventQueue(callback, log);
	config->event_callback_udata = (void *) handle;
	config->event_callback = cluster_event_callback;
}

void
events_callback_close(as_config *config)
{
	Nan::HandleScope scope;
	uv_handle_t* handle = (uv_handle_t *)config->event_callback_udata;
	// EventQueue* queue = reinterpret_cast<EventQueue*>(handle->data);
	// delete queue;
	config->event_callback_udata = NULL;
	handle->data = NULL;
	uv_close(handle, events_async_close);
}

//==========================================================
// Local helpers.
//

static void
events_async_close(uv_handle_t *handle)
{
	cf_free((uv_async_t *)handle);
}

static void
cluster_event_callback(as_cluster_event *event)
{
	uv_async_t* handle = (uv_async_t *) event->udata;
	if (handle->data) {
		EventQueue* queue = reinterpret_cast<EventQueue*>(handle->data);
		queue->push(event);
		uv_async_send(handle);
	}
}

static void
cluster_event_async(uv_async_t *handle)
{
	Nan::HandleScope scope;
	if (handle->data) {
		EventQueue* queue = reinterpret_cast<EventQueue*>(handle->data);
		queue->process();
	}
}
