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
    if ( obj->IsObject() ){
        Local<Object> v8_log         = obj->ToObject();
        if (v8_log->Has(String::New("level"))) {
            Local<Value> v8_log_level    = v8_log->Get(String::NewSymbol("level"));
            if ( v8_log_level->IsNumber()){
                log->severity = (as_log_level) V8INTEGER_TO_CINTEGER(v8_log_level);
            } else {
                fprintf(stderr, "Log level should be an integer less than 4\n");
                return AS_NODE_PARAM_ERR;
            }
        }
        if ( v8_log->Has(String::NewSymbol("log_file"))) {
            Local<Value> v8_path = obj->Get(String::NewSymbol("log_file"));
            if ( v8_path->IsString()) {
                log->fd = open(*String::Utf8Value(v8_path),O_CREAT, O_RDWR);    
            }
            as_v8_debug(log, "log file at location %s", *String::Utf8Value(v8_path));
            return AS_NODE_PARAM_OK;
        }
        else {
            log->fd = 2;
            as_v8_debug(log, "redirecting log to stderr");
            return AS_NODE_PARAM_OK;
        }
    }else {
        fprintf(stderr, "Log value should be an object \n");
        return AS_NODE_PARAM_ERR;
    }

    return AS_NODE_PARAM_ERR;

}
#if 0
// Add the element to the list.
void AddElement(llist **list, void * element)
{

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
#endif

bool key_clone(const as_key* src, as_key** dest, LogInfo * log)
{
    if(src == NULL || dest == NULL) {
        as_v8_info(log, "Parameter error : NULL in source/destination");
        return false;
    }

    as_key_value* val = src->valuep;
    as_val_t t = as_val_type((as_val*)val);
    switch(t){
        case AS_INTEGER: {
                             as_v8_detail(log, "Integer key value %d", val->integer.value);
                             *dest = as_key_new_int64(src->ns, src->set, val->integer.value);
                             break;
                         }
        case AS_STRING: {
                            char* strval = strdup(val->string.value);
                            as_v8_detail(log, "String key value %s", strval);
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

bool record_clone(const as_record* src, as_record** dest, LogInfo * log) 
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
        as_v8_detail(log, "Bin Name: %s", as_bin_get_name(bin));
        switch(t) {
            case AS_INTEGER: {
                                 as_v8_detail(log, "Integer bin value %d", val->integer.value);
                                 as_record_set_int64(*dest, as_bin_get_name(bin), val->integer.value); 
                                 break;

                             }
            case AS_STRING: {
                                char* strval = strdup(val->string.value);
                                as_v8_detail(log, "String bin value %s", strval);
                                as_record_set_strp(*dest, as_bin_get_name(bin), strval, true);
                                break;
                            }
            case AS_BYTES: {
                               size_t size = val->bytes.size;
                               uint8_t *bytes = (uint8_t*) malloc(size);
                               memcpy(bytes, val->bytes.value, size);
                               as_v8_detail(log, "Blob bin value %u ", bytes);
                               as_record_set_rawp(*dest, as_bin_get_name(bin), bytes, size, true);
                               break;
                           }

            default:
                           break;
        }
    }           

    return true;
}

Handle<Object> error_to_jsobject(as_error * error, LogInfo * log)
{
    HandleScope scope;  
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

// This callback is called by v8 garbage collector, when Buffer object 
// is garbage collected. 
void callback(char* data, void * ptr) 
{
    if ( ptr != NULL) {
        free(ptr);
    }
}

Handle<Value> val_to_jsvalue(as_val * val, LogInfo * log )
{
    HandleScope scope;
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
                
                return scope.Close(Integer::New(data));
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
                node::Buffer * buff  = node::Buffer::New((char *) data, size);

                return scope.Close(buff->handle_);
            } 
        }
        default:
            break;
    }
    return scope.Close(Undefined());
}


Handle<Object> recordbins_to_jsobject(const as_record * record, LogInfo * log )
{
    HandleScope scope;

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
    }
    return scope.Close(bins);
}

Handle<Object> recordmeta_to_jsobject(const as_record * record, LogInfo * log)
{
    HandleScope scope;
    Local<Object> meta ;
    if(record == NULL) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js metadata object"); 
        return scope.Close(meta);
    }
    meta = Object::New();
    meta->Set(String::NewSymbol("ttl"), Integer::New(record->ttl));
    meta->Set(String::NewSymbol("gen"), Integer::New(record->gen));
    return scope.Close(meta);
}

Handle<Object> record_to_jsobject(const as_record * record, const as_key * key, LogInfo * log )
{
    HandleScope scope;

    Handle<Object> okey;

    if(record == NULL) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js record object"); 
        return scope.Close(okey);
    }
    okey    = key_to_jsobject(key ? key : &record->key, log);
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

