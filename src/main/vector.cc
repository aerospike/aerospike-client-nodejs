/*******************************************************************************
 * Copyright 2026 Aerospike, Inc.
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

#include <cstring>

extern "C" {
#include <aerospike/as_error.h>
#include <aerospike/as_vector_value.h>
}

#include "vector.h"
#include "conversions.h"

using namespace v8;

// The Vector class from lib/vector.js, registered when that module loads.
static Nan::Persistent<Function> &vector_class()
{
	static Nan::Persistent<Function> cls;
	return cls;
}

NAN_METHOD(setVectorClass)
{
	vector_class().Reset(info[0].As<Function>());
}

// Matches by class, not by constructor name, so that user classes with a
// similar name are never mistaken for a vector.
bool is_vector_value(Local<Value> value)
{
	if (vector_class().IsEmpty() || !value->IsObject()) {
		return false;
	}
	Local<Function> cls = Nan::New(vector_class());
	return value.As<Object>()
		->InstanceOf(Nan::GetCurrentContext(), cls)
		.FromMaybe(false);
}

// Copies the vector's serialized bytes into a new as_bytes tagged as a vector.
int vector_bytes_from_jsvalue(as_bytes **bytes, Local<Value> value,
							  const LogInfo *log)
{
	Local<Value> buffer =
		Nan::Get(value.As<Object>(), Nan::New("_bytes").ToLocalChecked())
			.ToLocalChecked();
	if (!node::Buffer::HasInstance(buffer)) {
		as_v8_error(log, "Vector holds no serialized bytes");
		return AS_NODE_PARAM_ERR;
	}

	uint8_t *data = NULL;
	int size = 0;
	if (extract_blob_from_jsobject(&data, &size, buffer.As<Object>(), log) !=
		AS_NODE_PARAM_OK) {
		return AS_NODE_PARAM_ERR;
	}

	*bytes = as_bytes_new_wrap(data, size, true);
	if (*bytes == NULL) {
		free(data);
		as_v8_error(log, "Unable to convert Vector to C client's as_bytes");
		return AS_NODE_PARAM_ERR;
	}
	as_bytes_set_type(*bytes, AS_BYTES_VECTOR);
	return AS_NODE_PARAM_OK;
}

// Returns a Vector for a stored vector value, or the raw Buffer if lib/vector.js
// isn't loaded or the bytes aren't a valid vector.
Local<Value> vector_to_jsvalue(Local<Object> buffer)
{
	Nan::EscapableHandleScope scope;
	if (vector_class().IsEmpty()) {
		return scope.Escape(buffer);
	}

	Nan::TryCatch try_catch;
	Local<Value> argv[] = {buffer};
	Nan::MaybeLocal<Object> vector =
		Nan::NewInstance(Nan::New(vector_class()), 1, argv);
	if (try_catch.HasCaught() || vector.IsEmpty()) {
		return scope.Escape(buffer);
	}
	return scope.Escape(vector.ToLocalChecked());
}

template <typename T>
static as_vector_value *new_vector(as_error *err, Local<Value> elements,
								   as_vector_value *(*create)(as_error *,
															  const T *,
															  uint32_t))
{
	Nan::TypedArrayContents<T> data(elements);
	// An empty typed array may have no backing store; pass a valid pointer so
	// the C client reports the empty vector rather than a NULL pointer.
	static const T no_elements[1] = {0};
	const T *values = data.length() > 0 ? *data : no_elements;
	return create(err, values, (uint32_t)data.length());
}

// vectorEncode(elementType, elements): serializes elements, a typed array
// matching elementType, into a Buffer. Returns an error object instead if
// the C client rejects the vector.
NAN_METHOD(vectorEncode)
{
	as_error err;
	as_error_init(&err);

	uint32_t element_type = Nan::To<uint32_t>(info[0]).FromJust();
	Local<Value> elements = info[1];
	as_vector_value *vector = NULL;

	switch (element_type) {
	case AS_VECTOR_ELEMENT_TYPE_FLOAT16:
		vector = new_vector<uint16_t>(&err, elements,
									  as_vector_value_new_float16);
		break;
	case AS_VECTOR_ELEMENT_TYPE_INT32:
		vector = new_vector<int32_t>(&err, elements, as_vector_value_new_int32);
		break;
	case AS_VECTOR_ELEMENT_TYPE_FLOAT32:
		vector = new_vector<float>(&err, elements, as_vector_value_new_float32);
		break;
	case AS_VECTOR_ELEMENT_TYPE_FLOAT64:
		vector =
			new_vector<double>(&err, elements, as_vector_value_new_float64);
		break;
	default:
		as_error_update(&err, AEROSPIKE_ERR_PARAM,
						"vector: invalid element type %u", element_type);
	}

	if (vector == NULL) {
		info.GetReturnValue().Set(error_to_jsobject(&err, NULL));
		return;
	}

	as_bytes bytes;
	as_vector_value_to_bytes(vector, &bytes);
	as_vector_value_destroy(vector);
	info.GetReturnValue().Set(Nan::CopyBuffer((char *)as_bytes_get(&bytes),
											  as_bytes_size(&bytes))
								  .ToLocalChecked());
	as_bytes_destroy(&bytes);
}

static Local<Value> typed_array(as_vector_element_type element_type,
								Local<ArrayBuffer> buffer, uint32_t length)
{
	switch (element_type) {
	case AS_VECTOR_ELEMENT_TYPE_FLOAT16:
		return Uint16Array::New(buffer, 0, length);
	case AS_VECTOR_ELEMENT_TYPE_INT32:
		return Int32Array::New(buffer, 0, length);
	case AS_VECTOR_ELEMENT_TYPE_FLOAT32:
		return Float32Array::New(buffer, 0, length);
	default:
		return Float64Array::New(buffer, 0, length);
	}
}

// vectorDecode(buffer): returns { elementType, elements } for a serialized
// vector, with elements as a typed array in host byte order (float16 elements
// as raw bits in a Uint16Array). Returns an error object instead if the bytes
// aren't a valid vector.
NAN_METHOD(vectorDecode)
{
	Local<Object> buffer = info[0].As<Object>();
	as_bytes bytes;
	as_bytes_init_wrap(&bytes, (uint8_t *)node::Buffer::Data(buffer),
					   (uint32_t)node::Buffer::Length(buffer), false);

	as_error err;
	as_vector_value *vector = as_vector_value_from_bytes(&err, &bytes);
	if (vector == NULL) {
		info.GetReturnValue().Set(error_to_jsobject(&err, NULL));
		return;
	}

	uint32_t size = 0;
	const uint8_t *data = as_vector_value_element_bytes(vector, &size);
	Local<ArrayBuffer> elements =
		ArrayBuffer::New(info.GetIsolate(), (size_t)size);
	memcpy(elements->GetBackingStore()->Data(), data, size);

	Local<Object> result = Nan::New<Object>();
	Nan::Set(result, Nan::New("elementType").ToLocalChecked(),
			 Nan::New((uint32_t)vector->element_type));
	Nan::Set(result, Nan::New("elements").ToLocalChecked(),
			 typed_array(vector->element_type, elements, vector->dimensions));
	as_vector_value_destroy(vector);
	info.GetReturnValue().Set(result);
}
