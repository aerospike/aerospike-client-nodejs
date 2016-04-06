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
#include <aerospike/aerospike_index.h>
#include "enums.h"

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(Nan::New(__name).ToLocalChecked(), Nan::New(__value))

Local<Object> indexDataType()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "STRING", AS_INDEX_STRING);
	set(obj, "NUMERIC", AS_INDEX_NUMERIC);
	set(obj, "GEO2DSPHERE", AS_INDEX_GEO2DSPHERE);
	return scope.Escape(obj);
}

Local<Object> indexType()
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj = Nan::New<Object>();
	set(obj, "DEFAULT", AS_INDEX_TYPE_DEFAULT);
	set(obj, "LIST", AS_INDEX_TYPE_LIST);
	set(obj, "MAPKEYS", AS_INDEX_TYPE_MAPKEYS);
	set(obj, "MAPVALUES", AS_INDEX_TYPE_MAPVALUES);
	// deprecated - included for backward compatibility
	set(obj, "STRING", AS_INDEX_STRING);
	set(obj, "NUMERIC", AS_INDEX_NUMERIC);
	set(obj, "GEO2DSPHERE", AS_INDEX_GEO2DSPHERE);
	return scope.Escape(obj);
}
