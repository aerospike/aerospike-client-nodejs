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
		static Handle<Value> NewInstance(const Arguments& args);

		aerospike as;
		
	private:
		
		AerospikeClient();
		~AerospikeClient();

		static Persistent<Function> constructor;
		static Handle<Value> New(const Arguments& args);

		/***********************************************************************
		 *	CLIENT OPERATIONS
		 **********************************************************************/

		/**
		 *	undefined client.close()
		 */
		static Handle<Value> Close(const Arguments& args);

		/**
		 *	undefined client.get(Key, function(Error, Record))
		 */
		static Handle<Value> Get(const Arguments& args);

		/**
		 *	undefined client.put(Key, Record, function(Error))
		 */
		static Handle<Value> Put(const Arguments& args);
		
		/**
 		 *  undefined client.select(Key,bins,function(Error,Record))
 		 */ 
		static Handle<Value> Select(const Arguments& args);

};
