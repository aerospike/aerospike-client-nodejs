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
	#include <aerospike/as_bin.h>
	#include <aerospike/as_key.h>
	#include <aerospike/as_udf.h>
	#include <aerospike/as_query.h>
	#include <aerospike/as_scan.h>
}

#include <node.h>
#include <nan.h>
#include "log.h"
using namespace node;
using namespace v8;

enum asQueryType {
	QUERY,
	QUERYUDF,
	QUERYAGGREGATION,
	SCAN,
	SCANUDF,
	SCANAGGREGATION
};

union QueryScan {
    as_query* query;
    as_scan* scan;
};

#define isQuery(type) (type == QUERY || type == QUERYUDF || type == QUERYAGGREGATION) ? true:false
/*******************************************************************************
 *  CLASS
 ******************************************************************************/

/*
 * Query and Scan share the common interface in node.js layer.
 * Implementation for parsing scan and query parameters from node.js
 * is same. Only one(either scan or query) of them will be initialized,
 * and executed for a given request.
 */
class AerospikeQuery: public ObjectWrap {

    /***************************************************************************
     *  PUBLIC
     **************************************************************************/

    public:
        static void Init();
        static Handle<Value> NewInstance(Local<Object> ns, Local<Object> set, Local<Object> config, Local<Object> client);

		// C structure to store all the scan or query properties.
		QueryScan query_scan;

		// Size of queue that's used in the scan_callback, it's user adjustable.
		int q_size;

		// stores all aerospike related information. One common structure for 
		// a client instance.
		aerospike* as;

		// Logger to log.
		LogInfo* log;

		//Which of the six APIs in scanQueryAPI enum, this is used to specify which of
		// the underlying SCAN/QUERY API in C is to be invoked.
		asQueryType type;


        /***************************************************************************
         *  PRIVATE
         **************************************************************************/

    private:

        AerospikeQuery();
        ~AerospikeQuery();

        bool isQuery_;
        bool hasUDF_;
        bool hasAggregation_;

        static Persistent<FunctionTemplate> constructor;
		static NAN_METHOD(New);

        void SetQueryType(Local<Value> config); 
        /*
         * Define Getter Accessors to properties
         */ 
        static NAN_GETTER(GetIsQuery);
        static NAN_GETTER(GetHasAggregation);
        static NAN_GETTER(GetHasUDF);

        /*
         * Define Setter Accessors to properties
         */ 
        static NAN_SETTER(SetIsQuery);
        static NAN_SETTER(SetHasAggregation);
        static NAN_SETTER(SetHasUDF);

        /**
         *  undefined query.foreach(callback())
         */
		static NAN_METHOD(foreach);

		/**
         *  undefined query.queryInfo(queryId, policy, callback)
         */
		static NAN_METHOD(queryInfo);
};
