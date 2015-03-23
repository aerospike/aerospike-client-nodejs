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

// @TO-DO there's a warning with this function around. Have to figure that out.
//#define set(__obj, __name, __value) __obj->Set(NanNew(__name), NanNew<Function>(__value))
#define set(__obj, __name, __value) __obj->Set(NanNew(__name), NanNew(__value))

Handle<Value> range_integer(ResolveArgs(args))
{
	NanEscapableScope();
	
	Handle<Object> range_obj = NanNew<Object>();
	if(args.Length() != 3) {
		return NanEscapeScope(NanNull());	
	}

	range_obj->Set(NanNew("predicate"), NanNew(AS_PREDICATE_RANGE));
	range_obj->Set(NanNew("type"), NanNew(AS_INDEX_NUMERIC));
	range_obj->Set(NanNew("bin"), args[0]);
	range_obj->Set(NanNew("min"), args[1]);
	range_obj->Set(NanNew("max"), args[2]);
	return NanEscapeScope(range_obj);	

}

Handle<Value> equal(ResolveArgs(args))
{
	NanEscapableScope();


	Handle<Object> equal_obj = NanNew<Object>();

	if(args.Length() != 2) {
		return NanEscapeScope(NanNull());
	}
	equal_obj->Set(NanNew("predicate"), NanNew(AS_PREDICATE_EQUAL));

	if(args[1]->IsString()) {
		equal_obj->Set(NanNew("type"), NanNew(AS_INDEX_STRING));
	}
	else if( args[1]->IsNumber()){
		equal_obj->Set(NanNew("type"), NanNew(AS_INDEX_NUMERIC));
	}
	else {
		return NanEscapeScope(equal_obj);
	}
	equal_obj->Set(NanNew("bin"), args[0]);
	equal_obj->Set(NanNew("val"), args[1]);

	return NanEscapeScope(equal_obj);
	
}
/*Handle<Object> filter() 
{
    NanEscapableScope();
    Handle<Object> obj = NanNew<Object>();
    set(obj, "equal",   equal);
    set(obj, "range",  range_integer);
    return NanEscapeScope(obj);
}*/

Handle<Object> predicates()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set(obj, "EQUAL", AS_PREDICATE_EQUAL);
	set(obj, "RANGE", AS_PREDICATE_RANGE);
	return NanEscapeScope(obj);
}
