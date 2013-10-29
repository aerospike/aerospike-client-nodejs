#include <node.h>
#include "enums.h"

using namespace v8;
/*
 *  * Error Codes in Aerospike C Client exposed to Nodejs Client
 */


Handle<Object> Operators_Enum() 
{
	HandleScope scope;

	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("AS_OPERATOR_WRITE"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("AS_OPERATOR_READ"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("AS_OPERATOR_INCR"), Integer::New(2), ReadOnly);
	obj->Set(String::NewSymbol("AS_OPERATOR_PREPEND"), Integer::New(4), ReadOnly);
	obj->Set(String::NewSymbol("AS_OPERATOR_APPEND"), Integer::New(5), ReadOnly);
	obj->Set(String::NewSymbol("AS_OPERATOR_TOUCH"), Integer::New(8), ReadOnly);

	return scope.Close(obj);
}


