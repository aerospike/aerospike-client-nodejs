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

        /**
         * undefined client.connect()
         */
		 static NAN_METHOD(Connect);

        /**
         *  undefined client.close()
         */
		static NAN_METHOD(Close);

        /**
         *  undefined client.get(Key, function(Error, Record))
         */
		static NAN_METHOD(Get);

        /**
         *  undefined client.exists(Key, function(Error, exists))
         */
		static NAN_METHOD(Exists);

        /**
         *  undefined client.put(Key, Record, function(Error))
         */
		static NAN_METHOD(Put);

        /**
         *      undefined client.select(Key, String[], function(Error,Record))
         */ 
		static NAN_METHOD(Select);

        /**
         *      undefined client.delete(Key, function(Error,Key))
         */
		static NAN_METHOD(Remove);

        /**
         *  undefined client.batchGet(Key[], function(Error,Record))
         */
		static NAN_METHOD(BatchGet);

        /**
         *  undefined client.batchGet(Key[], function(Error,Record))
         */
		static NAN_METHOD(BatchExists);

        /**
         *  undefined client.batch_select(Key[],bins,function(Error,Record))
         */
		static NAN_METHOD(BatchSelect);

        /*
         *undefined client.operate( Key, Operation, function(Error, Record))
         */ 
		static NAN_METHOD(Operate);

        /*
         *undefined client.info( host, port, function(Error, Response))
         */ 
		static NAN_METHOD(Info);

        /*
         *undefined client.info( host, port, function(Error, Response))
         */ 
		static NAN_METHOD(Info_Cluster);

        /*
         *undefined client.set_log_level(Log log)
         */
		static NAN_METHOD(SetLogLevel);

        /*
         *undefined client.udf_register(udf_filepath, udf_type, function( Error))
         */
		static NAN_METHOD(Register);

        /*
         *undefined client.udf_execute(Key, udf_args, function( Error, Response))
         */
		static NAN_METHOD(Execute);

        /*
         *undefined client.udf_remove(udf_filename, function( Error ))
         */
		static NAN_METHOD(UDFRemove);

        /*
         *undefined client.udf_remove(udf_filename, function( Error ))
         */
		static NAN_METHOD(UDFScan);

        /*
         *undefined client.udf_remove(udf_filename, function( Error ))
         */
		static NAN_METHOD(ScanInfo);


		/*
		 * undefined client.scan(ns, set, options)
		 */ 
		static NAN_METHOD(Scan);

		/*
		 * undefined client.query(ns, set, options)
		 */ 
		static NAN_METHOD(Query);

		/*
		 * undefined client.indexCreate(ns, set, bin, indexName, indexType)
		 */ 
		static NAN_METHOD(sindexCreate);

		/*
		 * undefined client.indexRemove(ns, indexName )
		 */ 
		static NAN_METHOD(sindexRemove);
};
