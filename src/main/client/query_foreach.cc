/*******************************************************************************
 * Copyright 2013-2016 Aerospike, Inc.
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

extern "C" {
	#include <aerospike/aerospike.h>
	#include <aerospike/aerospike_key.h>
	#include <aerospike/aerospike_query.h>
	#include <aerospike/as_config.h>
	#include <aerospike/as_key.h>
	#include <aerospike/as_record.h>
	#include <aerospike/as_record_iterator.h>
	#include <citrusleaf/cf_queue.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>
#include <time.h>
#include <sys/time.h>

#include "query.h"
#include "client.h"
#include "async.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

#define QUEUE_SZ 100000

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

typedef struct AsyncData {
	bool param_err;
	aerospike* as;
	as_error err;
	as_policy_query policy;
	as_policy_query* p_policy;
	as_query query;
	uint64_t query_id;

	cf_queue* result_q;
	int max_q_size;
	int signal_interval;
	uv_async_t async_handle;

	LogInfo* log;
	Nan::Persistent<Function> callback;
} AsyncData;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

// Clone the as_val into a new val. And push the cloned value
// into the queue. When the queue size reaches 1/20th of total queue size
// send an async signal to v8 thread to process the records in the queue.


// This is common function used by both scan and query.
// scan populates only as_val of type record.
// In case of query it can be record - in case of query without aggregation
// In query aggregation, the value can be any as_val.

bool async_queue_populate(const as_val* val, AsyncData* data)
{
	if (data->result_q == NULL) {
		// in case result_q is not initialized, return from the callback.
		// But this should never happen.
		as_v8_error(data->log,"Internal Error: Queue not initialized");
		return false;
	}

	// if the record queue is full sleep for n microseconds.
	if (cf_queue_sz(data->result_q) > data->max_q_size) {
		usleep(20); // why 20?
	}

	as_val_t type = as_val_type(val);
	switch (type) {
		case AS_REC: {
			as_record* p_rec = as_record_fromval(val);
			as_record* rec = NULL;
			if (!p_rec) {
				as_v8_error(data->log, "record returned in the callback is NULL");
				return false;
			}
			uint16_t numbins = as_record_numbins(p_rec);
			rec = as_record_new(numbins);
			// clone the record into Asyncdata structure here.
			// as_val is freed up after the callback. We need to retain a copy of this
			// as_val until we pass this structure to nodejs
			record_clone(p_rec, &rec, data->log);

			as_val* clone_rec = as_record_toval(rec);
			if (cf_queue_sz(data->result_q) >= data->max_q_size) {
				sleep(1);
			}
			cf_queue_push(data->result_q, &clone_rec);
			data->signal_interval++;
			break;
		}
		case AS_NIL:
		case AS_BOOLEAN:
		case AS_INTEGER:
		case AS_STRING:
		case AS_BYTES:
		case AS_LIST:
		case AS_MAP: {
			as_val* clone = asval_clone((as_val*) val, data->log);
			if (cf_queue_sz(data->result_q) >= data->max_q_size) {
				sleep(1);
			}
			cf_queue_push(data->result_q, &clone);
			data->signal_interval++;
			break;
		 }
		default:
			as_v8_debug(data->log, "Query returned - unrecognizable type");
			break;
	}

	int async_signal_sz = (data->max_q_size) / 20;
	if (data->signal_interval % async_signal_sz == 0) {
		data->signal_interval = 0;
		uv_async_send(&data->async_handle);
	}
	return true;
}

void async_queue_process(AsyncData* data)
{
	as_val* val = NULL;

	// Pop each record from the queue and invoke the node callback with this record.
	while (data->result_q && cf_queue_sz(data->result_q) > 0) {
		int rv = cf_queue_pop(data->result_q, &val, CF_QUEUE_FOREVER);
		if (rv == CF_QUEUE_OK) {
			Nan::HandleScope scope;
			Local<Function> cb = Nan::New<Function>(data->callback);
			if (as_val_type(val) == AS_REC) {
				as_record* record = as_record_fromval(val);
				const int argc = 4;
				Local<Value> argv[argc];
				argv[0] = err_ok();
				argv[1] = recordbins_to_jsobject(record, data->log);
				argv[2] = recordmeta_to_jsobject(record, data->log);
				argv[3] = key_to_jsobject(&record->key, data->log);
				as_record_destroy(record);
				Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
			} else {
				const int argc = 2;
				Local<Value> argv[argc];
				argv[0] = err_ok();
				argv[1] = val_to_jsvalue(val, data->log);
				as_val_destroy(val);
				Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
			}
		}
	}
}


void async_callback(ResolveAsyncCallbackArgs)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(handle->data);
	if (data->result_q == NULL) {
		as_v8_error(data->log, "Internal error: data or result q is not initialized");
		return;
	}
	async_queue_process(data);
}

// callback for query here.
// Queue the record into a common queue and generate an event
// when the queue size reaches 1/20th of the total size of the queue.

bool aerospike_query_callback(const as_val* val, void* udata)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(udata);

	if (val == NULL) {
		as_v8_debug(data->log, "value returned by query callback is NULL");
		return false;
	}

	// push the record from the server to a queue.
	// Why? Here the record cannot be directly passed on from scan callback to v8 thread.
	// Because v8 objects can only be created inside a v8 context. This callback is in
	// C client thread, which is not aware of the v8 context.
	// So store this records in a temporary queue.
	// When a queue reaches a certain size, signal v8 thread to process this queue.
	bool res = async_queue_populate(val, data);
	return res;
}

void release_handle(uv_handle_t* async_handle)
{
    AsyncData* data = reinterpret_cast<AsyncData*>(async_handle->data);
    delete data;
}

/**
 *  prepare() — Function to prepare AsyncData, for use in `execute()` and `respond()`.
 *
 *  This should only keep references to V8 or V8 structures for use in
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(ResolveArgs(info))
{
	Nan::HandleScope scope;

	AerospikeClient* client = ObjectWrap::Unwrap<AerospikeClient>(info.This());
	LogInfo* log = client->log;

	AsyncData* data = new AsyncData();
	data->param_err = false;
	data->as = client->as;
	data->log = client->log;
	data->callback.Reset(info[4].As<Function>());

	setup_query(&data->query, info[0], info[1], info[2], log);

	if (info[3]->IsObject()) {
		if (querypolicy_from_jsobject(&data->policy, info[3]->ToObject(), log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing of query policy from object failed");
			COPY_ERR_MESSAGE(data->err, AEROSPIKE_ERR_PARAM);
			data->param_err = true;
			goto Return;
		}
		data->p_policy = &data->policy;
	}

	data->signal_interval   = 0;
	data->result_q          = cf_queue_create(sizeof(as_val*), true);
	data->max_q_size        = QUEUE_SZ; // TODO: make this configurable

	uv_async_init(uv_default_loop(), &data->async_handle, async_callback);
	data->async_handle.data = data;

Return:
	return data;
}

/**
 *  execute() — Function to execute inside the worker-thread.
 *
 *  It is not safe to access V8 or V8 data structures here, so everything
 *  we need for input and output should be in the AsyncData structure.
 */
