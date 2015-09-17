/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
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

#include <aerospike/as_policy.h>
#include <node.h>
#include "enums.h"

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Handle<Object> key_policy_values()
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj = Nan::New<Object>();
    set(obj, "DIGEST",  AS_POLICY_KEY_DIGEST);
    set(obj, "SEND",    AS_POLICY_KEY_SEND);
    return scope.Escape(obj);
}

Handle<Object> retry_policy_values()
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj = Nan::New<Object>();
    set(obj, "NONE",    AS_POLICY_RETRY_NONE);
    set(obj, "ONCE",    AS_POLICY_RETRY_ONCE);
    return scope.Escape(obj);
}

Handle<Object> generation_policy_values()
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj = Nan::New<Object>();
    set(obj, "IGNORE",  AS_POLICY_GEN_IGNORE);
    set(obj, "EQ",      AS_POLICY_GEN_EQ);
    set(obj, "GT",      AS_POLICY_GEN_GT);
    return scope.Escape(obj);
}

Handle<Object> exists_policy_values()
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

Handle<Object> replica_policy_values()
{
    Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "MASTER", AS_POLICY_REPLICA_MASTER); // read only from partition master replica node
	set(obj, "ANY", AS_POLICY_REPLICA_ANY);    // read from an unspecified replica node
	return scope.Escape(obj);
}

Handle<Object> consistency_level_policy_values()
{
    Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "ONE", AS_POLICY_CONSISTENCY_LEVEL_ONE); // Involve a single replica in the operation.
	set(obj, "ALL", AS_POLICY_CONSISTENCY_LEVEL_ALL); // Involve all replicas in the operation
	return scope.Escape(obj);
}

Handle<Object> commit_level_policy_values()
{
    Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "ALL", AS_POLICY_COMMIT_LEVEL_ALL); // Return succcess only after successfully committing all replicas
	set(obj, "MASTER", AS_POLICY_COMMIT_LEVEL_MASTER); // Return succcess after successfully committing the master replica
	return scope.Escape(obj);
}

Handle<Object> policy()
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj = Nan::New<Object>();
    
    obj->Set(Nan::New("key").ToLocalChecked(), key_policy_values());
    obj->Set(Nan::New("retry").ToLocalChecked(), retry_policy_values());
    obj->Set(Nan::New("gen").ToLocalChecked(), generation_policy_values());
    obj->Set(Nan::New("exists").ToLocalChecked(), exists_policy_values());
    obj->Set(Nan::New("replica").ToLocalChecked(), replica_policy_values());
    obj->Set(Nan::New("consistencyLevel").ToLocalChecked(), consistency_level_policy_values());
    obj->Set(Nan::New("commitLevel").ToLocalChecked(), commit_level_policy_values());

    return scope.Escape(obj);
}
