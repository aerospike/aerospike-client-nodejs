/*******************************************************************************
 * Copyright 2013-2019 Aerospike, Inc.
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

#include <nan.h>
#include <node.h>

extern "C" {
#include <aerospike/as_policy.h>
}

using namespace v8;

#define set(__obj, __name, __value) Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> key_policy_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "DIGEST",  AS_POLICY_KEY_DIGEST);
	set(obj, "SEND",    AS_POLICY_KEY_SEND);
	return scope.Escape(obj);
}

Local<Object> retry_policy_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "NONE",    AS_POLICY_RETRY_NONE);
	set(obj, "ONCE",    AS_POLICY_RETRY_ONCE);
	return scope.Escape(obj);
}

Local<Object> generation_policy_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "IGNORE",  AS_POLICY_GEN_IGNORE);
	set(obj, "EQ",      AS_POLICY_GEN_EQ);
	set(obj, "GT",      AS_POLICY_GEN_GT);
	return scope.Escape(obj);
}

Local<Object> exists_policy_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "IGNORE",  AS_POLICY_EXISTS_IGNORE);
	set(obj, "CREATE",  AS_POLICY_EXISTS_CREATE);
	set(obj, "UPDATE",  AS_POLICY_EXISTS_UPDATE);
	set(obj, "REPLACE", AS_POLICY_EXISTS_REPLACE);
	set(obj, "CREATE_OR_REPLACE", AS_POLICY_EXISTS_CREATE_OR_REPLACE);
	return scope.Escape(obj);
}

Local<Object> replica_policy_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "MASTER", AS_POLICY_REPLICA_MASTER);
	set(obj, "ANY", AS_POLICY_REPLICA_ANY);
	set(obj, "SEQUENCE", AS_POLICY_REPLICA_SEQUENCE);
	set(obj, "PREFER_RACK", AS_POLICY_REPLICA_PREFER_RACK);
	return scope.Escape(obj);
}

Local<Object> read_mode_ap_policy_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "ONE", AS_POLICY_READ_MODE_AP_ONE);
	set(obj, "ALL", AS_POLICY_READ_MODE_AP_ALL);
	return scope.Escape(obj);
}

Local<Object> read_mode_sc_policy_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "SESSION", AS_POLICY_READ_MODE_SC_SESSION);
	set(obj, "LINEARIZE", AS_POLICY_READ_MODE_SC_LINEARIZE);
	set(obj, "ALLOW_REPLICA", AS_POLICY_READ_MODE_SC_ALLOW_REPLICA);
	set(obj, "ALLOW_UNAVAILABLE", AS_POLICY_READ_MODE_SC_ALLOW_UNAVAILABLE);
	return scope.Escape(obj);
}

Local<Object> commit_level_policy_values()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "ALL", AS_POLICY_COMMIT_LEVEL_ALL);
	set(obj, "MASTER", AS_POLICY_COMMIT_LEVEL_MASTER);
	return scope.Escape(obj);
}

Local<Object> policy()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();

	Nan::Set(obj, Nan::New("key").ToLocalChecked(), key_policy_values());
	Nan::Set(obj, Nan::New("retry").ToLocalChecked(), retry_policy_values());
	Nan::Set(obj, Nan::New("gen").ToLocalChecked(), generation_policy_values());
	Nan::Set(obj, Nan::New("exists").ToLocalChecked(), exists_policy_values());
	Nan::Set(obj, Nan::New("replica").ToLocalChecked(), replica_policy_values());
	Nan::Set(obj, Nan::New("readModeAP").ToLocalChecked(), read_mode_ap_policy_values());
	Nan::Set(obj, Nan::New("readModeSC").ToLocalChecked(), read_mode_sc_policy_values());
	Nan::Set(obj, Nan::New("commitLevel").ToLocalChecked(), commit_level_policy_values());

	return scope.Escape(obj);
}
