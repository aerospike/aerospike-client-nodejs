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

#include <node.h>
#include <cstdlib>
#include <unistd.h>

extern "C" {
	#include <aerospike/aerospike.h>
	#include <aerospike/aerospike_key.h>
	#include <aerospike/as_config.h>
	#include <aerospike/as_key.h>
	#include <aerospike/as_record.h>
	#include <aerospike/as_record_iterator.h>
}

#include "../client.h"
#include "conversions.h"
#include "log.h"

using namespace v8;

/*******************************************************************************
 *  FUNCTIONS
 /*****************************************************************************/

as_config * config_from_jsobject(as_config * config, Local<Object> obj)
{
	return config;
}


Handle<Value> val_to_jsvalue(as_val * val)
{
	switch ( as_val_type(val) ) {
		case AS_INTEGER : {
			as_integer * ival = as_integer_fromval(val);
			if ( ival ) {
				return Integer::New(as_integer_get(ival));
			}
		}
		case AS_STRING : {
			as_string * sval = as_string_fromval(val);
			if ( sval ) {
				return String::NewSymbol(as_string_get(sval));
			}
		}
		default:
			break;
	}
	return Undefined();
}

Handle<Object> record_to_jsobject(const as_record * record, const as_key * key)
{
	HandleScope scope;

	Local<Object> bins = Object::New();

	as_record_iterator it;
	as_record_iterator_init(&it, record);

	while ( as_record_iterator_has_next(&it) ) {
		as_bin * bin = as_record_iterator_next(&it);
		char * name = as_bin_get_name(bin);
		as_val * val = (as_val *) as_bin_get_value(bin);
		Handle<Value> obj = val_to_object(val);
		bins->Set(String::NewSymbol(name), obj);
	}

	Local<Object> rec = Object::New();

	if ( key ) {
		rec->Set(String::NewSymbol("key"), key_to_object(key));
	}
	else {
		rec->Set(String::NewSymbol("key"), key_to_object(&record->key));
	}

	rec->Set(String::NewSymbol("bins"), bins);

	return scope.Close(rec);
}


as_record * record_from_jsobject(as_record * rec, Local<Object> obj)
{
	const Local<Array> props = obj->GetOwnPropertyNames();
	const uint32_t count = props->Length();

	as_record_init(rec, count);

	for ( uint32_t i = 0; i < count; i++ ) {
		
		const Local<Value> name = props->Get(i);
		const Local<Value> value = obj->Get(name);

		if ( value->IsString() ) {
			String::Utf8Value n(name);
			String::Utf8Value v(value);
			as_record_set_str(rec, *n, strdup(*v));
			as_record_get_string(rec, *n)->free = true;
		}
		else if ( value->IsNumber() ) {
			String::Utf8Value n(name);
			int64_t v = value->IntegerValue();
			as_record_set_int64(rec, *n, v);
		}
	}

	return rec;
}

Handle<Object> key_to_jsobject(const as_key * key)
{
	HandleScope scope;

	Local<Object> obj = Object::New();

	if ( strlen(key->ns) > 0 ) {
		obj->Set(String::NewSymbol("ns"), String::NewSymbol(key->ns));
	}

	if ( strlen(key->set) > 0 ) {
		obj->Set(String::NewSymbol("set"), String::NewSymbol(key->set));
	}

	if ( key->valuep ) {
		as_val * val = (as_val *) key->valuep;
		as_val_t type = as_val_type(val);
		switch(type) {
			case AS_INTEGER: {
				as_integer * ival = as_integer_fromval(val);
				obj->Set(String::NewSymbol("value"), Integer::New(as_integer_get(ival)));
			}
			case AS_STRING: {
				as_string * sval = as_string_fromval(val);
				obj->Set(String::NewSymbol("value"), String::NewSymbol(as_string_get(sval)));
			}
			case AS_BYTES: {
				// Use v8's ByteArray
				// key->Set(String::NewSymbol("value"), String::NewSymbol(key->ns));
			}
			default:
				break;
		}
	}

	return scope.Close(obj);
}

as_key * key_from_object(as_key * key, Local<Object> obj)
{
	as_namespace ns = { '\0' };
	as_set set = { '\0' };

	Local<Value> ns_obj = obj->Get(String::NewSymbol("ns"));
	if ( ns_obj->IsString() ) {
		strncpy(ns, *String::Utf8Value(ns_obj), AS_NAMESPACE_MAX_SIZE);
	}
	else {
		return NULL;
	}
	
	if ( strlen(ns) == 0 ) {
		return NULL;
	}
	
	Local<Value> set_obj = obj->Get(String::NewSymbol("set"));
	if ( set_obj->IsString() ) {
		strncpy(set, *String::Utf8Value(set_obj), AS_SET_MAX_SIZE);
	}
	else {
		return NULL;
	}

	if ( strlen(set) == 0 ) {
		return NULL;
	}

	Local<Value> val_obj = obj->Get(String::NewSymbol("value"));
	if ( val_obj->IsString() ) {
		char * value = strdup(*String::Utf8Value(val_obj));
		as_key_init(key, ns, set, value);
		((as_string *) key->valuep)->free = true;
		return key;
	}
	else if ( val_obj->IsNumber() ) {
		int64_t value = val_obj->ToInteger()->Value();
		as_key_init_int64(key, ns, set, value);
		return key;
	}

	return NULL;
}

as_key * key_from_jsarray(as_key * key, Local<Array> arr)
{
	as_namespace ns = { '\0' };
	as_set set = { '\0' };

	if ( arr->Length() != 3 ) {
		return NULL;
	}

	Local<Value> ns_obj = arr->Get(0);
	if ( ns_obj->IsString() ) {
		strncpy(ns, *String::Utf8Value(ns_obj), AS_NAMESPACE_MAX_SIZE);
	}
	else {
		return NULL;
	}
	
	if ( strlen(ns) == 0 ) {
		return NULL;
	}
	
	Local<Value> set_obj = arr->Get(1);
	if ( set_obj->IsString() ) {
		strncpy(set, *String::Utf8Value(set_obj), AS_SET_MAX_SIZE);
	}
	else {
		return NULL;
	}

	if ( strlen(set) == 0 ) {
		return NULL;
	}

	Local<Value> val_obj = arr->Get(2);
	if ( val_obj->IsString() ) {
		char * value = strdup(*String::Utf8Value(val_obj));
		as_key_init(key, ns, set, value);
		((as_string *) key->valuep)->free = true;
		return key;
	}
	else if ( val_obj->IsNumber() ) {
		int64_t value = val_obj->ToInteger()->Value();
		as_key_init_int64(key, ns, set, value);
		return key;
	}

	return NULL;
}