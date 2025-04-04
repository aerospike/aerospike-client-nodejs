/*******************************************************************************
 * Copyright 2013-2023 Aerospike, Inc.
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
#include <complex>
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
#include <aerospike/aerospike_stats.h>
#include <aerospike/as_metrics_writer.h>
#include <aerospike/as_key.h>
#include <aerospike/as_error.h>
#include <aerospike/as_record.h>
#include <aerospike/as_record_iterator.h>
#include <aerospike/aerospike_scan.h>
#include <aerospike/as_arraylist.h>
#include <aerospike/as_arraylist_iterator.h>
#include <aerospike/as_boolean.h>
#include <aerospike/as_geojson.h>
#include <aerospike/as_latency.h>
#include <aerospike/as_orderedmap.h>
#include <aerospike/as_pair.h>
#include <aerospike/as_scan.h>
#include <aerospike/as_map.h>
#include <aerospike/as_nil.h>
#include <aerospike/as_stringmap.h>
#include <aerospike/as_vector.h>
#include <aerospike/as_admin.h>
#include <citrusleaf/alloc.h>

}

#include "client.h"
#include "conversions.h"
#include "log.h"
#include "enums.h"
#include "string.h"
#include "transaction.h"

using namespace node;
using namespace v8;

const char *DoubleType = "Double";
const char *GeoJSONType = "GeoJSON";
const char *BinType = "Bin";
const char *TransactionType = "Transaction";

const int64_t MIN_SAFE_INTEGER = -1 * (std::pow(2, 53) - 1);
const int64_t MAX_SAFE_INTEGER = std::pow(2, 53) - 1;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

int get_string_property(char **strp, Local<Object> obj, char const *prop,
						const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (!value->IsString()) {
		as_v8_error(log, "Type error: %s property should be string", prop);
		return AS_NODE_PARAM_ERR;
	}
	(*strp) = strdup(*Nan::Utf8String(value));
	as_v8_detail(log, "%s => \"%s\"", prop, *strp);
	return AS_NODE_PARAM_OK;
}

int get_optional_string_property(char **strp, bool *defined, Local<Object> obj,
								 char const *prop, const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsString()) {
		if (defined != NULL)
			(*defined) = true;
		(*strp) = strdup(*Nan::Utf8String(value));
		as_v8_detail(log, "%s => \"%s\"", prop, *strp);
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be string", prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_int_property(int *intp, Local<Object> obj, char const *prop,
					 const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (!value->IsNumber()) {
		as_v8_error(log, "Type error: %s property should be integer", prop);
		return AS_NODE_PARAM_ERR;
	}
	(*intp) = Nan::To<int>(value).FromJust();
	as_v8_detail(log, "%s => (int) %d", prop, *intp);
	return AS_NODE_PARAM_OK;
}

int get_optional_int_property(int *intp, bool *defined, Local<Object> obj,
							  char const *prop, const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		if (defined != NULL)
			(*defined) = true;
		(*intp) = Nan::To<int>(value).FromJust();
		as_v8_detail(log, "%s => (int) %d", prop, *intp);
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
	}
	else {
		as_v8_error(log, "Type error: %s property should be integer", prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_optional_rack_ids_property(as_config *config, bool *defined, Local<Object> obj,
							  char const *prop, const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsArray()) {
		Local<Array> rack_ids_array = value.As<Array>();
		for (uint32_t i = 0; i < rack_ids_array->Length(); ++i)
		{
			Local<Value> array_value = Nan::Get(rack_ids_array, i).ToLocalChecked();
			if(array_value->IsNumber()) {	
				int rack_id  = Nan::To<int>(array_value).FromJust();
				as_config_add_rack_id(config, rack_id);
				as_v8_detail(log, "%s => added (int) %d", prop, rack_id);
			}
			else{
				as_v8_error(log, "Type error: %s property array values should be integers", prop);
				return AS_NODE_PARAM_ERR;
			}
		}
		if(config->rack_ids){
			if (defined != NULL)
				(*defined) = true;
		}
		else{
			if (defined != NULL)
				(*defined) = false;
			as_v8_detail(log, "%s => []", prop);	
		}
		
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be an array", prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_int64_property(int64_t *intp, Local<Object> obj, char const *prop,
					   const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (!value->IsNumber()) {
		as_v8_error(log, "Type error: %s property should be integer", prop);
		as_v8_detail(log, "%s => (int64) %d", prop, *intp);
		return AS_NODE_PARAM_ERR;
	}
	(*intp) = Nan::To<int64_t>(value).FromJust();
	as_v8_detail(log, "%s => (int64) %d", prop, *intp);
	return AS_NODE_PARAM_OK;
}

int get_uint64_property(uint64_t *intp, Local<Object> obj, char const *prop,
						const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (!value->IsNumber()) {
		as_v8_error(log, "Type error: %s property should be integer", prop);
		return AS_NODE_PARAM_ERR;
	}
	(*intp) = Nan::To<int64_t>(value).FromJust();
	as_v8_detail(log, "%s => (uint64) %d", prop, *intp);
	return AS_NODE_PARAM_OK;
}

int get_uint32_property(uint32_t *uintp, Local<Object> obj, char const *prop,
						const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		(*uintp) = Nan::To<uint32_t>(value).FromJust();
		as_v8_detail(log, "%s => (uint32) %d", prop, *uintp);
	}
	else {
		as_v8_error(log, "Type error: %s property should be integer (uint32)",
					prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_optional_int64_property(int64_t *intp, bool *defined, Local<Object> obj,
								char const *prop, const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		if (defined != NULL)
			(*defined) = true;
		(*intp) = Nan::To<int64_t>(value).FromJust();
		as_v8_detail(log, "%s => (int64) %d", prop, *intp);
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be integer", prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_optional_int32_property(int32_t *intp, bool *defined, Local<Object> obj,
								char const *prop, const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		if (defined != NULL)
			(*defined) = true;
		(*intp) = Nan::To<int32_t>(value).FromJust();
		as_v8_detail(log, "%s => (uint32) %d", prop, *intp);
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be integer (int32)",
					prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_optional_uint64_property(uint64_t *intp, bool *defined, Local<Object> obj,
								char const *prop, const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		if (defined != NULL)
			(*defined) = true;
		(*intp) = Nan::To<int64_t>(value).FromJust();
		as_v8_detail(log, "%s => (uint64) %d", prop, *intp);
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be integer (uint64)", prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_optional_uint32_property(uint32_t *intp, bool *defined,
								 Local<Object> obj, char const *prop,
								 const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		if (defined != NULL)
			(*defined) = true;
		(*intp) = Nan::To<uint32_t>(value).FromJust();
		as_v8_detail(log, "%s => (uint32) %d", prop, *intp);
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be integer (uint32)",
					prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_optional_uint16_property(uint16_t *intp, bool *defined,
								 Local<Object> obj, char const *prop,
								 const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber()) {
		if (defined != NULL)
			(*defined) = true;
		(*intp) = Nan::To<uint32_t>(value).FromJust();
		as_v8_detail(log, "%s => (uint16_t) %d", prop, *intp);
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be integer (uint16_t)",
					prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_float_property(double *floatp, Local<Object> obj, char const *prop,
					   const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsNumber() || instanceof (value, DoubleType)) {
		(*floatp) = double_value(value);
		as_v8_detail(log, "%s => (double) %g", prop, *floatp);
	}
	else {
		as_v8_error(log,
					"Type error: %s property should be a floating point number",
					prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_optional_bool_property(bool *boolp, bool *defined, Local<Object> obj,
							   char const *prop, const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsBoolean()) {
		if (defined != NULL)
			(*defined) = true;
		(*boolp) = Nan::To<bool>(value).FromJust();
		as_v8_detail(log, "%s => (bool) %d", prop, *boolp);
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be boolean", prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}



int get_optional_transaction_property(as_txn **txn, bool *defined,
								Local<Object> obj, char const *prop,
								const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> js_wrapper_value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();

	if (js_wrapper_value->IsObject()) {
		Local<Value> value =
			Nan::Get(js_wrapper_value.As<Object>(), Nan::New("transaction").ToLocalChecked()).ToLocalChecked();
		if (is_transaction_value(value)) {
			if (defined != NULL)
				(*defined) = true;
			Transaction *transaction = Nan::ObjectWrap::Unwrap<Transaction>(value.As<Object>());

			(*txn) = transaction->txn;

			as_v8_detail(log, "%s => (transaction) %d", prop, (*txn)->id);
		}
		else if (value->IsUndefined() || value->IsNull()) {
			if (defined != NULL)
				(*defined) = false;

			as_v8_detail(log, "%s => undefined", prop);
		}
		else {
			as_v8_error(log, "Type error: %s property should be a Transaction type", prop);
			return AS_NODE_PARAM_ERR;
		}
	}
	return AS_NODE_PARAM_OK;
}

int get_bool_property(bool *boolp, Local<Object> obj, char const *prop,
					  const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (value->IsBoolean()) {
		(*boolp) = Nan::To<bool>(value).FromJust();
		as_v8_detail(log, "%s => (bool) %d", prop, *boolp);
	}
	else {
		as_v8_error(log, "Type error: %s property should be boolean", prop);
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_list_property(as_list **list, Local<Object> obj, char const *prop,
					  const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (!value->IsArray()) {
		as_v8_error(log, "Type error: %s property should be array", prop);
		return AS_NODE_PARAM_ERR;
	}
	return list_from_jsarray(list, Local<Array>::Cast(value), log);
}


int get_bytes_property(uint8_t **bytes, int *size, Local<Object> obj,
					   char const *prop, const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (!node::Buffer::HasInstance(value)) {
		as_v8_error(log, "Type error: %s property should be Buffer", prop);
		return AS_NODE_PARAM_ERR;
	}

	as_v8_debug(log, "Extracting bytes from JS Buffer");
	if (extract_blob_from_jsobject(bytes, size, value.As<Object>(), log) !=
		AS_NODE_PARAM_OK) {
		as_v8_error(log, "Extracting bytes from a JS Buffer failed");
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

int get_optional_bytes_property(uint8_t **bytes, int *size, bool *defined,
								Local<Object> obj, char const *prop,
								const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (node::Buffer::HasInstance(value)) {
		as_v8_debug(log, "Extracting bytes from JS Buffer");
		if (extract_blob_from_jsobject(bytes, size, value.As<Object>(), log) !=
			AS_NODE_PARAM_OK) {
			as_v8_error(log, "Extracting bytes from a JS Buffer failed");
			return AS_NODE_PARAM_ERR;
		}
		if (defined != NULL)
			(*defined) = true;
	}
	else if (value->IsUndefined() || value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
	}
	else {
		as_v8_error(log, "Type error: %s property should be Buffer", prop);
		if (defined != NULL)
			(*defined) = false;
		return AS_NODE_PARAM_ERR;
	}
	return AS_NODE_PARAM_OK;
}

void get_inf_property(as_val **value, const LogInfo *log)
{
	Nan::HandleScope scope;
	*value = (as_val *)&as_cmp_inf;
}

void get_wildcard_property(as_val **value, const LogInfo *log)
{
	Nan::HandleScope scope;
	*value = (as_val *)&as_cmp_wildcard;
}

int get_asval_property(as_val **value, Local<Object> obj, const char *prop,
					   const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> v8value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (v8value->IsUndefined()) {
		as_v8_error(log, "Type error: %s property should not be undefined",
					prop);
		return AS_NODE_PARAM_ERR;
	}
	return asval_from_jsvalue(value, v8value, log);
}

int get_optional_asval_property(as_val **value, bool *defined,
								Local<Object> obj, const char *prop,
								const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> v8value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (v8value->IsUndefined() || v8value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
		return AS_NODE_PARAM_OK;
	}
	if (defined != NULL)
		(*defined) = true;
	return asval_from_jsvalue(value, v8value, log);
}

int get_optional_report_dir_property(char **report_dir, bool *defined,
								Local<Object> obj, const char *prop,
								const LogInfo *log)
{
	Nan::HandleScope scope;
	Local<Value> v8value =
		Nan::Get(obj, Nan::New(prop).ToLocalChecked()).ToLocalChecked();
	if (v8value->IsUndefined() || v8value->IsNull()) {
		if (defined != NULL)
			(*defined) = false;
		as_v8_detail(log, "%s => undefined", prop);
		return AS_NODE_PARAM_OK;
	}
	if (v8value->IsString()) {
		*report_dir = (char *)malloc(256);
		Local<String> v8_string_report_dir = v8value.As<String>();
		if((v8_string_report_dir->Length() + 1) > 256){
			as_v8_error(log, "Property error: %s report_dir must be less than 255 characters",
					prop);
			return AS_NODE_PARAM_ERR;
		}
		strncpy(*report_dir, *Nan::Utf8String(v8_string_report_dir), ((v8_string_report_dir->Length() + 1) < 256) ?
		(v8_string_report_dir->Length() + 1) : 256);
		as_v8_detail(log, "report dir : %s", (*report_dir));
		if (defined != NULL)
			(*defined) = true;
		return AS_NODE_PARAM_OK;
	}
	as_v8_error(log, "Type error: %s property should be String", prop);
	if (defined != NULL)
		(*defined) = false;
	return AS_NODE_PARAM_ERR;

}

int host_from_jsobject(Local<Object> obj, char **addr, uint16_t *port,
					   const LogInfo *log)
{
	Local<Value> v8_addr =
		Nan::Get(obj, Nan::New("addr").ToLocalChecked()).ToLocalChecked();
	Local<Value> v8_port =
		Nan::Get(obj, Nan::New("port").ToLocalChecked()).ToLocalChecked();

	if (v8_addr->IsString()) {
		*addr = (char *)malloc(HOST_ADDRESS_SIZE);
		Local<String> v8_string_addr = v8_addr.As<String>();
		strncpy(*addr, *Nan::Utf8String(v8_string_addr), ((v8_string_addr->Length() + 1) < HOST_ADDRESS_SIZE) ?
		(v8_string_addr->Length() + 1) : HOST_ADDRESS_SIZE);
		as_v8_detail(log, "host addr : %s", (*addr));
	}
	else {
		return AS_NODE_PARAM_ERR;
	}

	if (v8_port->IsNumber()) {
		*port = (uint16_t)Nan::To<uint32_t>(v8_port).FromJust();
	}
	else {
		return AS_NODE_PARAM_ERR;
	}

	return AS_NODE_PARAM_OK;
}

int datacenter_from_jsobject(Local<Value> v8_dc, char **dc,
					   const LogInfo *log)
{

	if (v8_dc->IsString()) {
		Local<String> v8_string_dc = v8_dc.As<String>();
		int data_center_max_size = ((v8_string_dc->Length()) < 31) ? (v8_string_dc->Length()) : 31;
		*dc = (char *)malloc(data_center_max_size + 1);
		strncpy(*dc, *Nan::Utf8String(v8_string_dc), ((v8_string_dc->Length()) < data_center_max_size) ?
		(v8_string_dc->Length()) : data_center_max_size);
		(*dc)[data_center_max_size] = '\0';  // null-terminate

		as_v8_detail(log, "data center : %s", (*dc));
	}
	else {
		return AS_NODE_PARAM_ERR;
	}

	return AS_NODE_PARAM_OK;
}

int log_from_jsobject(LogInfo *log, Local<Object> obj)
{
	int rc = AS_NODE_PARAM_OK;
	as_log_level level = log->level;
	FILE *fd = log->fd;

	if (obj->IsObject()) {
		Local<Object> v8_log = obj.As<Object>();
		Local<Value> v8_level =
			Nan::Get(v8_log, Nan::New("level").ToLocalChecked())
				.ToLocalChecked();
		Local<Value> v8_file =
			Nan::Get(v8_log, Nan::New("file").ToLocalChecked())
				.ToLocalChecked();

		// `level` is optional
		if (v8_level->IsNumber()) {
			level = (as_log_level)Nan::To<int>(v8_level).FromJust();
		}
		else if (v8_level->IsNull() || v8_level->IsUndefined()) {
			// `null` and `undefined` imply the value should not change.
		}
		else {
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
					fprintf(stderr,
							"Could not open file descriptor for logging: %s\n",
							strerror(errno));
					rc = AS_NODE_PARAM_ERR;
				}
			}
			else if (v8_file->IsNull() || v8_file->IsUndefined()) {
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
	if (rc == AS_NODE_PARAM_OK) {
		log->level = level;
		log->fd = fd;
	}

	return rc;
}

as_val *asval_clone(const as_val *val, const LogInfo *log)
{
	as_val_t t = as_val_type((as_val *)val);
	as_val *clone_val = NULL;
	switch (t) {
	case AS_NIL: {
		clone_val = (as_val *)&as_nil;
		break;
	}
	case AS_BOOLEAN: {
		as_boolean *bool_val = as_boolean_fromval(val);
		as_boolean *clone_bool = as_boolean_new(bool_val->value);
		if (clone_bool == NULL) {
			as_v8_error(log, "cloning a boolean value failed");
		}
		clone_val = as_boolean_toval(clone_bool);
		break;
	}
	case AS_INTEGER: {
		as_integer *int_val = as_integer_fromval(val);
		int64_t ival = as_integer_get(int_val);
		as_v8_detail(log, "Cloning Integer value %d", ival);
		as_integer *clone_int = as_integer_new(ival);
		if (clone_int == NULL) {
			as_v8_error(log, "Cloning integer failed");
		}
		clone_val = as_integer_toval(clone_int);
		break;
	}
	case AS_STRING: {
		as_string *str_val = as_string_fromval(val);
		char *strval = as_string_get(str_val);
		as_v8_detail(log, "Cloning String  value %s", strval);
		char *clone_str = (char *)cf_strdup(strval);
		if (clone_str == NULL) {
			as_v8_error(log, "cloning string failed");
		}
		as_string *clone_as = as_string_new(clone_str, true);
		if (clone_as == NULL) {
			as_v8_error(log, "cloning string failed");
		}
		clone_val = as_string_toval(clone_as);
		break;
	}
	case AS_BYTES: {
		as_bytes *bytes_val = as_bytes_fromval(val);
		size_t size = as_bytes_size(bytes_val);
		uint8_t *bytes = (uint8_t *)cf_malloc(size);
		memcpy(bytes, as_bytes_get(bytes_val), size);
		as_v8_detail(log, "Cloning Blob value %u ", bytes);
		clone_val = as_bytes_toval(as_bytes_new_wrap(bytes, size, true));
		break;
	}
	case AS_LIST: {
		as_arraylist *list = (as_arraylist *)as_list_fromval((as_val *)val);
		clone_val = as_list_toval((as_list *)as_arraylist_new(
			as_arraylist_size(list), list->block_size));
		as_arraylist_iterator it;
		as_arraylist_iterator_init(&it, list);
		int index = 0;
		as_v8_detail(log, "Cloning a list value of size %d ",
					 as_arraylist_size(list));
		while (as_arraylist_iterator_has_next(&it)) {
			as_val *arr_element = (as_val *)as_arraylist_iterator_next(&it);
			as_val *clone_element = asval_clone(arr_element, log);
			as_arraylist_set((as_arraylist *)clone_val, index++, clone_element);
		}
		as_v8_detail(log, "Cloning a list SUCCESS");
		break;
	}
	case AS_MAP: {
		as_orderedmap *map = (as_orderedmap *)as_map_fromval(val);
		clone_val =
			as_map_toval((as_map *)as_orderedmap_new(as_orderedmap_size(map)));
		as_orderedmap_iterator it;
		as_orderedmap_iterator_init(&it, map);
		while (as_orderedmap_iterator_has_next(&it)) {
			as_pair *pair = (as_pair *)as_orderedmap_iterator_next(&it);
			as_val *orig_key = as_pair_1(pair);
			as_val *orig_val = as_pair_2(pair);
			as_val *clone_key = asval_clone(orig_key, log);
			as_val *clone_mapval = asval_clone(orig_val, log);
			as_orderedmap_set((as_orderedmap *)clone_val, clone_key, clone_mapval);
		}
		as_orderedmap_set_flags((as_orderedmap *)clone_val, map->_.flags);
		as_v8_detail(log, "Cloning a map SUCCESS");
		break;
	}
	case AS_DOUBLE: {
		as_double *dbl_val = as_double_fromval(val);
		double dval = as_double_get(dbl_val);
		as_v8_detail(log, "Cloning double value %g", dval);
		as_double *clone_dbl = as_double_new(dval);
		if (clone_dbl == NULL) {
			as_v8_error(log, "Cloning double failed");
		}
		clone_val = as_double_toval(clone_dbl);
		break;
	}
	case AS_GEOJSON: {
		as_geojson *geo_val = as_geojson_fromval(val);
		char *strval = as_geojson_get(geo_val);

		as_v8_detail(log, "Cloning GeoJSON value %s", strval);
		char *clone_str = (char *)cf_strdup(strval);
		if (clone_str == NULL) {
			as_v8_error(log, "cloning GeoJSON failed");
		}
		as_geojson *clone_as = as_geojson_new(clone_str, true);
		if (clone_as == NULL) {
			as_v8_error(log, "cloning GeoJSON failed");
		}
		clone_val = as_geojson_toval(clone_as);
		break;
	}
	default:
		as_v8_error(log, "as_val received is UNKNOWN type %d", (int)t);
		break;
	}
	return clone_val;
}

bool key_clone(const as_key *src, as_key **dest, const LogInfo *log,
			   bool alloc_key)
{
	if (src == NULL || dest == NULL) {
		as_v8_info(log, "Parameter error : NULL in source/destination");
		return false;
	}

	as_v8_detail(log, "Cloning the key");
	as_key_value *val = src->valuep;
	if (src->digest.init == true) {
		if (alloc_key) {
			*dest = as_key_new_digest(src->ns, src->set, src->digest.value);
		}
		else {
			as_key_init_digest(*dest, src->ns, src->set, src->digest.value);
		}
		if (val != NULL) {
			(*dest)->valuep = (as_key_value *)asval_clone((as_val *)val, log);
		}
	}
	else if (val != NULL) {
		as_key_value *clone_val =
			(as_key_value *)asval_clone((as_val *)val, log);
		if (alloc_key) {
			*dest =
				as_key_new_value(src->ns, src->set, (as_key_value *)clone_val);
		}
		else {
			as_key_init_value(*dest, src->ns, src->set,
							  (as_key_value *)clone_val);
		}
	}
	else {
		as_v8_detail(log, "Key has neither value nor digest ");
	}

	return true;
}

bool record_clone(const as_record *src, as_record **dest, const LogInfo *log)
{
	if (src == NULL || dest == NULL) {
		return false;
	}
	as_v8_detail(log, "Cloning the record");
	(*dest)->ttl = src->ttl;
	(*dest)->gen = src->gen;
	as_record_iterator it;
	as_record_iterator_init(&it, src);

	while (as_record_iterator_has_next(&it)) {
		as_bin *bin = as_record_iterator_next(&it);
		as_bin_value *val = as_bin_get_value(bin);
		as_bin_value *clone_val =
			(as_bin_value *)asval_clone((as_val *)val, log);
		as_v8_detail(log, "Bin Name: %s", as_bin_get_name(bin));
		as_record_set(*dest, as_bin_get_name(bin), clone_val);
	}

	as_key *src_key = (as_key *)&src->key;
	as_key *dest_key = (as_key *)&(*dest)->key;
	if (src_key != NULL) {
		//clone the key but do not malloc the key structure,
		// use the structure available inside record structure.
		key_clone(src_key, &dest_key, log, false);
	}
	return true;
}

Local<Object> error_to_jsobject(as_error *error, const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	Local<Object> err = Nan::New<Object>();

	if (error == NULL) {
		as_v8_info(log, "error(C structure) object is NULL, node.js error "
						"object cannot be constructed");
		return scope.Escape(err);
	}

	Nan::Set(err, Nan::New("code").ToLocalChecked(), Nan::New(error->code));
	Nan::Set(err, Nan::New("message").ToLocalChecked(),
			 error->message[0] != '\0'
				 ? Nan::New(error->message).ToLocalChecked()
				 : Nan::New("\0").ToLocalChecked());
	Nan::Set(err, Nan::New("func").ToLocalChecked(),
			 error->func ? Nan::New(error->func).ToLocalChecked()
						 : Nan::New("\0").ToLocalChecked());
	Nan::Set(err, Nan::New("file").ToLocalChecked(),
			 error->file ? Nan::New(error->file).ToLocalChecked()
						 : Nan::New("\0").ToLocalChecked());
	Nan::Set(err, Nan::New("line").ToLocalChecked(),
			 error->line ? Nan::New(error->line) : Nan::New((uint32_t)0));
	Nan::Set(err, Nan::New("inDoubt").ToLocalChecked(),
			 error->in_doubt ? Nan::True() : Nan::False());

	return scope.Escape(err);
}

Local<Value> val_to_jsvalue(as_val *val, const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	if (val == NULL) {
		as_v8_debug(log, "value = NULL");
		return scope.Escape(Nan::Null());
	}

	switch (as_val_type(val)) {
	case AS_NIL: {
		as_v8_detail(log, "value is of type as_null");
		return scope.Escape(Nan::Null());
	}
	case AS_INTEGER: {
		as_integer *ival = as_integer_fromval(val);
		if (ival) {
			int64_t num = as_integer_getorelse(ival, -1);
			as_v8_detail(log, "integer value = %lld", num);
#if (NODE_MAJOR_VERSION > 10) ||                                               \
	(NODE_MAJOR_VERSION == 10 && NODE_MINOR_VERSION >= 4)
			if (num < MIN_SAFE_INTEGER || MAX_SAFE_INTEGER < num) {
				as_v8_detail(
					log, "Integer value outside safe range - returning BigInt");
				v8::Isolate *isolate = v8::Isolate::GetCurrent();
				Local<Value> bigInt = BigInt::New(isolate, num);
				return scope.Escape(bigInt);
			}
#endif
			return scope.Escape(Nan::New((double)num));
		}
		break;
	}
	case AS_DOUBLE: {
		as_double *dval = as_double_fromval(val);
		if (dval) {
			double d = as_double_getorelse(dval, -1);
			as_v8_detail(log, "double value = %lf", d);
			return scope.Escape(Nan::New((double)d));
		}
		break;
	}
	case AS_STRING: {
		as_string *sval = as_string_fromval(val);
		if (sval) {
			char *data = as_string_getorelse(sval, NULL);
			as_v8_detail(log, "string value = \"%s\"", data);
			return scope.Escape(Nan::New(data).ToLocalChecked());
		}
		break;
	}
	case AS_BOOLEAN: {
		as_boolean *bval = as_boolean_fromval(val);
		if (bval) {
			bool b = as_boolean_get(bval);
			as_v8_detail(log, "boolean value = %s", b ? "true" : "false");
			return scope.Escape(Nan::New(b));
		}
		break;
	}
	case AS_BYTES: {
		as_bytes *bval = as_bytes_fromval(val);
		if (bval) {
			uint8_t *data = as_bytes_getorelse(bval, NULL);
			uint32_t size = as_bytes_size(bval);

			as_v8_detail(log, "bytes value = <%x %x %x%s>",
						 size > 0 ? data[0] : 0, size > 1 ? data[1] : 0,
						 size > 2 ? data[2] : 0, size > 3 ? " ..." : "");
			// this constructor actually copies data into the new Buffer
			Local<Object> buff =
				Nan::CopyBuffer((char *)data, size).ToLocalChecked();

			return scope.Escape(buff);
		}
		break;
	}
	case AS_LIST: {
		as_arraylist *listval = (as_arraylist *)as_list_fromval((as_val *)val);
		int size = as_arraylist_size(listval);
		Local<Array> jsarray = Nan::New<Array>(size);
		for (int i = 0; i < size; i++) {
			as_val *arr_val = as_arraylist_get(listval, i);
			Local<Value> jsval = val_to_jsvalue(arr_val, log);
			Nan::Set(jsarray, i, jsval);
		}

		return scope.Escape(jsarray);
	}
	case AS_MAP: {
		Local<Object> jsobj = Nan::New<Object>();
		as_orderedmap *map = (as_orderedmap *)as_map_fromval(val);
		as_orderedmap_iterator it;
		as_orderedmap_iterator_init(&it, map);

		while (as_orderedmap_iterator_has_next(&it)) {
			as_pair *p = (as_pair *)as_orderedmap_iterator_next(&it);
			as_val *key = as_pair_1(p);
			as_val *val = as_pair_2(p);
			Nan::Set(jsobj, val_to_jsvalue(key, log), val_to_jsvalue(val, log));
		}

		return scope.Escape(jsobj);
	}
	case AS_GEOJSON: {
		as_geojson *gval = as_geojson_fromval(val);
		if (gval) {
			char *data = as_geojson_getorelse(gval, NULL);
			as_v8_detail(log, "geojson value = \"%s\"", data);
			return scope.Escape(Nan::New<String>(data).ToLocalChecked());
		}
		break;
	}
	default:
		break;
	}
	return scope.Escape(Nan::Undefined());
}

Local<Object> recordbins_to_jsobject(const as_record *record,
									 const LogInfo *log)
{
	Nan::EscapableHandleScope scope;

	Local<Object> bins;
	if (record == NULL) {
		as_v8_debug(
			log,
			"Record ( C structure) is NULL, cannot form node.js record object");
		return scope.Escape(bins);
	}

	bins = Nan::New<Object>();
	as_record_iterator it;
	as_record_iterator_init(&it, record);

	while (as_record_iterator_has_next(&it)) {
		as_bin *bin = as_record_iterator_next(&it);
		char *name = as_bin_get_name(bin);
		as_val *val = (as_val *)as_bin_get_value(bin);
		Local<Value> obj = val_to_jsvalue(val, log);
		Nan::Set(bins, Nan::New(name).ToLocalChecked(), obj);
		as_v8_detail(log, "Setting binname %s ", name);
	}

	return scope.Escape(bins);
}

Local<Object> recordmeta_to_jsobject(const as_record *record,
									 const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	Local<Object> meta;

	if (record == NULL) {
		as_v8_debug(log, "Record ( C structure) is NULL, cannot form node.js "
						 "metadata object");
		return scope.Escape(meta);
	}

	meta = Nan::New<Object>();
	Local<Number> ttl;
	switch (record->ttl) {
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

Local<Object> record_to_jsobject(const as_record *record, const as_key *key,
								 const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	Local<Object> okey;

	if (record == NULL) {
		as_v8_debug(
			log,
			"Record ( C structure) is NULL, cannot form node.js record object");
		return scope.Escape(okey);
	}

	okey = key_to_jsobject(key ? key : &record->key, log);
	Local<Object> bins = recordbins_to_jsobject(record, log);
	Local<Object> meta = recordmeta_to_jsobject(record, log);
	Local<Object> rec = Nan::New<Object>();
	Nan::Set(rec, Nan::New("key").ToLocalChecked(), okey);
	Nan::Set(rec, Nan::New("meta").ToLocalChecked(), meta);
	Nan::Set(rec, Nan::New("bins").ToLocalChecked(), bins);

	return scope.Escape(rec);
}

//Forward references;
int asval_from_jsvalue(as_val **value, Local<Value> v8value,
					   const LogInfo *log);
int extract_blob_from_jsobject(uint8_t **data, int *len, Local<Object> obj,
							   const LogInfo *log);

bool instanceof (Local<Value> value, const char *type)
{
	if (value->IsObject()) {
		Local<String> ctor_name = value.As<Object>()->GetConstructorName();
		Nan::Utf8String cn(ctor_name);
		return 0 == strncmp(*cn, type, strlen(type));
	}
	else {
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
	return instanceof (value, DoubleType);
}

double double_value(Local<Value> value)
{
	if (instanceof (value, DoubleType)) {
		value = Nan::Get(value.As<Object>(),
						 Nan::New<String>("Double").ToLocalChecked())
					.ToLocalChecked();
	}
	return Nan::To<double>(value).FromJust();
}

bool is_geojson_value(Local<Value> value)
{
	return instanceof (value, GeoJSONType);
}

bool is_transaction_value(Local<Value> value)
{
	return instanceof (value, TransactionType);
}

bool is_bin_value(Local<Value> value)
{
	return instanceof (value, BinType);
}

char *geojson_as_string(Local<Value> value)
{
	Local<Value> strval =
		Nan::Get(value.As<Object>(), Nan::New("str").ToLocalChecked())
			.ToLocalChecked();
	return strdup(*Nan::Utf8String(strval));
}

int list_from_jsarray(as_list **list, Local<Array> array, const LogInfo *log)
{
	const uint32_t capacity = array->Length();
	as_v8_detail(log, "Creating new as_arraylist with capacity %d", capacity);
	as_arraylist *arraylist = as_arraylist_new(capacity, 0);
	if (arraylist == NULL) {
		as_v8_error(log, "List allocation failed");
		Nan::ThrowError("List allocation failed");
		return AS_NODE_PARAM_ERR;
	}
	*list = (as_list *)arraylist;
	for (uint32_t i = 0; i < capacity; i++) {
		as_val *val;
		if (asval_from_jsvalue(&val, Nan::Get(array, i).ToLocalChecked(),
							   log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_list_append(*list, val);
	}
	return AS_NODE_PARAM_OK;
}

int map_from_jsobject(as_map **map, Local<Object> obj, const LogInfo *log)
{
	const Local<Array> props =
		Nan::GetOwnPropertyNames(obj.As<Object>()).ToLocalChecked();
	const uint32_t capacity = props->Length();
	as_v8_detail(log, "Creating new as_orderedmap with capacity %d", capacity);
	as_orderedmap *orderedmap = as_orderedmap_new(capacity);
	if (orderedmap == NULL) {
		as_v8_error(log, "Map allocation failed");
		Nan::ThrowError("Map allocation failed");
		return AS_NODE_PARAM_ERR;
	}
	*map = (as_map *)orderedmap;
	for (uint32_t i = 0; i < capacity; i++) {
		const Local<Value> name = Nan::Get(props, i).ToLocalChecked();
		const Local<Value> value = Nan::Get(obj, name).ToLocalChecked();
		as_val *val = NULL;
		if (asval_from_jsvalue(&val, value, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_stringmap_set(*map, *Nan::Utf8String(name), val);
	}
	return AS_NODE_PARAM_OK;
}

int map_from_jsmap(as_map **map, Local<Map> obj, const LogInfo *log)
{
	const Local<Array> data = obj->AsArray();
	const uint32_t capacity = data->Length();
	as_v8_detail(log, "Creating new as_orderedmap with capacity %d", capacity);
	as_orderedmap *orderedmap = as_orderedmap_new(capacity);
	if (orderedmap == NULL) {
		as_v8_error(log, "Map allocation failed");
		Nan::ThrowError("Map allocation failed");
		return AS_NODE_PARAM_ERR;
	}
	*map = (as_map *)orderedmap;

	for (uint32_t i = 0; i < capacity; i = i + 2) {
		const Local<Value> name = Nan::Get(data, i).ToLocalChecked();
		const Local<Value> value = Nan::Get(data, i+1).ToLocalChecked();
		as_val *val = NULL;
		as_val *nameVal = NULL;
		if (asval_from_jsvalue(&val, value, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		if (asval_from_jsvalue(&nameVal, name, log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_map_set(*map, nameVal, val);
	}
	return AS_NODE_PARAM_OK;
}

int asval_from_jsvalue(as_val **value, Local<Value> v8value, const LogInfo *log)
{
	if (v8value->IsNull()) {
		as_v8_detail(log, "The as_val is NULL");
		*value = (as_val *)&as_nil;
	}
	else if (v8value->IsUndefined()) {
		// asval_from_jsvalue is called recursively.
		// If a bin value is undefined, it should be handled by the caller of
		// this function gracefully.
		// If an entry in a map/list is undefined the corresponding entry becomes null.
		as_v8_detail(log, "Object passed is undefined");
		*value = (as_val *)&as_nil;
	}
	else if (v8value->IsBoolean()) {
		*value = (as_val *)as_boolean_new(Nan::To<bool>(v8value).FromJust());
	}
	else if (v8value->IsString()) {
		*value =
			(as_val *)as_string_new(strdup(*Nan::Utf8String(v8value)), true);
	}
	else if (v8value->IsInt32()) {
		*value = (as_val *)as_integer_new(Nan::To<int32_t>(v8value).FromJust());
	}
	else if (v8value->IsUint32()) {
		*value =
			(as_val *)as_integer_new(Nan::To<uint32_t>(v8value).FromJust());
	}
	else if (is_double_value(v8value)) {
		*value = (as_val *)as_double_new(double_value(v8value));
	}
	else if (v8value->IsNumber()) {
		*value = (as_val *)as_integer_new(Nan::To<int64_t>(v8value).FromJust());
#if (NODE_MAJOR_VERSION > 10) ||                                               \
	(NODE_MAJOR_VERSION == 10 && NODE_MINOR_VERSION >= 4)
	}
	else if (v8value->IsBigInt()) {
		Local<BigInt> bigint_value = v8value.As<BigInt>();
		bool lossless = true;
		int64_t int64_value = bigint_value->Int64Value(&lossless);
		if (!lossless) {
			as_v8_error(log, "Invalid key value: BigInt value could not be "
							 "converted to int64_t losslessly");
			return AS_NODE_PARAM_ERR;
		}
		*value = (as_val *)as_integer_new(int64_value);
#endif
	}
	else if (node::Buffer::HasInstance(v8value)) {
		int size = 0;
		uint8_t *data = NULL;
		if (extract_blob_from_jsobject(&data, &size, v8value.As<Object>(),
									   log) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Extracting blob from a js object failed");
			return AS_NODE_PARAM_ERR;
		}
		*value = (as_val *)as_bytes_new_wrap(data, size, true);
	}
	else if (v8value->IsArray()) {
		if (list_from_jsarray((as_list **)value, Local<Array>::Cast(v8value),
							  log) != AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}
	else if (v8value->IsMap()) {
		if (map_from_jsmap((as_map **)value, v8value.As<Map>(), log) !=
			AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}
	else if (is_geojson_value(v8value)) {
		char *jsonstr = geojson_as_string(v8value);
		*value = (as_val *)as_geojson_new(jsonstr, true);
	}
	else { // generic object - treat as map
		if (map_from_jsobject((as_map **)value, v8value.As<Object>(), log) !=
			AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
	}

	if (as_v8_detail_enabled(log)) {
		auto val_type = as_val_type(*value);
		char *val_str = as_val_tostring(*value);
		as_v8_detail(log, "type: %d, string value: %s", val_type, val_str);
		cf_free(val_str);
	}

	return AEROSPIKE_OK;
}
int string_from_jsarray(char*** roles, int roles_size, Local<Array> role_array, const LogInfo *log) {
	*roles =  new char*[roles_size];
	for(int i = 0; i < roles_size; i++){
		Local<Value> role = Nan::Get(role_array, i).ToLocalChecked();
		if(role->IsString()){
			(*roles)[i] = strdup(*Nan::Utf8String(role.As<String>()));
		}
		else{
			as_v8_error(log, "Failed to parse roles from jsarray");
			return AS_NODE_PARAM_ERR;

		}
		
	}

	return AS_NODE_PARAM_OK;
}

int privileges_from_jsarray(as_privilege*** privileges, int privileges_size, Local<Array> privilege_array, const LogInfo *log) {
	*privileges =  new as_privilege*[privileges_size];
	for(int i = 0; i < privileges_size; i++){
		Local<Value> maybe_privilege = Nan::Get(privilege_array, i).ToLocalChecked();
		if(maybe_privilege->IsObject()){
			Local<Object> privilege = maybe_privilege.As<Object>();	
			as_privilege* priv = new as_privilege;

			Local<Value> code = Nan::Get(privilege, Nan::New("code").ToLocalChecked()).ToLocalChecked();
			if(code->IsNumber()){
				priv->code = (as_privilege_code) Nan::To<uint32_t>(code).FromJust();
			}
			else{
				as_v8_error(log, "Failed to parse roles from jsarray");
				return AS_NODE_PARAM_ERR;
			}

			as_namespace as_ns = {'\0'};
			as_set as_set = {'\0'};

			Local<Value> ns = Nan::Get(privilege, Nan::New("namespace").ToLocalChecked()).ToLocalChecked();
			Local<Value> set = Nan::Get(privilege, Nan::New("set").ToLocalChecked()).ToLocalChecked();

 			if (ns->IsString()) {
				if (as_strlcpy(as_ns, *Nan::Utf8String(ns), AS_NAMESPACE_MAX_SIZE) >
					AS_NAMESPACE_MAX_SIZE) {
					as_v8_error(log, "Namespace exceeds max. length (%d)",
								AS_NAMESPACE_MAX_SIZE);
					return AS_NODE_PARAM_ERR;
					// TODO: Return param error
				}
			}

			if (set->IsString()) {
				if (as_strlcpy(as_set, *Nan::Utf8String(set), AS_SET_MAX_SIZE) >
					AS_SET_MAX_SIZE) {
					as_v8_error(log, "Set exceeds max. length (%d)", AS_SET_MAX_SIZE);
					return AS_NODE_PARAM_ERR;
					// TODO: Return param error
				}
			}
			as_strncpy(priv->ns, as_ns, AS_NAMESPACE_MAX_SIZE);
			as_strncpy(priv->set, as_set, AS_SET_MAX_SIZE);
			(*privileges)[i] = priv;
		}
		else{
			as_v8_error(log, "Failed to parse roles from jsarray");
			return AS_NODE_PARAM_ERR;

		}
		
	}
	return AS_NODE_PARAM_OK;
}
			

int recordbins_from_jsobject(as_record *rec, Local<Object> obj,
							 const LogInfo *log)
{
	if (is_bin_value(obj)) {
		Local<Object> jsobj = Nan::New<Object>();
		Nan::Set(jsobj, Nan::Get(obj, Nan::New("name").ToLocalChecked()).ToLocalChecked(), Nan::Get(obj, Nan::New("value").ToLocalChecked()).ToLocalChecked());	
		obj = jsobj;
	}
	const Local<Array> props = Nan::GetOwnPropertyNames(obj).ToLocalChecked();
	const uint32_t count = props->Length();
	as_record_init(rec, count);
	for (uint32_t i = 0; i < count; i++) {
		const Local<Value> name = Nan::Get(props, i).ToLocalChecked();
		const Local<Value> value = Nan::Get(obj, name).ToLocalChecked();

		Nan::Utf8String n(name);
		if (strlen(*n) > AS_BIN_NAME_MAX_SIZE) {
			as_v8_error(log, "Bin name length exceeded (max. %i): %s",
						AS_BIN_NAME_MAX_SIZE, *n);
			return AS_NODE_PARAM_ERR;
		}

		if (value->IsUndefined()) {
			as_v8_error(log, "Bin value 'undefined' not supported: %s", *n);
			return AS_NODE_PARAM_ERR;
		}
		if (value->IsNull()) {
			as_record_set_nil(rec, *n);
			continue;
		}
		if (value->IsBoolean()) {
			as_record_set_bool(rec, *n, Nan::To<bool>(value).FromJust());
			continue;
		}
		if (value->IsString()) {
			as_record_set_strp(rec, *n, strdup(*Nan::Utf8String(value)), true);
			continue;
		}
		if (is_double_value(value)) {
			as_record_set_double(rec, *n, double_value(value));
			continue;
		}
		if (value->IsInt32() || value->IsUint32() || value->IsNumber()) {
			as_record_set_int64(rec, *n, Nan::To<int64_t>(value).FromJust());
			continue;
		}
#if (NODE_MAJOR_VERSION > 10) ||                                               \
	(NODE_MAJOR_VERSION == 10 && NODE_MINOR_VERSION >= 4)
		if (value->IsBigInt()) {
			Local<BigInt> bigint_value = value.As<BigInt>();
			bool lossless = true;
			int64_t int64_value = bigint_value->Int64Value(&lossless);
			if (!lossless) {
				as_v8_error(log, "Invalid key value: BigInt value could not be "
								 "converted to int64_t losslessly");
				return AS_NODE_PARAM_ERR;
			}
			as_record_set_int64(rec, *n, int64_value);
			continue;
		}
#endif
		if (node::Buffer::HasInstance(value)) {
			int size = 0;
			uint8_t *data = NULL;
			if (extract_blob_from_jsobject(&data, &size, value.As<Object>(),
										   log) != AS_NODE_PARAM_OK) {
				as_v8_error(log, "Extractingb blob from a js object failed");
				return AS_NODE_PARAM_ERR;
			}
			as_record_set_rawp(rec, *n, data, size, true);
			continue;
		}
		if (is_geojson_value(value)) {
			as_record_set_geojson_strp(rec, *n, geojson_as_string(value), true);
			continue;
		}
		if (value->IsArray()) {
			as_list *list;
			if (list_from_jsarray(&list, Local<Array>::Cast(value), log) !=
				AS_NODE_PARAM_OK) {
				return AS_NODE_PARAM_ERR;
			}
			as_record_set_list(rec, *n, list);
			continue;
		}
		if (value->IsMap()) {
			as_map *map;
			if (map_from_jsmap(&map, value.As<Map>(), log) !=
				AS_NODE_PARAM_OK) {
				return AS_NODE_PARAM_ERR;
			}
			as_record_set_map(rec, *n, map);
			continue;
		}
		if (value->IsObject()) {
			as_map *map;
			if (map_from_jsobject(&map, value.As<Object>(), log) !=
				AS_NODE_PARAM_OK) {
				return AS_NODE_PARAM_ERR;
			}
			as_record_set_map(rec, *n, map);
			continue;
		}

		as_v8_error(log, "Skipping unsupported value for bin \"%s\"", *n);
	}

	return AS_NODE_PARAM_OK;
}

int recordmeta_from_jsobject(as_record *rec, Local<Object> obj,
							 const LogInfo *log)
{
	as_v8_detail(log, "Setting record meta from JS object");
	if (setTTL(obj, &rec->ttl, log) != AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	};
	if (setGeneration(obj, &rec->gen, log) != AS_NODE_PARAM_OK) {
		;
		return AS_NODE_PARAM_ERR;
	}

	return AS_NODE_PARAM_OK;
}

void cluster_to_jsobject(as_cluster_s* cluster, Local<Object> v8_cluster, latency* latency, uint32_t bucket_max) {
	as_error err;
	as_error_init(&err);

	char* cluster_name = cluster->cluster_name;

	if (cluster->cluster_name) {
    	cluster_name = strdup(cluster->cluster_name);
	} else {
	    cluster_name = strdup("");  // Allocates memory for an empty string
	}
		/*
	uint32_t cpu_load, mem;
	as_metrics_process_cpu_load_mem_usage(&err, NULL, &cpu_load, &mem);

	char now_str[128];
	timestamp_to_string(now_str, sizeof(now_str));

	Nan::Set(v8_cluster, Nan::New("time").ToLocalChecked(), Nan::New(now_str).ToLocalChecked());

	Nan::Set(v8_cluster, Nan::New("cpuLoad").ToLocalChecked(), Nan::New(cpu_load));
	*/
	Nan::Set(v8_cluster, Nan::New("clusterName").ToLocalChecked(),
				 Nan::New(cluster_name).ToLocalChecked());

	Nan::Set(v8_cluster, Nan::New("commandCount").ToLocalChecked(), Nan::New((uint32_t) as_cluster_get_command_count(cluster)));

	Nan::Set(v8_cluster, Nan::New("invalidNodeCount").ToLocalChecked(), Nan::New(cluster->invalid_node_count));

	Nan::Set(v8_cluster, Nan::New("transactionCount").ToLocalChecked(), Nan::New((uint32_t) as_cluster_get_tran_count(cluster)));

	Nan::Set(v8_cluster, Nan::New("retryCount").ToLocalChecked(), Nan::New((uint32_t) as_cluster_get_retry_count(cluster)));

	Nan::Set(v8_cluster, Nan::New("delayQueueTimeoutCount").ToLocalChecked(), Nan::New((double)as_cluster_get_delay_queue_timeout_count(cluster)));

	Local<Object> v8_event_loop = Nan::New<Object>();

	for (uint32_t i = 0; i < as_event_loop_size; i++) {
		as_event_loop* loop = &as_event_loops[i];
		if (i > 0) {
			exit(1);
		}
		Nan::Set(v8_event_loop, Nan::New("processSize").ToLocalChecked(), Nan::New((uint32_t) as_event_loop_get_process_size(loop)));
		Nan::Set(v8_event_loop, Nan::New("queueSize").ToLocalChecked(), Nan::New((uint32_t) as_event_loop_get_queue_size(loop)));

	}

	Nan::Set(v8_cluster, Nan::New("eventLoop").ToLocalChecked(), v8_event_loop);

	Local<Object> v8_nodes = Nan::New<Array>();	
	as_nodes* nodes = as_nodes_reserve(cluster);
	if(nodes){
		for (uint32_t i = 0; i < nodes->size; i++) {
			as_node* node = nodes->array[i];
			Local<Object> v8_node = Nan::New<Object>();
			if(latency){
				node_to_jsobject(node, v8_node, &latency[i], bucket_max);

			}
			else{
				node_to_jsobject(node, v8_node, NULL, 0);
			}
			Nan::Set(v8_nodes, i, v8_node);
		}
	}
	as_nodes_release(nodes);		


	Nan::Set(v8_cluster, Nan::New("nodes").ToLocalChecked(), v8_nodes);



}

