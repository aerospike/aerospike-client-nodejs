	/*******************************************************************************
 * Copyright 2020-2023 Aerospike, Inc.
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

#include <node.h>
#include <nan.h>

#include "log.h"
#include "conversions.h"
#include "expressions.h"
#include "operations.h"

#include <stdlib.h>
#include <string.h>

extern "C" {
#include <aerospike/as_exp.h>
}

using namespace v8;

NAN_METHOD(AerospikeClient::ExpressionToBase64)
{
	TYPE_CHECK_REQ(info[0], IsArray, "Expression must be an array");
	Nan::HandleScope scope;
	AerospikeClient *client =
		Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());


	as_exp *exp = NULL;

	if (info[0]->IsArray()) {

		Local<Array> exp_ary = Local<Array>::Cast(info[0].As<Array>());

		if (compile_expression(exp_ary, &exp, client->log) != AS_NODE_PARAM_OK) {
			info.GetReturnValue().Set(Nan::Undefined());
			return Nan::ThrowError("Expressions could not be compiled, cannot serialize");
		}

		info.GetReturnValue().Set(Nan::New<String>(as_exp_to_base64(exp)).ToLocalChecked());
		cf_free(exp);
	}
	else{

		info.GetReturnValue().Set(Nan::Undefined());
		return Nan::ThrowError("Expressions must be an array, cannot serialize");
	}

}

int free_entries(Local<Array> entries_ary, as_exp_entry *entries, int length,
				 const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	int i = 0;
	as_exp_entry *entry = entries;
	for (i = 0; i < length; i++, entry++) {
		Local<Object> entry_obj =
			Nan::Get(entries_ary, i).ToLocalChecked().As<Object>();

		if (Nan::Has(entry_obj, Nan::New("value").ToLocalChecked())
				.FromJust()) {
			// it is freed by c-client in case of geojson exp but for other cases it may leak
			// if (entry->v.val) as_val_destroy(entry->v.val);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("strVal").ToLocalChecked())
				.FromJust()) {
			if (entry->v.str_val)
				free((void *)entry->v.str_val);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("bytesVal").ToLocalChecked())
				.FromJust()) {
			if (entry->v.str_val)
				cf_free((void *)entry->v.bytes_val);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("intVal").ToLocalChecked())
				.FromJust()) {
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("uintVal").ToLocalChecked())
				.FromJust()) {
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("floatVal").ToLocalChecked())
				.FromJust()) {
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("boolVal").ToLocalChecked())
				.FromJust()) {
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("ctx").ToLocalChecked()).FromJust()) {
			if (entry->v.ctx)
				as_cdt_ctx_destroy(entry->v.ctx);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("exp").ToLocalChecked()).FromJust()) {
			if (entry->v.expr)
				as_exp_destroy(entry->v.expr);
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("listPolicy").ToLocalChecked())
				.FromJust()) {
			if (entry->v.list_pol) {
				cf_free(entry->v.list_pol);
			}
			continue;
		}

		if (Nan::Has(entry_obj, Nan::New("mapPolicy").ToLocalChecked())
				.FromJust()) {
			if (entry->v.map_pol) {
				cf_free(entry->v.map_pol);
			}
			continue;
		}
	}

	cf_free(entries);
	return rc;
}

int convert_entry(Local<Object> entry_obj, as_exp_entry *entry,
				  const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;

	if ((rc = get_int_property((int *)&entry->op, entry_obj, "op", log)) !=
		AS_NODE_PARAM_OK) {
		return rc;
	}

	if ((rc = get_optional_uint32_property(&entry->count, NULL, entry_obj,
										   "count", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	if ((rc = get_optional_uint32_property(&entry->sz, NULL, entry_obj, "sz",
										   log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("value").ToLocalChecked()).FromJust()) {
		entry->v.val = NULL;
		rc = get_asval_property(&entry->v.val, entry_obj, "value", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("strVal").ToLocalChecked()).FromJust()) {
		entry->v.str_val = NULL;
		rc = get_string_property((char **)&entry->v.str_val, entry_obj,
								 "strVal", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("bytesVal").ToLocalChecked()).FromJust()) {
		entry->v.bytes_val = NULL;
		entry->sz = 0;
		rc = get_bytes_property(&entry->v.bytes_val, (int *)&entry->sz,
								entry_obj, "bytesVal", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("intVal").ToLocalChecked()).FromJust()) {
		rc = get_int64_property(&entry->v.int_val, entry_obj, "intVal", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("uintVal").ToLocalChecked()).FromJust()) {
		return get_uint64_property(&entry->v.uint_val, entry_obj, "uintVal",
								   log);
	}

	if (Nan::Has(entry_obj, Nan::New("floatVal").ToLocalChecked()).FromJust()) {
		return get_float_property(&entry->v.float_val, entry_obj, "floatVal",
								  log);
	}

	if (Nan::Has(entry_obj, Nan::New("boolVal").ToLocalChecked()).FromJust()) {
		return get_bool_property(&entry->v.bool_val, entry_obj, "boolVal", log);
	}

	if (Nan::Has(entry_obj, Nan::New("ctx").ToLocalChecked()).FromJust()) {
		entry->v.ctx =
			get_cdt_context_heap(&rc, entry_obj, "ctx", log);
		return rc;
	}

	if (Nan::Has(entry_obj, Nan::New("exp").ToLocalChecked()).FromJust()) {
		as_exp* exp = NULL;
		Local<Value> exp_obj =
			Nan::Get(entry_obj, Nan::New("exp").ToLocalChecked())
				.ToLocalChecked();
		if (exp_obj->IsArray()) {
			Local<Array> exp_ary = Local<Array>::Cast(exp_obj);
			if (compile_expression(exp_ary, &exp, log) != AS_NODE_PARAM_OK) {
				return AS_NODE_PARAM_ERR;
			}
		}
		else if (exp_obj->IsString()) {
			Nan::Utf8String exp_b64(exp_obj.As<String>());
			exp = as_exp_from_base64(*exp_b64);
		}
		else{
			as_v8_error(log, "Type error: expression property should be array or string");
			return AS_NODE_PARAM_ERR;
		}
		entry->v.expr = exp;
		return rc;
	}


	if (Nan::Has(entry_obj, Nan::New("listPolicy").ToLocalChecked())
			.FromJust()) {
		entry->v.list_pol = NULL;
		Local<Value> policy_obj =
			Nan::Get(entry_obj, Nan::New("listPolicy").ToLocalChecked())
				.ToLocalChecked();
		if (policy_obj->IsObject()) {
			entry->v.list_pol =
				(as_list_policy *)cf_malloc(sizeof(as_list_policy));
			get_optional_list_policy(entry->v.list_pol, NULL,
									 policy_obj.As<Object>(), log);
		}
		return AS_NODE_PARAM_OK;
	}

	if (Nan::Has(entry_obj, Nan::New("mapPolicy").ToLocalChecked())
			.FromJust()) {
		entry->v.map_pol = NULL;
		Local<Value> policy_obj =
			Nan::Get(entry_obj, Nan::New("mapPolicy").ToLocalChecked())
				.ToLocalChecked();
		if (policy_obj->IsObject()) {
			entry->v.map_pol =
				(as_map_policy *)cf_malloc(sizeof(as_map_policy));
			get_map_policy(entry->v.map_pol, policy_obj.As<Object>(), log);
		}
		return AS_NODE_PARAM_OK;
	}

	if (Nan::Has(entry_obj, Nan::New("inf").ToLocalChecked()).FromJust()) {
		entry->v.val = NULL;
		get_inf_property(&entry->v.val, log);
	}

	if (Nan::Has(entry_obj, Nan::New("wildcard").ToLocalChecked()).FromJust()) {
		entry->v.val = NULL;
		get_wildcard_property(&entry->v.val, log);
	}

	return rc;
}

// The original conversion, kept as a fallback (AEROSPIKE_EXP_LEGACY=1) so one build can A/B
// both paths and the equivalence test can compare their output byte for byte.
static int compile_expression_legacy(Local<Array> entries_ary,
									 as_exp **filter_exp, const LogInfo *log)
{
	int rc = AS_NODE_PARAM_OK;
	int i = 0, length = entries_ary->Length();
	as_v8_debug(log, "Compiling expression (length=%i)", length);
	as_exp_entry *entries =
		(as_exp_entry *)cf_malloc(length * sizeof(as_exp_entry));
	as_exp_entry *entry = entries;

	for (i = 0; i < length; i++) {
		*entry = {};
		Local<Object> entry_obj =
			Nan::Get(entries_ary, i).ToLocalChecked().As<Object>();
		if ((rc = convert_entry(entry_obj, entry, log)) != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Error converting expression entry: %i", i);
			free_entries(entries_ary, entries, i, log);
			return rc;
		}
		entry++;
	}
	*filter_exp = as_exp_compile(entries, length);

	free_entries(entries_ary, entries, entries_ary->Length(), log);
	return rc;
}

/*******************************************************************************
 * Fast conversion path
 *
 * The legacy path above costs ~15-30 V8 API calls per expression node:
 *  - every property probe does Nan::New("<literal>"), i.e. a UTF-8 decode, a hash
 *    and a string-table lookup, on every node of every call;
 *  - the value kind is found by up to 12 sequential Has() probes (a plain
 *    { op, count } node, the most common shape, fails all of them);
 *  - free_entries() walks the JS array again and repeats the probes only to
 *    decide what to free.
 *
 * This path:
 *  1. creates the property-name strings once per isolate, internalized;
 *  2. reads each node's own property names once (GetOwnPropertyNames) and
 *     matches them by identity against those keys (internalized strings are
 *     unique, so Local == is a pointer compare, no string comparison);
 *  3. records each entry's kind in a C array while converting, so freeing
 *     needs no V8 calls at all.
 * Semantics (precedence of value keys, type checks, errors) follow the legacy
 * path; rare kinds (bytesVal, floatVal, ctx, inf, wildcard) reuse the legacy
 * helpers.
 ******************************************************************************/

