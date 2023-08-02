/*******************************************************************************
 * Copyright 2023 Aerospike, Inc.
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
#include <nan.h>

extern "C" {
#include <aerospike/as_admin.h>
}

using namespace v8;

#define set(__obj, __name, __value)                                            \
	Nan::Set(__obj, Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> privilegeCode()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "USER_ADMIN", AS_PRIVILEGE_USER_ADMIN);
	set(obj, "SYS_ADMIN", AS_PRIVILEGE_SYS_ADMIN);
	set(obj, "DATA_ADMIN", AS_PRIVILEGE_DATA_ADMIN);
    set(obj, "UDF_ADMIN", AS_PRIVILEGE_UDF_ADMIN);
    set(obj, "SINDEX_ADMIN", AS_PRIVILEGE_SINDEX_ADMIN);
    set(obj, "READ", AS_PRIVILEGE_READ);
    set(obj, "READ_WRITE", AS_PRIVILEGE_READ_WRITE);
    set(obj, "READ_WRITE_UDF", AS_PRIVILEGE_READ_WRITE_UDF);
    set(obj, "WRITE", AS_PRIVILEGE_WRITE);
    set(obj, "TRUNCATE", AS_PRIVILEGE_TRUNCATE);
	return scope.Escape(obj);
}