void
as_conn_stats_sum_internal(as_conn_stats* stats, as_async_conn_pool* pool)
{
	// Warning: cross-thread reference without a lock.
	int tmp = as_queue_size(&pool->queue);

	// Timing issues may cause values to go negative. Adjust.
	if (tmp < 0) {
		tmp = 0;
	}
	stats->in_pool += tmp;
	tmp = pool->queue.total - tmp;

	if (tmp < 0) {
		tmp = 0;
	}
	stats->in_use += tmp;
	stats->opened += pool->opened;
	stats->closed += pool->closed;
}

void node_to_jsobject(as_node_s* node, Local<Object> v8_node, latency* latency, uint32_t bucket_max) {
	Nan::Set(v8_node, Nan::New("name").ToLocalChecked(), Nan::New(node->name).ToLocalChecked());

	as_address* address = as_node_get_address(node);

	struct sockaddr* addr = (struct sockaddr*)&address->addr;
	uint32_t port = (uint32_t) as_address_port(addr);
	char address_name[AS_IP_ADDRESS_SIZE];
	as_address_short_name(addr, address_name, sizeof(address_name));

	Nan::Set(v8_node, Nan::New("address").ToLocalChecked(), Nan::New(address_name).ToLocalChecked());
	Nan::Set(v8_node, Nan::New("port").ToLocalChecked(), Nan::New(port));
	//Should this just by conn in NODEJS
	struct as_conn_stats_s async;
	as_conn_stats_init_internal(&async);

	for (uint32_t i = 0; i < as_event_loop_size; i++) {
		// Regular async.
		as_conn_stats_sum_internal(&async, &node->async_conn_pools[i]);
	}

	Local<Object> v8_conn_stats = Nan::New<Object>();
	Nan::Set(v8_conn_stats, Nan::New("inUse").ToLocalChecked(), Nan::New(async.in_use));
	Nan::Set(v8_conn_stats, Nan::New("inPool").ToLocalChecked(), Nan::New(async.in_pool));
	Nan::Set(v8_conn_stats, Nan::New("opened").ToLocalChecked(), Nan::New(async.opened));
	Nan::Set(v8_conn_stats, Nan::New("closed").ToLocalChecked(), Nan::New(async.closed));

	Nan::Set(v8_node, Nan::New("conns").ToLocalChecked(), v8_conn_stats);

	Nan::Set(v8_node, Nan::New("errorCount").ToLocalChecked(), Nan::New((uint32_t) as_node_get_error_count(node)));
	Nan::Set(v8_node, Nan::New("timeoutCount").ToLocalChecked(), Nan::New((uint32_t) as_node_get_timeout_count(node)));

	as_node_metrics* node_metrics = node->metrics;

	Local<Object> v8_latency = Nan::New<Object>();

	Local<Array> connection = Nan::New<Array>();
	Local<Array> write = Nan::New<Array>();
	Local<Array> read = Nan::New<Array>();
	Local<Array> batch = Nan::New<Array>();
	Local<Array> query = Nan::New<Array>();
	uint32_t i = 0;

	if(!latency){


		as_latency_buckets* buckets = &node_metrics->latency[0];

		bucket_max = buckets->latency_columns;

		for (i = 0; i < bucket_max; i++) {
			Nan::Set(connection, i, Nan::New((uint32_t) as_latency_get_bucket(buckets, i)));
		}

		buckets = &node_metrics->latency[1];

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(write, i, Nan::New((uint32_t) as_latency_get_bucket(buckets, i)));
		}

		buckets = &node_metrics->latency[2];

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(read, i, Nan::New((uint32_t) as_latency_get_bucket(buckets, i)));
		}

		buckets = &node_metrics->latency[3];

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(batch, i, Nan::New((uint32_t) as_latency_get_bucket(buckets, i)));
		}

		buckets = &node_metrics->latency[4];

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(query, i, Nan::New((uint32_t) as_latency_get_bucket(buckets, i)));
		}

		Nan::Set(v8_latency, Nan::New("connLatency").ToLocalChecked(), connection);
		Nan::Set(v8_latency, Nan::New("writeLatency").ToLocalChecked(), write);
		Nan::Set(v8_latency, Nan::New("readLatency").ToLocalChecked(), read);
		Nan::Set(v8_latency, Nan::New("batchLatency").ToLocalChecked(), batch);
		Nan::Set(v8_latency, Nan::New("queryLatency").ToLocalChecked(), query);
	}
	else{

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(connection, i, Nan::New((uint32_t) latency->connection[i]));
		}

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(write, i, Nan::New((uint32_t) latency->write[i]));
		}

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(read, i, Nan::New((uint32_t) latency->read[i]));
		}

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(batch, i, Nan::New((uint32_t) latency->batch[i]));
		}

		for ( i = 0; i < bucket_max; i++) {
			Nan::Set(query, i, Nan::New((uint32_t) latency->query[i]));
		}


		Nan::Set(v8_latency, Nan::New("connLatency").ToLocalChecked(), connection);
		Nan::Set(v8_latency, Nan::New("writeLatency").ToLocalChecked(), write);
		Nan::Set(v8_latency, Nan::New("readLatency").ToLocalChecked(), read);
		Nan::Set(v8_latency, Nan::New("batchLatency").ToLocalChecked(), batch);
		Nan::Set(v8_latency, Nan::New("queryLatency").ToLocalChecked(), query);

	}



	

	Nan::Set(v8_node, Nan::New("metrics").ToLocalChecked(), v8_latency);



}

