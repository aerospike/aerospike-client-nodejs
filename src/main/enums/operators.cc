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

#define set(__obj, __name, __value) __obj->Set(String::NewSymbol(__name), FunctionTemplate::New(__value)->GetFunction())

#define set_bin(__obj, __args) \
    __obj->Set(String::NewSymbol("bin"), __args[0]);\
    __obj->Set(String::NewSymbol("value"), __args[1]);

Handle<Value> operator_write(const Arguments& args)
{
    HANDLESCOPE;
    
    if (args.Length() != 2) {
        return Null();
    }

    Handle<Object> write_op = Object::New();

    write_op->Set(String::NewSymbol("operation"),Integer::New(AS_OPERATOR_WRITE)); 
    set_bin(write_op, args);

    return scope.Close(write_op);
}

Handle<Value> operator_read(const Arguments& args)
{
    HANDLESCOPE;

    if (args.Length() != 1) {
        return Null();
    }

    Handle<Object> read_op = Object::New();
    
    read_op->Set(String::NewSymbol("operation"), Integer::New(AS_OPERATOR_READ));
    if ( !args[0]->IsUndefined()) {
        read_op->Set(String::NewSymbol("bin"), args[0]);
    } else {
        return Null();
    }

    return scope.Close(read_op);
}

Handle<Value> operator_incr(const Arguments& args)
{
    HANDLESCOPE;

    if (args.Length() != 2 ) {
        return Null();
    }

    Handle<Object> incr_op = Object::New();

    incr_op->Set(String::NewSymbol("operation"), Integer::New(AS_OPERATOR_INCR));
    set_bin(incr_op, args);

    return scope.Close(incr_op);

}

Handle<Value> operator_append(const Arguments &args)
{
    HANDLESCOPE;
    
    if (args.Length() != 2) {
        return Null();
    }

    Handle<Object> append_op = Object::New();

    append_op->Set(String::NewSymbol("operation"), Integer::New(AS_OPERATOR_APPEND));
    set_bin(append_op, args);

    return scope.Close(append_op);
}

Handle<Value> operator_prepend(const Arguments& args)
{
    HANDLESCOPE;

    if(args.Length() != 2) {
        return Null();
    }

    Handle<Object> prepend_op = Object::New();

    prepend_op->Set(String::NewSymbol("operation"), Integer::New(AS_OPERATOR_PREPEND));
    set_bin(prepend_op, args);

    return scope.Close(prepend_op);
}

Handle<Value> operator_touch(const Arguments& args)
{
    HANDLESCOPE;

    Handle<Object> touch_op = Object::New();

    touch_op->Set(String::NewSymbol("operation"), Integer::New(AS_OPERATOR_TOUCH));
    if ( !args[0]->IsUndefined()) {
        touch_op->Set(String::NewSymbol("ttl"), args[0]);
    }

    return scope.Close(touch_op);

}
Handle<Object> operators() 
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();
    set(obj, "read",    operator_read);
    set(obj, "write",   operator_write);
    set(obj, "incr",    operator_incr); 
    set(obj, "prepend", operator_prepend);
    set(obj, "append",  operator_append);
    set(obj, "touch", operator_touch);
    return scope.Close(obj);
}
