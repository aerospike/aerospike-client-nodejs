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
#include <aerospike/aerospike_batch.h>
#include <aerospike/as_config.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
#include <aerospike/as_record_iterator.h>
#include <aerospike/aerospike_batch.h>
#include <aerospike/aerospike_scan.h>
#include <aerospike/as_arraylist.h>
#include <aerospike/as_arraylist_iterator.h>
#include <aerospike/as_boolean.h>
#include <aerospike/as_geojson.h>
#include <aerospike/as_hashmap.h>
#include <aerospike/as_hashmap_iterator.h>
#include <aerospike/as_pair.h>
#include <aerospike/as_scan.h>
#include <aerospike/as_map.h>
#include <aerospike/as_nil.h>
#include <aerospike/as_stringmap.h>
#include <aerospike/as_vector.h>
#include <citrusleaf/alloc.h>
}

#include "client.h"
#include "conversions.h"
#include "log.h"
#include "enums.h"

using namespace node;
using namespace v8;

const char * DoubleType = "Double";
const char * GeoJSONType = "GeoJSON";

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/
int config_from_jsobject(as_config * config, Local<Object> obj, LogInfo * log)
{

    Local<Value> hosts = obj->Get(Nan::New("hosts").ToLocalChecked());

    if(hosts->IsArray()) {
        Local<Array> hostlist = Local<Array>::Cast(hosts);
        for ( uint32_t i=0; i<hostlist->Length(); i++) {

            Local<Value> addr = hostlist->Get(i)->ToObject()->Get(Nan::New("addr").ToLocalChecked());
            Local<Value> port = hostlist->Get(i)->ToObject()->Get(Nan::New("port").ToLocalChecked());


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

    if ( obj->Has(Nan::New("policies").ToLocalChecked())){

        Local<Value> policy_val = obj->Get(Nan::New("policies").ToLocalChecked());

        if ( policy_val->IsObject() ){
            Local<Object> policies = policy_val->ToObject();
            if (policies->Has(Nan::New("timeout").ToLocalChecked())) {
                Local<Value> v8timeout = policies->Get(Nan::New("timeout").ToLocalChecked());
                config->policies.timeout = V8INTEGER_TO_CINTEGER(v8timeout);
            }
            if (policies->Has(Nan::New("retry").ToLocalChecked())) {
                Local<Value> v8retry = policies->Get(Nan::New("retry").ToLocalChecked());
                config->policies.retry = (as_policy_retry)V8INTEGER_TO_CINTEGER(v8retry);
            }
            if (policies->Has(Nan::New("key").ToLocalChecked())) {
                Local<Value> v8key = policies->Get(Nan::New("key").ToLocalChecked());
                config->policies.key = (as_policy_key)V8INTEGER_TO_CINTEGER(v8key);
            }
            if( policies->Has(Nan::New("exists").ToLocalChecked())) {
                Local<Value> v8exists = policies->Get(Nan::New("exists").ToLocalChecked());
                config->policies.exists = (as_policy_exists)V8INTEGER_TO_CINTEGER(v8exists);
            }
            if (policies->Has(Nan::New("gen").ToLocalChecked())) {
                Local<Value> v8gen = policies->Get(Nan::New("gen").ToLocalChecked());
                config->policies.gen = (as_policy_gen)V8INTEGER_TO_CINTEGER(v8gen);
            }
            if (policies->Has(Nan::New("replica").ToLocalChecked())) {
                Local<Value> v8replica = policies->Get(Nan::New("replica").ToLocalChecked());
                config->policies.replica = (as_policy_replica) V8INTEGER_TO_CINTEGER(v8replica);
            }
            if (policies->Has(Nan::New("consistencyLevel").ToLocalChecked())) {
                Local<Value> v8consistency = policies->Get(Nan::New("consistencyLevel").ToLocalChecked());
                config->policies.consistency_level = (as_policy_consistency_level) V8INTEGER_TO_CINTEGER(v8consistency);
            }
            if (policies->Has(Nan::New("commitLevel").ToLocalChecked())) {
                Local<Value> v8commitLevel = policies->Get(Nan::New("commitLevel").ToLocalChecked());
                config->policies.commit_level = (as_policy_commit_level) V8INTEGER_TO_CINTEGER(v8commitLevel);
            }
            if (policies->Has(Nan::New("read").ToLocalChecked())) {
                Local<Value> readpolicy = policies->Get(Nan::New("read").ToLocalChecked());
                if ( readpolicy_from_jsobject(&config->policies.read, readpolicy->ToObject(), log)  != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if (policies->Has(Nan::New("write").ToLocalChecked())) {
                Local<Value> writepolicy = policies->Get(Nan::New("write").ToLocalChecked());
                if( writepolicy_from_jsobject(&config->policies.write, writepolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if (policies->Has(Nan::New("remove").ToLocalChecked())) {
                Local<Value> removepolicy = policies->Get(Nan::New("remove").ToLocalChecked());
                if( removepolicy_from_jsobject(&config->policies.remove, removepolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if (policies->Has(Nan::New("batch").ToLocalChecked())) {
                Local<Value> batchpolicy = policies->Get(Nan::New("batch").ToLocalChecked());
                if( batchpolicy_from_jsobject(&config->policies.batch, batchpolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if (policies->Has(Nan::New("operate").ToLocalChecked())) {
                Local<Value> operatepolicy = policies->Get(Nan::New("operate").ToLocalChecked());
                if( operatepolicy_from_jsobject(&config->policies.operate, operatepolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if (policies->Has(Nan::New("info").ToLocalChecked())) {
                Local<Value> infopolicy = policies->Get(Nan::New("info").ToLocalChecked());
                if( infopolicy_from_jsobject(&config->policies.info, infopolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if (policies->Has(Nan::New("admin").ToLocalChecked())) {
                Local<Value> adminpolicy = policies->Get(Nan::New("admin").ToLocalChecked());
                if( adminpolicy_from_jsobject(&config->policies.admin, adminpolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if (policies->Has(Nan::New("scan").ToLocalChecked())) {
                Local<Value> scanpolicy = policies->Get(Nan::New("scan").ToLocalChecked());
                if( scanpolicy_from_jsobject(&config->policies.scan, scanpolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }
            if (policies->Has(Nan::New("query").ToLocalChecked())) {
                Local<Value> querypolicy = policies->Get(Nan::New("query").ToLocalChecked());
                if( querypolicy_from_jsobject(&config->policies.query, querypolicy->ToObject(), log) != AS_NODE_PARAM_OK) {
                    return AS_NODE_PARAM_ERR;
                }
            }


        }
        as_v8_debug(log, "Parsing global policies : Done");
    }
    // stores information about mod-lua userpath and systempath.
    bool syspath_set = false;
    bool usrpath_set = false;

    // If modlua path is passed in config object, set those values here
    if( obj->Has(Nan::New("modlua").ToLocalChecked())) {
        Local<Object> modlua = obj->Get(Nan::New("modlua").ToLocalChecked())->ToObject();

        if ( modlua->Has(Nan::New("systemPath").ToLocalChecked())) {
            Local<Value> v8syspath = modlua->Get(Nan::New("systemPath").ToLocalChecked());
            strcpy(config->lua.system_path, *String::Utf8Value(v8syspath));
            as_v8_debug(log, "The system path in the config is %s ", config->lua.system_path);
            syspath_set = true;
        }
        if( modlua->Has(Nan::New("userPath").ToLocalChecked())) {
            Local<Value> v8usrpath = modlua->Get(Nan::New("userPath").ToLocalChecked());
            strcpy(config->lua.user_path, *String::Utf8Value(v8usrpath));
            as_v8_debug(log, "The user path in the config is %s ", config->lua.user_path);
            usrpath_set = true;
        }
    }

    // Modlua system and user path is not passed in a config object.
    // Set them to default values here.
    if(!syspath_set) {
#ifdef __linux
        char const * syspath = "./node_modules/aerospike/aerospike-client-c/package/opt/aerospike/client/sys/udf/lua/";
#elif __APPLE__
        char const * syspath = "./node_modules/aerospike/aerospike-client-c/package/usr/local/aerospike/client/sys/udf/lua/";
#endif
        int rc = access(syspath, R_OK);
        if(rc == 0) {
            strcpy(config->lua.system_path, syspath);
        }
        else {
#ifdef __linux
            char const * syspath = "./aerospike-client-c/package/opt/aerospike/client/sys/udf/lua/";
#elif __APPLE__
            char const * syspath = "./aerospike-client-c/package/usr/local/aerospike/client/sys/udf/lua/";
#endif
            rc = access(syspath, R_OK);
            if ( rc== 0) {
                strcpy(config->lua.system_path, syspath);
            }
            else {
                as_v8_debug(log,"Could not find a valid LUA system path %s", syspath);
            }
        }
    }
    if(!usrpath_set) {
#ifdef __linux
        char const * usrpath = "./node_modules/aerospike/aerospike-client-c/package/opt/aerospike/client/usr/udf/lua/";
#elif __APPLE__
        char const * usrpath = "./node_modules/aerospike/aerospike-client-c/package/usr/local/aerospike/client/usr/udf/lua/";
#endif
        int rc = access(usrpath, R_OK);
        if ( rc == 0) {
            strcpy(config->lua.user_path, usrpath);
        }
        else {
#ifdef __linux
            char const * usrpath = "./aerospike-client-c/package/opt/aerospike/client/usr/udf/lua";
#elif __APPLE__
            char const * usrpath = "./aerospike-client-c/package/usr/local/aerospike/client/usr/udf/lua";
#endif
            rc = access(usrpath, R_OK);
            if( rc == 0) {
                strcpy(config->lua.user_path, usrpath);
            }
            else {
                as_v8_debug(log, "Could not find valid LUA user path %s", usrpath);
            }

        }
    }

    if ( obj->Has(Nan::New("user").ToLocalChecked())) {
        if(!obj->Has(Nan::New("password").ToLocalChecked())) {
            as_v8_error(log, "Password must be passed with username for connecting to secure cluster");
            return AS_NODE_PARAM_ERR;
        }

        Local<Value> v8usr = obj->Get(Nan::New("user").ToLocalChecked());
        Local<Value> v8pwd = obj->Get(Nan::New("password").ToLocalChecked());

        if ( !v8usr->IsUndefined() && !v8usr->IsNull() ) {
            if(!(v8usr->IsString())) {
                as_v8_error(log, "Username passed must be string");
                return AS_NODE_PARAM_ERR;
            } else {
                if ( !v8pwd->IsUndefined() && !v8pwd->IsNull() ) {
                    if(!(v8pwd->IsString())) {
                        as_v8_error(log, "Password passed must be a string");
                        return AS_NODE_PARAM_ERR;
                    } else {

                        bool setConfig = as_config_set_user(config,*String::Utf8Value(v8usr), *String::Utf8Value(v8pwd));

                        if(!setConfig) {
                            as_v8_error(log, "Setting config failed");
                            return AS_NODE_PARAM_ERR;
                        }
                    }
                }
            }
        }
    }

    if ( obj->Has(Nan::New("sharedMemory").ToLocalChecked())) {
        Local<Object> shm_obj = obj->Get(Nan::New("sharedMemory").ToLocalChecked())->ToObject();
        config->use_shm = true;
        if ( shm_obj->Has(Nan::New("key").ToLocalChecked())) {
            Local<Value> key = shm_obj->Get(Nan::New("key").ToLocalChecked());
            if (key->IsNumber()) {
                config->shm_key =  key->ToInteger()->Value();
                as_v8_debug(log, "SHM key is set to %x ", config->shm_key);
            }
            else {
                as_v8_error(log, "SHM key is not an integer. Integer expected");
                return AS_NODE_PARAM_ERR;
            }
        }
        if ( shm_obj->Has(Nan::New("maxNodes").ToLocalChecked())) {
            Local<Value> max_nodes = shm_obj->Get(Nan::New("maxNodes").ToLocalChecked());
            if (max_nodes->IsNumber()) {
                config->shm_max_nodes =  max_nodes->ToNumber()->Value();
                as_v8_debug(log, "SHM max nodes is set to %d", config->shm_max_nodes);
            }
            else {
                as_v8_error(log, "SHM max nodes is not an integer. Integer expected");
                return AS_NODE_PARAM_ERR;
            }
        }
        if ( shm_obj->Has(Nan::New("maxNamespaces").ToLocalChecked())) {
            Local<Value> max_namespaces = shm_obj->Get(Nan::New("maxNamespaces").ToLocalChecked());
            if (max_namespaces->IsNumber()) {
                config->shm_max_namespaces =  V8INTEGER_TO_CINTEGER(max_namespaces);
                as_v8_debug(log, "SHM max namespaces is set to %d", config->shm_max_namespaces);
            }
            else {
                as_v8_error(log, "SHM max namespaces is not an integer. Integer expected");
                return AS_NODE_PARAM_ERR;
            }
        }
        if ( shm_obj->Has(Nan::New("takeoverThresholdSeconds").ToLocalChecked())) {
            Local<Value> takeover_threshold_secs = shm_obj->Get(Nan::New("takeoverThresholdSeconds").ToLocalChecked());
            if (takeover_threshold_secs->IsNumber()) {
                config->shm_takeover_threshold_sec =  V8INTEGER_TO_CINTEGER(takeover_threshold_secs);
                as_v8_debug(log, "SHM takeover threshold seconds is set to %d", config->shm_takeover_threshold_sec);
            }
            else {
                as_v8_error(log, "SHM takeover threshold seconds is not an integer. Integer expected");
                return AS_NODE_PARAM_ERR;
            }
        }

    }

    if (obj->Has(Nan::New("connTimeoutMs").ToLocalChecked())) {
        Local<Value> v8connTimeoutMs = obj->Get(Nan::New("connTimeoutMs").ToLocalChecked());
        config->conn_timeout_ms = V8INTEGER_TO_CINTEGER(v8connTimeoutMs);
        as_v8_debug(log, "Initial connection timeout set to %d ms", config->conn_timeout_ms);
    }

    if (obj->Has(Nan::New("tenderInterval").ToLocalChecked())) {
        Local<Value> v8tenderInterval = obj->Get(Nan::New("tenderInterval").ToLocalChecked());
        config->tender_interval = V8INTEGER_TO_CINTEGER(v8tenderInterval);
        as_v8_debug(log, "Tender interval set to %d ms", config->tender_interval);
    }

    return AS_NODE_PARAM_OK;
}


int host_from_jsobject( Local<Object> obj, char **addr, uint16_t * port, LogInfo * log)
{
    if (obj->Has(Nan::New("addr").ToLocalChecked()) ) {
        Local<Value> addrVal = obj->Get(Nan::New("addr").ToLocalChecked());
        if ( addrVal->IsString() ) {
            *addr = (char*) malloc (HOST_ADDRESS_SIZE);
            strcpy(*addr, *String::Utf8Value(addrVal->ToString()));
            as_v8_detail(log, "host addr : %s", (*addr));
        }
        else {
            return AS_NODE_PARAM_ERR;
        }
    }

    if ( obj->Has(Nan::New("port").ToLocalChecked()) ){
        Local<Value> portVal = obj->Get(Nan::New("port").ToLocalChecked());
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
        if ( rc == AS_NODE_PARAM_OK && v8_log->Has(Nan::New("level").ToLocalChecked()) ) {
            Local<Value> v8_log_level = v8_log->Get(Nan::New("level").ToLocalChecked());
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
        if ( rc == AS_NODE_PARAM_OK && v8_log->Has(Nan::New("file").ToLocalChecked())) {
            Local<Value> v8_file = obj->Get(Nan::New("file").ToLocalChecked());
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

as_val* asval_clone(const as_val* val, LogInfo* log)
{
    as_val_t t = as_val_type( (as_val*)val);
    as_val* clone_val = NULL;
    switch(t) {
        case AS_NIL: {
            clone_val = (as_val*) &as_nil;
            break;
        }
        case AS_BOOLEAN: {
            as_boolean *bool_val = as_boolean_fromval(val);
            as_boolean *clone_bool = as_boolean_new(bool_val->value);
            if( clone_bool == NULL)
            {
                as_v8_error(log, "cloning a boolean value failed");
            }
            clone_val            = as_boolean_toval(clone_bool);
            break;
        }
        case AS_INTEGER: {
            as_integer* int_val = as_integer_fromval( val );
            int64_t ival        = as_integer_get( int_val);
            as_v8_detail(log, "Cloning Integer value %d", ival);
            as_integer* clone_int = as_integer_new(ival);
            if(clone_int == NULL)
            {
                as_v8_error(log, "Cloning integer failed");
            }
            clone_val = as_integer_toval(clone_int);
            break;
        }
        case AS_STRING: {
            as_string* str_val = as_string_fromval( val );
            char* strval = as_string_get( str_val);
            as_v8_detail(log, "Cloning String  value %s", strval);
            char* clone_str = (char*) cf_strdup( strval);
            if(clone_str == NULL)
            {
                as_v8_error(log, "cloning string failed");
            }
            as_string* clone_as = as_string_new(clone_str, true);
            if(clone_as == NULL)
            {
                as_v8_error(log, "cloning string failed");
            }
            clone_val = as_string_toval( clone_as);
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
            as_arraylist* list      = (as_arraylist*) as_list_fromval((as_val*)val);
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
		case AS_DOUBLE: {
			as_double * dbl_val = as_double_fromval(val);
			double dval = as_double_get(dbl_val);
			as_v8_detail(log, "Cloning double value %g", dval);
			as_double * clone_dbl = as_double_new(dval);
			if(clone_dbl == NULL)
			{
				as_v8_error(log, "Cloning double failed");
			}
			clone_val = as_double_toval(clone_dbl);
			break;
		}
		case AS_GEOJSON: {
			as_geojson * geo_val = as_geojson_fromval(val);
			char* strval = as_geojson_get(geo_val);

			as_v8_detail(log, "Cloning GeoJSON value %s", strval);
			char* clone_str = (char*) cf_strdup(strval);
			if(clone_str == NULL)
			{
				as_v8_error(log, "cloning GeoJSON failed");
			}
			as_geojson * clone_as = as_geojson_new(clone_str, true);
			if(clone_as == NULL)
			{
				as_v8_error(log, "cloning GeoJSON failed");
			}
			clone_val = as_geojson_toval(clone_as);
			break;
        }
        default:
            as_v8_error( log, "as_val received is UNKNOWN type %d", (int)t);
            break;
    }
    return clone_val;
}

bool key_clone(const as_key* src, as_key** dest, LogInfo * log, bool alloc_key)
{
    if(src == NULL || dest== NULL ) {
        as_v8_info(log, "Parameter error : NULL in source/destination");
        return false;
    }

    as_v8_detail(log, "Cloning the key");
    as_key_value* val   = src->valuep;
    if(val != NULL) {
        as_key_value* clone_val = (as_key_value*) asval_clone( (as_val*) val, log);
        if( alloc_key)
        {
            *dest   = as_key_new_value( src->ns, src->set, (as_key_value*) clone_val);
        }
        else
        {
            as_key_init_value(*dest, src->ns, src->set, (as_key_value*) clone_val);
        }
    }
    else if( src->digest.init == true) {
        if( alloc_key) {
            *dest = as_key_new_digest( src->ns, src->set, src->digest.value);
        }
        else {
            as_key_init_digest(*dest, src->ns, src->set, src->digest.value);
        }
    }
    else {
        as_v8_detail(log, "Key has neither value nor digest ");
    }

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

    as_key* src_key  = (as_key*) &src->key;
    as_key* dest_key = (as_key*) &(*dest)->key;
    if(src_key != NULL) {
        //clone the key but do not malloc the key structure,
        // use the structure available inside record structure.
        key_clone( src_key, &dest_key, log, false);
    }
    return true;
}

Local<Object> error_to_jsobject(as_error * error, LogInfo * log)
{
    Nan::EscapableHandleScope scope;
    Local<Object> err = Nan::New<Object>();

    if (error == NULL) {
        as_v8_info(log, "error(C structure) object is NULL, node.js error object cannot be constructed");
        return scope.Escape(err);
    }

    // LDT error codes are populated as a string message.
    // Parse the string and populate the error object appropriately
    // so that application can look up the error codes and doesn't have
    // to look at strings.
    // Check if it's an UDF ERROR and message has string LDT in it
    // then it implies it is an LDT error, so parse the error
    // and populate the error object.
    if(error->code == AEROSPIKE_ERR_UDF && strstr(error->message, "LDT") != NULL) {
        char err_message[AS_ERROR_MESSAGE_MAX_LEN] = {"\0"};
        strcpy(err_message, error->message);
        char *ptr;
        ptr = strtok(err_message, ":");
        if(ptr != NULL) {
            error->file = ptr;
            ptr = strtok(NULL, ":");
        }
        if(ptr != NULL) {
            error->line =  atoi(ptr);
            ptr = strtok(NULL, ":");
        }
        if(ptr != NULL) {
            error->code =  (as_status) atoi(ptr);
            ptr = strtok(NULL, ":");
        }

        if(ptr != NULL) {
            strcpy(error->message, ptr);
            ptr = strtok(NULL, ":");
        }

        // LDT error does not populate function name as of now.
        error->func = NULL;

    }
    err->Set(Nan::New("code").ToLocalChecked(), Nan::New(error->code));
    err->Set(Nan::New("message").ToLocalChecked(), error->message[0] != '\0' ? Nan::New(error->message).ToLocalChecked() : Nan::New("\0").ToLocalChecked() );
    err->Set(Nan::New("func").ToLocalChecked(), error->func ? Nan::New(error->func).ToLocalChecked() : Nan::New("\0").ToLocalChecked() );
    err->Set(Nan::New("file").ToLocalChecked(), error->file ? Nan::New(error->file).ToLocalChecked() : Nan::New("\0").ToLocalChecked() );
    err->Set(Nan::New("line").ToLocalChecked(), error->line ? Nan::New(error->line) : Nan::New((uint32_t)0) );

    return scope.Escape(err);
}


Local<Value> val_to_jsvalue(as_val * val, LogInfo * log )
{
    Nan::EscapableHandleScope scope;
    if ( val == NULL) {
        as_v8_debug(log, "value = NULL");
        return scope.Escape(Nan::Null());
    }

    switch ( as_val_type(val) ) {
        case AS_NIL: {
            as_v8_detail(log,"value is of type as_null");
            return scope.Escape(Nan::Null());
        }
        case AS_INTEGER : {
            as_integer * ival = as_integer_fromval(val);
            if ( ival ) {
                int64_t data = as_integer_getorelse(ival, -1);
                as_v8_detail(log, "value = %lld ", data);
                return scope.Escape(Nan::New((double)data));
            }
        }
        case AS_DOUBLE : {
            as_double* dval = as_double_fromval(val);
            if( dval ) {
                double d    = as_double_getorelse(dval, -1);
                as_v8_detail(log, "value = %lf ",d);
                return scope.Escape(Nan::New((double)d));
            }
        }
        case AS_STRING : {
            as_string * sval = as_string_fromval(val);
            if ( sval ) {
                char * data = as_string_getorelse(sval, NULL);
                as_v8_detail(log, "value = \"%s\"", data);
                return scope.Escape(Nan::New(data).ToLocalChecked());
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
                Local<Object> buff = Nan::CopyBuffer((char*) data, size).ToLocalChecked();

                return scope.Escape(buff);
            }
        }
        case AS_LIST : {
            as_arraylist* listval = (as_arraylist*) as_list_fromval((as_val*)val);
            int size = as_arraylist_size(listval);
            Local<Array> jsarray = Nan::New<Array>(size);
            for ( int i = 0; i < size; i++ ) {
                as_val * arr_val = as_arraylist_get(listval, i);
                Local<Value> jsval = val_to_jsvalue(arr_val, log);
                jsarray->Set(i, jsval);
            }

            return scope.Escape(jsarray);
        }
        case AS_MAP : {
            Local<Object> jsobj = Nan::New<Object>();
            as_hashmap* map = (as_hashmap*) as_map_fromval(val);
            as_hashmap_iterator  it;
            as_hashmap_iterator_init(&it, map);

            while ( as_hashmap_iterator_has_next(&it) ) {
                as_pair *p = (as_pair*) as_hashmap_iterator_next(&it);
                as_val* key = as_pair_1(p);
                as_val* val = as_pair_2(p);
                jsobj->Set(val_to_jsvalue(key, log), val_to_jsvalue(val, log));
            }

            return scope.Escape(jsobj);
        }
        case AS_GEOJSON : {
            as_geojson * gval = as_geojson_fromval(val);
            if ( gval ) {
                char * data = as_geojson_getorelse(gval, NULL);
                as_v8_detail(log, "geojson = \"%s\"", data);
                return scope.Escape(Nan::New<String>(data).ToLocalChecked());
            }
        }
        default:
            break;
    }
    return scope.Escape(Nan::Undefined());
}


Local<Object> recordbins_to_jsobject(const as_record * record, LogInfo * log )
{
    Nan::EscapableHandleScope scope;

    Local<Object> bins ;
    if (record == NULL) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js record object");
        return scope.Escape(bins);
    }

    bins = Nan::New<Object>();
    as_record_iterator it;
    as_record_iterator_init(&it, record);

    while ( as_record_iterator_has_next(&it) ) {
        as_bin * bin = as_record_iterator_next(&it);
        char * name = as_bin_get_name(bin);
        as_val * val = (as_val *) as_bin_get_value(bin);
        Local<Value> obj = val_to_jsvalue(val, log );
        bins->Set(Nan::New(name).ToLocalChecked(), obj);
        as_v8_detail(log, "Setting binname %s ", name);
    }

    return scope.Escape(bins);
}

Local<Object> recordmeta_to_jsobject(const as_record * record, LogInfo * log)
{
    Nan::EscapableHandleScope scope;
    Local<Object> meta;

    if(record == NULL) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js metadata object");
        return scope.Escape(meta);
    }

    meta = Nan::New<Object>();
    meta->Set(Nan::New("ttl").ToLocalChecked(), Nan::New((double)record->ttl));
    as_v8_detail(log, "TTL of the record %d", record->ttl);
    meta->Set(Nan::New("gen").ToLocalChecked(), Nan::New(record->gen));
    as_v8_detail(log, "Gen of the record %d", record->gen);

    return scope.Escape(meta);
}

Local<Object> record_to_jsobject(const as_record * record, const as_key * key, LogInfo * log )
{
    Nan::EscapableHandleScope scope;
    Local<Object> okey;

    if ( record == NULL ) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js record object");
        return scope.Escape(okey);
    }

    okey = key_to_jsobject(key ? key : &record->key, log);
    Local<Object> bins = recordbins_to_jsobject(record, log );
    Local<Object> meta = recordmeta_to_jsobject(record, log);
    Local<Object> rec = Nan::New<Object>();
    rec->Set(Nan::New("key").ToLocalChecked(), okey);
    rec->Set(Nan::New("meta").ToLocalChecked(), meta);
    rec->Set(Nan::New("bins").ToLocalChecked(), bins);

    return scope.Escape(rec);
}

Local<Array> batch_records_to_jsarray(const as_batch_read_records* records, LogInfo* log)
{
    Nan::EscapableHandleScope scope;
	const as_vector* list = &records->list;
	Local<Array> results = Nan::New<Array>(list->size);

	for (uint32_t i = 0; i < list->size; i++) {
		as_batch_read_record* batch_record = (as_batch_read_record*) as_vector_get((as_vector*) list, i);
		as_status status = batch_record->result;
		as_record* record = &batch_record->record;
		as_key* key = &batch_record->key;

		Local<Object> result = Nan::New<Object>();
		result->Set(Nan::New("status").ToLocalChecked(), Nan::New(status));
		result->Set(Nan::New("key").ToLocalChecked(), key_to_jsobject(key ? key : &record->key, log));
		if (status == AEROSPIKE_OK) {
			result->Set(Nan::New("meta").ToLocalChecked(), recordmeta_to_jsobject(record, log));
			result->Set(Nan::New("bins").ToLocalChecked(), recordbins_to_jsobject(record, log));
		}

		as_key_destroy(key);
		as_record_destroy(record);
		results->Set(i, result);
	}

    return scope.Escape(results);
}

//Forward references;
int asval_from_jsvalue(as_val** value, Local<Value> v8value, LogInfo* log);
int extract_blob_from_jsobject(uint8_t** data, int* len, Local<Object> obj, LogInfo* log);

bool instanceof(Local<Value> value, const char * type)
{
    Local<String> ctor_name = value->ToObject()->GetConstructorName();
    String::Utf8Value cn(ctor_name);
    return 0 == strncmp(*cn, type, strlen(type));
}

/**
 * Node.js stores all number values > 2^31 in the class Number and
 * values < 2^31 are stored in the class SMI (Small Integers). To distinguish
 * between a double and int64_t value in Node.js, retrieve the value as double
 * and also as int64_t. If the values are same, then store it as int64_t. Else
 * store it as double.
 * The problem with this implementation is var 123.00 will be treated as int64_t.
 * Applications can enforce double type by using the `Aerospike.Double` data type,
 * e.g.
 *
 *     const Double = Aerospike.Double
 *     var f = new Double(123)
 **/
bool is_double_value(Local<Value> value)
{
    if (value->IsNumber()) {
        int64_t i = value->ToInteger()->Value();
        double d = value->ToNumber()->Value();
        return d != (double)i;
    } else if (instanceof(value, DoubleType)) {
        return true;
    } else {
        return false;
    }
}

double double_value(Local<Value> value)
{
    if (instanceof(value, DoubleType)) {
        value = value->ToObject()->Get(Nan::New<String>("Double").ToLocalChecked());
    }
    return (double) value->ToNumber()->Value();
}

int list_from_jsarray(as_list** list, Local<Array> array, LogInfo* log)
{
    const uint32_t capacity = array->Length();
    as_v8_detail(log, "Creating new as_arraylist with capacity %d", capacity);
    as_arraylist* arraylist = as_arraylist_new(capacity, 0);
    if (arraylist == NULL) {
        as_v8_error(log, "List allocation failed");
        Nan::ThrowError("List allocation failed");
        return AS_NODE_PARAM_ERR;
    }
    *list = (as_list*) arraylist;
    for (uint32_t i = 0; i < capacity; i++) {
        as_val* val;
        if (asval_from_jsvalue(&val, array->Get(i), log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        as_list_append(*list, val);
    }
    return AS_NODE_PARAM_OK;
}

int map_from_jsobject(as_map** map, Local<Object> obj, LogInfo* log)
{
    const Local<Array> props = obj->ToObject()->GetOwnPropertyNames();
    const uint32_t capacity = props->Length();
    as_v8_detail(log, "Creating new as_hashmap with capacity %d", capacity);
    as_hashmap* hashmap = as_hashmap_new(capacity);
    if (hashmap == NULL) {
        as_v8_error(log, "Map allocation failed");
        Nan::ThrowError("Map allocation failed");
        return AS_NODE_PARAM_ERR;
    }
    *map = (as_map*) hashmap;
    for (uint32_t i = 0; i < capacity; i++) {
        const Local<Value> name = props->Get(i);
        const Local<Value> value = obj->Get(name);
        as_val* val = NULL;
        if (asval_from_jsvalue(&val, value, log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        as_stringmap_set(*map, *String::Utf8Value(name), val);
    }
    return AS_NODE_PARAM_OK;
}

int asval_from_jsvalue(as_val** value, Local<Value> v8value, LogInfo* log)
{
    if (v8value->IsNull()) {
        as_v8_detail(log, "The as_val is NULL");
        *value = (as_val*) &as_nil;
    } else if (v8value->IsUndefined()) {
        // asval_from_jsvalue is called recursively.
        // If a bin value is undefined, it should be handled by the caller of
        // this function gracefully.
        // If an entry in a map/list is undefined the corresponding entry becomes null.
        as_v8_detail(log, "Object passed is undefined");
        *value = (as_val*) &as_nil;
    } else if (v8value->IsBoolean()) {
        *value = (as_val*) as_boolean_new(v8value->ToBoolean()->Value());
    } else if (v8value->IsString()) {
        *value = (as_val*) as_string_new(strdup(*String::Utf8Value(v8value)), true);
    } else if (v8value->IsInt32() ) {
        *value = (as_val*) as_integer_new(v8value->ToInt32()->Value());
    } else if (v8value->IsUint32()) {
        *value = (as_val*) as_integer_new(v8value->ToUint32()->Value());
    } else if (is_double_value(v8value)) {
        *value = (as_val*) as_double_new(double_value(v8value));
    } else if (v8value->IsNumber()) {
        *value = (as_val*) as_integer_new(v8value->ToInteger()->Value());
    } else if (node::Buffer::HasInstance(v8value)) {
        int size;
        uint8_t* data;
        if (extract_blob_from_jsobject(&data, &size, v8value->ToObject(), log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "Extractingb blob from a js object failed");
            return AS_NODE_PARAM_ERR;
        }
        *value = (as_val*) as_bytes_new_wrap(data, size, true);
    } else if (v8value->IsArray()) {
        if (list_from_jsarray((as_list**) value, Local<Array>::Cast(v8value), log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
    } else if (instanceof(v8value, GeoJSONType)) {
        Local<Value> strval = v8value->ToObject()->Get(Nan::New("str").ToLocalChecked());
        *value = (as_val*) as_geojson_new(strdup(*String::Utf8Value(strval)), true);
    } else { // generic object - treat as map
        if (map_from_jsobject((as_map**) value, v8value->ToObject(), log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
    }
    as_v8_detail(log, "type: %d, string value: %s", as_val_type(*value), as_val_tostring(*value));
    return AEROSPIKE_OK;
}

int recordbins_from_jsobject(as_record * rec, Local<Object> obj, LogInfo * log)
{
    const Local<Array> props = obj->GetOwnPropertyNames();
    const uint32_t count = props->Length();
    as_record_init(rec, count);
    for ( uint32_t i = 0; i < count; i++ ) {

        const Local<Value> name = props->Get(i);
        const Local<Value> value = obj->Get(name);

        // A bin can be undefined, or an entry inside a CDT(list, map)
        // can be an undefined value.
        // If a bin is undefined, it must error out at the earliest.
        if( value->IsUndefined()) {
            as_v8_error(log, "Bin value passed for bin %s is undefined", *String::Utf8Value(name));
            return AS_NODE_PARAM_ERR;
        }

        String::Utf8Value n(name);
        if( strlen(*n) > AS_BIN_NAME_MAX_SIZE ) {
            as_v8_error(log, "Valid length for a bin name is 14. Bin name length exceeded");
            return AS_NODE_PARAM_ERR;
        }
        as_val* val = NULL;
        if (asval_from_jsvalue(&val, value, log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        switch(as_val_type(val)) {
            case AS_BOOLEAN:
                as_val_destroy(val);
                as_v8_error(log,"Boolean datatype not supported");
                return AS_NODE_PARAM_ERR;
            case AS_INTEGER:
                as_record_set_integer(rec, *n, (as_integer*)val);
                break;
            case AS_DOUBLE:
                as_record_set_as_double(rec, *n, (as_double*)val);
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
            case AS_GEOJSON:
                as_record_set_geojson(rec, *n, (as_geojson*) val);
                break;
            case AS_NIL:
                as_record_set_nil(rec, *n);
                break;
            default:
                break;
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


//@TO-DO - GetIndexedProperties is to be checked
int extract_blob_from_jsobject(uint8_t** data, int* len, Local<Object> obj, LogInfo* log)
{
    if (!node::Buffer::HasInstance(obj)) {
        as_v8_error(log, "The binary data is not of the type UnsignedBytes");
        return AS_NODE_PARAM_ERR;
    }

    (*len) = node::Buffer::Length(obj);
    (*data) = (uint8_t*) cf_malloc(sizeof(uint8_t) * (*len));
    memcpy((*data), node::Buffer::Data(obj), (*len));

    return AS_NODE_PARAM_OK;
}


int setTTL ( Local<Object> obj, uint32_t *ttl, LogInfo * log)
{
    if ( obj->Has(Nan::New("ttl").ToLocalChecked())) {
        Local<Value> v8ttl = obj->Get(Nan::New("ttl").ToLocalChecked()) ;
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

    if ( obj->Has(Nan::New("timeout").ToLocalChecked()) ) {
        Local<Value> v8timeout = obj->Get(Nan::New<String>("timeout").ToLocalChecked()) ;
        if ( v8timeout->IsNumber() ) {
            (*timeout) = (uint32_t) V8INTEGER_TO_CINTEGER(v8timeout);
            as_v8_detail(log, "timeout value %d", *timeout);
        }
        else {
            as_v8_error(log, "timeout should be an integer");
            return AS_NODE_PARAM_ERR;
        }
    }
    else {
        as_v8_detail(log, "Object does not have timeout");
    }
    return AS_NODE_PARAM_OK;
}

int setTtlPolicy( Local<Object> obj, uint32_t *ttl, LogInfo * log )
{

    if ( obj->Has(Nan::New("ttl").ToLocalChecked()) ) {
        Local<Value> v8ttl = obj->Get(Nan::New<String>("ttl").ToLocalChecked()) ;
        if ( v8ttl->IsNumber() ) {
            (*ttl) = (uint32_t) V8INTEGER_TO_CINTEGER(v8ttl);
            as_v8_detail(log, "ttl value %d", *ttl);
        }
        else {
            as_v8_error(log, "ttl should be an integer");
            return AS_NODE_PARAM_ERR;
        }
    }
    else {
        as_v8_detail(log, "Object does not have ttl");
    }
    return AS_NODE_PARAM_OK;
}

int setGeneration( Local<Object> obj, uint16_t * generation, LogInfo * log )
{
    if ( obj->Has(Nan::New("gen").ToLocalChecked()) ) {
        Local<Value> v8gen = obj->Get(Nan::New("gen").ToLocalChecked());
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

    if ( obj->Has(Nan::New(policyname).ToLocalChecked()) ) {
        Local<Value> policy = obj->Get(Nan::New(policyname).ToLocalChecked());

        // Check if node layer is passing a legal integer value
        if (policy->IsNumber()) {
            *policyEnumValue = V8INTEGER_TO_CINTEGER(policy);
        }
        else {
            as_v8_error(log, "value for %s policy must be an integer", policyname);
            //Something other than expected type which is Number
            return AS_NODE_PARAM_ERR;
        }
    }
    else {
        as_v8_detail(log, "Object does not have %s ", policyname);
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

int setRetryPolicy( Local<Object> obj, uint32_t* retrypolicy, LogInfo * log)
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

int setCommitLevelPolicy( Local<Object> obj, as_policy_commit_level* commitpolicy, LogInfo * log)
{
    if( setPolicyGeneric(obj, "commitLevel", (int*) commitpolicy, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Commit Level policy is set to %d", *commitpolicy);
    return AS_NODE_PARAM_OK;
}

int setCompressionThresholdPolicy( Local<Object> obj, uint32_t* compression_threshold, LogInfo * log)
{
    if( setPolicyGeneric(obj, "compressionThreshold", (int*) compression_threshold, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Compression Threshold policy is set to %d", *compression_threshold);
    return AS_NODE_PARAM_OK;
}

int setReplicaPolicy(Local<Object> obj, as_policy_replica *replicapolicy, LogInfo *log)
{
    if( setPolicyGeneric(obj, "replica", (int*) replicapolicy, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Replica policy is set to %d ", *replicapolicy);
    return AS_NODE_PARAM_OK;
}

int setConsistencyLevelPolicy( Local<Object> obj, as_policy_consistency_level *consistencypolicy, LogInfo * log){
    if( setPolicyGeneric(obj, "consistencyLevel", (int*) consistencypolicy, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    }

    as_v8_detail(log, "Consistency Level Policy is set to %d", *consistencypolicy);
    return AS_NODE_PARAM_OK;
}

int infopolicy_from_jsobject( as_policy_info * policy, Local<Object> obj, LogInfo * log)
{
    if ( obj->IsUndefined() || obj->IsNull()) {
        return AS_NODE_PARAM_ERR;
    }
    as_policy_info_init(policy);
    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    if ( obj->Has(Nan::New("send_as_is").ToLocalChecked()) ) {
        Local<Value> v8send_as_is = obj->Get(Nan::New<String>("send_as_is").ToLocalChecked());
        if ( v8send_as_is->IsBoolean() ) {
            policy->send_as_is = (bool) v8send_as_is->ToBoolean()->Value();
            as_v8_detail(log,"info policy send_as_is is set to %s", policy->send_as_is ? "true":"false");
        }
        else {
            as_v8_error(log, "send_as_is should be a boolean object");
            return AS_NODE_PARAM_ERR;
        }
    }
    if ( obj->Has(Nan::New("check_bounds").ToLocalChecked()) ) {
        Local<Value> v8check_bounds = obj->Get(Nan::New("check_bounds").ToLocalChecked());
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

int adminpolicy_from_jsobject( as_policy_admin * policy, Local<Object> obj, LogInfo * log)
{
    if( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    as_v8_detail(log, "Timeout in admin policy is set to %d", policy->timeout);
    return AS_NODE_PARAM_OK;
}

int operatepolicy_from_jsobject( as_policy_operate * policy, Local<Object> obj, LogInfo * log)
{

    as_policy_operate_init( policy);

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setGenPolicy( obj, &policy->gen, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setCommitLevelPolicy( obj, &policy->commit_level, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setReplicaPolicy( obj, &policy->replica, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setConsistencyLevelPolicy( obj, &policy->consistency_level, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

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
    // only remove policy object has generation field, so directly look up
    // the generation field in "obj" argument and set the generation value in policy structure.
    if ( obj->Has(Nan::New("generation").ToLocalChecked()) ) {
        Local<Value> v8gen = obj->Get(Nan::New("generation").ToLocalChecked());
        if ( v8gen->IsNumber() ) {
            policy->generation = (uint16_t) V8INTEGER_TO_CINTEGER(v8gen);
            as_v8_detail(log, "Generation value %d ", policy->generation);
        }
        else {
            as_v8_error(log, "Generation should be an integer");
            return AS_NODE_PARAM_ERR;
        }
    }
    else {
        as_v8_detail(log,"Remove policy does not have generation value");
    }

    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setGenPolicy( obj, &policy->gen, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setCommitLevelPolicy( obj, &policy->commit_level, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    return AS_NODE_PARAM_OK;
}

int readpolicy_from_jsobject( as_policy_read * policy, Local<Object> obj, LogInfo * log)
{

    as_policy_read_init( policy );

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setReplicaPolicy( obj, &policy->replica, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setConsistencyLevelPolicy( obj, &policy->consistency_level, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    as_v8_detail(log, "Parsing read policy : success");

    return AS_NODE_PARAM_OK;
}

int writepolicy_from_jsobject( as_policy_write * policy, Local<Object> obj, LogInfo * log)
{

    as_policy_write_init( policy );

    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setGenPolicy( obj, &policy->gen, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setRetryPolicy( obj, &policy->retry, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setCompressionThresholdPolicy( obj, &policy->compression_threshold, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setExistsPolicy( obj, &policy->exists, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setCommitLevelPolicy( obj, &policy->commit_level, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    as_v8_detail(log, "Parsing write policy : success");
    return AS_NODE_PARAM_OK;
}

int applypolicy_from_jsobject( as_policy_apply * policy, Local<Object> obj, LogInfo* log)
{

    as_policy_apply_init( policy);
    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setKeyPolicy( obj, &policy->key, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setCommitLevelPolicy( obj, &policy->commit_level, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;
    if ( setTtlPolicy( obj, &policy->ttl, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    as_v8_detail( log, "Parsing apply policy : success");

    return AS_NODE_PARAM_OK;
}

int querypolicy_from_jsobject( as_policy_query* policy, Local<Object> obj, LogInfo* log)
{

    as_policy_query_init( policy);
    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    as_v8_detail( log, "Parsing query policy : success");

    return AS_NODE_PARAM_OK;
}

int scanpolicy_from_jsobject( as_policy_scan * policy, Local<Object> obj, LogInfo* log)
{
    as_policy_scan_init( policy);
    if ( setTimeOut( obj, &policy->timeout, log) != AS_NODE_PARAM_OK) return AS_NODE_PARAM_ERR;

    if ( obj->Has(Nan::New("failOnClusterChange").ToLocalChecked()) ) {
        Local<Value> failOnClusterChange = obj->Get(Nan::New("failOnClusterChange").ToLocalChecked());
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

Local<Object> key_to_jsobject(const as_key * key, LogInfo * log)
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj;
    if (key == NULL) {
        as_v8_debug(log, "Key (C structure) is NULL, cannot form node.js key object");
        return scope.Escape(obj);
    }

    obj = Nan::New<Object>();
    if ( key->ns && strlen(key->ns) > 0 ) {
        as_v8_detail(log, "key.ns = \"%s\"", key->ns);
        obj->Set(Nan::New("ns").ToLocalChecked(), Nan::New(key->ns).ToLocalChecked());
    } else {
        as_v8_debug(log, "Key namespace is NULL");
    }

    if ( key->set && strlen(key->set) > 0 ) {
        as_v8_detail(log, "key.set = \"%s\"", key->set);
        obj->Set(Nan::New("set").ToLocalChecked(), Nan::New(key->set).ToLocalChecked());
    } else {
        as_v8_debug(log, "Key set is NULL");
    }

    if ( key->valuep ) {
        as_val * val = (as_val *) key->valuep;
        as_val_t type = as_val_type(val);
        switch(type) {
            case AS_INTEGER: {
                as_integer * ival = as_integer_fromval(val);
                as_v8_detail(log, "key.key = %d", as_integer_get(ival));
                obj->Set(Nan::New("key").ToLocalChecked(), Nan::New((double)as_integer_get(ival)));
                break;
            }
            case AS_STRING: {
                as_string * sval = as_string_fromval(val);
                as_v8_detail(log, "key.key = \"%s\"", as_string_get(sval));
                obj->Set(Nan::New("key").ToLocalChecked(), Nan::New(as_string_get(sval)).ToLocalChecked());
                break;
            }
            case AS_BYTES: {
                as_bytes * bval = as_bytes_fromval(val);
                if ( bval ) {
                    uint32_t size = as_bytes_size(bval);
                    as_v8_detail(log,"key.key = \"%u\"", bval->value);
                    Local<Object> buff = Nan::CopyBuffer((char*)bval->value, size).ToLocalChecked();
                    obj->Set(Nan::New("key").ToLocalChecked(), buff);
                    break;
                }
            }
            default:
                break;
        }
    } else {
        as_v8_detail(log, "Key value is NULL");
    }

    if(key->digest.init == true) {
        Local<Object> buff = Nan::CopyBuffer((char*)key->digest.value, AS_DIGEST_VALUE_SIZE).ToLocalChecked();
        obj->Set(Nan::New("digest").ToLocalChecked(), buff);
    }

    return scope.Escape(obj);
}

Local<Object> jobinfo_to_jsobject(const as_job_info * info, LogInfo * log)
{
    Local<Object> jobinfo;

    if (info == NULL) {
        as_v8_debug(log, "Job Info ( C structure) is NULL, cannot form node.js jobInfo object");
        return jobinfo;
    }

    jobinfo = Nan::New<Object>();
    jobinfo->Set(Nan::New("progressPct").ToLocalChecked(), Nan::New(info->progress_pct));
    as_v8_detail(log, "Progress pct of the job %d", info->progress_pct);
	Local<Value> recordsRead = Nan::New((double)info->records_read);
    jobinfo->Set(Nan::New("recordsRead").ToLocalChecked(), recordsRead);
    as_v8_detail(log, "Number of records read so far %d", info->records_read);
    jobinfo->Set(Nan::New("status").ToLocalChecked(), Nan::New(info->status));

    return jobinfo;
}

int key_from_jsobject(as_key * key, Local<Object> obj, LogInfo * log)
{
    as_namespace ns = {'\0'};
    as_set set = {'\0'};


    // All the v8 local variables have to declared before any of the goto
    // statements. V8 demands that.

    if(obj->IsNull())
    {
        as_v8_error(log, "The key object passed is Null");
        goto ReturnError;
    }

    // get the namespace
    if ( obj->Has(Nan::New("ns").ToLocalChecked()) ) {
        Local<Value> ns_obj = obj->Get(Nan::New("ns").ToLocalChecked());
        if ( ns_obj->IsString() ) {
            strncpy(ns, *String::Utf8Value(ns_obj), AS_NAMESPACE_MAX_SIZE);
            as_v8_detail(log, "key.ns = \"%s\"", ns);
            if ( strlen(ns) == 0 ) {
                as_v8_error(log, "The namespace has null string");
                goto ReturnError;
            }
        }
        else {
            as_v8_error(log, "The namespace passed must be string");
            goto ReturnError;
        }
    }
    else {
        as_v8_error(log, "The key object should have an \"ns\" entry");
        goto ReturnError;
    }

    // get the set
    if ( obj->Has(Nan::New("set").ToLocalChecked()) ) {
        Local<Value> set_obj = obj->Get(Nan::New("set").ToLocalChecked());
        //check if set is string or a null value.
        if ( set_obj->IsString() ) {
            strncpy(set, *String::Utf8Value(set_obj), AS_SET_MAX_SIZE);
            as_v8_detail(log,"key.set = \"%s\"", set);
            if ( strlen(set) == 0 ) {
                as_v8_debug(log, "Set passed is empty string");
            }
        }
        // null value for set is valid in a key. Any value other than null and string is not
        // acceptable for set
        else if( !set_obj->IsNull()){
            as_v8_error(log, "The set in the key must be a key");
            goto ReturnError;
        }
    }

    // get the value
    if ( obj->Has(Nan::New("key").ToLocalChecked()) ) {
        Local<Value> val_obj = obj->Get(Nan::New("key").ToLocalChecked());
        if(val_obj->IsNull())
        {
            as_v8_error(log, "The key entry must not be null");
            goto ReturnError;
        }

        if (val_obj->IsUndefined()) {
            as_v8_error(log, "The key value cannot be undefined");
            goto ReturnError;
        }

        if (val_obj->IsString()) {
            char * value = strdup(*String::Utf8Value(val_obj));
            as_key_init(key, ns, set, value);
            as_v8_detail(log, "key.key = \"%s\"", value);
            ((as_string *) key->valuep)->free = true;
        } else if (val_obj->IsNumber()) {
            int64_t value = V8INTEGER_TO_CINTEGER(val_obj);
            as_key_init_int64(key, ns, set, value);
            as_v8_detail(log, "key.key = %d", value);
        } else if (val_obj->IsObject()) {
            Local<Object> obj = val_obj->ToObject();
            int size ;
            uint8_t* data ;
            if (extract_blob_from_jsobject(&data, &size, obj, log) != AS_NODE_PARAM_OK) {
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
        Local<Object> buff = Nan::CopyBuffer((char*)as_key_digest(key)->value, AS_DIGEST_VALUE_SIZE).ToLocalChecked();
        obj->Set(Nan::New("digest").ToLocalChecked(), buff);
    } else {
        as_v8_error(log, "The Key object must have a \" key \" entry ");
        goto ReturnError;
    }

    return AS_NODE_PARAM_OK;

ReturnError:
    return AS_NODE_PARAM_ERR;
}

int key_from_jsarray(as_key * key, Local<Array> arr, LogInfo * log)
{
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
    return AS_NODE_PARAM_OK;

Ret_Err:
    return AS_NODE_PARAM_ERR;
}

int batch_from_jsarray(as_batch *batch, Local<Array> arr, LogInfo * log)
{

    uint32_t capacity = arr->Length();

    if(capacity > 0) {
        as_batch_init(batch, capacity);
    }
    else {
        return AS_NODE_PARAM_ERR;
    }
    for ( uint32_t i=0; i < capacity; i++) {
        Local<Object> key = arr->Get(i)->ToObject();
        int status = key_from_jsobject(as_batch_keyat(batch, i), key, log);
        if(status != AS_NODE_PARAM_OK) {
            as_v8_error(log, "Parsing batch keys failed \n");
            return AS_NODE_PARAM_ERR;
        }
    }

    return AS_NODE_PARAM_OK;
}

int batch_read_records_from_jsarray(as_batch_read_records** records, Local<Array> arr, LogInfo* log)
{
	uint32_t no_records = arr->Length();
	*records = as_batch_read_create(no_records);
	for (uint32_t i = 0; i < no_records; i++) {
		as_batch_read_record* record = as_batch_read_reserve(*records);
		Local<Object> obj = arr->Get(i)->ToObject();

		Local<Object> key = obj->Get(Nan::New("key").ToLocalChecked())->ToObject();
		if (key_from_jsobject(&record->key, key, log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing batch keys failed\n");
			return AS_NODE_PARAM_ERR;
		}

		Local<Value> maybe_bins = obj->Get(Nan::New("bins").ToLocalChecked());
		if (maybe_bins->IsArray()) {
			char** bin_names;
			uint32_t n_bin_names;
			if (bins_from_jsarray(&bin_names, &n_bin_names, Local<Array>::Cast(maybe_bins), log) != AS_NODE_PARAM_OK) {
				as_v8_error(log, "Parsing batch bin names failed\n");
				return AS_NODE_PARAM_ERR;
			}
			record->bin_names = bin_names;
			record->n_bin_names = n_bin_names;
		}

		Local<Value> maybe_read_all_bins = obj->Get(Nan::New("read_all_bins").ToLocalChecked());
		if (maybe_read_all_bins->IsBoolean()) {
			record->read_all_bins = maybe_read_all_bins->ToBoolean()->Value();
		}
	}
	return AS_NODE_PARAM_OK;
}

int bins_from_jsarray( char*** bins, uint32_t* num_bins, Local<Array> arr, LogInfo* log)
{
    int arr_length = arr->Length();
    char** c_bins = NULL;
    c_bins = (char**) cf_calloc(sizeof(char*), arr_length+1);
    as_v8_debug(log, "Number of bins requested %d", arr_length);
    for( int i = 0; i < arr_length; i++) {
        Local<Value> bname = arr->Get(i);
        c_bins[i] = (char*)cf_malloc(AS_BIN_NAME_MAX_SIZE);
        strncpy(c_bins[i], *String::Utf8Value(bname), AS_BIN_NAME_MAX_SIZE);
        as_v8_detail(log, "name of the bin %s", c_bins[i]);
    }
    // The last entry should be NULL because we are passing to select API calls.
    c_bins[arr_length] = NULL;

    *bins = c_bins;
    *num_bins = (uint32_t) arr_length;
    return AS_NODE_PARAM_OK;
}

int udfargs_from_jsobject( char** filename, char** funcname, as_list** args, Local<Object> obj, LogInfo * log)
{
    if(obj->IsNull()) {
        as_v8_error(log, "Object passed is NULL");
        return AS_NODE_PARAM_ERR;
    }

    // Extract UDF module name
    if (obj->Has(Nan::New("module").ToLocalChecked())) {
        Local<Value> module = obj->Get( Nan::New("module").ToLocalChecked());
        if (module->IsString()) {
            int size = module->ToString()->Length() + 1;
            if (*filename == NULL) {
                *filename = (char*) cf_malloc(sizeof(char) * size);
            }
            strncpy(*filename, *String::Utf8Value(module), size);
            as_v8_detail(log, "Filename in the udf args is set to %s", *filename);
        } else {
            as_v8_error(log, "UDF module name should be string");
            return AS_NODE_PARAM_ERR;
        }
    } else {
        as_v8_error(log, "UDF module name should be passed to execute UDF");
        return AS_NODE_PARAM_ERR;
    }

    // Extract UDF function name
    if (obj->Has(Nan::New("funcname").ToLocalChecked())) {
        Local<Value> v8_funcname = obj->Get(Nan::New("funcname").ToLocalChecked());
        if (v8_funcname->IsString()) {
            int size = v8_funcname->ToString()->Length() + 1;
            if (*funcname == NULL) {
                *funcname = (char*) cf_malloc(sizeof(char) * size);
            }
            strncpy(*funcname, *String::Utf8Value(v8_funcname), size);
            as_v8_detail(log, "The function name in the UDF args set to %s", *funcname);
        } else {
            as_v8_error(log, "UDF function name should be string");
            return AS_NODE_PARAM_ERR;
        }
    } else {
        as_v8_error(log, "UDF function name should be passed to execute UDF");
        return AS_NODE_PARAM_ERR;
    }

    Local<Value> arglist = obj->Get(Nan::New("args").ToLocalChecked());
    if (arglist->IsArray()) {
        list_from_jsarray(args, Local<Array>::Cast(arglist), log);
        as_v8_detail(log, "Parsing UDF args -- done !!!");
    } else if (arglist->IsNull() || arglist->IsUndefined()) {
        // No argument case: Initialize array with 0 elements.
        *args = (as_list*) as_arraylist_new(0, 0);
    } else {
        as_v8_error(log, "UDF args should be an array");
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}