int extract_blob_from_jsobject(uint8_t **data, int *len, Local<Object> obj,
							   const LogInfo *log)
{
	if (!node::Buffer::HasInstance(obj)) {
		as_v8_error(log, "The binary data is not of the type UnsignedBytes");
		return AS_NODE_PARAM_ERR;
	}
	if (*len == 0) {
		(*len) = node::Buffer::Length(obj);
		(*data) = (uint8_t *)cf_malloc(sizeof(uint8_t) * (*len));
	}
	else {
		assert(*data);
		assert(*len == (int)node::Buffer::Length(obj));
	}

	memcpy((*data), node::Buffer::Data(obj), (*len));

	return AS_NODE_PARAM_OK;
}

int setTTL(Local<Object> obj, uint32_t *ttl, const LogInfo *log)
{
	Local<Value> v8_ttl =
		Nan::Get(obj, Nan::New("ttl").ToLocalChecked()).ToLocalChecked();
	if (v8_ttl->IsNumber()) {
		(*ttl) = Nan::To<uint32_t>(v8_ttl).FromJust();
		as_v8_detail(log, "TTL: %d", (*ttl));
	}
	else if (v8_ttl->IsNull() || v8_ttl->IsUndefined()) {
		// noop - ttl may not be specified
	}
	else {
		as_v8_error(log, "Type error: TTL should be a positive integer");
		return AS_NODE_PARAM_ERR;
	}

	return AS_NODE_PARAM_OK;
}

