#include <node.h>
#include "enums.h"

using namespace v8;
/*
 *  * Error Codes in Aerospike C Client exposed to Nodejs Client
 */


Handle<Object> logLevel() 
{
	HandleScope scope;

	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("OFF"), Integer::New(-1), ReadOnly);
	obj->Set(String::NewSymbol("ERROR"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("WARN"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("INFO"), Integer::New(2), ReadOnly);
	obj->Set(String::NewSymbol("DEBUG"), Integer::New(3), ReadOnly);
	obj->Set(String::NewSymbol("TRACE"), Integer::New(4), ReadOnly);

	return scope.Close(obj);
}


