/*******************************************************************************
 * Copyright 2013-2019 Aerospike, Inc.
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

#include <cstdint>
#include <node.h>
#include <node_buffer.h>

#if defined(_MSC_VER)
#include "io.h"
#include "fcntl.h"
#endif

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/aerospike_batch.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
#include <aerospike/as_record_iterator.h>
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
#include "string.h"

using namespace node;
using namespace v8;

const char * DoubleType = "Double";
const char * GeoJSONType = "GeoJSON";

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

int get_string_property(char** strp, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (!value->IsString()) {
        as_v8_error(log, "Type error: %s property should be string", prop);
        return AS_NODE_PARAM_ERR;
    }
    (*strp) = strdup(*Nan::Utf8String(value));
    as_v8_detail(log, "%s => \"%s\"", prop, *strp);
    return AS_NODE_PARAM_OK;
}

int get_optional_string_property(char** strp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (value->IsString()) {
        if (defined != NULL) (*defined) = true;
        (*strp) = strdup(*Nan::Utf8String(value));
        as_v8_detail(log, "%s => \"%s\"", prop, *strp);
    } else if (value->IsUndefined() || value->IsNull()) {
        if (defined != NULL) (*defined) = false;
    } else {
        as_v8_error(log, "Type error: %s property should be string", prop);
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}

int get_int_property(int* intp, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (!value->IsNumber()) {
        as_v8_error(log, "Type error: %s property should be integer", prop);
        return AS_NODE_PARAM_ERR;
    }
    (*intp) = Nan::To<int>(value).FromJust();
    as_v8_detail(log, "%s => (int) %d", prop, *intp);
    return AS_NODE_PARAM_OK;
}

int get_optional_int_property(int* intp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (value->IsNumber()) {
        if (defined != NULL) (*defined) = true;
        (*intp) = Nan::To<int>(value).FromJust();
        as_v8_detail(log, "%s => (int) %d", prop, *intp);
    } else if (value->IsUndefined() || value->IsNull()) {
        if (defined != NULL) (*defined) = false;
    } else {
        as_v8_error(log, "Type error: %s property should be integer", prop);
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}

int get_int64_property(int64_t* intp, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (!value->IsNumber()) {
        as_v8_error(log, "Type error: %s property should be integer", prop);
        return AS_NODE_PARAM_ERR;
    }
    (*intp) = Nan::To<int64_t>(value).FromJust();
    as_v8_detail(log, "%s => (int64) %d", prop, *intp);
    return AS_NODE_PARAM_OK;
}

int get_uint32_property(uint32_t* uintp, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (value->IsNumber()) {
        (*uintp) = Nan::To<uint32_t>(value).FromJust();
        as_v8_detail(log, "%s => (uint32) %d", prop, *uintp);
    } else {
        as_v8_error(log, "Type error: %s property should be integer (uint32)", prop);
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}

int get_optional_int64_property(int64_t* intp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (value->IsNumber()) {
        if (defined != NULL) (*defined) = true;
        (*intp) = Nan::To<int64_t>(value).FromJust();
        as_v8_detail(log, "%s => (int64) %d", prop, *intp);
    } else if (value->IsUndefined() || value->IsNull()) {
        if (defined != NULL) (*defined) = false;
        as_v8_detail(log, "%s => undefined", prop);
    } else {
        as_v8_error(log, "Type error: %s property should be integer", prop);
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}

int get_optional_int32_property(int32_t* intp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (value->IsNumber()) {
        if (defined != NULL) (*defined) = true;
        (*intp) = Nan::To<int32_t>(value).FromJust();
        as_v8_detail(log, "%s => (uint32) %d", prop, *intp);
    } else if (value->IsUndefined() || value->IsNull()) {
        if (defined != NULL) (*defined) = false;
        as_v8_detail(log, "%s => undefined", prop);
    } else {
        as_v8_error(log, "Type error: %s property should be integer (int32)", prop);
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}

int get_optional_uint32_property(uint32_t* intp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (value->IsNumber()) {
        if (defined != NULL) (*defined) = true;
        (*intp) = Nan::To<uint32_t>(value).FromJust();
        as_v8_detail(log, "%s => (uint32) %d", prop, *intp);
    } else if (value->IsUndefined() || value->IsNull()) {
        if (defined != NULL) (*defined) = false;
        as_v8_detail(log, "%s => undefined", prop);
    } else {
        as_v8_error(log, "Type error: %s property should be integer (uint32)", prop);
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}

int get_optional_bool_property(bool* boolp, bool* defined, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (value->IsBoolean()) {
        if (defined != NULL) (*defined) = true;
        (*boolp) = Nan::To<bool>(value).FromJust();
        as_v8_detail(log, "%s => (bool) %d", prop, *boolp);
    } else if (value->IsUndefined() || value->IsNull()) {
        if (defined != NULL) (*defined) = false;
        as_v8_detail(log, "%s => undefined", prop);
    } else {
        as_v8_error(log, "Type error: %s property should be boolean", prop);
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}

int get_bool_property(bool* boolp, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (value->IsBoolean()) {
        (*boolp) = Nan::To<bool>(value).FromJust();
        as_v8_detail(log, "%s => (bool) %d", prop, *boolp);
    } else {
        as_v8_error(log, "Type error: %s property should be boolean", prop);
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}


int get_list_property(as_list** list, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (!value->IsArray()) {
        as_v8_error(log, "Type error: %s property should be array", prop);
        return AS_NODE_PARAM_ERR;
    }
    return list_from_jsarray(list, Local<Array>::Cast(value), log);
}

int get_bytes_property(uint8_t** bytes, int* size, Local<Object> obj, char const* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (!node::Buffer::HasInstance(value)) {
        as_v8_error(log, "Type error: %s property should be Buffer", prop);
        return AS_NODE_PARAM_ERR;
    }

    as_v8_debug(log, "Extracting bytes from JS Buffer");
    if (extract_blob_from_jsobject(bytes, size, value.As<Object>(), log) != AS_NODE_PARAM_OK) {
        as_v8_error(log, "Extracting bytes from a JS Buffer failed");
        return AS_NODE_PARAM_ERR;
    }
    return AS_NODE_PARAM_OK;
}

int get_asval_property(as_val** value, Local<Object> obj, const char* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> v8value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (v8value->IsUndefined()) {
        as_v8_error(log, "Type error: %s property should not be undefined", prop);
        return AS_NODE_PARAM_ERR;
    }
    return asval_from_jsvalue(value, v8value, log);
}

int get_optional_asval_property(as_val** value, bool* defined, Local<Object> obj, const char* prop, const LogInfo* log)
{
    Nan::HandleScope scope;
    Local<Value> v8value = Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
    if (v8value->IsUndefined() || v8value->IsNull()) {
        if (defined != NULL) (*defined) = false;
        as_v8_detail(log, "%s => undefined", prop);
        return AS_NODE_PARAM_OK;
    }
    if (defined != NULL) (*defined) = true;
    return asval_from_jsvalue(value, v8value, log);
}


int host_from_jsobject(Local<Object> obj, char** addr, uint16_t* port, const LogInfo* log)
{
    Local<Value> v8_addr = Nan::Get(obj, Nan::New("addr").ToLocalChecked()).ToLocalChecked();
    Local<Value> v8_port = Nan::Get(obj, Nan::New("port").ToLocalChecked()).ToLocalChecked();

    if (v8_addr->IsString()) {
        *addr = (char*) malloc(HOST_ADDRESS_SIZE);
        strcpy(*addr, *Nan::Utf8String(v8_addr.As<String>()));
        as_v8_detail(log, "host addr : %s", (*addr));
    } else {
        return AS_NODE_PARAM_ERR;
    }

    if (v8_port->IsNumber()) {
        *port = (uint16_t) Nan::To<uint32_t>(v8_port).FromJust();
    } else {
        return AS_NODE_PARAM_ERR;
    }

    return AS_NODE_PARAM_OK;
}

int log_from_jsobject(LogInfo* log, Local<Object> obj)
{
    int rc = AS_NODE_PARAM_OK;
    as_log_level level = log->level;
    FILE* fd = log->fd;

    if (obj->IsObject()) {
        Local<Object> v8_log = obj.As<Object>();
        Local<Value> v8_level = Nan::Get(v8_log, Nan::New("level").ToLocalChecked()).ToLocalChecked();
        Local<Value> v8_file = Nan::Get(v8_log, Nan::New("file").ToLocalChecked()).ToLocalChecked();

        // `level` is optional
        if (v8_level->IsNumber()){
            level = (as_log_level) Nan::To<int>(v8_level).FromJust();
        } else if (v8_level->IsNull() || v8_level->IsUndefined()){
            // `null` and `undefined` imply the value should not change.
        } else {
            // Any other value is a bad parameter
            rc = AS_NODE_PARAM_ERR;
        }

        // `file` is optional
        if (rc == AS_NODE_PARAM_OK) {
            if (v8_file->IsNumber()) {
                int fildes = Nan::To<int>(v8_file).FromJust();
#if !defined(_MSC_VER)
                fd = fdopen(fildes, "a");
#else
                intptr_t osfptr = _get_osfhandle(fildes);
                int osfd = _open_osfhandle(osfptr, O_APPEND);
                fd = _fdopen(osfd, "a");
#endif
                if (fd == NULL) {
                  fprintf(stderr, "Could not open file descriptor for logging: %s\n", strerror(errno));
                  rc = AS_NODE_PARAM_ERR;
                }
            } else if (v8_file->IsNull() || v8_file->IsUndefined()){
                // `null` and `undefined` imply the value should not change.
            } else {
                // Any other value is a bad parameter
                rc = AS_NODE_PARAM_ERR;
            }
        }
    } else {
        // The value should be an object. Otherwise it should fail.
        rc = AS_NODE_PARAM_ERR;
    }

    // Only if no error occurred do we set the log values.
    if (rc == AS_NODE_PARAM_OK) {
        log->level = level;
        log->fd = fd;
    }

    return rc;
}

as_val* asval_clone(const as_val* val, const LogInfo* log)
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

bool key_clone(const as_key* src, as_key** dest, const LogInfo* log, bool alloc_key)
{
    if (src == NULL || dest== NULL) {
        as_v8_info(log, "Parameter error : NULL in source/destination");
        return false;
    }

    as_v8_detail(log, "Cloning the key");
    as_key_value* val = src->valuep;
    if (src->digest.init == true) {
        if (alloc_key) {
            *dest = as_key_new_digest(src->ns, src->set, src->digest.value);
        } else {
            as_key_init_digest(*dest, src->ns, src->set, src->digest.value);
        }
        if (val != NULL) {
            (*dest)->valuep = (as_key_value*) asval_clone((as_val*) val, log);
        }
    } else if (val != NULL) {
        as_key_value* clone_val = (as_key_value*) asval_clone((as_val*) val, log);
        if (alloc_key) {
            *dest = as_key_new_value(src->ns, src->set, (as_key_value*) clone_val);
        } else {
            as_key_init_value(*dest, src->ns, src->set, (as_key_value*) clone_val);
        }
    } else {
        as_v8_detail(log, "Key has neither value nor digest ");
    }

    return true;
}

bool record_clone(const as_record* src, as_record** dest, const LogInfo* log)
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

Local<Object> error_to_jsobject(as_error* error, const LogInfo* log)
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
        as_strlcpy(err_message, error->message, AS_ERROR_MESSAGE_MAX_LEN);
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
            as_strlcpy(error->message, ptr, AS_ERROR_MESSAGE_MAX_LEN);
            ptr = strtok(NULL, ":");
        }

        // LDT error does not populate function name as of now.
        error->func = NULL;

    }
    Nan::Set(err, Nan::New("code").ToLocalChecked(), Nan::New(error->code));
    Nan::Set(err, Nan::New("message").ToLocalChecked(), error->message[0] != '\0' ? Nan::New(error->message).ToLocalChecked() : Nan::New("\0").ToLocalChecked() );
    Nan::Set(err, Nan::New("func").ToLocalChecked(), error->func ? Nan::New(error->func).ToLocalChecked() : Nan::New("\0").ToLocalChecked() );
    Nan::Set(err, Nan::New("file").ToLocalChecked(), error->file ? Nan::New(error->file).ToLocalChecked() : Nan::New("\0").ToLocalChecked() );
    Nan::Set(err, Nan::New("line").ToLocalChecked(), error->line ? Nan::New(error->line) : Nan::New((uint32_t)0) );
    Nan::Set(err, Nan::New("inDoubt").ToLocalChecked(), error->in_doubt ? Nan::True() : Nan::False());

    return scope.Escape(err);
}


Local<Value> val_to_jsvalue(as_val* val, const LogInfo* log)
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
            break;
        }
        case AS_DOUBLE : {
            as_double* dval = as_double_fromval(val);
            if( dval ) {
                double d    = as_double_getorelse(dval, -1);
                as_v8_detail(log, "value = %lf ",d);
                return scope.Escape(Nan::New((double)d));
            }
            break;
        }
        case AS_STRING : {
            as_string * sval = as_string_fromval(val);
            if ( sval ) {
                char * data = as_string_getorelse(sval, NULL);
                as_v8_detail(log, "value = \"%s\"", data);
                return scope.Escape(Nan::New(data).ToLocalChecked());
            }
            break;
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
            break;
        }
        case AS_LIST : {
            as_arraylist* listval = (as_arraylist*) as_list_fromval((as_val*)val);
            int size = as_arraylist_size(listval);
            Local<Array> jsarray = Nan::New<Array>(size);
            for ( int i = 0; i < size; i++ ) {
                as_val * arr_val = as_arraylist_get(listval, i);
                Local<Value> jsval = val_to_jsvalue(arr_val, log);
                Nan::Set(jsarray, i, jsval);
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
                Nan::Set(jsobj, val_to_jsvalue(key, log), val_to_jsvalue(val, log));
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
            break;
        }
        default:
            break;
    }
    return scope.Escape(Nan::Undefined());
}


Local<Object> recordbins_to_jsobject(const as_record* record, const LogInfo* log)
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
        Nan::Set(bins, Nan::New(name).ToLocalChecked(), obj);
        as_v8_detail(log, "Setting binname %s ", name);
    }

    return scope.Escape(bins);
}

Local<Object> recordmeta_to_jsobject(const as_record* record, const LogInfo* log)
{
    Nan::EscapableHandleScope scope;
    Local<Object> meta;

    if(record == NULL) {
        as_v8_debug( log, "Record ( C structure) is NULL, cannot form node.js metadata object");
        return scope.Escape(meta);
    }

    meta = Nan::New<Object>();
    Local<Number> ttl;
    switch(record->ttl) {
        case AS_RECORD_NO_EXPIRE_TTL:
            ttl = Nan::New<Number>(TTL_NEVER_EXPIRE);
            break;
        default:
            ttl = Nan::New<Number>(record->ttl);
    }
    Nan::Set(meta, Nan::New("ttl").ToLocalChecked(), ttl);
    as_v8_detail(log, "TTL of the record %d", record->ttl);
    Nan::Set(meta, Nan::New("gen").ToLocalChecked(), Nan::New(record->gen));
    as_v8_detail(log, "Gen of the record %d", record->gen);

    return scope.Escape(meta);
}

Local<Object> record_to_jsobject(const as_record* record, const as_key* key, const LogInfo* log)
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
    Nan::Set(rec, Nan::New("key").ToLocalChecked(), okey);
    Nan::Set(rec, Nan::New("meta").ToLocalChecked(), meta);
    Nan::Set(rec, Nan::New("bins").ToLocalChecked(), bins);

    return scope.Escape(rec);
}

Local<Array> batch_records_to_jsarray(const as_batch_read_records* records, const LogInfo* log)
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
        Nan::Set(result, Nan::New("status").ToLocalChecked(), Nan::New(status));
        Nan::Set(result, Nan::New("key").ToLocalChecked(), key_to_jsobject(key ? key : &record->key, log));
        if (status == AEROSPIKE_OK) {
            Nan::Set(result, Nan::New("meta").ToLocalChecked(), recordmeta_to_jsobject(record, log));
            Nan::Set(result, Nan::New("bins").ToLocalChecked(), recordbins_to_jsobject(record, log));
        }

        Nan::Set(results, i, result);
    }

    return scope.Escape(results);
}

//Forward references;
int asval_from_jsvalue(as_val** value, Local<Value> v8value, const LogInfo* log);
int extract_blob_from_jsobject(uint8_t** data, int* len, Local<Object> obj, const LogInfo* log);

bool instanceof(Local<Value> value, const char * type)
{
    if (value->IsObject()) {
        Local<String> ctor_name = value.As<Object>()->GetConstructorName();
        Nan::Utf8String cn(ctor_name);
        return 0 == strncmp(*cn, type, strlen(type));
    } else {
        return false;
    }
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
        int64_t i = Nan::To<int64_t>(value).FromJust();
        double d = Nan::To<double>(value).FromJust();
        return d != (double)i;
    }
    return instanceof(value, DoubleType);
}

double double_value(Local<Value> value)
{
    if (instanceof(value, DoubleType)) {
        value = Nan::Get(value.As<Object>(), Nan::New<String>("Double").ToLocalChecked()).ToLocalChecked();
    }
    return Nan::To<double>(value).FromJust();
}

bool is_geojson_value(Local<Value> value)
{
    return instanceof(value, GeoJSONType);
}

char* geojson_as_string(Local<Value> value)
{
    Local<Value> strval = Nan::Get(value.As<Object>(), Nan::New("str").ToLocalChecked()).ToLocalChecked();
    return strdup(*Nan::Utf8String(strval));
}

int list_from_jsarray(as_list** list, Local<Array> array, const LogInfo* log)
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
        if (asval_from_jsvalue(&val, Nan::Get(array, i).ToLocalChecked(), log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        as_list_append(*list, val);
    }
    return AS_NODE_PARAM_OK;
}

int map_from_jsobject(as_map** map, Local<Object> obj, const LogInfo* log)
{
    const Local<Array> props = Nan::GetOwnPropertyNames(obj.As<Object>()).ToLocalChecked();
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
        const Local<Value> name = Nan::Get(props, i).ToLocalChecked();
        const Local<Value> value = Nan::Get(obj, name).ToLocalChecked();
        as_val* val = NULL;
        if (asval_from_jsvalue(&val, value, log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        as_stringmap_set(*map, *Nan::Utf8String(name), val);
    }
    return AS_NODE_PARAM_OK;
}

int asval_from_jsvalue(as_val** value, Local<Value> v8value, const LogInfo* log)
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
        *value = (as_val*) as_boolean_new(Nan::To<bool>(v8value).FromJust());
    } else if (v8value->IsString()) {
        *value = (as_val*) as_string_new(strdup(*Nan::Utf8String(v8value)), true);
    } else if (v8value->IsInt32()) {
        *value = (as_val*) as_integer_new(Nan::To<int32_t>(v8value).FromJust());
    } else if (v8value->IsUint32()) {
        *value = (as_val*) as_integer_new(Nan::To<uint32_t>(v8value).FromJust());
    } else if (is_double_value(v8value)) {
        *value = (as_val*) as_double_new(double_value(v8value));
    } else if (v8value->IsNumber()) {
        *value = (as_val*) as_integer_new(Nan::To<int64_t>(v8value).FromJust());
    } else if (node::Buffer::HasInstance(v8value)) {
        int size;
        uint8_t* data;
        if (extract_blob_from_jsobject(&data, &size, v8value.As<Object>(), log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "Extractingb blob from a js object failed");
            return AS_NODE_PARAM_ERR;
        }
        *value = (as_val*) as_bytes_new_wrap(data, size, true);
    } else if (v8value->IsArray()) {
        if (list_from_jsarray((as_list**) value, Local<Array>::Cast(v8value), log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
    } else if (is_geojson_value(v8value)) {
        char* jsonstr = geojson_as_string(v8value);
        *value = (as_val*) as_geojson_new(jsonstr, true);
    } else { // generic object - treat as map
        if (map_from_jsobject((as_map**) value, v8value.As<Object>(), log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
    }

    if (as_v8_detail_enabled(log)) {
        auto val_type = as_val_type(*value);
        char* val_str = as_val_tostring(*value);
        as_v8_detail(log, "type: %d, string value: %s", val_type, val_str);
        cf_free(val_str);
    }

    return AEROSPIKE_OK;
}

int recordbins_from_jsobject(as_record* rec, Local<Object> obj, const LogInfo* log)
{
    const Local<Array> props = Nan::GetOwnPropertyNames(obj).ToLocalChecked();
    const uint32_t count = props->Length();
    as_record_init(rec, count);
    for ( uint32_t i = 0; i < count; i++ ) {

        const Local<Value> name = Nan::Get(props, i).ToLocalChecked();
        const Local<Value> value = Nan::Get(obj, name).ToLocalChecked();

        // A bin can be undefined, or an entry inside a CDT(list, map)
        // can be an undefined value.
        // If a bin is undefined, it must error out at the earliest.
        if( value->IsUndefined()) {
            as_v8_error(log, "Bin value 'undefined' not supported: %s", *Nan::Utf8String(name));
            return AS_NODE_PARAM_ERR;
        }

        Nan::Utf8String n(name);
        if( strlen(*n) > AS_BIN_NAME_MAX_SIZE ) {
            as_v8_error(log, "Bin name length exceeded (max. 14): %s", *n);
            return AS_NODE_PARAM_ERR;
        }
        as_val* val = NULL;
        if (asval_from_jsvalue(&val, value, log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        switch(as_val_type(val)) {
            case AS_BOOLEAN:
                as_val_destroy(val);
                as_v8_error(log, "Boolean type not supported: %s", *n);
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
                as_v8_error(log,"Skipping unsupported as_val type %i: %s", as_val_type(val), *n);
                break;
        }
    }

    return AS_NODE_PARAM_OK;
}


int recordmeta_from_jsobject(as_record* rec, Local<Object> obj, const LogInfo* log)
{
    as_v8_detail(log, "Setting record meta from JS object");
    if (setTTL(obj, &rec->ttl, log) != AS_NODE_PARAM_OK) {
        return AS_NODE_PARAM_ERR;
    };
    if (setGeneration(obj, &rec->gen, log) != AS_NODE_PARAM_OK) {;
        return AS_NODE_PARAM_ERR;
    }

    return AS_NODE_PARAM_OK;
}


int extract_blob_from_jsobject(uint8_t** data, int* len, Local<Object> obj, const LogInfo* log)
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


int setTTL(Local<Object> obj, uint32_t* ttl, const LogInfo* log)
{
    Local<Value> v8_ttl = Nan::Get(obj, Nan::New("ttl").ToLocalChecked()).ToLocalChecked();
    if (v8_ttl->IsNumber()) {
        (*ttl) = Nan::To<uint32_t>(v8_ttl).FromJust();
        as_v8_detail(log, "TTL: %d", (*ttl));
    } else if (v8_ttl->IsNull() || v8_ttl->IsUndefined()) {
        // noop - ttl may not be specified
    } else {
        return AS_NODE_PARAM_ERR;
    }

    return AS_NODE_PARAM_OK;
}

int setGeneration(Local<Object> obj, uint16_t* generation, const LogInfo* log)
{
    Local<Value> v8_gen = Nan::Get(obj, Nan::New("gen").ToLocalChecked()).ToLocalChecked();
    if (v8_gen->IsNumber()) {
        (*generation) = (uint16_t) Nan::To<uint32_t>(v8_gen).FromJust();
        as_v8_detail(log, "Generation: %d", (*generation));
    } else if (v8_gen->IsNull() || v8_gen->IsUndefined()) {
        // noop - gen may not be specified
    } else {
        as_v8_error(log, "Generation should be an integer");
        return AS_NODE_PARAM_ERR;
    }

    return AS_NODE_PARAM_OK;
}

Local<Object> key_to_jsobject(const as_key* key, const LogInfo* log)
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj;
    if (key == NULL) {
        as_v8_debug(log, "Key (C structure) is NULL, cannot form node.js key object");
        return scope.Escape(obj);
    }

    obj = Nan::New<Object>();
    if (strlen(key->ns) > 0) {
        as_v8_detail(log, "key.ns = \"%s\"", key->ns);
        Nan::Set(obj, Nan::New("ns").ToLocalChecked(), Nan::New(key->ns).ToLocalChecked());
    } else {
        as_v8_debug(log, "Key namespace is NULL");
    }

    if (strlen(key->set) > 0) {
        as_v8_detail(log, "key.set = \"%s\"", key->set);
        Nan::Set(obj, Nan::New("set").ToLocalChecked(), Nan::New(key->set).ToLocalChecked());
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
                Nan::Set(obj, Nan::New("key").ToLocalChecked(), Nan::New((double)as_integer_get(ival)));
                break;
            }
            case AS_STRING: {
                as_string * sval = as_string_fromval(val);
                as_v8_detail(log, "key.key = \"%s\"", as_string_get(sval));
                Nan::Set(obj, Nan::New("key").ToLocalChecked(), Nan::New(as_string_get(sval)).ToLocalChecked());
                break;
            }
            case AS_BYTES: {
                as_bytes * bval = as_bytes_fromval(val);
                if ( bval ) {
                    uint32_t size = as_bytes_size(bval);
                    as_v8_detail(log,"key.key = \"%u\"", bval->value);
                    Local<Object> buff = Nan::CopyBuffer((char*)bval->value, size).ToLocalChecked();
                    Nan::Set(obj, Nan::New("key").ToLocalChecked(), buff);
                    break;
                }
            }
            default:
                break;
        }
    } else {
        as_v8_detail(log, "Key value is NULL");
    }

    if (key->digest.init == true) {
        Local<Object> buff = Nan::CopyBuffer((char*)key->digest.value, AS_DIGEST_VALUE_SIZE).ToLocalChecked();
        Nan::Set(obj, Nan::New("digest").ToLocalChecked(), buff);
    }

    return scope.Escape(obj);
}

Local<Object> jobinfo_to_jsobject(const as_job_info* info, const LogInfo* log)
{
    Local<Object> jobinfo;

    if (info == NULL) {
        as_v8_debug(log, "Job Info ( C structure) is NULL, cannot form node.js jobInfo object");
        return jobinfo;
    }

    jobinfo = Nan::New<Object>();
    Nan::Set(jobinfo, Nan::New("progressPct").ToLocalChecked(), Nan::New(info->progress_pct));
    as_v8_detail(log, "Progress pct of the job %d", info->progress_pct);
    Local<Value> recordsRead = Nan::New((double)info->records_read);
    Nan::Set(jobinfo, Nan::New("recordsRead").ToLocalChecked(), recordsRead);
    as_v8_detail(log, "Number of records read so far %d", info->records_read);
    Nan::Set(jobinfo, Nan::New("status").ToLocalChecked(), Nan::New(info->status));

    return jobinfo;
}

int key_from_jsobject(as_key* key, Local<Object> obj, const LogInfo* log)
{
    Nan::EscapableHandleScope scope;
    as_namespace ns = {'\0'};
    as_set set = {'\0'};

    if (obj->IsNull()) {
        as_v8_error(log, "The key object passed is Null");
        return AS_NODE_PARAM_ERR;
    }

    Local<Value> ns_obj = Nan::Get(obj, Nan::New("ns").ToLocalChecked()).ToLocalChecked();
    if (ns_obj->IsString()) {
        if (as_strlcpy(ns, *Nan::Utf8String(ns_obj), AS_NAMESPACE_MAX_SIZE) > AS_NAMESPACE_MAX_SIZE) {
            as_v8_error(log, "The key namespace is too long (max. %d)", AS_NAMESPACE_MAX_SIZE);
            return AS_NODE_PARAM_ERR;
        }
        if (strlen(ns) == 0) {
            as_v8_error(log, "The key namespace must not be empty");
            return AS_NODE_PARAM_ERR;
        }
        as_v8_detail(log, "key.ns = \"%s\"", ns);
    } else {
        as_v8_error(log, "The key namespace must be a string");
        return AS_NODE_PARAM_ERR;
    }

    Local<Value> set_obj = Nan::Get(obj, Nan::New("set").ToLocalChecked()).ToLocalChecked();
    if (set_obj->IsString()) {
        if (as_strlcpy(set, *Nan::Utf8String(set_obj), AS_SET_MAX_SIZE) > AS_SET_MAX_SIZE) {
            as_v8_error(log, "The key set is too long (max. %d)", AS_SET_MAX_SIZE);
            return AS_NODE_PARAM_ERR;
        }
        if (strlen(set) == 0) {
            as_v8_debug(log, "Key set passed is empty string");
        }
        as_v8_detail(log,"key.set = \"%s\"", set);
    } else if (set_obj->IsNull() || set_obj->IsUndefined()) {
        // noop - set name may not be specified
    } else {
        as_v8_error(log, "The key set must be a string");
        return AS_NODE_PARAM_ERR;
    }

    bool has_value = false;
    Local<Value> val_obj = Nan::Get(obj, Nan::New("key").ToLocalChecked()).ToLocalChecked();
    if (val_obj->IsString()) {
        char* value = strdup(*Nan::Utf8String(val_obj));
        as_key_init(key, ns, set, value);
        as_v8_detail(log, "key.key = \"%s\"", value);
        ((as_string*) key->valuep)->free = true;
        has_value = true;
    } else if (is_double_value(val_obj)) {
        as_v8_error(log, "Invalid key value: double - only string, integer and Buffer are supported");
        return AS_NODE_PARAM_ERR;
    } else if (val_obj->IsNumber()) {
        int64_t value = Nan::To<int64_t>(val_obj).FromJust();
        as_key_init_int64(key, ns, set, value);
        as_v8_detail(log, "key.key = %d", value);
        has_value = true;
    } else if (val_obj->IsObject()) {
        Local<Object> obj = val_obj.As<Object>();
        int size ;
        uint8_t* data ;
        if (extract_blob_from_jsobject(&data, &size, obj, log) != AS_NODE_PARAM_OK) {
            return AS_NODE_PARAM_ERR;
        }
        as_key_init_rawp(key, ns, set, data, size, true);
        has_value = true;

        as_v8_detail(log,
                "key.key = <%x %x %x%s>",
                size > 0 ? data[0] : 0,
                size > 1 ? data[1] : 0,
                size > 2 ? data[2] : 0,
                size > 3 ? " ..." : ""
                );
    } else if (val_obj->IsNull() || val_obj->IsUndefined()) {
        // noop - value can be omitted if digest is given
    } else {
        as_v8_error(log, "Invalid key value - only string, integer and Buffer are supported");
        return AS_NODE_PARAM_ERR;
    }

    if (has_value) {
        // Copy the digest back to the JS key object
        as_digest* digest = as_key_digest(key);
        uint8_t* bytes = digest->value;
        Local<Object> buff = scope.Escape(Nan::CopyBuffer((char*) bytes, AS_DIGEST_VALUE_SIZE).ToLocalChecked());
        Nan::Set(obj, Nan::New("digest").ToLocalChecked(), buff);
    } else {
        Local<Value> digest_value = Nan::Get(obj, Nan::New("digest").ToLocalChecked()).ToLocalChecked();
        if (digest_value->IsObject()) {
            Local<Object> digest_obj = digest_value.As<Object>();
            int size;
            uint8_t* data;
            if (extract_blob_from_jsobject(&data, &size, digest_obj, log) != AS_NODE_PARAM_OK) {
                return AS_NODE_PARAM_ERR;
            }
            as_digest_value digest;
            memcpy(digest, data, AS_DIGEST_VALUE_SIZE);
            as_v8_detail(log,
                    "key.digest = <%x %x %x%s>",
                    size > 0 ? digest[0] : 0,
                    size > 1 ? digest[1] : 0,
                    size > 2 ? digest[2] : 0,
                    size > 3 ? " ..." : ""
                    );
            as_key_init_digest(key, ns, set, digest);
        } else if (digest_value->IsNull() || digest_value->IsUndefined()) {
            as_v8_error(log, "The key must have either a \"value\" or a \"digest\"");
            return AS_NODE_PARAM_ERR;
        } else {
            as_v8_error(log, "Invalid digest value: \"digest\" must be a 20-byte Buffer");
            return AS_NODE_PARAM_ERR;
        }
    }

    return AS_NODE_PARAM_OK;
}

int batch_from_jsarray(as_batch* batch, Local<Array> arr, const LogInfo* log)
{
    uint32_t len = arr->Length();
    as_batch_init(batch, len);
    for (uint32_t i = 0; i < len; i++) {
        Local<Object> key = Nan::Get(arr, i).ToLocalChecked().As<Object>();
        if (key_from_jsobject(as_batch_keyat(batch, i), key, log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "Parsing batch key [%d] failed", i);
            return AS_NODE_PARAM_ERR;
        }
    }

    return AS_NODE_PARAM_OK;
}

int batch_read_records_from_jsarray(as_batch_read_records** records, Local<Array> arr, const LogInfo* log)
{
    uint32_t no_records = arr->Length();
    *records = as_batch_read_create(no_records);
    for (uint32_t i = 0; i < no_records; i++) {
        as_batch_read_record* record = as_batch_read_reserve(*records);
        Local<Object> obj = Nan::Get(arr, i).ToLocalChecked().As<Object>();

        Local<Object> key = Nan::Get(obj, Nan::New("key").ToLocalChecked()).ToLocalChecked().As<Object>();
        if (key_from_jsobject(&record->key, key, log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "Parsing batch keys failed");
            return AS_NODE_PARAM_ERR;
        }

        Local<Value> v8_bins = Nan::Get(obj, Nan::New("bins").ToLocalChecked()).ToLocalChecked();
        if (v8_bins->IsArray()) {
            char** bin_names;
            uint32_t n_bin_names;
            if (bins_from_jsarray(&bin_names, &n_bin_names, Local<Array>::Cast(v8_bins), log) != AS_NODE_PARAM_OK) {
                as_v8_error(log, "Parsing batch bin names failed");
                return AS_NODE_PARAM_ERR;
            }
            record->bin_names = bin_names;
            record->n_bin_names = n_bin_names;
        }

        Local<Value> v8_read_all_bins = Nan::Get(obj, Nan::New("read_all_bins").ToLocalChecked()).ToLocalChecked();
        if (v8_read_all_bins->IsBoolean()) {
            record->read_all_bins = Nan::To<bool>(v8_read_all_bins).FromJust();
        }
    }
    return AS_NODE_PARAM_OK;
}

int bins_from_jsarray(char*** bins, uint32_t* num_bins, Local<Array> arr, const LogInfo* log)
{
    int arr_length = arr->Length();
    char** c_bins = (char**) cf_calloc(sizeof(char*), arr_length+1);
    as_v8_debug(log, "Number of bins requested %d", arr_length);
    for( int i = 0; i < arr_length; i++) {
        Local<Value> bname = Nan::Get(arr, i).ToLocalChecked();
        c_bins[i] = (char*)cf_malloc(AS_BIN_NAME_MAX_SIZE);
        as_strlcpy(c_bins[i], *Nan::Utf8String(bname), AS_BIN_NAME_MAX_SIZE);
        as_v8_detail(log, "name of the bin %s", c_bins[i]);
    }
    // The last entry should be NULL because we are passing to select API calls.
    c_bins[arr_length] = NULL;

    *bins = c_bins;
    *num_bins = (uint32_t) arr_length;
    return AS_NODE_PARAM_OK;
}

void
free_batch_records(as_batch_read_records* records)
{
    const as_vector* list = &records->list;
    for (uint32_t i = 0; i < list->size; i++) {
        as_batch_read_record* batch_record = (as_batch_read_record*) as_vector_get((as_vector*) list, i);
        if (batch_record->n_bin_names > 0) {
            for (uint32_t j = 0; j < batch_record->n_bin_names; j++) {
                cf_free(batch_record->bin_names[j]);
            }
            cf_free(batch_record->bin_names);
        }
    }

    as_batch_read_destroy(records);
}


int udfargs_from_jsobject(char** filename, char** funcname, as_list** args, Local<Object> obj, const LogInfo* log)
{
    if (obj->IsNull()) {
        as_v8_error(log, "Object passed is NULL");
        return AS_NODE_PARAM_ERR;
    }

    // Extract UDF module name
    Local<Value> v8_module = Nan::Get(obj, Nan::New("module").ToLocalChecked()).ToLocalChecked();
    if (v8_module->IsString()) {
        size_t size = v8_module.As<String>()->Length() + 1;
        if (*filename == NULL) {
            *filename = (char*) cf_malloc(sizeof(char) * size);
        }
        if (as_strlcpy(*filename, *Nan::Utf8String(v8_module), size) > size) {
            as_v8_error(log, "UDF module name is too long (> %d)", size);
            return AS_NODE_PARAM_ERR;
        }
        as_v8_detail(log, "Filename in the udf args is set to %s", *filename);
    } else {
        as_v8_error(log, "UDF module name should be string");
        return AS_NODE_PARAM_ERR;
    }

    // Extract UDF function name
    Local<Value> v8_funcname = Nan::Get(obj, Nan::New("funcname").ToLocalChecked()).ToLocalChecked();
    if (v8_funcname->IsString()) {
        size_t size = v8_funcname.As<String>()->Length() + 1;
        if (*funcname == NULL) {
            *funcname = (char*) cf_malloc(sizeof(char) * size);
        }
        if (as_strlcpy(*funcname, *Nan::Utf8String(v8_funcname), size) > size) {
            as_v8_error(log, "UDF function name is too long (> %d)", size);
            return AS_NODE_PARAM_ERR;
        }
        as_v8_detail(log, "The function name in the UDF args set to %s", *funcname);
    } else {
        as_v8_error(log, "UDF function name should be string");
        return AS_NODE_PARAM_ERR;
    }

    Local<Value> arglist = Nan::Get(obj, Nan::New("args").ToLocalChecked()).ToLocalChecked();
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

// Like strncpy but does not 0 fill the buffer and always null
// terminates. bufsize is the size of the destination buffer.
size_t as_strlcpy(char *d, const char *s, size_t bufsize)
{
    size_t len = strlen(s);
    size_t ret = len;
    if (len >= bufsize) len = bufsize-1;
    memcpy(d, s, len);
    d[len] = 0;
    return ret;
}
