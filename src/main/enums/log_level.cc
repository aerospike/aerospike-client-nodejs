
#include <node.h>
#include "enums.h"
#include "../util/log.h"

using namespace v8;
/*
 *  * Error Codes in Aerospike C Client exposed to Nodejs Client
 */

const char * log_severity_strings[]= { "ERROR", "WARN", "INFO", "DEBUG", "DETAIL"};

Handle<Object> logLevel() 
{
    HandleScope scope;

    Handle<Object> obj = Object::New();
    obj->Set(String::NewSymbol("OFF"), Integer::New(-1), ReadOnly);
    int num_elements = sizeof(log_severity_strings)/sizeof(log_severity_strings[0]);
    for ( int i = 0; i < num_elements; i++) {
        obj->Set(String::NewSymbol(log_severity_strings[i]),Integer::New(i), ReadOnly);
    }

    return scope.Close(obj);
}


