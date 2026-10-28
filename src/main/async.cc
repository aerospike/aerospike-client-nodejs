/*******************************************************************************
 * Copyright 2013-2026 Aerospike, Inc.
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
#include <uv.h>

#include "async.h"
#include "command.h"
#include "transaction.h"
#include "client.h"
#include "conversions.h"
#include "log.h"
#include "scan.h"
#include "query.h"
#include "metrics.h"

extern "C" {
#include <aerospike/as_error.h>
#include <aerospike/as_status.h>
#include <aerospike/as_txn.h>
}

using namespace v8;

/**
 *  Setup an asynchronous invocation of a function using uv worker threads.
 */
Local<Value>
async_invoke(const Nan::FunctionCallbackInfo<v8::Value> &args,
			 void *(*prepare)(const Nan::FunctionCallbackInfo<v8::Value> &args),
			 void (*execute)(uv_work_t *req),
			 void (*respond)(uv_work_t *req, int status))
{
	Nan::HandleScope scope;

	void *cmd = prepare(args);
	if (!cmd) {
		return Nan::Undefined();
	}

	// Create an async work request for the prepared command
	uv_work_t *req = new uv_work_t;
	req->data = cmd;

	// Pass the work request to libuv to be run when a
	// worker-thread is available to process it.
	uv_queue_work(uv_default_loop(), // event loop
				  req,				 // work token
				  execute,			 // execute work
				  respond			 // respond to callback
	);

	// Return value for the function. Because we are async, we will
	// return an `undefined`.
	return Nan::Undefined();
}


/**
 *  Setup an asynchronous invocation of a function using uv worker threads.
 * 
 *  Since the metrics operations will be firing in the background, queueing the work to run asynchronously is necessary to avoid segmentation faults.
 */
void
async_invoke_metrics(MetricsCommand *cmd, void (*execute)(uv_work_t *req), void (*respond)(uv_work_t *req, int status))
{

	// Create an async work request and prepare the command
	uv_work_t *req = new uv_work_t;
	req->data = cmd;

	// Pass the work request to libuv to be run when a
	// worker-thread is available to process it.
	uv_queue_work(uv_default_loop(), // event loop
				  req,				 // work token
				  execute,			 // execute work, nothing since no C Code must be executed
				  respond			 // respond to callback by running the appropriate metrics callback
	);

}

void async_record_listener(as_error *err, as_record *record, void *udata,
						   as_event_loop *event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand *cmd = reinterpret_cast<AsyncCommand *>(udata);

	if (err) {
		cmd->ErrorCallback(err);
	}
	else {
		Local<Value> argv[] = {Nan::Null(),
							   recordbins_to_jsobject(record, cmd->log),
							   recordmeta_to_jsobject(record, cmd->log)};
		cmd->Callback(3, argv);
	}

	delete cmd;
}

void async_write_listener(as_error *err, void *udata, as_event_loop *event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand *cmd = reinterpret_cast<AsyncCommand *>(udata);

	if (err) {
		cmd->ErrorCallback(err);
	}
	else {
		cmd->Callback(0, {});
	}

	delete cmd;
}

void async_value_listener(as_error *err, as_val *value, void *udata,
						  as_event_loop *event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand *cmd = reinterpret_cast<AsyncCommand *>(udata);

	if (err) {
		cmd->ErrorCallback(err);
	}
	else {
		Local<Value> argv[] = {Nan::Null(), val_to_jsvalue(value, cmd->log)};
		cmd->Callback(2, argv);
	}

	delete cmd;
}

void async_batch_listener(as_error *err, as_batch_read_records *records,
						  void *udata, as_event_loop *event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand *cmd = reinterpret_cast<AsyncCommand *>(udata);
	if (!err || (err->code == AEROSPIKE_BATCH_FAILED && records->list.size != 0)) {

		Local<Value> argv[]{Nan::Null(),
							batch_records_to_jsarray(records, cmd->log)};
		cmd->Callback(2, argv);
	}
	else {
		cmd->ErrorCallback(err);
	}

	batch_records_free(records, cmd->log);
	delete cmd;
}

bool async_scan_listener(as_error *err, as_record *record, void *udata,
						 as_event_loop *event_loop)
{
	Nan::HandleScope scope;
	AsyncCommand *cmd = reinterpret_cast<AsyncCommand *>(udata);
	const LogInfo *log = cmd->log;

	// The C client never invokes the listener again after an error, after the
	// final NULL record, or after the listener returns false.
	if (err) {
		cmd->ErrorCallback(err);
		delete cmd;
		return false;
	}
	if (!record) {
		cmd->Callback(0, {});
		delete cmd;
		return false;
	}

	Local<Value> argv[] = {Nan::Null(),
						   recordbins_to_jsobject(record, log),
						   recordmeta_to_jsobject(record, log),
						   key_to_jsobject(&record->key, log)};
	Local<Value> result = cmd->Callback(4, argv);

	bool continue_scan = true;
	if (result->IsBoolean()) {
		continue_scan = Nan::To<bool>(result).FromJust();
		as_v8_debug(log, "Async scan callback returned: %s",
					continue_scan ? "true" : "false");
	}
	if (!continue_scan) {
		delete cmd;
	}
	return continue_scan;
}

