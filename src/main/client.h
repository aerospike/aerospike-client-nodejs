/*******************************************************************************
 * Copyright 2013 Aerospike Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 ******************************************************************************/

#pragma once

extern "C" {
#include <aerospike/aerospike.h>
}

#include <node.h>
#include "util/log.h"
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
         *      undefined client.select(Key,bins,function(Error,Record))
         */ 
        static Handle<Value> Select(const Arguments& args);

        /**
         *      undefined client.delete(Key, function(Error,Key))
         */
        static Handle<Value> Remove(const Arguments& args);     

        /**
         *  undefined client.batch_get(Key[],function(Error,Record))
         */
        static Handle<Value> Batch_Get(const Arguments& args);

        /**
         *  undefined client.batch_get(Key[],function(Error,Record))
         */
        static Handle<Value> Batch_Exists(const Arguments& args);

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
};
