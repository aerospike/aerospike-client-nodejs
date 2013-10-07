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
#include <node_buffer.h>
#include <v8.h>
#include <cstdlib>
#include <unistd.h>

extern "C" {
	#include <aerospike/aerospike.h>
	#include <aerospike/aerospike_key.h>
	#include <aerospike/as_config.h>
	#include <aerospike/as_key.h>
	#include <aerospike/as_record.h>
	#include <aerospike/as_record_iterator.h>
	#include <aerospike/aerospike_batch.h>	
}

#include "../client.h"
#include "conversions.h"
#include "log.h"

using namespace node;
using namespace v8;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

as_config * config_from_jsobject(as_config * config, Local<Object> obj)
{

	Local<Value> hosts = obj->Get(String::NewSymbol("hosts"));

	if(hosts->IsArray()) {
		Local<Array> hostlist = Local<Array>::Cast(hosts);
		for ( uint32_t i=0; i<hostlist->Length(); i++) {
	
			Local<Value> addr = hostlist->Get(i)->ToObject()->Get(String::NewSymbol("addr"));
			Local<Value> port = hostlist->Get(i)->ToObject()->Get(String::NewSymbol("port"));
	
		
    		if ( addr->IsString() ) {
				config->hosts[i].addr = strdup(*String::Utf8Value(addr));
			}
			else {
				return NULL;
			}
	
			if ( port->IsNumber() ) {	
				config->hosts[i].port = port->ToInteger()->Value();		
			}
			else {
				return NULL;
			}
		}
	}
	else{
		return NULL;
	}
	return config;
}

bool key_copy_constructor(const as_key* src, as_key** dest)
{
	if(src == NULL || dest == NULL) {
		return false;
	}

	as_key_value* val = src->valuep;
	as_val_t t = as_val_type((as_val*)val);
	switch(t){
		case AS_INTEGER: {
			*dest = as_key_new_int64(src->ns, src->set, val->integer.value);
			break;
		 }
		case AS_STRING: {
			char* strval = strdup(val->string.value);
			*dest = as_key_new_strp( src->ns, src->set, strval,true);
			strcpy((*dest)->ns,src->ns);
			strcpy((*dest)->set,src->set);
			break;
		 }
		default: 
			break;
	}
	
	return true;
	
}

bool record_copy_constructor(const as_record* src, as_record** dest) 
{
	if(src == NULL || dest == NULL) {
		return false;
	}
	(*dest)->ttl = src->ttl;
	(*dest)->gen = src->gen;
	as_record_iterator it;
    	as_record_iterator_init(&it, src);
	while (as_record_iterator_has_next(&it)) {
		as_bin * bin = as_record_iterator_next(&it);
		as_bin_value * val = as_bin_get_value(bin);
		as_val_t t = as_bin_get_type(bin);
		switch(t) {
			case AS_INTEGER: {
				as_record_set_int64(*dest, as_bin_get_name(bin), val->integer.value); 
				break;
				
			}
			case AS_STRING: {
				char* strval = strdup(val->string.value);
				as_record_set_strp(*dest, as_bin_get_name(bin), strval, true);
				break;
			}
			case AS_BYTES: {
				uint8_t *bytes = (uint8_t*) malloc(sizeof(val->bytes.value));
				memcpy(bytes, val->bytes.value, sizeof(val->bytes.value));
				as_record_set_rawp(*dest, as_bin_get_name(bin), bytes, sizeof(val->bytes.value), true);
				break;
			}
				
			default:
				break;
		}
	}           
                        
	return true;
}
	
Handle<Object> error_to_jsobject(as_error * error)
{
	HandleScope scope;	
	Local<Object> err = Object::New();
	if (error == NULL) {
		return scope.Close(err);
	}
	err->Set(String::NewSymbol("code"), Integer::New(error->code));
	err->Set(String::NewSymbol("message"), error->message[0] != '\0' ? String::NewSymbol(error->message) : Null() );
	err->Set(String::NewSymbol("func"), error->func ? String::NewSymbol(error->func) : Null() );
	err->Set(String::NewSymbol("file"), error->file ? String::NewSymbol(error->file) : Null() );
	err->Set(String::NewSymbol("line"), error->line ? Integer::New(error->line) : Null() );
	return scope.Close(err);
}


Handle<Value> val_to_jsvalue(as_val * val)
{
	if( val == NULL) {
		return Undefined();
	}
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
		case AS_BYTES : {
			as_bytes * bval = as_bytes_fromval(val);
			if ( bval ) {
				int size = as_bytes_size(bval);
				Buffer * buf = Buffer::New(size);
				memcpy(node::Buffer::Data(buf), bval->value, size);
				v8::Local<v8::Object> globalObj = v8::Context::GetCurrent()->Global();
				v8::Local<v8::Function> bufferConstructor = v8::Local<v8::Function>::Cast(globalObj->Get(v8::String::New("Buffer")));
				v8::Handle<v8::Value> constructorArgs[3] = { buf->handle_, v8::Integer::New(size), v8::Integer::New(0) };
				v8::Local<v8::Object> actualBuffer = bufferConstructor->NewInstance(3, constructorArgs);
				return actualBuffer;
			} 
		}
		default:
			break;
	}
	return Undefined();
}


