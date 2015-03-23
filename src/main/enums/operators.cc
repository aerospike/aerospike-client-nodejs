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
#include <aerospike/as_operations.h>
using namespace v8;

#define set(__obj, __name, __value) __obj->Set(NanNew(__name), NanNew<Function>(__value))

#define set_bin(__obj, __args) \
    __obj->Set(NanNew("bin"), __args[0]);\
    __obj->Set(NanNew("value"), __args[1]);
#define set_op(__obj, __str, __val) __obj->Set(NanNew(__str), NanNew(__val))
Handle<Value> operator_write(ResolveArgs(args))
{
    NanEscapableScope();
    

    Handle<Object> write_op = NanNew<Object>();
    if (args.Length() != 2) {
        return NanEscapeScope(NanNull());
    }

    write_op->Set(NanNew("operation"),NanNew(AS_OPERATOR_WRITE)); 
    set_bin(write_op, args);

    return NanEscapeScope(write_op);
}

Handle<Value> operator_read(ResolveArgs(args))
{
    NanEscapableScope();

    if (args.Length() != 1) {
        return NanEscapeScope(NanNull());
    }

    Handle<Object> read_op = NanNew<Object>();
    
    read_op->Set(NanNew("operation"), NanNew(AS_OPERATOR_READ));
    if ( !args[0]->IsUndefined()) {
        read_op->Set(NanNew("bin"), args[0]);
    } else {
        return NanEscapeScope(NanNull());
    }

    return NanEscapeScope(read_op);
}

Handle<Value> operator_incr(ResolveArgs(args))
{
    NanEscapableScope();

    if (args.Length() != 2 ) {
        return NanEscapeScope(NanNull());
    }

    Handle<Object> incr_op = NanNew<Object>();

    incr_op->Set(NanNew("operation"), NanNew(AS_OPERATOR_INCR));
    set_bin(incr_op, args);

    return NanEscapeScope(incr_op);

}

Handle<Value> operator_append(ResolveArgs(args))
{
    NanEscapableScope();

    
    if (args.Length() != 2) {
        return NanEscapeScope(NanNull());
    }

    Handle<Object> append_op = NanNew<Object>();

    append_op->Set(NanNew("operation"), NanNew(AS_OPERATOR_APPEND));
    set_bin(append_op, args);

    return NanEscapeScope(append_op);
}

Handle<Value> operator_prepend(ResolveArgs(args))
{
    NanEscapableScope();

    if(args.Length() != 2) {
        return NanEscapeScope(NanNull());
    }

    Handle<Object> prepend_op = NanNew<Object>();

    prepend_op->Set(NanNew("operation"), NanNew(AS_OPERATOR_PREPEND));
    set_bin(prepend_op, args);

    return NanEscapeScope(prepend_op);
}

Handle<Value> operator_touch(ResolveArgs(args))
{
	NanEscapableScope();

    Handle<Object> touch_op = NanNew<Object>();

    touch_op->Set(NanNew("operation"), NanNew(AS_OPERATOR_TOUCH));
    if ( !args[0]->IsUndefined()) {
        touch_op->Set(NanNew("ttl"), args[0]);
    }

    return NanEscapeScope(touch_op);

}
Handle<Object> operations()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set_op(obj, "READ", AS_OPERATOR_READ);
	set_op(obj, "WRITE", AS_OPERATOR_WRITE);
	set_op(obj, "INCR", AS_OPERATOR_INCR);
	set_op(obj, "APPEND", AS_OPERATOR_APPEND);
	set_op(obj, "PREPEND", AS_OPERATOR_PREPEND);
	set_op(obj, "TOUCH", AS_OPERATOR_TOUCH);
	return NanEscapeScope(obj);
}