int setGeneration(Local<Object> obj, uint16_t *generation, const LogInfo *log)
{
	Local<Value> v8_gen =
		Nan::Get(obj, Nan::New("gen").ToLocalChecked()).ToLocalChecked();
	if (v8_gen->IsNumber()) {
		(*generation) = (uint16_t)Nan::To<uint32_t>(v8_gen).FromJust();
		as_v8_detail(log, "Generation: %d", (*generation));
	}
	else if (v8_gen->IsNull() || v8_gen->IsUndefined()) {
		// noop - gen may not be specified
	}
	else {
		as_v8_error(log, "Generation should be an integer");
		return AS_NODE_PARAM_ERR;
	}

	return AS_NODE_PARAM_OK;
}

Local<Object> key_to_jsobject(const as_key *key, const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	Local<Object> obj;
	if (key == NULL) {
		as_v8_debug(
			log, "Key (C structure) is NULL, cannot form node.js key object");
		return scope.Escape(obj);
	}

	obj = Nan::New<Object>();
	if (strlen(key->ns) > 0) {
		as_v8_detail(log, "key.ns = \"%s\"", key->ns);
		Nan::Set(obj, Nan::New("ns").ToLocalChecked(),
				 Nan::New(key->ns).ToLocalChecked());
	}
	else {
		as_v8_debug(log, "Key namespace is NULL");
	}

	if (strlen(key->set) > 0) {
		as_v8_detail(log, "key.set = \"%s\"", key->set);
		Nan::Set(obj, Nan::New("set").ToLocalChecked(),
				 Nan::New(key->set).ToLocalChecked());
	}
	else {
		as_v8_debug(log, "Key set is NULL");
	}

	if (key->valuep) {
		as_val *val = (as_val *)key->valuep;
		as_val_t type = as_val_type(val);
		switch (type) {
		case AS_INTEGER: {
			as_integer *ival = as_integer_fromval(val);
			as_v8_detail(log, "key.key = %d", as_integer_get(ival));
			Nan::Set(obj, Nan::New("key").ToLocalChecked(),
					 Nan::New((double)as_integer_get(ival)));
			break;
		}
		case AS_STRING: {
			as_string *sval = as_string_fromval(val);
			as_v8_detail(log, "key.key = \"%s\"", as_string_get(sval));
			Nan::Set(obj, Nan::New("key").ToLocalChecked(),
					 Nan::New(as_string_get(sval)).ToLocalChecked());
			break;
		}
		case AS_BYTES: {
			as_bytes *bval = as_bytes_fromval(val);
			if (bval) {
				uint32_t size = as_bytes_size(bval);
				as_v8_detail(log, "key.key = \"%u\"", bval->value);
				Local<Object> buff =
					Nan::CopyBuffer((char *)bval->value, size).ToLocalChecked();
				Nan::Set(obj, Nan::New("key").ToLocalChecked(), buff);
				break;
			}
		}
		default:
			break;
		}
	}
	else {
		as_v8_detail(log, "Key value is NULL");
	}

	if (key->digest.init == true) {
		Local<Object> buff =
			Nan::CopyBuffer((char *)key->digest.value, AS_DIGEST_VALUE_SIZE)
				.ToLocalChecked();
		Nan::Set(obj, Nan::New("digest").ToLocalChecked(), buff);
	}

	return scope.Escape(obj);
}

