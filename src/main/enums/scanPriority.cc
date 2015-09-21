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
#include <aerospike/as_scan.h>

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(Nan::New<String>(__name).ToLocalChecked(), Nan::New(__value) )

Local<Object> scanPriority() 
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj = Nan::New<Object>();
    set(obj, "AUTO",   AS_SCAN_PRIORITY_AUTO );
    set(obj, "LOW",    AS_SCAN_PRIORITY_LOW );
    set(obj, "MEDIUM", AS_SCAN_PRIORITY_MEDIUM );
    set(obj, "HIGH",   AS_SCAN_PRIORITY_HIGH );
    return scope.Escape(obj);
}
