#include <node.h>
#include "enums.h"

using namespace v8;
/*
 *  * Error Codes in Aerospike C Client exposed to Nodejs Client
 */


Handle<Object> operatorsEnum() 
{
	HandleScope scope;

	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("WRITE"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("READ"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("INCR"), Integer::New(2), ReadOnly);
	obj->Set(String::NewSymbol("PREPEND"), Integer::New(4), ReadOnly);
	obj->Set(String::NewSymbol("APPEND"), Integer::New(5), ReadOnly);
	obj->Set(String::NewSymbol("TOUCH"), Integer::New(8), ReadOnly);

	return scope.Close(obj);
}


