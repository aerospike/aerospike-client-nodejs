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
#include <inttypes.h>

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/aerospike_key.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_key.h>
    #include <aerospike/as_record.h>
    #include <aerospike/as_record_iterator.h>
    #include <aerospike/aerospike_batch.h>  
    #include <aerospike/aerospike_scan.h>  
    #include <aerospike/as_arraylist.h>
    #include <aerospike/as_arraylist_iterator.h>
    #include <aerospike/as_hashmap.h>
    #include <aerospike/as_hashmap_iterator.h>
    #include <aerospike/as_pair.h>
    #include <aerospike/as_scan.h>
    #include <aerospike/as_map.h>
    #include <aerospike/as_nil.h>
    #include <aerospike/as_stringmap.h>
    #include <citrusleaf/alloc.h>
}

#include "../client.h"
#include "conversions.h"
#include "log.h"
#include "../enums/enums.h"

using namespace node;
using namespace v8;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

int config_from_jsobject(as_config * config, Local<Object> obj, LogInfo * log)
{

    Local<Value> hosts = obj->Get(String::NewSymbol("hosts"));

    if(hosts->IsArray()) {
        Local<Array> hostlist = Local<Array>::Cast(hosts);
        for ( uint32_t i=0; i<hostlist->Length(); i++) {

            Local<Value> addr = hostlist->Get(i)->ToObject()->Get(String::NewSymbol("addr"));
            Local<Value> port = hostlist->Get(i)->ToObject()->Get(String::NewSymbol("port"));


            if ( addr->IsString() ) {
                config->hosts[i].addr = strdup(*String::Utf8Value(addr));
                as_v8_detail(log,"host[%d].addr = \"%s\"", i, config->hosts[i].addr);
            }
            else {
                as_v8_error(log, "host[%d].addr should be an string", i);
                return AS_NODE_PARAM_ERR;
            }

            if ( port->IsNumber() ) {   
                config->hosts[i].port = V8INTEGER_TO_CINTEGER(port);        
                as_v8_detail(log,"host[%d].port = %d", i, config->hosts[i].port);
            }
            else {
                as_v8_error(log, "host[%d].port should be an integer", i);
                return AS_NODE_PARAM_ERR;
            }
        }
    }
    else{
        as_v8_error(log, "Host list has to be an array");
        return AS_NODE_PARAM_ERR;
    }

    if ( obj->Has(String::NewSymbol("policies"))){

        Local<Value> policy_val = obj->Get(String::NewSymbol("policies"));

        if ( policy_val->IsObject() ){
            Local<Object> policies = policy_val->ToObject();
            if (policies->Has(String::NewSymbol("timeout"))) {
                Local<Value> v8timeout = policies->Get(String::NewSymbol("timeout"));
                config->policies.timeout = V8INTEGER_TO_CINTEGER(v8timeout);
            }
            if ( policies->Has(String::NewSymbol("read") )){
                Local<Value> readpolicy = policies->Get(String::NewSymbol("read"));
                if ( readpolicy_from_jsobject(&config->policies.read, readpolicy->ToObject(), log)  != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if ( policies->Has(String::NewSymbol("write"))){
                Local<Value> writepolicy = policies->Get(String::NewSymbol("write"));
                if( writepolicy_from_jsobject(&config->policies.write, writepolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if ( policies->Has(String::NewSymbol("remove"))){
                Local<Value> removepolicy = policies->Get(String::NewSymbol("remove"));
                if( removepolicy_from_jsobject(&config->policies.remove, removepolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if ( policies->Has(String::NewSymbol("batch"))){
                Local<Value> batchpolicy = policies->Get(String::NewSymbol("batch"));
                if( batchpolicy_from_jsobject(&config->policies.batch, batchpolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if ( policies->Has(String::NewSymbol("operate"))){
                Local<Value> operatepolicy = policies->Get(String::NewSymbol("operate"));
                if( operatepolicy_from_jsobject(&config->policies.operate, operatepolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if ( policies->Has(String::NewSymbol("info"))){
                Local<Value> infopolicy = policies->Get(String::NewSymbol("info"));
                if( infopolicy_from_jsobject(&config->policies.info, infopolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }

        }
        as_v8_debug(log, "Parsing global policies : Done");
    }
    return AS_NODE_PARAM_OK;
}

int host_from_jsobject( Local<Object> obj, char **addr, uint16_t * port, LogInfo * log)
{
    if (obj->Has(String::New("addr")) ) {
        Local<Value> addrVal = obj->Get(String::NewSymbol("addr"));
        if ( addrVal->IsString() ) {
            *addr = (char*) malloc (HOST_ADDRESS_SIZE);
            strcpy(*addr, *String::Utf8Value(addrVal->ToString()));
            as_v8_detail(log, "host addr : %s", (*addr));
        }
        else {
            return AS_NODE_PARAM_ERR;
        }
    }

    if ( obj->Has(String::New("port")) ){
        Local<Value> portVal = obj->Get(String::NewSymbol("port"));
        if ( portVal->IsNumber() ) {
            *port = V8INTEGER_TO_CINTEGER(portVal);
        }
        else {
            return AS_NODE_PARAM_ERR;
        }
    }

    return AS_NODE_PARAM_OK;
}

int log_from_jsobject( LogInfo * log, Local<Object> obj)
{
    int rc = AS_NODE_PARAM_OK;
    int level = log->severity;
    int fd = log->fd;

    if ( obj->IsObject() ) {
        Local<Object> v8_log = obj->ToObject();

        // `level` is optional
        if ( rc == AS_NODE_PARAM_OK && v8_log->Has(String::New("level")) ) {
            Local<Value> v8_log_level = v8_log->Get(String::NewSymbol("level"));
            if ( v8_log_level->IsNumber() ){
                level = (as_log_level) V8INTEGER_TO_CINTEGER(v8_log_level);
            }
            else if ( v8_log_level->IsNull() || v8_log_level->IsUndefined() ){
                // `null` and `undefined` imply the value should not change.
            }
            else {
                // Any other value is a bad parameter
                rc = AS_NODE_PARAM_ERR;
            }
        }
        
        // `file` is optional
        if ( rc == AS_NODE_PARAM_OK && v8_log->Has(String::NewSymbol("file"))) {
            Local<Value> v8_file = obj->Get(String::NewSymbol("file"));
            if ( v8_file->IsNumber() ) {
                fd = V8INTEGER_TO_CINTEGER(v8_file);
            }
            else if (v8_file->IsNull() || v8_file->IsUndefined()){
                // `null` and `undefined` imply the value should not change.
            }
            else {
                // Any other value is a bad parameter
                rc = AS_NODE_PARAM_ERR;
            }
        }
    }
    else {
        // The value should be an object. Otherwise it should fail.
        rc = AS_NODE_PARAM_ERR;
    }

    // Only if no error occurred do we set the log values.
    if ( rc == AS_NODE_PARAM_OK ) {
        log->severity = (as_log_level) level;
        log->fd = fd;
    }

    return AS_NODE_PARAM_OK;
}
as_val* asval_clone( as_val* val, LogInfo* log)
{
    as_val_t t = as_val_type( (as_val*)val);
    as_val* clone_val = NULL;
    switch(t) {
        case AS_INTEGER: {
            as_integer* int_val = as_integer_fromval( val );
            int64_t ival        = as_integer_get( int_val);
            as_v8_detail(log, "Cloning Integer value %d", ival);
            clone_val = as_integer_toval(as_integer_new(ival)); 
            break;
        }
        case AS_STRING: {
            as_string* str_val = as_string_fromval( val );
            char* strval = as_string_get( str_val);
            as_v8_detail(log, "Cloning String  value %s", strval);
            char* clone_str = (char*) cf_strdup( strval);
            clone_val = as_string_toval( as_string_new(clone_str, true));
            break;
        }
        case AS_BYTES: {
            as_bytes* bytes_val = as_bytes_fromval( val);
            size_t size         = as_bytes_size(bytes_val);
            uint8_t *bytes      = (uint8_t*) cf_malloc(size);
            memcpy(bytes, as_bytes_get(bytes_val), size);
            as_v8_detail(log, "Cloning Blob value %u ", bytes);
            clone_val = as_bytes_toval(as_bytes_new_wrap( bytes, size, true));    
            break;
        }
        case AS_LIST: {
                as_arraylist* list      = (as_arraylist*) as_list_fromval( val); 
                clone_val =  as_list_toval( (as_list*)as_arraylist_new(as_arraylist_size(list), list->block_size));
                as_arraylist_iterator it;
                as_arraylist_iterator_init( &it, list);
                int index = 0;
                as_v8_detail(log, "Cloning a list value of size %d ", as_arraylist_size(list));
                while( as_arraylist_iterator_has_next( &it)) {
                    as_val* arr_element   = (as_val*) as_arraylist_iterator_next( &it);
                    as_val* clone_element = asval_clone( arr_element, log);
                    as_arraylist_set((as_arraylist*) clone_val, index++, clone_element);
                }
                as_v8_detail(log, "Cloning a list SUCCESS");
                break;
        }
        case AS_MAP: {
                as_hashmap* map         = (as_hashmap*) as_map_fromval(val);
                clone_val               = as_map_toval( (as_map*)as_hashmap_new(as_hashmap_size(map)));
                as_hashmap_iterator it;
                as_hashmap_iterator_init( &it, map);
                while( as_hashmap_iterator_has_next( &it )) {
                    as_pair* pair   = (as_pair*) as_hashmap_iterator_next( &it);
                    as_val* orig_key     = as_pair_1(pair); 
                    as_val* orig_val     = as_pair_2(pair);
                    as_val* clone_key    = asval_clone( orig_key, log);
                    as_val* clone_mapval = asval_clone( orig_val, log);
                    as_hashmap_set( (as_hashmap*) clone_val, clone_key, clone_mapval);
                }
                as_v8_detail( log, "Cloning a map SUCCESS");
                break;
        }
        default:
            as_v8_error( log, "as_val received is UNKNOWN type");
            break;
    }
    return clone_val;
}
bool key_clone(const as_key* src, as_key** dest, LogInfo * log)
{
    if ( src == NULL || dest == NULL ) {
        as_v8_info(log, "Parameter error : NULL in source/destination");
        return false;
    }
    as_v8_detail(log, "Cloning the key");
    as_key_value* val           = src->valuep;
    as_key_value* clone_val     = (as_key_value*) asval_clone( (as_val*) val, log);
    *dest                       = as_key_new_value( src->ns, src->set, (as_key_value*) clone_val);
    return true;
}

bool record_clone(const as_record* src, as_record** dest, LogInfo * log) 
{
    if(src == NULL || dest == NULL) {
        return false;
    }
    as_v8_detail( log, "Cloning the record");
    (*dest)->ttl = src->ttl;
    (*dest)->gen = src->gen;
    as_record_iterator it;
    as_record_iterator_init(&it, src);

    while (as_record_iterator_has_next(&it)) {
        as_bin * bin            = as_record_iterator_next(&it);
        as_bin_value * val      = as_bin_get_value(bin);
        as_bin_value* clone_val = (as_bin_value*) asval_clone( (as_val*) val, log);
        as_v8_detail(log, "Bin Name: %s", as_bin_get_name(bin));
        as_record_set( *dest, as_bin_get_name(bin), clone_val);

    }       

    return true;
}

Handle<Object> error_to_jsobject(as_error * error, LogInfo * log)
{
    HANDLESCOPE;  
    Local<Object> err = Object::New();
    
    if (error == NULL) {
        as_v8_info(log, "error(C structure) object is NULL, node.js error object cannot be constructed");
        return scope.Close(err);
    }

    err->Set(String::NewSymbol("code"), Integer::New(error->code));
    err->Set(String::NewSymbol("message"), error->message[0] != '\0' ? String::NewSymbol(error->message) : Null() );
    err->Set(String::NewSymbol("func"), error->func ? String::NewSymbol(error->func) : Null() );
    err->Set(String::NewSymbol("file"), error->file ? String::NewSymbol(error->file) : Null() );
    err->Set(String::NewSymbol("line"), error->line ? Integer::New(error->line) : Null() );
    
    return scope.Close(err);
}

void map_callback(const as_val* key, const as_val * val, void * udata) 
{
    
}

Handle<Value> val_to_jsvalue(as_val * val, LogInfo * log )
{
    HANDLESCOPE;
    if ( val == NULL) {
        as_v8_debug(log, "value = NULL"); 
        return scope.Close(Undefined());
    }

    switch ( as_val_type(val) ) {
        case AS_INTEGER : {
            as_integer * ival = as_integer_fromval(val);
            if ( ival ) {
                int64_t data = as_integer_getorelse(ival, -1);
                as_v8_detail(log, "value = %d ", data);
                return scope.Close(Number::New((double)data));
            }
        }
        case AS_STRING : {
            as_string * sval = as_string_fromval(val);
            if ( sval ) {
                char * data = as_string_getorelse(sval, NULL);
                as_v8_detail(log, "value = \"%s\"", data);
                return scope.Close(String::NewSymbol(data));
            }
        }
        case AS_BYTES : {
            as_bytes * bval = as_bytes_fromval(val);
            if ( bval ) {

                uint8_t * data = as_bytes_getorelse(bval, NULL);
                uint32_t size  = as_bytes_size(bval);

                as_v8_detail(log, 
                    "value = <%x %x %x%s>", 
                    size > 0 ? data[0] : 0,
                    size > 1 ? data[1] : 0,
                    size > 2 ? data[2] : 0,
                    size > 3 ? " ..." : ""
                    );

                // this constructor actually copies data into the new Buffer
                node::Buffer *buff  = node::Buffer::New((char *) data, size);

                return scope.Close(buff->handle_);
            } 
        }
        case AS_LIST : {
            as_arraylist* listval = (as_arraylist*) as_list_fromval(val);
            int size = as_arraylist_size(listval);
            Local<Array> jsarray = Array::New(size);
            for ( int i = 0; i < size; i++ ) {
                as_val * arr_val = as_arraylist_get(listval, i);
                Handle<Value> jsval = val_to_jsvalue(arr_val, log);
                jsarray->Set(i, jsval);
            }

            return scope.Close(jsarray);
        }
        case AS_MAP : {
            Local<Object> jsobj = Object::New();
            as_hashmap* map = (as_hashmap*) as_map_fromval(val);
            as_hashmap_iterator  it; 
            as_hashmap_iterator_init(&it, map);

            while ( as_hashmap_iterator_has_next(&it) ) {
                as_pair *p = (as_pair*) as_hashmap_iterator_next(&it);
                as_val* key = as_pair_1(p);
                as_val* val = as_pair_2(p);
                jsobj->Set(val_to_jsvalue(key, log), val_to_jsvalue(val, log));
            }

            return scope.Close(jsobj);
        }
        default:
            break;
    }
    return scope.Close(Undefined());
}


Handle<Object> recordbins_to_jsobject(const as_record * record, LogInfo * log )
{
    HANDLESCOPE;

    Local<Object> bins ;
    if (record == NULL) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js record object"); 
        return scope.Close(bins);
    }

    bins = Object::New();
    as_record_iterator it;
    as_record_iterator_init(&it, record);

    while ( as_record_iterator_has_next(&it) ) {
        as_bin * bin = as_record_iterator_next(&it);
        char * name = as_bin_get_name(bin);
        as_val * val = (as_val *) as_bin_get_value(bin);
        Handle<Value> obj = val_to_jsvalue(val, log );
        bins->Set(String::NewSymbol(name), obj);
		as_v8_detail(log, "Setting binname %s ", name);
    }

    return scope.Close(bins);
}

Handle<Object> recordmeta_to_jsobject(const as_record * record, LogInfo * log)
{
    HANDLESCOPE;
    Local<Object> meta;

    if(record == NULL) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js metadata object"); 
        return scope.Close(meta);
    }
    
    meta = Object::New();
    meta->Set(String::NewSymbol("ttl"), Number::New((double)record->ttl));
    as_v8_detail(log, "TTL of the record %d", record->ttl);
    meta->Set(String::NewSymbol("gen"), Integer::New(record->gen));
    as_v8_detail(log, "Gen of the record %d", record->gen);

    return scope.Close(meta);
}

Handle<Object> record_to_jsobject(const as_record * record, const as_key * key, LogInfo * log )
{
    HANDLESCOPE;
    Handle<Object> okey;

    if ( record == NULL ) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js record object"); 
        return scope.Close(okey);
    }

    okey = key_to_jsobject(key ? key : &record->key, log);
    Handle<Object> bins = recordbins_to_jsobject(record, log );
    Handle<Object> meta = recordmeta_to_jsobject(record, log);
    Local<Object> rec = Object::New();
    rec->Set(String::NewSymbol("key"), okey);
    rec->Set(String::NewSymbol("meta"), meta);
    rec->Set(String::NewSymbol("bins"), bins);

    return scope.Close(rec);
}

//Forward references;
int extract_blob_from_jsobject( Local<Object> obj, uint8_t **data, int *len, LogInfo * log );

as_val* asval_from_jsobject( Local<Value> obj, LogInfo * log)
{
    if(obj->IsNull()){
		as_v8_detail(log, "The as_val is NULL");
        return (as_val*) &as_nil;
    }
	else if(obj->IsUndefined()) {
		as_v8_error(log, "Object passed is undefined");
		return NULL;
	}
    else if(obj->IsString()){
        String::Utf8Value v(obj);
        as_string *str = as_string_new(strdup(*v), true);
        return (as_val*) str;
        
    }
    else if(obj->IsNumber()){
        as_integer *num = as_integer_new(obj->NumberValue());
        return (as_val*) num;
    }
    else if(obj->ToObject()->GetIndexedPropertiesExternalArrayDataType() == kExternalUnsignedByteArray) {
        int size ;
        uint8_t* data ;
        if (extract_blob_from_jsobject(obj->ToObject(), &data, &size, log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Extractingb blob from a js object failed");
            return NULL;
        }
        as_bytes *bytes = as_bytes_new_wrap( data, size, true);
        return (as_val*) bytes;

    } 
    else if(obj->IsArray()){
        Local<Array> js_list = Local<Array>::Cast(obj);
        as_arraylist *list = as_arraylist_new( js_list->Length(), 0);
        if (list == NULL) {
			as_v8_error(log, "List allocation failed");
            return NULL;
        }
        for ( uint32_t i = 0; i < js_list->Length(); i++ ) {
            Local<Value> val = js_list->Get(i);
            as_val* asval = asval_from_jsobject(val, log);
            as_arraylist_append(list, asval);
        }
        return (as_val*) list;

    }
    else {
        const Local<Array> props = obj->ToObject()->GetOwnPropertyNames();
        const uint32_t count = props->Length();
        as_hashmap *map = as_hashmap_new(count);
        if( map == NULL){
			as_v8_error(log, "Map allocation failed");
			return NULL;
		}
        for ( uint32_t i = 0; i < count; i++) {
            const Local<Value> name = props->Get(i);
            const Local<Value> value = obj->ToObject()->Get(name);
            String::Utf8Value n(name);
            as_val* val = asval_from_jsobject(value, log);
            as_stringmap_set((as_map*) map, *n, val);
        }
        return (as_val*) map;

    }
    return NULL;
}
int recordbins_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log)
{
    HANDLESCOPE;

    const Local<Array> props = obj->GetOwnPropertyNames();
    const uint32_t count = props->Length();
    as_record_init(rec, count);
    for ( uint32_t i = 0; i < count; i++ ) {

        const Local<Value> name = props->Get(i);
        const Local<Value> value = obj->Get(name);

        String::Utf8Value n(name);
        as_val* val = asval_from_jsobject( value, log);

        if( val == NULL) 
        {
            scope.Close(Undefined());
            return AS_NODE_PARAM_ERR;
        }
    
        switch(as_val_type(val)){
            case AS_INTEGER:
                as_record_set_integer(rec, *n, (as_integer*)val);
                break;
            case AS_STRING:
                as_record_set_string(rec, *n, (as_string*)val);
                break;
            case AS_BYTES:
                as_record_set_bytes(rec, *n, (as_bytes*) val);
                break;
            case AS_LIST:
                as_record_set_list(rec, *n, (as_list*) val);
                break;
            case AS_MAP:
                as_record_set_map(rec, *n, (as_map*) val);
                break;
            case AS_NIL:
                as_record_set_nil(rec, *n);
            default:
                break;
        }
    }

    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int recordmeta_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log)
{
    HANDLESCOPE;

    setTTL( obj, &rec->ttl, log);
    setGeneration( obj, &rec->gen, log);

    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int extract_blob_from_jsobject( Local<Object> obj, uint8_t **data, int *len, LogInfo * log)
{
    if (obj->GetIndexedPropertiesExternalArrayDataType() != kExternalUnsignedByteArray ) {
        as_v8_error(log, "The binary data is not of the type UnsignedBytes");
        return AS_NODE_PARAM_ERR;
    }

    (*len) = obj->GetIndexedPropertiesExternalArrayDataLength();
    (*data) = (uint8_t*) cf_malloc(sizeof(uint8_t) * (*len));
    memcpy((*data), static_cast<uint8_t*>(obj->GetIndexedPropertiesExternalArrayData()), (*len));

    return AS_NODE_PARAM_OK;
}
     
int setTTL ( Local<Object> obj, uint32_t *ttl, LogInfo * log)
{
    if ( obj->Has(String::NewSymbol("ttl"))) {
        Local<Value> v8ttl = obj->Get(String::NewSymbol("ttl")) ;
        if ( v8ttl->IsNumber() ) {
            (*ttl) = (uint32_t) V8INTEGER_TO_CINTEGER(v8ttl);
        }
        else {
            return AS_NODE_PARAM_ERR;
        }
    }

    return AS_NODE_PARAM_OK;
}

int setTimeOut( Local<Object> obj, uint32_t *timeout, LogInfo * log )
{
    HANDLESCOPE;

    if ( obj->Has(String::NewSymbol("timeout")) ) { 
        Local<Value> v8timeout = obj->Get(String::NewSymbol("timeout")) ;
        if ( v8timeout->IsNumber() ) {
            (*timeout) = (uint32_t) V8INTEGER_TO_CINTEGER(v8timeout);
            as_v8_detail(log, "timeout value %d", *timeout);
        }
        else {
            as_v8_error(log, "timeout should be an integer");
            scope.Close(Undefined());
            return AS_NODE_PARAM_ERR;
        }
    }
    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int setGeneration( Local<Object> obj, uint16_t * generation, LogInfo * log )
{
    if ( obj->Has(String::NewSymbol("gen")) ) {
        Local<Value> v8gen = obj->Get(String::NewSymbol("gen"));
        if ( v8gen->IsNumber() ) {
            (*generation) = (uint16_t) V8INTEGER_TO_CINTEGER(v8gen);
            as_v8_detail(log, "Generation value %d ", (*generation));
        }
        else {
            as_v8_error(log, "Generation should be an integer");
            return AS_NODE_PARAM_ERR;
        }
    }

    return AS_NODE_PARAM_OK;
}

int setPolicyGeneric(Local<Object> obj, const char *policyname, int *policyEnumValue, LogInfo * log ) 
{
    HANDLESCOPE;

    if ( obj->Has(String::NewSymbol(policyname)) ) {
        Local<Value> policy = obj->Get(String::NewSymbol(policyname));

        // Check if node layer is passing a legal integer value
        if (policy->IsNumber()) {
            *policyEnumValue = V8INTEGER_TO_CINTEGER(policy);
        }
        else {    
            as_v8_error(log, "value for %s policy must be an integer", policyname);
            //Something other than expected type which is Number
            scope.Close(Undefined());
            return AS_NODE_PARAM_ERR;
        }
    }

    // The policyEnumValue will/should be inited to the default value by the caller
    // So, do not change anything if we get an non-integer from node layer
    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int setKeyPolicy( Local<Object> obj, as_policy_key *keypolicy, LogInfo * log)
{
    HANDLESCOPE;

    if (setPolicyGeneric(obj, "key", (int *) keypolicy, log) != AS_NODE_PARAM_OK) {
        scope.Close(Undefined());
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Key policy is set to %d", *keypolicy);
    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int setGenPolicy( Local<Object> obj, as_policy_gen * genpolicy, LogInfo * log)
{
    if ( setPolicyGeneric(obj, "gen", (int *) genpolicy, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Generation policy is set to %d", *genpolicy);
    return AS_NODE_PARAM_OK;
}

int setRetryPolicy( Local<Object> obj, as_policy_retry * retrypolicy, LogInfo * log) 
{
    if (setPolicyGeneric(obj, "retry", (int *) retrypolicy, log) != AS_NODE_PARAM_OK ) {
        return AS_NODE_PARAM_OK;
    }

    as_v8_detail(log, "Retry Policy is set to %d", *retrypolicy);
    return AS_NODE_PARAM_OK;
}


int setExistsPolicy( Local<Object> obj, as_policy_exists * existspolicy, LogInfo * log)
{
    if ( setPolicyGeneric(obj, "exists", (int *) existspolicy, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Exists policy is set to %d", *existspolicy);
    return AS_NODE_PARAM_OK;
}

int infopolicy_from_jsobject( as_policy_info * policy, Local<Object> obj, LogInfo * log)
{
    as_policy_info_init(policy);
    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    if ( obj->Has(String::NewSymbol("send_as_is")) ) {  
        Local<Value> v8send_as_is = obj->Get(String::NewSymbol("send_as_is"));
        if ( v8send_as_is->IsBoolean() ) {
            policy->send_as_is = (bool) v8send_as_is->ToBoolean()->Value();
            as_v8_detail(log,"info policy send_as_is is set to %s", policy->send_as_is ? "true":"false");
        }
        else {
            as_v8_error(log, "send_as_is should be a boolean object");
            return AS_NODE_PARAM_ERR;
        }
    }
    if ( obj->Has(String::NewSymbol("check_bounds")) ) {    
        Local<Value> v8check_bounds = obj->Get(String::NewSymbol("check_bounds"));
        if ( v8check_bounds->IsBoolean() ) {
            policy->check_bounds = (bool) v8check_bounds->ToBoolean()->Value();
            as_v8_detail(log, "info policy check bounds is set to %s", policy->check_bounds ? "true" : "false");
        }
        else {
            as_v8_error(log, "check_bounds should be a boolean object");
            return AS_NODE_PARAM_ERR;
        }
    }

    return  AS_NODE_PARAM_OK;
}
int operatepolicy_from_jsobject( as_policy_operate * policy, Local<Object> obj, LogInfo * log)
{
    HANDLESCOPE;

    as_policy_operate_init( policy);

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setGenPolicy( obj, &policy->gen, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int batchpolicy_from_jsobject( as_policy_batch * policy, Local<Object> obj, LogInfo * log)
{
    HANDLESCOPE;

    as_policy_batch_init(policy);

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    
    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int removepolicy_from_jsobject( as_policy_remove * policy, Local<Object> obj, LogInfo * log)
{
    HANDLESCOPE;

    as_policy_remove_init(policy);

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setGeneration( obj, &policy->generation, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int readpolicy_from_jsobject( as_policy_read * policy, Local<Object> obj, LogInfo * log)
{
    HANDLESCOPE;

    as_policy_read_init( policy );

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    as_v8_detail(log, "Parsing read policy : success");

    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int writepolicy_from_jsobject( as_policy_write * policy, Local<Object> obj, LogInfo * log)
{

    as_policy_write_init( policy ); 

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setGenPolicy( obj, &policy->gen, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setExistsPolicy( obj, &policy->exists, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    as_v8_detail(log, "Parsing write policy : success");
    return AS_NODE_PARAM_OK;
}

int applypolicy_from_jsobject( as_policy_apply * policy, Local<Object> obj, LogInfo* log)
{
    HANDLESCOPE;

	as_policy_apply_init( policy);
	if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
	if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

	as_v8_detail( log, "Parsing apply policy : success");
    
    scope.Close(Undefined());
	return AS_NODE_PARAM_OK;
}

int scanpolicy_from_jsobject( as_policy_scan * policy, Local<Object> obj, LogInfo* log)
{
	as_policy_scan_init( policy);
	if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    if ( obj->Has(String::NewSymbol("failOnClusterChange")) ) {  
        Local<Value> failOnClusterChange = obj->Get(String::NewSymbol("failOnClusterChange"));
        if ( failOnClusterChange->IsBoolean() ) {
            policy->fail_on_cluster_change = (bool) failOnClusterChange->ToBoolean()->Value();
            as_v8_detail(log,"scan policy fail on cluster change is set to %s", policy->fail_on_cluster_change ? "true":"false");
        }
        else {
            as_v8_error(log, "failOnClusterChange should be a boolean object");
            return AS_NODE_PARAM_ERR;
        }
    }

	as_v8_detail( log, "Parsing scan policy : success");
	return AS_NODE_PARAM_OK;
}

Handle<Object> key_to_jsobject(const as_key * key, LogInfo * log)
{
    HANDLESCOPE;
    Local<Object> obj;
    if (key == NULL) {
        return scope.Close(obj);
    }

    obj = Object::New();
    if ( key->ns && strlen(key->ns) > 0 ) {
        as_v8_debug(log, "key.ns = \"%s\"", key->ns);
        obj->Set(String::NewSymbol("ns"), String::NewSymbol(key->ns));
    }

    if ( key->set && strlen(key->set) > 0 ) {
        as_v8_debug(log, "key.set = \"%s\"", key->set);
        obj->Set(String::NewSymbol("set"), String::NewSymbol(key->set));
    }

    if ( key->valuep ) {
        as_val * val = (as_val *) key->valuep;
        as_val_t type = as_val_type(val);
        switch(type) {
            case AS_INTEGER: {
                as_integer * ival = as_integer_fromval(val);
                as_v8_debug(log, "key.key = %d", as_integer_get(ival));
                obj->Set(String::NewSymbol("key"), Number::New(as_integer_get(ival)));
                break;
            }
            case AS_STRING: {
                as_string * sval = as_string_fromval(val);
                as_v8_debug(log, "key.key = \"%s\"", as_string_get(sval));
                obj->Set(String::NewSymbol("key"), String::NewSymbol(as_string_get(sval)));
                break;
            }
            case AS_BYTES: {
               as_bytes * bval = as_bytes_fromval(val);
               if ( bval ) {
                   int size = as_bytes_size(bval);
                   as_v8_debug(log,"key.key = \"%u\"", bval->value);
                   Buffer * buf = Buffer::New(size);
                   memcpy(node::Buffer::Data(buf), bval->value, size);
                   v8::Local<v8::Object> globalObj = v8::Context::GetCurrent()->Global();
                   v8::Local<v8::Function> bufferConstructor = v8::Local<v8::Function>::Cast(globalObj->Get(v8::String::New("Buffer")));
                   v8::Handle<v8::Value> constructorArgs[3] = { buf->handle_, v8::Integer::New(size), v8::Integer::New(0) };
                   v8::Local<v8::Object> actualBuffer = bufferConstructor->NewInstance(3, constructorArgs);
                   obj->Set(String::NewSymbol("key"), actualBuffer);
                   break;
               }
            }
            default:
                break;
        }
    }

    return scope.Close(obj);
}

Handle<Object> scaninfo_to_jsobject( const as_scan_info * info, LogInfo * log)
{
	HANDLESCOPE;
	Local<Object> scaninfo;

    if(info == NULL) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js metadata object"); 
        return scope.Close(scaninfo);
    }
    
    scaninfo = Object::New();
    scaninfo->Set(String::NewSymbol("progressPct"), Integer::New(info->progress_pct));
    as_v8_detail(log, "Progress pct of the scan %d", info->progress_pct);
    scaninfo->Set(String::NewSymbol("recordScanned"), Number::New(info->records_scanned));
    as_v8_detail(log, "Number of records scanned so far %d", info->records_scanned);
	scaninfo->Set(String::NewSymbol("status"), Integer::New(info->status));

    return scope.Close(scaninfo);

	
}

int key_from_jsobject(as_key * key, Local<Object> obj, LogInfo * log)
{
    // Every v8 object has be declared/accessed inside a scope, and the 
    // scope has to be closed to avoid memory leak.
    // Open a scope
    HANDLESCOPE;
    as_namespace ns = {'\0'};
    as_set set = {'\0'};


    // All the v8 local variables have to declared before any of the goto
    // statements. V8 demands that.

	if(obj->IsNull()) 
	{
		goto ReturnError;
	}	

    // get the namespace
    if ( obj->Has(String::NewSymbol("ns")) ) {
        Local<Value> ns_obj = obj->Get(String::NewSymbol("ns"));
        if ( ns_obj->IsString() ) {
            strncpy(ns, *String::Utf8Value(ns_obj), AS_NAMESPACE_MAX_SIZE);
            as_v8_detail(log, "key.ns = \"%s\"", ns);
            if ( strlen(ns) == 0 ) {
                goto ReturnError;
            }
        }
        else {
            goto ReturnError;
        }
    }
    else {
        goto ReturnError;
    }

    // get the set
    if ( obj->Has(String::NewSymbol("set")) ) {
        Local<Value> set_obj = obj->Get(String::NewSymbol("set"));
        if ( set_obj->IsString() ) {
            strncpy(set, *String::Utf8Value(set_obj), AS_SET_MAX_SIZE);
            as_v8_detail(log,"key.set = \"%s\"", set);
            if ( strlen(set) == 0 ) {
                goto ReturnError;
            }
        }
        else {
            goto ReturnError;
        }
    }

    // get the value
    if ( obj->Has(String::NewSymbol("key")) ) {
        Local<Value> val_obj = obj->Get(String::NewSymbol("key"));
		if(val_obj->IsNull()) 
		{
			goto ReturnError;
		}
        if ( val_obj->IsString() ) {
            char * value = strdup(*String::Utf8Value(val_obj));
            as_key_init(key, ns, set, value);
            as_v8_detail(log, "key.key = \"%s\"", value);
            ((as_string *) key->valuep)->free = true;
            goto ReturnOk;
        }
        else if ( val_obj->IsNumber() ) {
            int64_t value = V8INTEGER_TO_CINTEGER(val_obj);
            as_key_init_int64(key, ns, set, value);
            as_v8_detail(log, "key.key = %d", value);
            goto ReturnOk;
        }
        else if ( val_obj->IsObject() ) {
            Local<Object> obj = val_obj->ToObject();
            int size ;
            uint8_t* data ;
            if (extract_blob_from_jsobject(obj, &data, &size, log) != AS_NODE_PARAM_OK) {
                return AS_NODE_PARAM_ERR;
            }
            as_key_init_rawp(key, ns, set, data, size, true);

            as_v8_detail(log, 
                "key.key = <%x %x %x%s>", 
                size > 0 ? data[0] : 0,
                size > 1 ? data[1] : 0,
                size > 2 ? data[2] : 0,
                size > 3 ? " ..." : ""
                );
        }
    }
	else
	{
		goto ReturnError;
	}

    // close the scope, so that garbage collector can collect the v8 variables.
ReturnOk:
    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;

ReturnError:
    scope.Close(Undefined());
    return AS_NODE_PARAM_ERR;
}

int key_from_jsarray(as_key * key, Local<Array> arr, LogInfo * log)
{
    HANDLESCOPE;
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

int batch_from_jsarray(as_batch *batch, Local<Array> arr, LogInfo * log)
{
    HANDLESCOPE;

    uint32_t capacity = arr->Length();

    if(capacity > 0) {
        as_batch_init(batch, capacity);
    }
    else {
        scope.Close(Undefined());
        return AS_NODE_PARAM_ERR;
    }
    for ( uint32_t i=0; i < capacity; i++) {
        Local<Object> key = arr->Get(i)->ToObject();
        key_from_jsobject(as_batch_keyat(batch, i), key, log);
    }

    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}

int asarray_from_jsarray( as_arraylist** udfargs, Local<Array> arr, LogInfo * log)
{
	uint32_t  capacity = arr->Length();

	if ( capacity <= 0) {
		capacity = 0;
	}
	as_v8_detail(log, "Capacity of the asarray to be initialized %d", capacity);
	if ( *udfargs != NULL) {
		as_arraylist_init( *udfargs, capacity, 0);
	} else {
		*udfargs = as_arraylist_new( capacity, 0);
	}

	for ( uint32_t i = 0; i < capacity; i++) {
		as_val* val = asval_from_jsobject( arr->Get(i), log);
		as_arraylist_append(*udfargs, val);
	}
	return AS_NODE_PARAM_OK;

}

int udfargs_from_jsobject( char** filename, char** funcname, as_arraylist** args, Local<Object> obj, LogInfo * log)
{
    HANDLESCOPE;

	// Extract UDF module name
	if( obj->Has(String::NewSymbol("module"))) {
		Local<Value> module = obj->Get( String::NewSymbol("module"));
		int size = 0;

		if( module->IsString()) {
			size = module->ToString()->Length()+1;
			if( *filename == NULL) {
				*filename = (char*) cf_malloc(sizeof(char) * size);
			}
			strcpy( *filename, *String::Utf8Value(module) );
			as_v8_detail(log, "Filename in the udf args is set to %s", *filename);
		}
		else {
			as_v8_error(log, "UDF module name should be string");
            scope.Close(Undefined());
			return AS_NODE_PARAM_ERR;
		}
	}
	else {
		as_v8_error(log, "UDF module name should be passed to execute UDF");
        scope.Close(Undefined());
		return AS_NODE_PARAM_ERR;
	}

	// Extract UDF function name
	if( obj->Has(String::NewSymbol("funcname"))) { 
		Local<Value> v8_funcname = obj->Get( String::NewSymbol("funcname"));
		if ( v8_funcname->IsString()) {
			if( *funcname == NULL) {
				int size = v8_funcname->ToString()->Length();
				*funcname = (char*) cf_malloc( sizeof(char) * size);
			}
			strcpy( *funcname, *String::Utf8Value( v8_funcname));
			as_v8_detail(log, "The function name in the UDF args set to %s ", *funcname);
		}
		else {
			as_v8_error(log, "UDF function name should be string");
            scope.Close(Undefined());
			return AS_NODE_PARAM_ERR;
		}
	}
	else {
		as_v8_error(log, "UDF function name should be passed to execute UDF");
        scope.Close(Undefined());
		return AS_NODE_PARAM_ERR;
	}

	// Is it fair to expect an array always. For a single argument UDF invocation
	// should we relax.
	// Extract UDF arglist as_arraylist
	if( obj->Has( String::NewSymbol("args"))) {
		Local<Value> arglist = obj->Get( String::NewSymbol("args"));
		if ( ! arglist->IsArray()){
			as_v8_error(log, "UDF args should be an array");
            scope.Close(Undefined());
			return AS_NODE_PARAM_ERR;
		}
		asarray_from_jsarray( args, Local<Array>::Cast(arglist), log);
		as_v8_detail(log, "Parsing UDF args -- done !!!");
        scope.Close(Undefined());
		return AS_NODE_PARAM_OK;
	}
	else {
		// no argument case. Initialize array with 0 elements and invoke UDF.
		if (*args != NULL) {
			as_arraylist_init(*args, 0, 0);
		}
        scope.Close(Undefined());
		return AS_NODE_PARAM_OK;
	}
    scope.Close(Undefined());
	return AS_NODE_PARAM_OK;
}

int scan_from_jsobject( as_scan * scan, Local<Object> obj, LogInfo * log) {
	if ( scan == NULL) {
		// should never land in here.
		as_v8_error(log, "scan object is NULL, internal error");
		return AS_NODE_PARAM_ERR;
	}

	as_namespace ns = {'\0'};
	as_set set		= {'\0'};
	
	if ( obj->Has(String::NewSymbol("ns"))) {
		Local<Value> ns_obj = obj->Get(String::NewSymbol("ns"));
		if ( ! ns_obj->IsString()) {
			as_v8_error( log, "namespace for scan must be a string");
			return AS_NODE_PARAM_ERR;
		}
		strncpy( ns, *String::Utf8Value(ns_obj), AS_NAMESPACE_MAX_SIZE);
		as_v8_detail( log, "namespace for scan operation is set to value %s", ns);
	}
	else {
		as_v8_error( log, "namespace should be set for scan object");
		return AS_NODE_PARAM_ERR;
	}

	if ( obj->Has(String::NewSymbol("set"))) {
		Local<Value> set_obj = obj->Get(String::NewSymbol("set"));
		if ( !set_obj->IsString()) {
			as_v8_error( log, "set for scan must be a string");
			return AS_NODE_PARAM_ERR;
		}
		strncpy( set, *String::Utf8Value(set_obj), AS_SET_MAX_SIZE);
		as_v8_detail( log, "set for scan operation is set to value %s", set);
	}

	if( ns == NULL || set == NULL) {
		// Should never land here.
		// If one of them is not present in the object, error is returned from there.
		as_v8_error( log, "namespace/set is NULL. Internal Error !!!");
		return AS_NODE_PARAM_ERR;
	}
	as_scan_init( scan, ns, set);
	as_v8_detail( log, "scan object is initialized");
	if ( obj->Has(String::NewSymbol("noBins"))) {
		Local<Value> noBins = obj->Get(String::NewSymbol("noBins"));
		if ( ! noBins->IsBoolean()) {
			as_v8_error( log, "noBins value should be of type boolean in a scan object");
			return AS_NODE_PARAM_ERR;
		}
		scan->no_bins = (bool) noBins->ToBoolean()->Value();
		as_v8_detail( log, "no_bins value for scan operation is set to %d ", scan->no_bins);
	}
	if ( obj->Has(String::NewSymbol("concurrent"))) {
		Local<Value> concurrent = obj->Get(String::NewSymbol("concurrent"));
		if ( ! concurrent->IsBoolean()) {
			as_v8_error( log, "concurrent value in a scan object should be a boolean type");
			return AS_NODE_PARAM_ERR;
		}
		scan->concurrent = concurrent->ToBoolean()->Value();
		as_v8_detail( log, "concurrent in scan object is set to %d", scan->concurrent);
	}
	//Parsing binlist from an array of bins
	//Two APIs use this feature. 1. select and scan
	//@TO-DO  Gayathri
	//Move the parsing function to conversion.cc and use it 
	//in both APIs. -- Do not replicate code.

	if( obj->Has(String::NewSymbol("applyEach"))) {
		Local<Value> applyEach = obj->Get(String::NewSymbol("applyEach"));
		char file[255] = {'\0'};
		char* filename = file; 
		char* funcname ;  
		as_arraylist *list = NULL;
		int ret = udfargs_from_jsobject(&filename, &funcname, &list, applyEach->ToObject(), log);
		if ( funcname == NULL || filename == NULL) {
			return AS_NODE_PARAM_ERR;
		}
		if ( ret == AS_NODE_PARAM_ERR) {
			as_v8_error( log, "parsing udf args for scan failed");
			return ret;
		}
		as_v8_detail(log, "Invoking scan apply each with filename %s, funcname %s", filename, funcname);
		as_scan_apply_each( scan, (const char*)filename, (const char*) funcname, (as_list*) list);
	}
	else {
		as_v8_error( log, "applyEach value should be an argument for scan operation");
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int GetBinName( char** binName, Local<Object> obj, LogInfo * log) {

    if ( obj->Has(String::NewSymbol("bin"))) {
        Local<Value> val = obj->Get(String::NewSymbol("bin"));
        if ( !val->IsString()) {
            as_v8_error(log, "Type error in bin_name(bin should be string"); 
            return AS_NODE_PARAM_ERR;
        }
        (*binName) = strdup(*String::Utf8Value(val));
        return AS_NODE_PARAM_OK;
    } else {
        return AS_NODE_PARAM_ERR;
    }
}

Local<Value> GetBinValue( Local<Object> obj, LogInfo * log) {
    HANDLESCOPE;
    Local<Value> val = obj->Get(String::NewSymbol("value"));
    return scope.Close(val);
}

int populate_write_op ( as_operations * op, Local<Object> obj, LogInfo * log) 
{
    if ( op == NULL ) { 
        as_v8_debug(log, "operation (C structure) passed is NULL, can't parse the V8 object");
        return AS_NODE_PARAM_ERR; 
    }
    char* binName;
    if ( GetBinName(&binName, obj, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }
    as_v8_detail(log, "write operation on bin : %s", binName);

    Local<Value> v8val = GetBinValue(obj, log);
    if ( v8val->IsNumber() ) {
        int64_t val = v8val->NumberValue();
        as_v8_detail(log, "integer value to be written %d", val);
        as_operations_add_write_int64(op, binName, val);
        if ( binName != NULL) free(binName);
        return AS_NODE_PARAM_OK;
    }
    else if ( v8val->IsString() ) {
        char* binVal = strdup(*String::Utf8Value(v8val));   
        as_v8_detail(log, "String value to be written %s", binVal);
        as_operations_add_write_str(op, binName, binVal);
        if ( binName != NULL) free(binName);
        return AS_NODE_PARAM_OK;
    }
    else if ( v8val->IsObject() ) {
        Local<Object> binObj = v8val->ToObject();
        int len ;
        uint8_t* data ;
        if ( extract_blob_from_jsobject(binObj, &data, &len, log) != AS_NODE_PARAM_OK) {   
            return AS_NODE_PARAM_ERR;
        }
        as_v8_detail(log, "Blob value to be written %u ", data);
        as_operations_add_write_rawp(op, binName, data, len, true);
        if ( binName != NULL) free(binName);
        return AS_NODE_PARAM_OK;
    }
    else {
        as_v8_debug(log, "Type error in write operation");
        return AS_NODE_PARAM_ERR;
    }
}

int populate_read_op( as_operations * ops, Local<Object> obj, LogInfo * log) 
{
    if ( ops == NULL ) { 
        as_v8_debug(log, "operation (C structure) passed is NULL, can't parse the v8 object");
        return AS_NODE_PARAM_ERR; 
    }
    char* binName;
    if ( GetBinName(&binName, obj, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }
    as_v8_detail(log, "Read operation on bin :%s", binName);
    as_operations_add_read(ops, binName);
    if ( binName != NULL) free(binName);
    return AS_NODE_PARAM_OK;
}

int populate_incr_op ( as_operations * ops, Local<Object> obj, LogInfo * log) 
{

    if ( ops == NULL ) { 
        as_v8_debug(log, "operation (C structure) passed is NULL, can't parse the v8 object");
        return AS_NODE_PARAM_ERR; 
    }
    char* binName;
    if ( GetBinName(&binName, obj, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Incr operation on bin :%s", binName);
    Local<Value> v8val = GetBinValue(obj, log);
    if ( v8val->IsNumber()) {
        int64_t binValue = v8val->NumberValue();
        as_v8_detail(log, "value to be incremented %d", binValue);
        as_operations_add_incr( ops, binName, binValue);
        if (binName != NULL) free (binName);
        return AS_NODE_PARAM_OK;
    }
    else {
        as_v8_debug(log, "Type error in incr operation");
        return AS_NODE_PARAM_ERR;
    }
}

int populate_prepend_op( as_operations* ops, Local<Object> obj, LogInfo * log)
{

    if ( ops == NULL ) { 
        as_v8_debug(log, "operation (C structure) passed is NULL, can't parse the v8 object");
        return AS_NODE_PARAM_ERR; 
    }
    char* binName;
    if ( GetBinName(&binName, obj, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "prepend operation on bin :%s", binName);

    Local<Value> v8val = GetBinValue(obj, log);
    if ( v8val->IsString() ) {
        char* binVal = strdup(*String::Utf8Value(v8val));   
        as_v8_detail(log, "prepending string %s", binVal);
        as_operations_add_prepend_strp(ops, binName, binVal, true);
        if ( binName != NULL) free(binName);
        return AS_NODE_PARAM_OK;
    }
    else if ( v8val->IsObject() ) {
        Local<Object> binObj = v8val->ToObject();
        int len ;
        uint8_t* data ;
        if (extract_blob_from_jsobject(binObj, &data, &len, log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        as_v8_detail(log, "prepending raw bytes %u", data);
        as_operations_add_prepend_rawp(ops, binName, data, len, true);
        if ( binName != NULL) free(binName);
        return AS_NODE_PARAM_OK;
    }
    else {
        as_v8_debug(log, "Type error in prepend operation");
        return AS_NODE_PARAM_ERR;
    }
}


int populate_append_op( as_operations * ops, Local<Object> obj, LogInfo * log)
{
    if ( ops == NULL ) { 
        as_v8_debug(log, "operation (C structure) passed is NULL, can't parse the v8 object");
        return AS_NODE_PARAM_ERR; 
    }
    char* binName;
    if ( GetBinName(&binName, obj, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "append operation on bin :%s", binName);
    Local<Value> v8val = GetBinValue(obj, log);
    if ( v8val->IsString() ) {
        char* binVal = strdup(*String::Utf8Value(v8val));
        as_v8_detail(log, "appending string %s", binVal);
        as_operations_add_append_strp(ops, binName, binVal,true);
        if ( binName != NULL) free(binName);
        return AS_NODE_PARAM_OK;
    }
    else if ( v8val->IsObject() ) {
        Local<Object> binObj = v8val->ToObject();
        int len ;
        uint8_t* data ;
        if (extract_blob_from_jsobject(binObj, &data, &len, log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        as_v8_detail(log, "appending raw bytes %u", data);
        as_operations_add_append_rawp(ops, binName, data, len, true);
        if (binName != NULL) free(binName);
        return AS_NODE_PARAM_OK;
    }
    else {
        as_v8_debug(log, "Type error in append operation");
        return AS_NODE_PARAM_ERR;
    }
}

int populate_touch_op( as_operations* ops, LogInfo * log)
{
    if ( ops == NULL) {
        as_v8_debug(log, "operation (C structure) passed is NULL, can't parse the v8 object");
        return AS_NODE_PARAM_ERR;
    }
    
    as_operations_add_touch(ops);
    as_v8_debug(log, "Touch operation is set");
    return AS_NODE_PARAM_OK;
}

int operations_from_jsarray( as_operations * ops, Local<Array> arr, LogInfo * log) 
{
    HANDLESCOPE;

    uint32_t capacity = arr->Length();
    as_v8_detail(log, "no op operations in the array %d", capacity);
    if ( capacity > 0 ) {
        as_operations_init( ops, capacity );
    }
    else {
        scope.Close(Undefined());
        return AS_NODE_PARAM_ERR;
    }
    for ( uint32_t i = 0; i < capacity; i++ ) {
        Local<Object> obj = arr->Get(i)->ToObject();
        setTTL(obj, &ops->ttl, log);
        Local<Value> v8op = obj->Get(String::NewSymbol("operation"));
        if ( v8op->IsNumber() ) {
            as_operator op = (as_operator) v8op->ToInteger()->Value();
            switch ( op ) {
                case AS_OPERATOR_WRITE: {
                    populate_write_op(ops, obj, log);
                    break;
                }
                case AS_OPERATOR_READ: {
                    populate_read_op(ops, obj, log);
                    break;
                }
                case AS_OPERATOR_INCR:  {
                    populate_incr_op(ops, obj, log);
                    break;
                }
                case AS_OPERATOR_PREPEND: {
                    populate_prepend_op(ops, obj, log);
                    break;
                }
                case AS_OPERATOR_APPEND: {
                    populate_append_op(ops, obj, log);
                    break;
                }
                case AS_OPERATOR_TOUCH: {
                    populate_touch_op(ops, log);
                    break;
                }
                default :
                    as_v8_info(log, "Operation Type not supported by the API");
                    scope.Close(Undefined());
                    return AS_NODE_PARAM_ERR;
            }
        }
    }
    scope.Close(Undefined());
    return AS_NODE_PARAM_OK;
}