static void execute(uv_work_t* req)
{
	AsyncData* data = reinterpret_cast<AsyncData*>(req->data);
	LogInfo* log = data->log;

	if (data->param_err) {
		as_v8_debug(log, "Parameter error in the query options");
	} else {
		as_v8_debug(log, "Sending query command with UDF aggregation");
		aerospike_query_foreach(data->as, &data->err, data->p_policy, &data->query, aerospike_query_callback, data);

		// send an async signal here. If at all there's any residual records left in the result_q,
		// this signal's callback will send it to node layer.
		uv_async_send(&data->async_handle);
	}

	as_query_destroy(&data->query);
}

/**
 *  respond() — Function to be called after `execute()`. Used to send response
 *  to the callback.
 *
 *  This function will be run inside the main event loop so it is safe to use
 *  V8 again. This is where you will convert the results into V8 types, and
 *  call the callback function with those results.
 */
static void respond(uv_work_t* req, int status)
{
	Nan::HandleScope scope;
	AsyncData* data = reinterpret_cast<AsyncData*>(req->data);
	LogInfo* log = data->log;

	const int argc = 2;
	Local<Value> argv[argc];
	if (data->err.code != AEROSPIKE_OK) {
		as_v8_info(log, "Command failed: %d %s\n", data->err.code, data->err.message);
		argv[0] = error_to_jsobject(&data->err, log);
	} else {
		argv[0] = err_ok();
		if (data->result_q && !CF_Q_EMPTY(data->result_q)) {
			async_queue_process(data);
		}
	}
	argv[1] = Nan::Null();

	as_v8_detail(log, "Invoking JS callback for query_apply");
	Nan::TryCatch try_catch;
	Local<Function> cb = Nan::New<Function>(data->callback);
	Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, argc, argv);
	if (try_catch.HasCaught()) {
		Nan::FatalException(try_catch);
	}

	data->callback.Reset();
	if (data->result_q != NULL) {
		cf_queue_destroy(data->result_q);
		data->result_q = NULL;
	}
	uv_close((uv_handle_t*) &data->async_handle, release_handle);

	as_query_destroy(&data->query);

	delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'query.foreach()' Operation
 */
NAN_METHOD(AerospikeClient::QueryForeach)
{
	TYPE_CHECK_REQ(info[0], IsString, "namespace must be a string");
	TYPE_CHECK_OPT(info[1], IsString, "set must be a string");
	TYPE_CHECK_OPT(info[2], IsObject, "options must be an object");
	TYPE_CHECK_OPT(info[3], IsObject, "policy must be an object");
	TYPE_CHECK_REQ(info[4], IsFunction, "callback must be a function");

	async_invoke(info, prepare, execute, respond);
}