Local<Object> jobinfo_to_jsobject(const as_job_info *info, const LogInfo *log)
{
	Local<Object> jobinfo;

	if (info == NULL) {
		as_v8_debug(log, "Job Info ( C structure) is NULL, cannot form node.js "
						 "jobInfo object");
		return jobinfo;
	}

	jobinfo = Nan::New<Object>();
	Nan::Set(jobinfo, Nan::New("progressPct").ToLocalChecked(),
			 Nan::New(info->progress_pct));
	as_v8_detail(log, "Progress pct of the job %d", info->progress_pct);
	Local<Value> recordsRead = Nan::New((double)info->records_read);
	Nan::Set(jobinfo, Nan::New("recordsRead").ToLocalChecked(), recordsRead);
	as_v8_detail(log, "Number of records read so far %d", info->records_read);
	Nan::Set(jobinfo, Nan::New("status").ToLocalChecked(),
			 Nan::New(info->status));

	return jobinfo;
}

Local<Object> query_bytes_to_jsobject(uint8_t* bytes, uint32_t bytes_size, const LogInfo *log)
{
	Nan::EscapableHandleScope scope;

	Local<Object> v8_saved_query;
	if (bytes == NULL) {
		as_v8_debug(
			log,
			"Bytes ( C structure) is NULL, cannot form node.js record object");
		return scope.Escape(v8_saved_query);
	}

	v8_saved_query = Nan::New<Object>();

	Local<Array> v8_bytes = Nan::New<Array>();
	for(uint32_t i = 0; i < bytes_size; i++) {
		Nan::Set(v8_bytes, i, Nan::New<Uint32>((uint32_t) bytes[i]));
	}
	Nan::Set(v8_saved_query, Nan::New("bytes").ToLocalChecked(), v8_bytes);
	Nan::Set(v8_saved_query, Nan::New("bytesSize").ToLocalChecked(), Nan::New<Uint32>(bytes_size));
	return scope.Escape(v8_saved_query);
}