int recordbins_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log)
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
            if (extract_blob_from_jsobject(obj, &data, &len, log) != AS_NODE_PARAM_OK) {
                return AS_NODE_PARAM_ERR;
            }
            as_record_set_rawp(rec, *n, data, len, true);
            //as_record_get_bytes(rec, *n)->free = true;

        }
        else {
            return AS_NODE_PARAM_ERR;
        }
    }

    return AS_NODE_PARAM_OK;
}

int recordmeta_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log)
{
    setTTL( obj, &rec->ttl, log);
    setGeneration( obj, &rec->gen, log);

    return AS_NODE_PARAM_OK;
}

int extract_blob_from_jsobject( Local<Object> obj, uint8_t **data, int *len, LogInfo * log)
{

    if (obj->GetIndexedPropertiesExternalArrayDataType() != kExternalUnsignedByteArray ) {
        as_v8_error(log, "The binary data is not of the type UnsignedBytes");
        return AS_NODE_PARAM_ERR;
    }
    (*len) = obj->GetIndexedPropertiesExternalArrayDataLength();
    (*data) = (uint8_t*) malloc(sizeof(uint8_t) * (*len));
    memcpy((*data), static_cast<uint8_t*>(obj->GetIndexedPropertiesExternalArrayData()), (*len)); 
    return AS_NODE_PARAM_OK;
}
int setTTL ( Local<Object> obj, uint32_t *ttl, LogInfo * log)
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

int setTimeOut( Local<Object> obj, uint32_t *timeout, LogInfo * log )
{
    if ( obj->Has(String::NewSymbol("timeout")) ) { 
        Local<Value> v8timeout = obj->Get(String::NewSymbol("timeout")) ;
        if ( v8timeout->IsNumber() ) {
            (*timeout) = (uint32_t) V8INTEGER_TO_CINTEGER(v8timeout);
            as_v8_detail(log, "timeout value %d", *timeout);
        }else {
            as_v8_error(log, "timeout should be an integer");
            return AS_NODE_PARAM_ERR;
        }
    } 
    return AS_NODE_PARAM_OK;

}

int setGeneration( Local<Object> obj, uint16_t * generation, LogInfo * log )
{
    if ( obj->Has(String::NewSymbol("gen")) ) {
        Local<Value> v8gen = obj->Get(String::NewSymbol("gen"));
        if ( v8gen->IsNumber() ) {
            (*generation) = (uint16_t) V8INTEGER_TO_CINTEGER(v8gen);
            as_v8_detail(log, "Generation value %d ", (*generation));
        }else {
            as_v8_error(log, "Generation should be an integer");
            return AS_NODE_PARAM_ERR;
        }
    } 
    return AS_NODE_PARAM_OK;

}

int setPolicyGeneric(Local<Object> obj, const char *policyname, int *policyEnumValue, LogInfo * log ) 
{
    if ( obj->Has(String::NewSymbol(policyname)) ) {
        Local<Value> policy = obj->Get(String::NewSymbol(policyname));

        // Check if node layer is passing a legal integer value
        if (policy->IsNumber()) {
            *policyEnumValue = V8INTEGER_TO_CINTEGER(policy);
        } else {    
            as_v8_error(log, "value for %s policy must be an integer", policyname);
            //Something other than expected type which is Number
            return AS_NODE_PARAM_ERR;
        }
    }
    // The policyEnumValue will/should be inited to the default value by the caller
    // So, do not change anything if we get an non-integer from node layer
    return AS_NODE_PARAM_OK;

}