enum exp_key {
	K_OP, K_COUNT, K_SZ, K_VALUE, K_STRVAL, K_BYTESVAL, K_INTVAL, K_UINTVAL,
	K_FLOATVAL, K_BOOLVAL, K_CTX, K_EXP, K_LISTPOLICY, K_MAPPOLICY, K_INF,
	K_WILDCARD, K__COUNT
};

static const char *const EXP_KEY_NAMES[K__COUNT] = {
	"op", "count", "sz", "value", "strVal", "bytesVal", "intVal", "uintVal",
	"floatVal", "boolVal", "ctx", "exp", "listPolicy", "mapPolicy", "inf",
	"wildcard"};

// what an entry owns, so it can be freed without looking at the JS object again
enum exp_entry_kind : uint8_t {
	EK_NONE = 0, EK_VALUE, EK_STR, EK_BYTES, EK_CTX, EK_EXP, EK_LIST_POLICY,
	EK_MAP_POLICY
};

struct exp_keys {
	Isolate *isolate;
	Eternal<String> key[K__COUNT];
};

// the keys as Locals, materialised once per compile (Eternal::Get makes a new handle per call)
struct exp_key_locals {
	Local<String> key[K__COUNT];
};

// one set per isolate; an isolate is used by one thread at a time (main thread or a worker)
static thread_local exp_keys *tls_exp_keys = NULL;

