#include <node.h>
#include "enums.h"

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(String::NewSymbol(__name), Integer::New(__value), ReadOnly)

Handle<Object> status_codes() 
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