Local<Array> as_users_to_jsobject(as_user** users, uint32_t users_size, const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	Local<Array> v8_users = Nan::New<Array>();
	for(uint32_t i = 0; i < users_size; i++) {
		as_user* user = users[i];
		Local<Object> v8_user = Nan::New<Object>();

		Nan::Set(v8_user, Nan::New("name").ToLocalChecked(), Nan::New(user->name).ToLocalChecked());

		Local<Array> v8_read_info = Nan::New<Array>();
		for(int j = 0; j < user->read_info_size; j++){
			Nan::Set(v8_read_info,  j, Nan::New<Uint32>((uint32_t) user->read_info[j]));			
		}
		Nan::Set(v8_user, Nan::New("readInfo").ToLocalChecked(), v8_read_info);

		Local<Array> v8_write_info = Nan::New<Array>();
		for(int j = 0; j < user->write_info_size; j++){
			Nan::Set(v8_write_info,  j, Nan::New<Uint32>((uint32_t) user->write_info[j]));			
		}
		Nan::Set(v8_user, Nan::New("writeInfo").ToLocalChecked(), v8_write_info);

		Nan::Set(v8_user, Nan::New("connsInUse").ToLocalChecked(), Nan::New<Int32>((int32_t) user->conns_in_use));

		Local<Array> v8_roles = Nan::New<Array>();
		for(int j = 0; j < user->roles_size; j++){
			Nan::Set(v8_roles, j, Nan::New(user->roles[j]).ToLocalChecked());		
		}
		Nan::Set(v8_user, Nan::New("roles").ToLocalChecked(), v8_roles);

		Nan::Set(v8_users, i, v8_user);
	}
	return scope.Escape(v8_users);
}