Handle<Object> recordbins_to_jsobject(const as_record * record)
{
	HandleScope scope;

	Local<Object> bins ;
	if (record == NULL) {
		return scope.Close(bins);
	}

	bins = Object::New();
	as_record_iterator it;
	as_record_iterator_init(&it, record);

	while ( as_record_iterator_has_next(&it) ) {
		as_bin * bin = as_record_iterator_next(&it);
		char * name = as_bin_get_name(bin);
		as_val * val = (as_val *) as_bin_get_value(bin);
		Handle<Value> obj = val_to_jsvalue(val);
		bins->Set(String::NewSymbol(name), obj);
	}
	return scope.Close(bins);
}

Handle<Object> recordmeta_to_jsobject(const as_record * record)
{
	HandleScope scope;
	Local<Object> meta ;
	if(record == NULL) {
		return scope.Close(meta);
	}
	meta = Object::New();
	meta->Set(String::NewSymbol("ttl"), Integer::New(record->ttl));
	meta->Set(String::NewSymbol("gen"), Integer::New(record->gen));
	return scope.Close(meta);
}

Handle<Object> record_to_jsobject(const as_record * record, const as_key * key)
{
	HandleScope scope;
	
	Handle<Object> okey;
	
	if(record == NULL) {
		return scope.Close(okey);
	}
	okey	= key_to_jsobject(key ? key : &record->key);
	Handle<Object> bins	= recordbins_to_jsobject(record);
	Handle<Object> meta	= recordmeta_to_jsobject(record);
	Local<Object> rec = Object::New();
	rec->Set(String::NewSymbol("key"), okey);
	rec->Set(String::NewSymbol("meta"), meta);
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
		else if ( value->IsObject() ) {
			Local<Object> obj = value->ToObject();
			if (obj->GetIndexedPropertiesExternalArrayDataType() != kExternalUnsignedByteArray ) {
				return NULL;
			}
			int len = obj->GetIndexedPropertiesExternalArrayDataLength();
			uint8_t* data = static_cast<uint8_t*>(obj->GetIndexedPropertiesExternalArrayData());	
			String::Utf8Value n(name);
			as_record_set_raw(rec, *n, data, len);
		}
		else 
			return NULL;
	}

	return rec;
}

Handle<Object> key_to_jsobject(const as_key * key)
{
	HandleScope scope;
	Local<Object> obj;
	if (key == NULL) {
		return scope.Close(obj);
	}

	obj = Object::New();
	if ( key->ns && strlen(key->ns) > 0 ) {
		obj->Set(String::NewSymbol("ns"), String::NewSymbol(key->ns));
	}

	if ( key->set && strlen(key->set) > 0 ) {
		obj->Set(String::NewSymbol("set"), String::NewSymbol(key->set));
	}

	if ( key->valuep ) {
		as_val * val = (as_val *) key->valuep;
		as_val_t type = as_val_type(val);
		switch(type) {
			case AS_INTEGER: {
				as_integer * ival = as_integer_fromval(val);
				obj->Set(String::NewSymbol("key"), Integer::New(as_integer_get(ival)));
			}
			case AS_STRING: {
				as_string * sval = as_string_fromval(val);
				obj->Set(String::NewSymbol("key"), String::NewSymbol(as_string_get(sval)));
			}
			case AS_BYTES: {
				 as_bytes * bval = as_bytes_fromval(val);
            	if ( bval ) {
                	int size = as_bytes_size(bval);
                	Buffer * buf = Buffer::New(size);
                	memcpy(node::Buffer::Data(buf), bval->value, size);
               		v8::Local<v8::Object> globalObj = v8::Context::GetCurrent()->Global();
                	v8::Local<v8::Function> bufferConstructor = v8::Local<v8::Function>::Cast(globalObj->Get(v8::String::New("Buffer")));
                	v8::Handle<v8::Value> constructorArgs[3] = { buf->handle_, v8::Integer::New(size), v8::Integer::New(0) };
                	v8::Local<v8::Object> actualBuffer = bufferConstructor->NewInstance(3, constructorArgs);
					obj->Set(String::NewSymbol("key"), actualBuffer);
            }

			}
			default:
				break;
		}
	}

	return scope.Close(obj);
}

as_key * key_from_jsobject(as_key * key, Local<Object> obj)
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

	Local<Value> val_obj = obj->Get(String::NewSymbol("key"));
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

as_batch* batch_from_jsarray(as_batch *batch, Local<Array> arr)
{
	uint32_t capacity = arr->Length();
	
	if(capacity > 0) {
		as_batch_init(batch, capacity);
	}
	for ( uint32_t i=0; i < capacity; i++) {
		Local<Object> key = arr->Get(i)->ToObject();
		key_from_jsobject(as_batch_keyat(batch, i), key);
	}

	return batch;
}
