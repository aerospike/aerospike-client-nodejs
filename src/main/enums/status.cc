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
    set(obj, "AEROSPIKE_ERR",                       -1);
    set(obj, "AEROSPIKE_ERR_CLIENT",                -1);
    set(obj, "AEROSPIKE_ERR_PARAM",                 -2);
    set(obj, "AEROSPIKE_ERR_SERVER",                1);
    set(obj, "AEROSPIKE_ERR_RECORD_NOT_FOUND",      2);
    set(obj, "AEROSPIKE_ERR_RECORD_GENERATION",     3);
    set(obj, "AEROSPIKE_ERR_REQUEST_INVALID",       4);
    set(obj, "AEROSPIKE_ERR_RECORD_EXISTS",         5);
	set(obj, "AEROSPIKE_ERR_BIN_EXISTS",			6);
    set(obj, "AEROSPIKE_ERR_CLUSTER_CHANGE",        7);
    set(obj, "AEROSPIKE_ERR_SERVER_FULL",           8);
    set(obj, "AEROSPIKE_ERR_TIMEOUT",               9);
    set(obj, "AEROSPIKE_ERR_NO_XDR",                10);
    set(obj, "AEROSPIKE_ERR_CLUSTER",               11);
    set(obj, "AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE", 12);
    set(obj, "AEROSPIKE_ERR_RECORD_TOO_BIG",        13);
    set(obj, "AEROSPIKE_ERR_RECORD_BUSY",           14);
    set(obj, "AEROSPIKE_ERR_SCAN_ABORTED",          15);
    set(obj, "AEROSPIKE_ERR_UNSUPPORTED_FEATURE",   16);
    set(obj, "AEROSPIKE_ERR_BIN_NOT_FOUND",			17);
    set(obj, "AEROSPIKE_ERR_DEVICE_OVERLOAD",		18);
    set(obj, "AEROSPIKE_ERR_RECORD_KEY_MISMATCH",	19);
    set(obj, "AEROSPIKE_ERR_NAMESPACE_NOT_FOUND",   20);
    set(obj, "AEROSPIKE_ERR_BIN_NAME",				21);
	set(obj, "AEROSPIKE_ERR_UDF",					100);
	set(obj, "AEROSPIKE_ERR_UDF_NOT_FOUND",			1301);
	set(obj, "AEROSPIKE_ERR_LUA_FILE_NOT_FOUND",	1302);
    return scope.Close(obj);
}
