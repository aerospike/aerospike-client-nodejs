#include <node.h>
#include "enums.h"

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(String::NewSymbol(__name), Integer::New(__value), ReadOnly)

Handle<Object> log_levels() 
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();
    set(obj, "OFF",    -1);
    set(obj, "ERROR",  0);
    set(obj, "WARN",   1);
    set(obj, "INFO",   2);
    set(obj, "DEBUG",  3);
    set(obj, "DETAIL", 4);
    return scope.Close(obj);
}
