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

#define set(__obj, __name, __value) __obj->Set(NanNew(__name), NanNew(__value))

Handle<Object> key_policy_values()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "DIGEST",  AS_POLICY_KEY_DIGEST);
    set(obj, "SEND",    AS_POLICY_KEY_SEND);
    return NanEscapeScope(obj);
}

Handle<Object> retry_policy_values()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "NONE",    AS_POLICY_RETRY_NONE);
    set(obj, "ONCE",    AS_POLICY_RETRY_ONCE);
    return NanEscapeScope(obj);
}

Handle<Object> generation_policy_values()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "IGNORE",  AS_POLICY_GEN_IGNORE);
    set(obj, "EQ",      AS_POLICY_GEN_EQ);
    set(obj, "GT",      AS_POLICY_GEN_GT);
    return NanEscapeScope(obj);
}

Handle<Object> exists_policy_values()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "IGNORE",  AS_POLICY_EXISTS_IGNORE);
    set(obj, "CREATE",  AS_POLICY_EXISTS_CREATE);
    set(obj, "UPDATE",  AS_POLICY_EXISTS_UPDATE);
	set(obj, "REPLACE", AS_POLICY_EXISTS_REPLACE);
	set(obj, "CREATE_OR_REPLACE", AS_POLICY_EXISTS_CREATE_OR_REPLACE);
    return NanEscapeScope(obj);
}

Handle<Object> replica_policy_values()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set(obj, "MASTER", AS_POLICY_REPLICA_MASTER); // read only from partition master replica node
	set(obj, "ANY", AS_POLICY_REPLICA_ANY);    // read from an unspecified replica node
	return NanEscapeScope(obj);
}

Handle<Object> consistency_level_policy_values()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set(obj, "ONE", AS_POLICY_CONSISTENCY_LEVEL_ONE); // Involve a single replica in the operation.
	set(obj, "ALL", AS_POLICY_CONSISTENCY_LEVEL_ALL); // Involve all replicas in the operation
	return NanEscapeScope(obj);
}

Handle<Object> commit_level_policy_values()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set(obj, "ALL", AS_POLICY_COMMIT_LEVEL_ALL); // Return succcess only after successfully committing all replicas
	set(obj, "MASTER", AS_POLICY_COMMIT_LEVEL_MASTER); // Return succcess after successfully committing the master replica
	return NanEscapeScope(obj);
}

Handle<Object> policy()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    
    obj->Set(NanNew("key"), key_policy_values());
    obj->Set(NanNew("retry"), retry_policy_values());
    obj->Set(NanNew("gen"), generation_policy_values());
    obj->Set(NanNew("exists"), exists_policy_values());
	obj->Set(NanNew("replica"), replica_policy_values());
	obj->Set(NanNew("consistencyLevel"), consistency_level_policy_values());
	obj->Set(NanNew("commitLevel"), commit_level_policy_values());

    return NanEscapeScope(obj);
}