static exp_keys *get_exp_keys(Isolate *isolate)
{
	if (tls_exp_keys == NULL || tls_exp_keys->isolate != isolate) {
		exp_keys *keys = new exp_keys(); // never freed: a few strings per isolate
		keys->isolate = isolate;
		for (int k = 0; k < K__COUNT; k++) {
			keys->key[k].Set(isolate, String::NewFromUtf8(isolate, EXP_KEY_NAMES[k],
														   NewStringType::kInternalized)
										  .ToLocalChecked());
		}
		tls_exp_keys = keys;
	}
	return tls_exp_keys;
}

static int free_entries_fast(as_exp_entry *entries, const uint8_t *kinds,
							 int length)
{
	for (int i = 0; i < length; i++) {
		as_exp_entry *entry = &entries[i];
		switch (kinds[i]) {
		case EK_STR:
			if (entry->v.str_val)
				free((void *)entry->v.str_val);
			break;
		case EK_BYTES:
			if (entry->v.bytes_val)
				cf_free((void *)entry->v.bytes_val);
			break;
		case EK_CTX:
			if (entry->v.ctx)
				as_cdt_ctx_destroy(entry->v.ctx);
			break;
		case EK_EXP:
			if (entry->v.expr)
				as_exp_destroy(entry->v.expr);
			break;
		case EK_LIST_POLICY:
			if (entry->v.list_pol)
				cf_free(entry->v.list_pol);
			break;
		case EK_MAP_POLICY:
			if (entry->v.map_pol)
				cf_free(entry->v.map_pol);
			break;
		default: // EK_VALUE: owned by the c-client after compile (same as legacy)
			break;
		}
	}
	cf_free(entries);
	return AS_NODE_PARAM_OK;
}