Local<Array> as_roles_to_jsobject(as_role** roles, int roles_size, const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	Local<Array> v8_roles = Nan::New<Array>();
	for(int i = 0; i < roles_size; i++) {
		as_role* role = roles[i];
		Local<Object> v8_role = Nan::New<Object>();

		Nan::Set(v8_role, Nan::New("name").ToLocalChecked(), Nan::New(role->name).ToLocalChecked());
		Nan::Set(v8_role, Nan::New("readQuota").ToLocalChecked(), Nan::New(role->read_quota));
		Nan::Set(v8_role, Nan::New("writeQuota").ToLocalChecked(), Nan::New(role->write_quota));
		Local<Array> v8_whitelist = Nan::New<Array>();
		for(int j = 0; j < role->whitelist_size; j++){
			Nan::Set(v8_whitelist,  j, Nan::New(role->whitelist[j]).ToLocalChecked());			
		}
		Nan::Set(v8_role, Nan::New("whitelist").ToLocalChecked(), v8_whitelist);


		Nan::Set(v8_role, Nan::New("privileges").ToLocalChecked(),  as_privileges_to_jsarray(role->privileges, role->privileges_size, log) );

		Nan::Set(v8_roles, i, v8_role);
	}
	return scope.Escape(v8_roles);
}

Local<Array> as_privileges_to_jsarray(as_privilege* privileges, int privileges_size, const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	Local<Array> v8_privileges = Nan::New<Array>();
	for(int i = 0; i < privileges_size; i++) {
		as_privilege privilege = privileges[i];
		Local<Object> v8_privilege = Nan::New<Object>();

		Nan::Set(v8_privilege, Nan::New("namespace").ToLocalChecked(), Nan::New(privilege.ns).ToLocalChecked());
		Nan::Set(v8_privilege, Nan::New("set").ToLocalChecked(), Nan::New(privilege.set).ToLocalChecked());
		Nan::Set(v8_privilege, Nan::New("code").ToLocalChecked(), Nan::New(privilege.code));
		
		Nan::Set(v8_privileges, i, v8_privilege);
	}
	return scope.Escape(v8_privileges);
}

void load_bytes_size(Local<Object> saved_object, uint32_t* bytes_size, LogInfo *log)
{

	Local<Value> v8_byte_size =
		Nan::Get(saved_object, Nan::New("bytesSize").ToLocalChecked())
			.ToLocalChecked();
	TYPE_CHECK_OPT(v8_byte_size, IsNumber, "paginate must be a boolean");
	if (v8_byte_size->IsUint32()) {
		*bytes_size = (uint32_t)Nan::To<uint32_t>(v8_byte_size).FromJust();

	}

}

void load_bytes(Local<Object> saved_object, uint8_t* bytes, uint32_t bytes_size, LogInfo *log)
{

	Local<Value> v8_bytes =
		Nan::Get(saved_object, Nan::New("bytes").ToLocalChecked())
			.ToLocalChecked();
	TYPE_CHECK_OPT(v8_bytes, IsArray, "paginate must be a boolean");
	if (v8_bytes->IsArray())
	{
		for(uint32_t i = 0; i < (bytes_size); i++) 
		{
			Local<Value> v8_bytes_val = Nan::Get(v8_bytes.As<Array>(), i).ToLocalChecked();
			TYPE_CHECK_OPT(v8_bytes_val, IsNumber, "paginate must be a boolean");
			if (v8_bytes_val->IsNumber()) 
			{
				bytes[i] = (uint8_t) Nan::To<uint32_t>(v8_bytes_val).FromJust();
			}
		}
	}
}	

