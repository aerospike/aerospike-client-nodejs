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

	// LDT errors.
	set(obj, "AEROSPIKE_ERR_LDT_INTERNAL",          1400);	
	set(obj, "AEROSPIKE_ERR_LDT_NOT_FOUND",         1401);	
	set(obj, "AEROSPIKE_ERR_LDT_UNIQUE_KEY",        1402);	
	set(obj, "AEROSPIKE_ERR_LDT_INSERT",            1403);	
	set(obj, "AEROSPIKE_ERR_LDT_SEARCH",            1404);	
	set(obj, "AEROSPIKE_ERR_LDT_DELETE",            1405);	
	set(obj, "AEROSPIKE_ERR_LDT_INPUT_PARAM",       1409);	
	set(obj, "AEROSPIKE_ERR_LDT_TYPE_MISMATCH",     1410);	
	set(obj, "AEROSPIKE_ERR_LDT_NULL_BIN_NAME",     1411);	
	set(obj, "AEROSPIKE_ERR_LDT_BIN_NAME_NOT_STRING",1412);	
	set(obj, "AEROSPIKE_ERR_LDT_BIN_NAME_TOO_LONG", 1413);	
	set(obj, "AEROSPIKE_ERR_LDT_TOO_MANY_OPEN_SUBRECS",1414);	
	set(obj, "AEROSPIKE_ERR_LDT_TOP_REC_NOT_FOUND",  1415);	
	set(obj, "AEROSPIKE_ERR_LDT_SUB_REC_NOT_FOUND",  1416);	
	set(obj, "AEROSPIKE_ERR_LDT_BIN_DOES_NOT_EXIST", 1417);
	set(obj, "AEROSPIKE_ERR_LDT_BIN_ALREADY_EXISTS", 1418);
	set(obj, "AEROSPIKE_ERR_LDT_BIN_DAMAGED",        1419);
	set(obj, "AEROSPIKE_ERR_LDT_SUBREC_POOL_DAMAGED",1420);
	set(obj, "AEROSPIKE_ERR_LDT_SUBREC_DAMAGED",     1421);
	set(obj, "AEROSPIKE_ERR_LDT_SUBREC_OPEN",        1422);
	set(obj, "AEROSPIKE_ERR_LDT_SUBREC_UPDATE",      1423);
	set(obj, "AEROSPIKE_ERR_LDT_SUBREC_CREATE",      1424);
	set(obj, "AEROSPIKE_ERR_LDT_SUBREC_DELETE",      1425);
	set(obj, "AEROSPIKE_ERR_LDT_SUBREC_CLOSE",       1426);
	set(obj, "AEROSPIKE_ERR_LDT_TOPREC_UPDATE",      1427);
	set(obj, "AEROSPIKE_ERR_LDT_TOPREC_CREATE",      1428);
	set(obj, "AEROSPIKE_ERR_LDT_FILTER_FUNCTION_BAD",1430);
	set(obj, "AEROSPIKE_ERR_LDT_FILTER_FUNCTION_NOT_FOUND",1431);
	set(obj, "AEROSPIKE_ERR_LDT_KEY_FUNCTION_BAD",   1432);
	set(obj, "AEROSPIKE_ERR_LDT_KEY_FUNCTION_NOT_FOUND",1433);
	set(obj, "AEROSPIKE_ERR_LDT_TRANS_FUNCTION_BAD",   1434);
	set(obj, "AEROSPIKE_ERR_LDT_TRANS_FUNCTION_NOT_FOUND",1435);
	set(obj, "AEROSPIKE_ERR_LDT_UNTRANS_FUNCTION_BAD",1436);
	set(obj, "AEROSPIKE_ERR_LDT_UNTRANS_FUNCTION_NOT_FOUND",1437);
	set(obj, "AEROSPIKE_ERR_LDT_USER_MODULE_BAD",    1438);
	set(obj, "AEROSPIKE_ERR_LDT_USER_MODULE_NOT_FOUND",1439);

    return scope.Close(obj);
}