static int read_optional_uint32(uint32_t *out, Local<Value> value,
								const char *prop, const LogInfo *log)
{
	if (value.IsEmpty() || value->IsUndefined() || value->IsNull()) {
		return AS_NODE_PARAM_OK;
	}
	if (!value->IsNumber()) {
		as_v8_error(log, "Type error: %s property should be integer (uint32)",
					prop);
		return AS_NODE_PARAM_ERR;
	}
	*out = Nan::To<uint32_t>(value).FromJust();
	return AS_NODE_PARAM_OK;
}

static int compile_expression_fast(Local<Array> entries_ary,
								   as_exp **filter_exp, const LogInfo *log);

static int convert_entry_fast(Isolate *isolate, Local<Context> context,
							  const exp_key_locals *keys, Local<Object> entry_obj,
							  as_exp_entry *entry, uint8_t *kind,
							  const LogInfo *log)
{
	*kind = EK_NONE;

	Local<Array> names;
	if (!entry_obj->GetOwnPropertyNames(context).ToLocal(&names)) {
		as_v8_error(log, "Expression entry: cannot read property names");
		return AS_NODE_PARAM_ERR;
	}

	Local<Value> vals[K__COUNT];
	uint32_t present = 0;
	uint32_t n = names->Length();

	for (uint32_t i = 0; i < n; i++) {
		Local<Value> name;
		if (!names->Get(context, i).ToLocal(&name)) {
			return AS_NODE_PARAM_ERR;
		}
		for (int k = 0; k < K__COUNT; k++) {
			if (name == keys->key[k]) { // identity: both are internalized
				if (!entry_obj->Get(context, name).ToLocal(&vals[k])) {
					return AS_NODE_PARAM_ERR;
				}
				present |= 1u << k;
				break;
			}
		}
	}
#define HAS(k) (present & (1u << (k)))

	// op: required integer
	if (!HAS(K_OP) || !vals[K_OP]->IsNumber()) {
		as_v8_error(log, "Type error: op property should be integer");
		return AS_NODE_PARAM_ERR;
	}
	entry->op = (as_exp_ops)Nan::To<int>(vals[K_OP]).FromJust();

	int rc;
	if ((rc = read_optional_uint32(&entry->count,
								   HAS(K_COUNT) ? vals[K_COUNT] : Local<Value>(),
								   "count", log)) != AS_NODE_PARAM_OK) {
		return rc;
	}
	if ((rc = read_optional_uint32(&entry->sz,
								   HAS(K_SZ) ? vals[K_SZ] : Local<Value>(), "sz",
								   log)) != AS_NODE_PARAM_OK) {
		return rc;
	}

	// value kinds, in the legacy precedence order
	if (HAS(K_VALUE)) {
		*kind = EK_VALUE;
		entry->v.val = NULL;
		if (vals[K_VALUE]->IsUndefined()) {
			as_v8_error(log, "Type error: value property should not be undefined");
			return AS_NODE_PARAM_ERR;
		}
		return asval_from_jsvalue(&entry->v.val, vals[K_VALUE], log);
	}

	if (HAS(K_STRVAL)) {
		entry->v.str_val = NULL;
		if (!vals[K_STRVAL]->IsString()) {
			as_v8_error(log, "Type error: strVal property should be string");
			return AS_NODE_PARAM_ERR;
		}
		*kind = EK_STR;
		entry->v.str_val = strdup(*Nan::Utf8String(vals[K_STRVAL]));
		return AS_NODE_PARAM_OK;
	}

	if (HAS(K_BYTESVAL)) { // rare: legacy helper
		*kind = EK_BYTES;
		entry->v.bytes_val = NULL;
		entry->sz = 0;
		return get_bytes_property(&entry->v.bytes_val, (int *)&entry->sz,
								  entry_obj, "bytesVal", log);
	}

	if (HAS(K_INTVAL)) {
		if (!vals[K_INTVAL]->IsNumber()) {
			as_v8_error(log, "Type error: intVal property should be integer");
			return AS_NODE_PARAM_ERR;
		}
		entry->v.int_val = Nan::To<int64_t>(vals[K_INTVAL]).FromJust();
		return AS_NODE_PARAM_OK;
	}

	if (HAS(K_UINTVAL)) {
		if (!vals[K_UINTVAL]->IsNumber()) {
			as_v8_error(log, "Type error: uintVal property should be integer");
			return AS_NODE_PARAM_ERR;
		}
		entry->v.uint_val = Nan::To<int64_t>(vals[K_UINTVAL]).FromJust();
		return AS_NODE_PARAM_OK;
	}

	if (HAS(K_FLOATVAL)) { // rare: legacy helper (accepts Double objects)
		return get_float_property(&entry->v.float_val, entry_obj, "floatVal",
								  log);
	}

	if (HAS(K_BOOLVAL)) {
		if (!vals[K_BOOLVAL]->IsBoolean()) {
			as_v8_error(log, "Type error: boolVal property should be boolean");
			return AS_NODE_PARAM_ERR;
		}
		entry->v.bool_val = Nan::To<bool>(vals[K_BOOLVAL]).FromJust();
		return AS_NODE_PARAM_OK;
	}

	if (HAS(K_CTX)) { // legacy helper
		*kind = EK_CTX;
		entry->v.ctx = get_cdt_context_heap(&rc, entry_obj, "ctx", log);
		return rc;
	}

	if (HAS(K_EXP)) {
		*kind = EK_EXP;
		as_exp *exp = NULL;
		Local<Value> exp_obj = vals[K_EXP];
		if (exp_obj->IsArray()) {
			if (compile_expression_fast(Local<Array>::Cast(exp_obj), &exp, log) !=
				AS_NODE_PARAM_OK) {
				return AS_NODE_PARAM_ERR;
			}
		}
		else if (exp_obj->IsString()) {
			Nan::Utf8String exp_b64(exp_obj.As<String>());
			exp = as_exp_from_base64(*exp_b64);
		}
		else {
			as_v8_error(log, "Type error: expression property should be array or string");
			return AS_NODE_PARAM_ERR;
		}
		entry->v.expr = exp;
		return AS_NODE_PARAM_OK;
	}

	if (HAS(K_LISTPOLICY)) {
		*kind = EK_LIST_POLICY;
		entry->v.list_pol = NULL;
		if (vals[K_LISTPOLICY]->IsObject()) {
			entry->v.list_pol = (as_list_policy *)cf_malloc(sizeof(as_list_policy));
			get_optional_list_policy(entry->v.list_pol, NULL,
									 vals[K_LISTPOLICY].As<Object>(), log);
		}
		return AS_NODE_PARAM_OK;
	}

	if (HAS(K_MAPPOLICY)) {
		*kind = EK_MAP_POLICY;
		entry->v.map_pol = NULL;
		if (vals[K_MAPPOLICY]->IsObject()) {
			entry->v.map_pol = (as_map_policy *)cf_malloc(sizeof(as_map_policy));
			get_map_policy(entry->v.map_pol, vals[K_MAPPOLICY].As<Object>(), log);
		}
		return AS_NODE_PARAM_OK;
	}

	// legacy: inf and wildcard do not return early
	if (HAS(K_INF)) {
		entry->v.val = NULL;
		get_inf_property(&entry->v.val, log);
	}
	if (HAS(K_WILDCARD)) {
		entry->v.val = NULL;
		get_wildcard_property(&entry->v.val, log);
	}
#undef HAS
	return AS_NODE_PARAM_OK;
}

