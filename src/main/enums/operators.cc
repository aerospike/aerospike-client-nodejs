#include <node.h>
#include "enums.h"
#include <aerospike/as_operations.h>
using namespace v8;

#define set(__obj, __name, __value) __obj->Set(String::NewSymbol(__name), FunctionTemplate::New(__value)->GetFunction())

#define set_bin(__obj, __args) \
    __obj->Set(String::NewSymbol("bin_name"), __args[0]);\
    __obj->Set(String::NewSymbol("bin_value"), __args[1]);

Handle<Value> operator_write(const Arguments& args)
{
    HandleScope scope;

    // For write operation there should be two arguments.
    // bin_name and bin_value
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
    HandleScope scope;

    //For write operation there should be only one argument
    //Just bin_name
    if (args.Length() != 1) {
        return Null();
    }

    Handle<Object> read_op = Object::New();
    
    read_op->Set(String::NewSymbol("operation"), Integer::New(AS_OPERATOR_READ));
    read_op->Set(String::NewSymbol("bin_name"), args[0]);

    return scope.Close(read_op);
}

Handle<Value> operator_incr(const Arguments& args)
{
    HandleScope scope;

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
    HandleScope scope;
    
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
    HandleScope scope;

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
    HandleScope scope;

    Handle<Object> touch_op = Object::New();

    touch_op->Set(String::NewSymbol("operation"), Integer::New(AS_OPERATOR_TOUCH));

    return scope.Close(touch_op);

}
Handle<Object> operators() 
{
    HandleScope scope;
    Handle<Object> obj = Object::New();
    set(obj, "read",    operator_read);
    set(obj, "write",   operator_write);
    set(obj, "incr",    operator_incr); 
    set(obj, "prepend", operator_prepend);
    set(obj, "append",  operator_append);
    //set(obj, "touch",   Integer::New(8));
    return scope.Close(obj);
}
