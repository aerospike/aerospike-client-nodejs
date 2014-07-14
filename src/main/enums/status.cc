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

#define set(__obj, __name, __value) __obj->Set(String::NewSymbol(__name), Integer::New(__value), ReadOnly)

Handle<Object> status() 
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();
    set(obj, "AEROSPIKE_OK",                        0);
    set(obj, "AEROSPIKE_ERR",                       100);
    set(obj, "AEROSPIKE_ERR_CLIENT",                200);
    set(obj, "AEROSPIKE_ERR_PARAM",                 201);
    set(obj, "AEROSPIKE_ERR_CLUSTER",               300);
    set(obj, "AEROSPIKE_ERR_TIMEOUT",               400);
    set(obj, "AEROSPIKE_ERR_THROTTLED",             401);
    set(obj, "AEROSPIKE_ERR_SERVER",                500);
    set(obj, "AEROSPIKE_ERR_REQUEST_INVALID",       501);
    set(obj, "AEROSPIKE_ERR_NAMESPACE_NOT_FOUND",   502);
    set(obj, "AEROSPIKE_ERR_SERVER_FULL",           503);
    set(obj, "AEROSPIKE_ERR_CLUSTER_CHANGE",        504);
    set(obj, "AEROSPIKE_ERR_RECORD",                600);
    set(obj, "AEROSPIKE_ERR_RECORD_BUSY",           601);
    set(obj, "AEROSPIKE_ERR_RECORD_NOT_FOUND",      602);
    set(obj, "AEROSPIKE_ERR_RECORD_EXISTS",         603);
    set(obj, "AEROSPIKE_ERR_RECORD_GENERATION",     604);
    set(obj, "AEROSPIKE_ERR_RECORD_TOO_BIG",        605);
    set(obj, "AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE", 606);
    return scope.Close(obj);
}