static int compile_expression_fast(Local<Array> entries_ary,
								   as_exp **filter_exp, const LogInfo *log)
{
	Isolate *isolate = Isolate::GetCurrent();
	Local<Context> context = isolate->GetCurrentContext();
	exp_keys *eternal_keys = get_exp_keys(isolate);
	exp_key_locals locals;
	for (int k = 0; k < K__COUNT; k++) {
		locals.key[k] = eternal_keys->key[k].Get(isolate);
	}
	const exp_key_locals *keys = &locals;
	int length = entries_ary->Length();
	as_v8_debug(log, "Compiling expression, fast path (length=%i)", length);

	as_exp_entry *entries =
		(as_exp_entry *)cf_malloc(length * sizeof(as_exp_entry));
	uint8_t *kinds = (uint8_t *)cf_malloc(length > 0 ? length : 1);

	for (int i = 0; i < length; i++) {
		HandleScope scope(isolate); // bound the handles of one node
		entries[i] = {};
		kinds[i] = EK_NONE;
		Local<Value> item;
		if (!entries_ary->Get(context, i).ToLocal(&item) || !item->IsObject()) {
			as_v8_error(log, "Expression entry %i is not an object", i);
			free_entries_fast(entries, kinds, i);
			cf_free(kinds);
			return AS_NODE_PARAM_ERR;
		}
		int rc = convert_entry_fast(isolate, context, keys, item.As<Object>(),
									&entries[i], &kinds[i], log);
		if (rc != AS_NODE_PARAM_OK) {
			as_v8_error(log, "Error converting expression entry: %i", i);
			free_entries_fast(entries, kinds, i + 1);
			cf_free(kinds);
			return rc;
		}
	}

	*filter_exp = as_exp_compile(entries, length);

	free_entries_fast(entries, kinds, length);
	cf_free(kinds);
	return AS_NODE_PARAM_OK;
}

// AEROSPIKE_EXP_LEGACY=1 selects the original conversion (read once per process)
static bool use_legacy_expression_path()
{
	static int legacy = -1;
	if (legacy < 0) {
		const char *env = getenv("AEROSPIKE_EXP_LEGACY");
		legacy = (env != NULL && env[0] == '1') ? 1 : 0;
	}
	return legacy == 1;
}

int compile_expression(Local<Array> entries_ary, as_exp **filter_exp,
					   const LogInfo *log)
{
	if (use_legacy_expression_path()) {
		return compile_expression_legacy(entries_ary, filter_exp, log);
	}
	return compile_expression_fast(entries_ary, filter_exp, log);
}
