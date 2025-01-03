/*******************************************************************************
 * Copyright 2013-2024 Aerospike, Inc.
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

extern "C" {
#include <aerospike/as_txn.h>
}

#include "log.h"
#include "command.h"

class Transaction : public Nan::ObjectWrap {

	/***************************************************************************
	 *  PUBLIC
	 **************************************************************************/
  public:
	static void Init();
	static v8::Local<v8::Value> NewInstance(v8::Local<v8::Object> capacity_obj);

    Nan::Persistent<v8::Object> persistent;
	as_txn *txn;
	
	Transaction();
	~Transaction();

	/***************************************************************************
	 *  PRIVATE
	 **************************************************************************/
  private:

	static inline Nan::Persistent<v8::Function> &constructor()
	{
		static Nan::Persistent<v8::Function> my_constructor;
		return my_constructor;
	}

	static NAN_METHOD(New);

	static NAN_METHOD(GetId);
	static NAN_METHOD(GetInDoubt);
	static NAN_METHOD(GetTimeout);
	static NAN_METHOD(GetState);
	
	static NAN_METHOD(SetTimeout);

	static NAN_METHOD(Close);

};
