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

int config_from_jsobject(as_config * config, Local<Object> obj)
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
				return AS_NODE_PARAM_ERR;
			}
	
			if ( port->IsNumber() ) {	
				config->hosts[i].port = V8INTEGER_TO_CINTEGER(port);		
			}
			else {
				return AS_NODE_PARAM_ERR;
			}
		}
	}
	else{
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

// Add the element to the list.
void AddElement(llist **list, void * element)
{
	llist *newnode;
	if ((newnode = (llist*)malloc(sizeof(llist))) == NULL) {
		exit(1);
	}
	newnode->ptr = element;
	newnode->next = NULL;
	if ((*list) == NULL){
		(*list) = newnode;
		return;
	}
	llist* trav = (*list);
	while ( trav->next != NULL) {
		trav = trav->next;
	}
	trav->next = newnode;
	return;
}


// Delete all the elements in the linked list
// and the list itself.
void RemoveList( llist **list) {
	llist * head = (*list);
	llist * currnode = NULL;
	while ( head != NULL ) {
		currnode = head;
		head = head->next;
		delete currnode->ptr;
		free(currnode);
	}
	return;
}


bool key_clone(const as_key* src, as_key** dest)
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

bool record_clone(const as_record* src, as_record** dest) 
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
				size_t size = val->bytes.size;
				uint8_t *bytes = (uint8_t*) malloc(size);
				memcpy(bytes, val->bytes.value, size);
				as_record_set_rawp(*dest, as_bin_get_name(bin), bytes, size, true);
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

// This callback is called by v8 garbage collector, when Buffer object 
// is garbage collected. 
void callback(char* data, void * ptr) 
{
	if ( ptr != NULL) {
		free(ptr);
	}
}

Handle<Value> val_to_jsvalue(as_val * val, void** freeptr)
{
	HandleScope scope;
	if( val == NULL) {
		return scope.Close(Undefined());
	}
	switch ( as_val_type(val) ) {
		case AS_INTEGER : {
			as_integer * ival = as_integer_fromval(val);
			if ( ival ) {
				return scope.Close(Integer::New(as_integer_get(ival)));
			}
		}
		case AS_STRING : {
			as_string * sval = as_string_fromval(val);
			if ( sval ) {	
				return scope.Close(String::NewSymbol(as_string_get(sval)));
			}
		}
		case AS_BYTES : {
			as_bytes * bval = as_bytes_fromval(val);
			if ( bval ) {
				// int size = as_bytes_size(bval);
				// Buffer  *buf = Buffer::New((char*)bval->value, size, callback, NULL);
				// memcpy(Buffer::Data(buf), bval->value, size);
				// v8::Local<v8::Object> globalObj = v8::Context::GetCurrent()->Global();
				// v8::Local<v8::Function> bufferConstructor = v8::Local<v8::Function>::Cast(globalObj->Get(v8::String::New("Buffer")));
				// v8::Handle<v8::Value> constructorArgs[3] = { buf->handle_, v8::Integer::New(size), v8::Integer::New(0) };
				// v8::Local<v8::Object> actualBuffer = bufferConstructor->NewInstance(3, constructorArgs);
				// buf->handle_.Dispose();
				// // Store the address of node::Buffer, to be freed later. 
				// // Otherwise it leads to memory leak, (not garbage collected by v8)
				// *freeptr = (void*) buf;
				// return scope.Close(actualBuffer);

				uint8_t * data = as_bytes_getorelse(bval, NULL);
				uint32_t size  = as_bytes_size(bval);

				// this constructor actually copies data into the new Buffer
				node::Buffer * buff  = node::Buffer::New((char *) data, size);

				return scope.Close(buff->handle_);
			} 
		}
		default:
			break;
	}
	return scope.Close(Undefined());
}


Handle<Object> recordbins_to_jsobject(const as_record * record, void ** freeptr)
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
		Handle<Value> obj = val_to_jsvalue(val, freeptr);
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

Handle<Object> record_to_jsobject(const as_record * record, const as_key * key, void ** freeptr)
{
	HandleScope scope;
	
	Handle<Object> okey;
	
	if(record == NULL) {
		return scope.Close(okey);
	}
	okey	= key_to_jsobject(key ? key : &record->key);
	Handle<Object> bins	= recordbins_to_jsobject(record, freeptr);
	Handle<Object> meta	= recordmeta_to_jsobject(record);
	Local<Object> rec = Object::New();
	rec->Set(String::NewSymbol("key"), okey);
	rec->Set(String::NewSymbol("meta"), meta);
	rec->Set(String::NewSymbol("bins"), bins);

	return scope.Close(rec);
}
//Forward references;
int extract_blob_from_jsobject( Local<Object> obj, uint8_t **data, int *len);

int recordbins_from_jsobject(as_record * rec, Local<Object> obj)
{
		
	const Local<Array> props = obj->GetOwnPropertyNames();
	const uint32_t count = props->Length();

	as_record_init(rec, count);
	for ( uint32_t i = 0; i < count; i++ ) {

		const Local<Value> name = props->Get(i);
		const Local<Value> value = obj->Get(name);

		String::Utf8Value n(name);


		String::Utf8Value p(value);
		if ( value->IsString() ) {
			String::Utf8Value v(value);
			as_record_set_str(rec, *n, strdup(*v));
			as_record_get_string(rec, *n)->free = true;
		}
		else if ( value->IsNumber() ) {
			int64_t v = value->IntegerValue();
			as_record_set_int64(rec, *n, v);
		}
		else if ( value->IsObject() ) {
			Local<Object> obj = value->ToObject();
			int len ;
			uint8_t* data ;
			if (extract_blob_from_jsobject(obj, &data, &len) != AS_NODE_PARAM_OK) {
				return AS_NODE_PARAM_ERR;
			}
			as_record_set_raw(rec, *n, data, len);
			//as_record_get_bytes(rec, *n)->free = true;

		}
		else {
			return AS_NODE_PARAM_ERR;
		}
	}

	return AS_NODE_PARAM_OK;
}

int recordmeta_from_jsobject(as_record * rec, Local<Object> obj)
{
	setTTL( obj, &rec->ttl);
	setGeneration( obj, &rec->gen);

	return AS_NODE_PARAM_OK;
}

int extract_blob_from_jsobject( Local<Object> obj, uint8_t **data, int *len)
{

	if (obj->GetIndexedPropertiesExternalArrayDataType() != kExternalUnsignedByteArray ) {
		return AS_NODE_PARAM_ERR;
	}
	(*len) = obj->GetIndexedPropertiesExternalArrayDataLength();
	(*data) = static_cast<uint8_t*>(obj->GetIndexedPropertiesExternalArrayData());	
	return AS_NODE_PARAM_OK;
}
int setTTL ( Local<Object> obj, uint32_t *ttl)
{
	if ( obj->Has(String::NewSymbol("ttl"))) {
		Local<Value> v8ttl = obj->Get(String::NewSymbol("ttl")) ;
		if ( v8ttl->IsNumber() ) {
			(*ttl) = (uint32_t) V8INTEGER_TO_CINTEGER(v8ttl);
		} else {
			return AS_NODE_PARAM_ERR;
		}
	}
	return AS_NODE_PARAM_OK;

	
}

int setTimeOut( Local<Object> obj, uint32_t *timeout)
{
	if ( obj->Has(String::NewSymbol("timeout")) ) {	
		Local<Value> v8timeout = obj->Get(String::NewSymbol("timeout")) ;
		if ( v8timeout->IsNumber() ) {
			(*timeout) = (uint32_t) V8INTEGER_TO_CINTEGER(v8timeout);
		}else {
			return AS_NODE_PARAM_ERR;
		}
	} 
	return AS_NODE_PARAM_OK;
	
}

int setGeneration( Local<Object> obj, uint16_t * generation)
{
	if ( obj->Has(String::NewSymbol("gen")) ) {
		Local<Value> v8gen = obj->Get(String::NewSymbol("gen"));
		if ( v8gen->IsNumber() ) {
			(*generation) = (uint16_t) V8INTEGER_TO_CINTEGER(v8gen);
		}else {
			return AS_NODE_PARAM_ERR;
		}
	} 
	return AS_NODE_PARAM_OK;
	
}

int setPolicyGeneric(Local<Object> obj, const char *policyname, int *policyEnumValue) 
{
	if ( obj->Has(String::NewSymbol(policyname)) ) {
		Local<Value> policy = obj->Get(String::NewSymbol(policyname));

		// Check if node layer is passing a legal integer value
		if (policy->IsNumber()) {
			*policyEnumValue = V8INTEGER_TO_CINTEGER(policy);
		} else {	
			//Something other than expected type which is Number
			return AS_NODE_PARAM_ERR;
		}
	} 
	// The policyEnumValue will/should be inited to the default value by the caller
	// So, do not change anything if we get an non-integer from node layer
	return AS_NODE_PARAM_OK;
	
}

int setKeyPolicy( Local<Object> obj, as_policy_key *keypolicy)
{
	return setPolicyGeneric(obj, "key", (int *) keypolicy);
}

int setGenPolicy( Local<Object> obj, as_policy_gen * genpolicy)
{
	return setPolicyGeneric(obj, "gen", (int *) genpolicy);
}

int setRetryPolicy( Local<Object> obj, as_policy_retry * retrypolicy) 
{
	return setPolicyGeneric(obj, "retry", (int *) retrypolicy);
}
	
int setExistsPolicy( Local<Object> obj, as_policy_exists * existspolicy)
{
	return setPolicyGeneric(obj, "exists", (int *) existspolicy);
}

int infopolicy_from_jsobject( as_policy_info * policy, Local<Object> obj)
{
	as_policy_info_init(policy);
	if ( setTimeOut( obj, &policy->timeout) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

	if ( obj->Has(String::NewSymbol("send_as_is")) ) {	
		Local<Value> v8send_as_is = obj->Get(String::NewSymbol("send_as_is"));
		if ( v8send_as_is->IsBoolean() ) {
			policy->send_as_is = v8send_as_is->ToBoolean()->Value();
		} else {
			return AS_NODE_PARAM_ERR;
		}
	}
	if ( obj->Has(String::NewSymbol("check_bounds")) ) {	
		Local<Value> v8check_bounds = obj->Get(String::NewSymbol("check_bounds"));
		if ( v8check_bounds->IsBoolean() ) {
			policy->check_bounds = v8check_bounds->ToBoolean()->Value();
		} else {
			return AS_NODE_PARAM_ERR;
		}
	}

	return 	AS_NODE_PARAM_OK;
}
int operatepolicy_from_jsobject( as_policy_operate * policy, Local<Object> obj)
{
	as_policy_operate_init( policy);

	if ( setTimeOut( obj, &policy->timeout) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setGenPolicy( obj, &policy->gen) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setRetryPolicy( obj, &policy->retry) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setKeyPolicy( obj, &policy->key) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

	return AS_NODE_PARAM_OK;
}

int batchpolicy_from_jsobject( as_policy_batch * policy, Local<Object> obj)
{

	as_policy_batch_init(policy);

	if ( setTimeOut( obj, &policy->timeout) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

	return AS_NODE_PARAM_OK;
}

int removepolicy_from_jsobject( as_policy_remove * policy, Local<Object> obj)
{

	as_policy_remove_init(policy);

	if ( setTimeOut( obj, &policy->timeout) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setGeneration( obj, &policy->generation) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setRetryPolicy( obj, &policy->retry) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setKeyPolicy( obj, &policy->key) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

	return AS_NODE_PARAM_OK;
}

int readpolicy_from_jsobject( as_policy_read * policy, Local<Object> obj)
{
	as_policy_read_init( policy );

	if ( setTimeOut( obj, &policy->timeout) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setKeyPolicy( obj, &policy->key) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

	return AS_NODE_PARAM_OK;
}

int writepolicy_from_jsobject( as_policy_write * policy, Local<Object> obj)
{

	as_policy_write_init( policy );	

	if ( setTimeOut( obj, &policy->timeout) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setGenPolicy( obj, &policy->gen) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setRetryPolicy( obj, &policy->retry) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setKeyPolicy( obj, &policy->key) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setExistsPolicy( obj, &policy->exists) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

	return AS_NODE_PARAM_OK;
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

int key_from_jsobject(as_key * key, Local<Object> obj)
{
	// Every v8 object has be declared/accessed inside a scope, and the 
	// scope has to be closed to avoid memory leak.
	// Open a scope
	HandleScope scope;
	as_namespace ns = { '\0' };
	as_set set = { '\0' };

	// All the v8 local variables have to declared before any of the goto
	// statements. V8 demands that.
	Local<Value> ns_obj = obj->Get(String::NewSymbol("ns"));
	Local<Value> val_obj = obj->Get(String::NewSymbol("key"));
	if (obj->Has(String::NewSymbol("set"))) {
		Local<Value> set_obj = obj->Get(String::NewSymbol("set"));
		if ( set_obj->IsString() ) {
			strncpy(set, *String::Utf8Value(set_obj), AS_SET_MAX_SIZE);
		}
		else {
			goto ReturnError;
		}	
		if ( strlen(set) == 0 ) {
			goto ReturnError;
		}
	}

	if ( ns_obj->IsString() ) {
		strncpy(ns, *String::Utf8Value(ns_obj), AS_NAMESPACE_MAX_SIZE);
	}
	else {
		goto ReturnError;
	}
	
	if ( strlen(ns) == 0 ) {
		goto ReturnError;
	}

	if ( val_obj->IsString() ) {
		char * value = strdup(*String::Utf8Value(val_obj));
		as_key_init(key, ns, set, value);
		((as_string *) key->valuep)->free = true;
		goto ReturnOk;
	}
	else if ( val_obj->IsNumber() ) {
		int64_t value = V8INTEGER_TO_CINTEGER(val_obj);
		as_key_init_int64(key, ns, set, value);
		goto ReturnOk;
	}
	else if ( val_obj->IsObject() ) {
		Local<Object> obj = val_obj->ToObject();
		int len ;
		uint8_t* data ;
		if (extract_blob_from_jsobject(obj, &data, &len) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_key_init_raw(key, ns, set, data, len);

	}


// close the scope, so that garbage collector can collect the v8 variables.
ReturnOk:
	scope.Close(Undefined());
	return AS_NODE_PARAM_OK;

ReturnError:
	scope.Close(Undefined());
	return AS_NODE_PARAM_ERR;
}

int key_from_jsarray(as_key * key, Local<Array> arr)
{
	HandleScope scope;
	as_namespace ns = { '\0' };
	as_set set = { '\0' };


	Local<Value> ns_obj = arr->Get(0);
	Local<Value> set_obj = arr->Get(1);
	Local<Value> val_obj = arr->Get(2);
	if ( arr->Length() != 3 ) {
		goto Ret_Err;
	}
	if ( ns_obj->IsString() ) {
		strncpy(ns, *String::Utf8Value(ns_obj), AS_NAMESPACE_MAX_SIZE);
	}
	else {
		goto Ret_Err;
	}
	
	if ( strlen(ns) == 0 ) {
		goto Ret_Err;
	}
	
	if ( set_obj->IsString() ) {
		strncpy(set, *String::Utf8Value(set_obj), AS_SET_MAX_SIZE);
	}
	else {
		goto Ret_Err;
	}

	if ( strlen(set) == 0 ) {
		goto Ret_Err;
	}

	if ( val_obj->IsString() ) {
		char * value = strdup(*String::Utf8Value(val_obj));
		as_key_init(key, ns, set, value);
		((as_string *) key->valuep)->free = true;
		goto Ret_Ok;
	}
	else if ( val_obj->IsNumber() ) {
		int64_t value = V8INTEGER_TO_CINTEGER(val_obj);
		as_key_init_int64(key, ns, set, value);
		goto Ret_Ok;
	}

Ret_Ok:
	scope.Close(Undefined());
	return AS_NODE_PARAM_OK;

Ret_Err:
	scope.Close(Undefined());	
	return AS_NODE_PARAM_ERR;
}

int batch_from_jsarray(as_batch *batch, Local<Array> arr)
{
	uint32_t capacity = arr->Length();

	if(capacity > 0) {
		as_batch_init(batch, capacity);
	} else {
		return AS_NODE_PARAM_ERR;
	}
	for ( uint32_t i=0; i < capacity; i++) {
		Local<Object> key = arr->Get(i)->ToObject();
		key_from_jsobject(as_batch_keyat(batch, i), key);
	}

	return AS_NODE_PARAM_OK;
}

int GetBinName( char** binName, Local<Object> obj) {
	Local<Value> val = obj->Get(String::NewSymbol("bin_name"));
	if ( !val->IsString()) {
		return AS_NODE_PARAM_ERR;
	}
	(*binName) = strdup(*String::Utf8Value(val));
	return AS_NODE_PARAM_OK;
}

Local<Value> GetBinValue( Local<Object> obj) {
	HandleScope scope;
	Local<Value> val = obj->Get(String::NewSymbol("bin_value"));
	return scope.Close(val);
}
int populate_write_op ( as_operations * op, Local<Object> obj) 
{
	if ( op == NULL ) { return AS_NODE_PARAM_ERR; }
	char* binName;
	if ( GetBinName(&binName, obj) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> v8val = GetBinValue(obj);
	if ( v8val->IsNumber() ) {
		int64_t val = v8val->IntegerValue();
		as_operations_add_write_int64(op, binName, val);
		if ( binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	}
	else if ( v8val->IsString() ) {
		char* binVal = strdup(*String::Utf8Value(v8val)); 	
		as_operations_add_write_str(op, binName, binVal);
		if ( binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	}			
	else if ( v8val->IsObject() ) {
		Local<Object> binObj = v8val->ToObject();
		int len ;
		uint8_t* data ;
		if ( extract_blob_from_jsobject(obj, &data, &len) != AS_NODE_PARAM_OK) {	
			return AS_NODE_PARAM_ERR;
		}
		as_operations_add_write_raw(op, binName, data, len);
		if ( binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	}
	else {
		return AS_NODE_PARAM_ERR;
	}
}

int populate_read_op( as_operations * ops, Local<Object> obj) 
{
	if ( ops == NULL ) { return AS_NODE_PARAM_ERR; }
	char* binName;
	if ( GetBinName(&binName, obj) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}
	as_operations_add_read(ops, binName);
	if ( binName != NULL) free(binName);
	return AS_NODE_PARAM_OK;
}

int populate_incr_op ( as_operations * ops, Local<Object> obj) 
{
	
	if ( ops == NULL ) { return AS_NODE_PARAM_ERR; }
	char* binName;
	if ( GetBinName(&binName, obj) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> v8val = GetBinValue(obj);
	if ( v8val->IsNumber()) {
		int64_t binValue = v8val->IntegerValue();
		as_operations_add_incr( ops, binName, binValue);
		if (binName != NULL) free (binName);
		return AS_NODE_PARAM_OK;
	}else {
		return AS_NODE_PARAM_ERR;
	}
}

int populate_prepend_op( as_operations* ops, Local<Object> obj)
{
	
	if ( ops == NULL ) { return AS_NODE_PARAM_ERR; }
	char* binName;
	if ( GetBinName(&binName, obj) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> v8val = GetBinValue(obj);
	if ( v8val->IsString() ) {
		char* binVal = strdup(*String::Utf8Value(v8val)); 	
		as_operations_add_prepend_strp(ops, binName, binVal, true);
		if ( binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	}			
	else if ( v8val->IsObject() ) {
		Local<Object> binObj = v8val->ToObject();
		int len ;
		uint8_t* data ;
		if (extract_blob_from_jsobject(obj, &data, &len) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_operations_add_prepend_raw(ops, binName, data, len);
		if ( binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	}
	else {
		return AS_NODE_PARAM_ERR;
	}
}
	

int populate_append_op( as_operations * ops, Local<Object> obj)
{
	if ( ops == NULL ) { return AS_NODE_PARAM_ERR; }
	char* binName;
	if ( GetBinName(&binName, obj) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> v8val = GetBinValue(obj);
	if ( v8val->IsString() ) {
		char* binVal = strdup(*String::Utf8Value(v8val));
		as_operations_add_append_strp(ops, binName, binVal,true);
		if ( binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	}			
	else if ( v8val->IsObject() ) {
		Local<Object> binObj = v8val->ToObject();
		int len ;
		uint8_t* data ;
		if (extract_blob_from_jsobject(obj, &data, &len) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_operations_add_append_raw(ops, binName, data, len);
		if (binName != NULL) free(binName);
		return AS_NODE_PARAM_OK;
	}
	else {
		return AS_NODE_PARAM_ERR;
	}
}

int populate_touch_op( as_operations* ops)
{
	if ( ops == NULL) return AS_NODE_PARAM_ERR;

	as_operations_add_touch(ops);
	return AS_NODE_PARAM_OK;
}
int operations_from_jsarray( as_operations * ops, Local<Array> arr) 
{

	uint32_t capacity = arr->Length();
	if ( capacity > 0 ) {
		as_operations_init( ops, capacity );
	} else {
		return AS_NODE_PARAM_ERR;
	}
	for ( uint32_t i = 0; i < capacity; i++ ) {
		Local<Object> obj = arr->Get(i)->ToObject();
		Local<Value> v8op = obj->Get(String::NewSymbol("operation"));
		if ( v8op->IsNumber() ) {
			as_operator op = (as_operator) v8op->ToInteger()->Value();
			switch ( op ) {
				case AS_OPERATOR_WRITE: 
					{
						populate_write_op(ops, obj);
						break;
					}
				case AS_OPERATOR_READ:
					{
						populate_read_op(ops, obj);
						break;
					}
				case AS_OPERATOR_INCR: 
					{
						populate_incr_op(ops, obj);
						break;
					}
				case AS_OPERATOR_PREPEND:
					{
						populate_prepend_op(ops, obj);
						break;
					}
				case AS_OPERATOR_APPEND:
					{
						populate_append_op(ops, obj);
						break;
					}
				case AS_OPERATOR_TOUCH:
					{
						populate_touch_op(ops);
						break;
					}
				default :
					return AS_NODE_PARAM_ERR;
			}
		}
	}
	return AS_NODE_PARAM_OK;

}
