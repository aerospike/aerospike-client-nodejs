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

#pragma once

extern "C" {
	#include <aerospike/aerospike.h>
}

#include <node.h>
#include "log.h"
using namespace node;
using namespace v8;

/**********************************************************************
 *  MACRO DECLARATIONS FOR NODE.JS BACKWARD COMPATABILITY.
 *********************************************************************/ 

#if NODE_MODULE_VERSION > 0x000B
#  define NODE_ISOLATE_DECL Isolate* isolate = Isolate::GetCurrent();
#  define NODE_ISOLATE      isolate
#  define NODE_ISOLATE_PRE  isolate, 
#  define NODE_ISOLATE_POST , isolate 
#  define HANDLESCOPE v8::HandleScope scope(NODE_ISOLATE);
#else
#  define NODE_ISOLATE_DECL
#  define NODE_ISOLATE
#  define NODE_ISOLATE_PRE
#  define NODE_ISOLATE_POST
#  define HANDLESCOPE v8::HandleScope scope;
#endif

/*******************************************************************************
 *  CLASS
 ******************************************************************************/

class AerospikeClient : public ObjectWrap {

    /***************************************************************************
     *  PUBLIC
     **************************************************************************/

    public:
        static void Init();
        static Handle<Value> NewInstance(const Arguments& args);

        aerospike *as;
        LogInfo *log;

        /***************************************************************************
         *  PRIVATE
         **************************************************************************/

    private:

        AerospikeClient();
        ~AerospikeClient();

        static Persistent<Function> constructor;
        static Handle<Value> New(const Arguments& args);

        /***********************************************************************
         *  CLIENT OPERATIONS
         **********************************************************************/

        /**
         * undefined client.connect()
         */
        static Handle<Value> Connect(const Arguments& args);

        /**
         *  undefined client.close()
         */
        static Handle<Value> Close(const Arguments& args);

        /**
         *  undefined client.get(Key, function(Error, Record))
         */
        static Handle<Value> Get(const Arguments& args);    

        /**
         *  undefined client.exists(Key, function(Error, exists))
         */
        static Handle<Value> Exists(const Arguments& args); 

        /**
         *  undefined client.put(Key, Record, function(Error))
         */
        static Handle<Value> Put(const Arguments& args);

        /**
         *      undefined client.select(Key, String[], function(Error,Record))
         */ 
        static Handle<Value> Select(const Arguments& args);

        /**
         *      undefined client.delete(Key, function(Error,Key))
         */
        static Handle<Value> Remove(const Arguments& args);     

        /**
         *  undefined client.batchGet(Key[], function(Error,Record))
         */
        static Handle<Value> BatchGet(const Arguments& args);

        /**
         *  undefined client.batchGet(Key[], function(Error,Record))
         */
        static Handle<Value> BatchExists(const Arguments& args);

        /**
         *  undefined client.batch_select(Key[],bins,function(Error,Record))
         */
        //static Handle<Value> Batch_Select(const Arguments& args);

        /*
         *undefined client.operate( Key, Operation, function(Error, Record))
         */ 
        static Handle<Value> Operate(const Arguments& args);

        /*
         *undefined client.info( host, port, function(Error, Response))
         */ 
        static Handle<Value> Info(const Arguments& args);

        /*
         *undefined client.info( host, port, function(Error, Response))
         */ 
        static Handle<Value> Info_Cluster(const Arguments& args);

        /*
         *undefined client.set_log_level(Log log)
         */
        static Handle<Value> SetLogLevel(const Arguments& args);

        /*
         *undefined client.udf_register(udf_filepath, udf_type, function( Error))
         */
        static Handle<Value> Register(const Arguments& args);

        /*
         *undefined client.udf_execute(Key, udf_args, function( Error, Response))
         */
        static Handle<Value> Execute(const Arguments& args);

        /*
         *undefined client.udf_remove(udf_filename, function( Error ))
         */
        static Handle<Value> UDFRemove(const Arguments& args);

        /*
         *undefined client.udf_remove(udf_filename, function( Error ))
         */
        static Handle<Value> UDFScan(const Arguments& args);

        /*
         *undefined client.udf_remove(udf_filename, function( Error ))
         */
        static Handle<Value> ScanInfo(const Arguments& args);


		/*
		 * undefined client.scan(ns, set, options)
		 */ 
		static Handle<Value> Scan(const Arguments& args);

		/*
		 * undefined client.query(ns, set, options)
		 */ 
		static Handle<Value> Query(const Arguments& args);

		/*
		 * undefined client.indexCreate(ns, set, bin, indexName, indexType)
		 */ 
		static Handle<Value> sindexCreate(const Arguments& args);

		/*
		 * undefined client.indexRemove(ns, indexName )
		 */ 
		static Handle<Value> sindexRemove(const Arguments& args);
};
