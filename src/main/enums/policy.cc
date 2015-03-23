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

#include <node.h>
#include "enums.h"

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(NanNew(__name), NanNew(__value))

Handle<Object> key_policy_values()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "DIGEST",  0);
    set(obj, "SEND",    1);
    return NanEscapeScope(obj);
}

Handle<Object> retry_policy_values()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "NONE",    0);
    set(obj, "ONCE",    1);
    return NanEscapeScope(obj);
}

Handle<Object> generation_policy_values()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "IGNORE",  0);
    set(obj, "EQ",      1);
    set(obj, "GT",      2);
    set(obj, "DUP",     3);
    return NanEscapeScope(obj);
}

Handle<Object> exists_policy_values()
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "IGNORE",  0);
    set(obj, "CREATE",  1);
    set(obj, "UPDATE",  2);
	set(obj, "REPLACE", 3);
	set(obj, "CREATE_OR_REPLACE", 4);
    return NanEscapeScope(obj);
}

Handle<Object> replica_policy_values()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set(obj, "MASTER", 0); // read only from partition master replica node
	set(obj, "ANY", 1);    // read from an unspecified replica node
	return NanEscapeScope(obj);
}

Handle<Object> consistency_level_policy_values()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set(obj, "ONE", 0); // Involve a single replica in the operation.
	set(obj, "ALL", 1); // Involve all replicas in the operation
	return NanEscapeScope(obj);
}

Handle<Object> commit_level_policy_values()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set(obj, "ALL", 0); // Return succcess only after successfully committing all replicas
	set(obj, "MASTER", 1); // Return succcess after successfully committing the master replica
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
