#include <node.h>
#include "hyperloglog.h"
#include "conversions.h"

extern "C" {
#include <aerospike/as_txn.h>
#include <aerospike/aerospike_txn.h>
}

using namespace v8;

/*******************************************************************************
 *  Constructor and Destructor
 ******************************************************************************/

HyperLogLog::HyperLogLog() { }

HyperLogLog::~HyperLogLog() { }

/**
 *  Constructor for HyperLogLog.
 */
NAN_METHOD(HyperLogLog::New)
{
	Local<Object> v8Buffer = info[0].As<Object>();

	if (!node::Buffer::HasInstance(v8Buffer)) {
		return Nan::ThrowTypeError("buffer must be a Buffer");
	}

	HyperLogLog* hll = new HyperLogLog();

	hll->Wrap(info.This());

	Nan::Set(info.This(),  Nan::New("buffer").ToLocalChecked(), v8Buffer);

	info.GetReturnValue().Set(info.This());
}

/**
 *  Instantiate a new HyperLogLog.
 */
Local<Value> HyperLogLog::NewInstance(Local<Object> buffer)
{
	Nan::EscapableHandleScope scope;
	const int argc = 1;
	Local<Value> argv[argc] = {buffer};

	Local<Function> cons = Nan::New(constructor());
	Nan::TryCatch try_catch;
	Nan::MaybeLocal<Object> instance = Nan::NewInstance(cons, argc, argv);
	if (try_catch.HasCaught()) {
		try_catch.ReThrow();
		return Nan::Undefined();
	}
	return scope.Escape(instance.ToLocalChecked());
}

/**
 *  Initialize a HyperLogLog object.
 *  This creates a constructor function, and sets up the prototype.
 */
void HyperLogLog::Init()
{
	Local<FunctionTemplate> tpl =
		Nan::New<FunctionTemplate>(HyperLogLog::New);

	tpl->SetClassName(Nan::New("HyperLogLog").ToLocalChecked());

	tpl->InstanceTemplate()->SetInternalFieldCount(1);

	Local<Function> ctor =
		Nan::GetFunction(tpl).ToLocalChecked();

	constructor().Reset(ctor);

}