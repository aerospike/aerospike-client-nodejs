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

#include <node.h>
#include <cstdlib>
#include <unistd.h>

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/aerospike_key.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_key.h>
    #include <aerospike/as_record.h>
	#include <aerospike/aerospike_batch.h>
}

#include "../client.h"

using namespace v8;
/****************************************************************************
 * MACROS
 ****************************************************************************/ 

#define COPY_ERR_MESSAGE(__err,__message) \
    strcpy(__err.message, #__message); \
	    __err.code = __message; 

#define V8INTEGER_TO_CINTEGER(__num) \
	__num->ToInteger()->Value();

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

as_config * config_from_jsobject(as_config * config, Local<Object> obj);

Handle<Object> error_to_jsobject(as_error * error);


Handle<Value> val_to_jsvalue(as_val * val);

Handle<Object> recordbins_to_jsobject(const as_record * record);
Handle<Object> recordmeta_to_jsobject(const as_record * record);
Handle<Object> record_to_jsobject(const as_record * record, const as_key * key);

as_record * record_from_jsobject(as_record * rec, Local<Object> obj);
as_policy_write * writepolicy_from_jsobject(as_policy_write * policy, Local<Object> obj);
as_policy_read * readpolicy_from_jsobject( as_policy_read* policy, Local<Object> obj);
as_policy_remove * removepolicy_from_jsobject( as_policy_remove* policy, Local<Object> obj);
as_policy_batch * batchpolicy_from_jsobject( as_policy_batch * policy, Local<Object> obj);

Handle<Object> key_to_jsobject(const as_key * key);

as_key * key_from_jsobject(as_key * key, Local<Object> obj);
as_key * key_from_jsarray(as_key * key, Local<Array> arr);

as_batch * batch_from_jsarray(as_batch * batch, Local<Array> arr);
bool record_copy_constructor(const as_record * src, as_record ** dest);
bool key_copy_constructor(const as_key* src, as_key** dest);