int key_from_jsobject(as_key *key, Local<Object> obj, const LogInfo *log)
{
	Nan::EscapableHandleScope scope;
	as_namespace ns = {'\0'};
	as_set set = {'\0'};

	if (obj->IsNull()) {
		as_v8_error(log, "The key object passed is Null");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> ns_obj =
		Nan::Get(obj, Nan::New("ns").ToLocalChecked()).ToLocalChecked();
	if (ns_obj->IsString()) {
		if (as_strlcpy(ns, *Nan::Utf8String(ns_obj), AS_NAMESPACE_MAX_SIZE) >
			AS_NAMESPACE_MAX_SIZE) {
			as_v8_error(log, "The key namespace is too long (max. %d)",
						AS_NAMESPACE_MAX_SIZE);
			return AS_NODE_PARAM_ERR;
		}
		if (strlen(ns) == 0) {
			as_v8_error(log, "The key namespace must not be empty");
			return AS_NODE_PARAM_ERR;
		}
		as_v8_detail(log, "key.ns = \"%s\"", ns);
	}
	else {
		as_v8_error(log, "The key namespace must be a string");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> set_obj =
		Nan::Get(obj, Nan::New("set").ToLocalChecked()).ToLocalChecked();
	if (set_obj->IsString()) {
		if (as_strlcpy(set, *Nan::Utf8String(set_obj), AS_SET_MAX_SIZE) >
			AS_SET_MAX_SIZE) {
			as_v8_error(log, "The key set is too long (max. %d)",
						AS_SET_MAX_SIZE);
			return AS_NODE_PARAM_ERR;
		}
		if (strlen(set) == 0) {
			as_v8_debug(log, "Key set passed is empty string");
		}
		as_v8_detail(log, "key.set = \"%s\"", set);
	}
	else if (set_obj->IsNull() || set_obj->IsUndefined()) {
		// noop - set name may not be specified
	}
	else {
		as_v8_error(log, "The key set must be a string");
		return AS_NODE_PARAM_ERR;
	}

	bool has_value = false;
	Local<Value> val_obj =
		Nan::Get(obj, Nan::New("key").ToLocalChecked()).ToLocalChecked();
	if (val_obj->IsString()) {
		char *value = strdup(*Nan::Utf8String(val_obj));
		as_key_init(key, ns, set, value);
		as_v8_detail(log, "key.key = \"%s\"", value);
		((as_string *)key->valuep)->free = true;
		has_value = true;
	}
	else if (is_double_value(val_obj)) {
		as_v8_error(log, "Invalid key value: double - only string, integer and "
						 "Buffer are supported");
		return AS_NODE_PARAM_ERR;
	}
	else if (val_obj->IsNumber()) {
		int64_t value = Nan::To<int64_t>(val_obj).FromJust();
		as_key_init_int64(key, ns, set, value);
		as_v8_detail(log, "key.key = %d", value);
		has_value = true;
#if (NODE_MAJOR_VERSION > 10) ||                                               \
	(NODE_MAJOR_VERSION == 10 && NODE_MINOR_VERSION >= 4)
	}
	else if (val_obj->IsBigInt()) {
		Local<BigInt> big_int = val_obj.As<BigInt>();
		bool lossless = true;
		int64_t value = big_int->Int64Value(&lossless);
		if (!lossless) {
			as_v8_error(log, "Invalid key value: BigInt value could not be "
							 "converted to int64_t losslessly");
			return AS_NODE_PARAM_ERR;
		}
		as_key_init_int64(key, ns, set, value);
		as_v8_detail(log, "key.key = %d", value);
		has_value = true;
#endif
	}
	else if (val_obj->IsObject()) {
		Local<Object> obj = val_obj.As<Object>();
		int size = 0;
		uint8_t *data = NULL;
		if (extract_blob_from_jsobject(&data, &size, obj, log) !=
			AS_NODE_PARAM_OK) {
			return AS_NODE_PARAM_ERR;
		}
		as_key_init_rawp(key, ns, set, data, size, true);
		has_value = true;

		as_v8_detail(log, "key.key = <%x %x %x%s>", size > 0 ? data[0] : 0,
					 size > 1 ? data[1] : 0, size > 2 ? data[2] : 0,
					 size > 3 ? " ..." : "");
	}
	else if (val_obj->IsNull() || val_obj->IsUndefined()) {
		// noop - value can be omitted if digest is given
	}
	else {
		as_v8_error(log, "Invalid key value - only string, integer and Buffer "
						 "are supported");
		return AS_NODE_PARAM_ERR;
	}

	if (has_value) {
		// Copy the digest back to the JS key object
		as_digest *digest = as_key_digest(key);
		uint8_t *bytes = digest->value;
		Local<Object> buff =
			scope.Escape(Nan::CopyBuffer((char *)bytes, AS_DIGEST_VALUE_SIZE)
							 .ToLocalChecked());
		Nan::Set(obj, Nan::New("digest").ToLocalChecked(), buff);
	}
	else {
		Local<Value> digest_value =
			Nan::Get(obj, Nan::New("digest").ToLocalChecked()).ToLocalChecked();
		if (digest_value->IsObject()) {
			Local<Object> digest_obj = digest_value.As<Object>();
			int size = 0;
			uint8_t *data = NULL;
			if (extract_blob_from_jsobject(&data, &size, digest_obj, log) !=
				AS_NODE_PARAM_OK) {
				return AS_NODE_PARAM_ERR;
			}
			as_digest_value digest;
			memcpy(digest, data, AS_DIGEST_VALUE_SIZE);
			as_v8_detail(log, "key.digest = <%x %x %x%s>",
						 size > 0 ? digest[0] : 0, size > 1 ? digest[1] : 0,
						 size > 2 ? digest[2] : 0, size > 3 ? " ..." : "");
			as_key_init_digest(key, ns, set, digest);
		}
		else if (digest_value->IsNull() || digest_value->IsUndefined()) {
			as_v8_error(log,
						"The key must have either a \"value\" or a \"digest\"");
			return AS_NODE_PARAM_ERR;
		}
		else {
			as_v8_error(
				log,
				"Invalid digest value: \"digest\" must be a 20-byte Buffer");
			return AS_NODE_PARAM_ERR;
		}
	}

	return AS_NODE_PARAM_OK;
}

int batch_from_jsarray(as_batch *batch, Local<Array> arr, const LogInfo *log)
{
	uint32_t len = arr->Length();
	as_batch_init(batch, len);
	for (uint32_t i = 0; i < len; i++) {
		Local<Object> key = Nan::Get(arr, i).ToLocalChecked().As<Object>();
		if (key_from_jsobject(as_batch_keyat(batch, i), key, log) !=
			AS_NODE_PARAM_OK) {
			as_v8_error(log, "Parsing batch key [%d] failed", i);
			return AS_NODE_PARAM_ERR;
		}
	}

	return AS_NODE_PARAM_OK;
}

int bins_from_jsarray(char ***bins, uint32_t *num_bins, Local<Array> arr,
					  const LogInfo *log)
{
	int arr_length = arr->Length();
	char **c_bins = (char **)cf_calloc(sizeof(char *), arr_length + 1);
	as_v8_debug(log, "Number of bins requested %d", arr_length);
	for (int i = 0; i < arr_length; i++) {
		Local<Value> bname = Nan::Get(arr, i).ToLocalChecked();
		c_bins[i] = (char *)cf_malloc(AS_BIN_NAME_MAX_SIZE);
		as_strlcpy(c_bins[i], *Nan::Utf8String(bname), AS_BIN_NAME_MAX_SIZE);
		as_v8_detail(log, "name of the bin %s", c_bins[i]);
	}
	// The last entry should be NULL because we are passing to select API calls.
	c_bins[arr_length] = NULL;

	*bins = c_bins;
	*num_bins = (uint32_t)arr_length;
	return AS_NODE_PARAM_OK;
}

int udfargs_from_jsobject(char **filename, char **funcname, as_list **args,
						  Local<Object> obj, const LogInfo *log)
{
	if (obj->IsNull()) {
		as_v8_error(log, "Object passed is NULL");
		return AS_NODE_PARAM_ERR;
	}

	// Extract UDF module name
	Local<Value> v8_module =
		Nan::Get(obj, Nan::New("module").ToLocalChecked()).ToLocalChecked();
	if (v8_module->IsString()) {
		size_t size = v8_module.As<String>()->Length() + 1;
		if (*filename == NULL) {
			*filename = (char *)cf_malloc(sizeof(char) * size);
		}
		if (as_strlcpy(*filename, *Nan::Utf8String(v8_module), size) > size) {
			as_v8_error(log, "UDF module name is too long (> %d)", size);
			return AS_NODE_PARAM_ERR;
		}
		as_v8_detail(log, "Filename in the udf args is set to %s", *filename);
	}
	else {
		as_v8_error(log, "UDF module name should be string");
		return AS_NODE_PARAM_ERR;
	}

	// Extract UDF function name
	Local<Value> v8_funcname =
		Nan::Get(obj, Nan::New("funcname").ToLocalChecked()).ToLocalChecked();
	if (v8_funcname->IsString()) {
		size_t size = v8_funcname.As<String>()->Length() + 1;
		if (*funcname == NULL) {
			*funcname = (char *)cf_malloc(sizeof(char) * size);
		}
		if (as_strlcpy(*funcname, *Nan::Utf8String(v8_funcname), size) > size) {
			as_v8_error(log, "UDF function name is too long (> %d)", size);
			return AS_NODE_PARAM_ERR;
		}
		as_v8_detail(log, "The function name in the UDF args set to %s",
					 *funcname);
	}
	else {
		as_v8_error(log, "UDF function name should be string");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> arglist =
		Nan::Get(obj, Nan::New("args").ToLocalChecked()).ToLocalChecked();
	if (arglist->IsArray()) {
		list_from_jsarray(args, Local<Array>::Cast(arglist), log);
		as_v8_detail(log, "Parsing UDF args -- done !!!");
	}
	else if (arglist->IsNull() || arglist->IsUndefined()) {
		// No argument case: Initialize array with 0 elements.
		*args = (as_list *)as_arraylist_new(0, 0);
	}
	else {
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
	if (len >= bufsize)
		len = bufsize - 1;
	memcpy(d, s, len);
	d[len] = 0;
	return ret;
}