int setKeyPolicy( Local<Object> obj, as_policy_key *keypolicy, LogInfo * log)
{
    if (setPolicyGeneric(obj, "key", (int *) keypolicy, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Key policy is set to %d", *keypolicy);
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
            policy->send_as_is = v8send_as_is->ToBoolean()->Value();
            as_v8_detail(log,"info policy send_as_is is set to %s", policy->send_as_is ? "true":"false");
        } else {
            as_v8_error(log, "send_as_is should be a boolean object");
            return AS_NODE_PARAM_ERR;
        }
    }
    if ( obj->Has(String::NewSymbol("check_bounds")) ) {    
        Local<Value> v8check_bounds = obj->Get(String::NewSymbol("check_bounds"));
        if ( v8check_bounds->IsBoolean() ) {
            policy->check_bounds = v8check_bounds->ToBoolean()->Value();
            as_v8_detail(log, "info policy check bounds is set to %s", policy->check_bounds ? "true" : "false");
        } else {
            as_v8_error(log, "check_bounds should be a boolean object");
            return AS_NODE_PARAM_ERR;
        }
    }

    return  AS_NODE_PARAM_OK;
}
int operatepolicy_from_jsobject( as_policy_operate * policy, Local<Object> obj, LogInfo * log)
{
    as_policy_operate_init( policy);

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setGenPolicy( obj, &policy->gen, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    return AS_NODE_PARAM_OK;
}

int batchpolicy_from_jsobject( as_policy_batch * policy, Local<Object> obj, LogInfo * log)
{

    as_policy_batch_init(policy);

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    return AS_NODE_PARAM_OK;
}

int removepolicy_from_jsobject( as_policy_remove * policy, Local<Object> obj, LogInfo * log)
{

    as_policy_remove_init(policy);

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setGeneration( obj, &policy->generation, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    return AS_NODE_PARAM_OK;
}

int readpolicy_from_jsobject( as_policy_read * policy, Local<Object> obj, LogInfo * log)
{
    as_policy_read_init( policy );

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    as_v8_detail(log, "Parsing read policy : success");
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

Handle<Object> key_to_jsobject(const as_key * key, LogInfo * log)
{
    HandleScope scope;
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
                                 obj->Set(String::NewSymbol("key"), Integer::New(as_integer_get(ival)));
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

int key_from_jsobject(as_key * key, Local<Object> obj, LogInfo * log)
{
    // Every v8 object has be declared/accessed inside a scope, and the 
    // scope has to be closed to avoid memory leak.
    // Open a scope
    HandleScope scope;
    as_namespace ns = {'\0'};
    as_set set = {'\0'};

    // All the v8 local variables have to declared before any of the goto
    // statements. V8 demands that.

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
            as_key_init_raw(key, ns, set, data, size);

            as_v8_detail(log, 
                "key.key = <%x %x %x%s>", 
                size > 0 ? data[0] : 0,
                size > 1 ? data[1] : 0,
                size > 2 ? data[2] : 0,
                size > 3 ? " ..." : ""
                );
        }
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

int batch_from_jsarray(as_batch *batch, Local<Array> arr, LogInfo * log)
{
    uint32_t capacity = arr->Length();

    if(capacity > 0) {
        as_batch_init(batch, capacity);
    } else {
        return AS_NODE_PARAM_ERR;
    }
    for ( uint32_t i=0; i < capacity; i++) {
        Local<Object> key = arr->Get(i)->ToObject();
        key_from_jsobject(as_batch_keyat(batch, i), key, log);
    }

    return AS_NODE_PARAM_OK;
}

int GetBinName( char** binName, Local<Object> obj, LogInfo * log) {
    Local<Value> val = obj->Get(String::NewSymbol("bin_name"));
    if ( !val->IsString()) {
        as_v8_debug(log, "Type error in bin_name(bin_name should be string"); 
        return AS_NODE_PARAM_ERR;
    }
    (*binName) = strdup(*String::Utf8Value(val));
    return AS_NODE_PARAM_OK;
}

Local<Value> GetBinValue( Local<Object> obj, LogInfo * log) {
    HandleScope scope;
    Local<Value> val = obj->Get(String::NewSymbol("bin_value"));
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
        int64_t val = v8val->IntegerValue();
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
        as_operations_add_write_raw(op, binName, data, len);
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
        int64_t binValue = v8val->IntegerValue();
        as_v8_detail(log, "value to be incremented %d", binValue);
        as_operations_add_incr( ops, binName, binValue);
        if (binName != NULL) free (binName);
        return AS_NODE_PARAM_OK;
    }else {
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
        as_operations_add_prepend_raw(ops, binName, data, len);
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
        as_operations_add_append_raw(ops, binName, data, len);
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
    return AS_NODE_PARAM_OK;
}
int operations_from_jsarray( as_operations * ops, Local<Array> arr, LogInfo * log) 
{

    uint32_t capacity = arr->Length();
    as_v8_detail(log, "no op operations in the array %d", capacity);
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
                        populate_write_op(ops, obj, log);
                        break;
                    }
                case AS_OPERATOR_READ:
                    {
                        populate_read_op(ops, obj, log);
                        break;
                    }
                case AS_OPERATOR_INCR: 
                    {
                        populate_incr_op(ops, obj, log);
                        break;
                    }
                case AS_OPERATOR_PREPEND:
                    {
                        populate_prepend_op(ops, obj, log);
                        break;
                    }
                case AS_OPERATOR_APPEND:
                    {
                        populate_append_op(ops, obj, log);
                        break;
                    }
                case AS_OPERATOR_TOUCH:
                    {
                        populate_touch_op(ops, log);
                        break;
                    }
                default :
                    as_v8_info(log, "Operation Type not supported by the API");
                    return AS_NODE_PARAM_ERR;
            }
        }
    }
    return AS_NODE_PARAM_OK;
}