static void free_scan_udata(struct scan_udata *su)
{
	as_scan_destroy(su->scan);
	delete su->cmd;
	free(su);
}

static void free_query_udata(struct query_udata *qu)
{
	free_query(qu->query, NULL, qu->exp);
	delete qu->cmd;
	free(qu);
}

// See async_scan_listener() for when the C client stops invoking the listener.
bool async_scan_pages_listener(as_error *err, as_record *record, void *udata,
						 as_event_loop *event_loop)
{
	Nan::HandleScope scope;
	struct scan_udata* su = (scan_udata*) udata;
	AsyncCommand *cmd = su->cmd;
	const LogInfo *log = cmd->log;

	if (err) {
		cmd->ErrorCallback(err);
		free_scan_udata(su);
		return false;
	}
	if (su->count >= su->max_records) {
		uint32_t bytes_size;
		uint8_t* bytes = NULL;
		as_scan_to_bytes(su->scan, &bytes, &bytes_size);
		Local<Value> argv[] = {Nan::Null(),
							   Nan::Null(),
							   query_bytes_to_jsobject(bytes, bytes_size, log),
							   Nan::Null()};

		cmd->Callback(4, argv);
		free(bytes);
		free_scan_udata(su);
		return false;
	}
	if (!record) {
		cmd->Callback(0, {});
		free_scan_udata(su);
		return false;
	}

	Local<Value> argv[] = {Nan::Null(),
						   recordbins_to_jsobject(record, log),
						   recordmeta_to_jsobject(record, log),
						   key_to_jsobject(&record->key, log)};
	Local<Value> result = cmd->Callback(4, argv);

	su->count += 1;

	bool continue_scan = true;
	if (result->IsBoolean()) {
		continue_scan = Nan::To<bool>(result).FromJust();
		as_v8_debug(log, "Async scan callback returned: %s",
					continue_scan ? "true" : "false");
	}
	if (!continue_scan) {
		free_scan_udata(su);
	}
	return continue_scan;
}

// See async_scan_listener() for when the C client stops invoking the listener.
bool async_query_pages_listener(as_error *err, as_record *record, void *udata,
						 as_event_loop *event_loop)
{
	Nan::HandleScope scope;
	struct query_udata* qu = (query_udata*) udata;
	AsyncCommand *cmd = qu->cmd;
	const LogInfo *log = cmd->log;

	if (err) {
		cmd->ErrorCallback(err);
		free_query_udata(qu);
		return false;
	}
	if (qu->count >= qu->max_records) {
		uint32_t bytes_size;
		uint8_t* bytes = NULL;
		as_query_to_bytes(qu->query, &bytes, &bytes_size);
		Local<Value> argv[] = {Nan::Null(),
							   Nan::Null(),
							   query_bytes_to_jsobject(bytes, bytes_size, log),
							   Nan::Null()};

		cmd->Callback(4, argv);
		free(bytes);
		free_query_udata(qu);
		return false;
	}
	if (!record) {
		cmd->Callback(0, {});
		free_query_udata(qu);
		return false;
	}

	Local<Value> argv[] = {Nan::Null(),
						   recordbins_to_jsobject(record, log),
						   recordmeta_to_jsobject(record, log),
						   key_to_jsobject(&record->key, log)};
	Local<Value> result = cmd->Callback(4, argv);

	qu->count += 1;

	bool continue_scan = true;
	if (result->IsBoolean()) {
		continue_scan = Nan::To<bool>(result).FromJust();
		as_v8_debug(log, "Async scan callback returned: %s",
					continue_scan ? "true" : "false");
	}
	if (!continue_scan) {
		free_query_udata(qu);
	}
	return continue_scan;
}

void async_abort_listener(as_error* err, as_abort_status status, void* udata, struct as_event_loop* event_loop)
{
	async_mrt_listener(err, (uint32_t)status, udata);
}

void async_commit_listener(as_error* err, as_commit_status status, void* udata, struct as_event_loop* event_loop)
{
	async_mrt_listener(err, (uint32_t)status, udata);
}

void async_mrt_listener(as_error* err, uint32_t status, void* udata)
{
	Nan::HandleScope scope;
	AsyncCommand *cmd = reinterpret_cast<AsyncCommand *>(udata);

	if (err) {
		cmd->ErrorCallback(err);
	}
	else {
		Local<Value> argv[] = {Nan::Null(),
							   Nan::New((uint32_t)status)};
		cmd->Callback(2, argv);
	}

	delete cmd;
}