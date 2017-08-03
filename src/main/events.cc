/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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
	#include <citrusleaf/cf_queue.h>
}

using namespace v8;

//==========================================================
// Typedefs & constants.
//

typedef struct EventQueue {
	public:
		explicit EventQueue(Local<Function> cb, LogInfo *p_log) {
			cf_queue_init(&events, sizeof(as_cluster_event), 4, true);
			callback.SetFunction(cb);
			log = p_log;
		}

		void push(as_cluster_event *event) {
			cf_queue_push(&events, event);
			as_v8_debug(log, "Cluster event %d triggered by node \"%s\" (%s)",
					event->type, event->node_name, event->node_address);
		}

		void process() {
			as_cluster_event event;
			while (cf_queue_pop(&events, &event, 0) != CF_QUEUE_EMPTY) {
				Nan::TryCatch try_catch;
				Local<Value> argv[] = { convert(&event) };
				callback.Call(1, argv);
				if (try_catch.HasCaught()) {
					Nan::FatalException(try_catch);
				}
			}
		}

	private:
		cf_queue events;
		Nan::Callback callback;
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
			jsEvent->Set(Nan::New("name").ToLocalChecked(),
					Nan::New(name).ToLocalChecked());
			jsEvent->Set(Nan::New("nodeName").ToLocalChecked(),
					Nan::New(event->node_name).ToLocalChecked());
			jsEvent->Set(Nan::New("nodeAddress").ToLocalChecked(),
					Nan::New(event->node_address).ToLocalChecked());
			return scope.Escape(jsEvent);
		}
} EventQueue;

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
	uv_handle_t *async = (uv_handle_t *)config->event_callback_udata;
	uv_close(async, events_async_close);
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
	uv_async_t *handle = (uv_async_t *) event->udata;
	EventQueue *queue = (EventQueue *) handle->data;
	queue->push(event);
	uv_async_send(handle);
}

static void
cluster_event_async(uv_async_t *handle)
{
	Nan::HandleScope scope;
	EventQueue *queue = (EventQueue *) handle->data;
	queue->process();
}
