#include <node.h>
#include "enums.h"

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(String::NewSymbol(__name), Integer::New(__value), ReadOnly)

Handle<Object> key_policy_values()
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();
    set(obj, "UNDEF",   0);
    set(obj, "DIGEST",  1);
    set(obj, "SEND",    2);
    return scope.Close(obj);
}

Handle<Object> retry_policy_values()
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();
    set(obj, "UNDEF",   0);
    set(obj, "NONE",    1);
    set(obj, "ONCE",    2);
    return scope.Close(obj);
}

Handle<Object> generation_policy_values()
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();
    set(obj, "UNDEF",   0);
    set(obj, "IGNORE",  1);
    set(obj, "EQ",      2);
    set(obj, "GT",      3);
    set(obj, "DUP",     4);
    return scope.Close(obj);
}

Handle<Object> exists_policy_values()
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();
    set(obj, "UNDEF",   0);
    set(obj, "IGNORE",  1);
    set(obj, "CREATE",  2);
    set(obj, "UPDATE",  3);
    return scope.Close(obj);
}

Handle<Object> policy_values()
{
    HANDLESCOPE;
    Handle<Object> obj = Object::New();

    obj->Set(String::NewSymbol("Key"), key_policy_values());
    obj->Set(String::NewSymbol("Retry"), retry_policy_values());
    obj->Set(String::NewSymbol("Generation"), generation_policy_values());
    obj->Set(String::NewSymbol("Exists"), exists_policy_values());

    return scope.Close(obj);
}
