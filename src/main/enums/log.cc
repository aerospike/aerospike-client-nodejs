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

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> log() 
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj = Nan::New<Object>();
    set(obj, "OFF",    -1);
    set(obj, "ERROR",  0);
    set(obj, "WARN",   1);
    set(obj, "INFO",   2);
    set(obj, "DEBUG",  3);
    set(obj, "DETAIL", 4);
    return scope.Escape(obj);
}
