#include <node.h>
#include "enums.h"

using namespace v8;
/*
 *  * Error Codes in Aerospike C Client exposed to Nodejs Client
 */


Handle<Object> Error_Codes() 
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	//Success
	obj->Set(String::NewSymbol("AEROSPIKE_OK"), Integer::New(0), ReadOnly);
	//Generic Error
	obj->Set(String::NewSymbol("AEROSPIKE_ERR"), Integer::New(100), ReadOnly);
	//Client API usage
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_CLIENT"), Integer::New(200), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_PARAM"), Integer::New(201), ReadOnly);
	//Cluster Discovery and Connection
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_CLUSTER"), Integer::New(300), ReadOnly);
	//Incomplete Requests
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_TIMEOUT"), Integer::New(400), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_THROTTLED"), Integer::New(401), ReadOnly);
	//Competed Requests
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_SERVER"), Integer::New(500), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_REQUEST_INVALID"), Integer::New(501), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_NAMESPACE_NOT_FOUND"), Integer::New(502), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_SERVER_FULL"), Integer::New(503), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_CLUSTER_CHANGE"), Integer::New(504), ReadOnly);
	// Record Specific
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_RECORD"), Integer::New(600), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_RECORD_BUSY"), Integer::New(601), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_RECORD_NOT_FOUND"), Integer::New(602), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_RECORD_EXISTS"), Integer::New(603), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_RECORD_GENERATION"), Integer::New(604), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_RECORD_TOO_BIG"), Integer::New(605), ReadOnly);
	obj->Set(String::NewSymbol("AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE"), Integer::New(606), ReadOnly);


	return scope.Close(obj);
}


