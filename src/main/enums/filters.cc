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
#include <aerospike/as_query.h>

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(String::NewSymbol(__name), FunctionTemplate::New(__value)->GetFunction())

Handle<Value> range(const Arguments& args)
{
	HANDLESCOPE;

	if(args.Length() != 3) {
		return Null();	
	}

	Handle<Object> range_obj = Object::New();
	range_obj->Set(String::NewSymbol("predicate"), Integer::New(AS_PREDICATE_INTEGER_RANGE));
	range_obj->Set(String::NewSymbol("bin"), args[0]);
	range_obj->Set(String::NewSymbol("min"), args[1]);
	range_obj->Set(String::NewSymbol("max"), args[2]);
	return scope.Close(range_obj);

}
Handle<Value> equal(const Arguments& args)
{
	HANDLESCOPE;

	if(args.Length() != 2) {
		return Null();
	}

	Handle<Object> equal_obj = Object::New();
	if(args[1]->IsString()) {
		equal_obj->Set(String::NewSymbol("predicate"), Integer::New(AS_PREDICATE_STRING_EQUAL));
	}
	else if( args[1]->IsNumber()){
		equal_obj->Set(String::NewSymbol("predicate"), Integer::New(AS_PREDICATE_INTEGER_EQUAL));
	}
	else {
		return Null();
	}
	equal_obj->Set(String::NewSymbol("bin"), args[0]);
	equal_obj->Set(String::NewSymbol("val"), args[1]);

	return scope.Close(equal_obj);
	
}
Handle<Object> filter() 
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();
    set(obj, "equal",   equal);
    set(obj, "range",  range);
    return scope.Close(obj);
}
