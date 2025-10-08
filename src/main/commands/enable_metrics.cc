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

#include "async.h"
#include "client.h"
#include "metrics.h"
#include "command.h"
#include "async.h"
#include "conversions.h"
#include "policy.h"
#include "log.h"

#include <node.h>
#include <nan.h>
#include <uv.h>


extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/as_config.h>
#include <aerospike/as_status.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
}

using namespace v8;

static void *prepare(const Nan::FunctionCallbackInfo<Value> &info)
{
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());
	MetricsCommand *cmd =
		new MetricsCommand(client, info[5].As<Function>());
	// LogInfo *log = client->log;

	if (info[0]->IsObject()) {
		cmd->policy = (as_metrics_policy *)cf_malloc(sizeof(as_metrics_policy));
		if (metricspolicy_from_jsobject(cmd->policy, info[0].As<Object>(), &(cmd->report_dir), cmd->enable_callback, cmd->snapshot_callback, cmd->node_close_callback, cmd->disable_callback, false, cmd->log) !=
			AS_NODE_PARAM_OK) {
			return CmdSetError(cmd, AEROSPIKE_ERR_PARAM,
							   "Metrics policy parameter invalid");
		}
		cmd->policy->metrics_listeners.udata = cmd;
	}
	else{
		cmd->client->as->config.policies.metrics.metrics_listeners.udata = cmd;
	}
	return cmd;
}

static void execute(uv_work_t *req)
{

	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);
	LogInfo *log = cmd->log;


	if (!cmd->CanExecute()) {
		return;
	}

	as_v8_debug(log, "Executing MetricsCommand command, enabling Metrics");
	aerospike_enable_metrics(cmd->as, &cmd->err, cmd->policy);
}

static void respond(uv_work_t *req, int status)
{
	Nan::HandleScope scope;

	MetricsCommand *cmd = reinterpret_cast<MetricsCommand *>(req->data);
	LogInfo *log = cmd->log;

	if (cmd->err.code == AEROSPIKE_METRICS_CONFLICT) {
		as_v8_warn(log, cmd->err.message);
		as_error_reset(&cmd->err);
	}

	Local<Value> argv[] = {Nan::Null(), Nan::Null()};

	if (!(cmd->IsError())){
		cmd->Callback(2, argv);
	}
	else {
		cmd->ErrorCallback();
	}
	delete req;
}


NAN_METHOD(AerospikeClient::EnableMetrics)
{
	TYPE_CHECK_OPT(info[0], IsObject, "policy must be an object");
	TYPE_CHECK_OPT(info[1], IsFunction, "enableListener must be a function");
	TYPE_CHECK_OPT(info[2], IsFunction, "snapshotListener must be a function");
	TYPE_CHECK_OPT(info[3], IsFunction, "nodeCloseListener must be a function");
	TYPE_CHECK_OPT(info[4], IsFunction, "disableListener must be a function");
	TYPE_CHECK_OPT(info[5], IsFunction, "Callback must be a function");

	async_invoke(info, prepare, execute, respond);
}



