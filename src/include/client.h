/***************************************************************************
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

#pragma once

#include <node.h>
#include <nan.h>
#include "log.h"
#include "query.h"

#if NODE_MODULE_VERSION > 0x000B
#  define ResolveArgs(args) const Nan::FunctionCallbackInfo<v8::Value>& args
#  define ResolveAsyncCallbackArgs uv_async_t* handle
#  define V8_RETURN
#else
#  define ResolveArgs(args) const Nan::FunctionCallbackInfo<v8::Value>& args
#  define ResolveAsyncCallbackArgs uv_async_t* handle, int status
#  define V8_RETURN return
#endif

#define TYPE_CHECK_REQ(val, type, msg) if (!val->type()) return Nan::ThrowTypeError(msg)
#define TYPE_CHECK_OPT(val, type, msg) if (!(val->IsNull() || val->IsUndefined() || val->type())) return Nan::ThrowTypeError(msg)

#define UDF_MAX_MODULE_NAME 255
#define UDF_MAX_FUNCTION_NAME 255

extern "C" {
	#include <aerospike/aerospike.h>
}

using namespace node;
using namespace v8;

/*******************************************************************************
 *  CLASS
 ******************************************************************************/

class AerospikeClient : public ObjectWrap {

	/***************************************************************************
	 *  PUBLIC
	 **************************************************************************/

	public:
		static void Init();
		static Local<Value> NewInstance(Local<Object> args);

		aerospike *as;
		LogInfo *log;

	/***************************************************************************
	 *  PRIVATE
	 **************************************************************************/

	private:

		AerospikeClient();
		~AerospikeClient();

		static Nan::Persistent<FunctionTemplate> constructor;
		static NAN_METHOD(New);

		/***********************************************************************
		 *  CLIENT OPERATIONS
		 **********************************************************************/

		static NAN_METHOD(ApplyAsync);
		static NAN_METHOD(BatchExists);
		static NAN_METHOD(BatchGet);
		static NAN_METHOD(BatchReadAsync);
		static NAN_METHOD(BatchSelect);
		static NAN_METHOD(Close);
		static NAN_METHOD(Connect);
		static NAN_METHOD(ExistsAsync);
		static NAN_METHOD(GetAsync);
		static NAN_METHOD(HasPendingAsyncCommands);
		static NAN_METHOD(Info);
		static NAN_METHOD(Info_Cluster);
		static NAN_METHOD(IsConnected);
		static NAN_METHOD(OperateAsync);
		static NAN_METHOD(PutAsync);
		static NAN_METHOD(Query);
		static NAN_METHOD(Register);
		static NAN_METHOD(RegisterWait);
		static NAN_METHOD(RemoveAsync);
		static NAN_METHOD(Scan);
		static NAN_METHOD(ScanInfo);
		static NAN_METHOD(SelectAsync);
		static NAN_METHOD(SetLogLevel);
		static NAN_METHOD(UDFRemove);
		static NAN_METHOD(UDFScan);
		static NAN_METHOD(sindexCreate);
		static NAN_METHOD(sindexCreateWait);
		static NAN_METHOD(sindexRemove);
};
