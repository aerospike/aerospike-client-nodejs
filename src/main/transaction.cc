#include <node.h>
#include "transaction.h"
#include "conversions.h"

extern "C" {
#include <aerospike/as_txn.h>
#include <aerospike/aerospike_txn.h>
}

using namespace v8;

/*******************************************************************************
 *  Constructor and Destructor
 ******************************************************************************/

Transaction::Transaction() {}

Transaction::~Transaction() {}

/**
 *  Constructor for Transaction.
 */
NAN_METHOD(Transaction::New)
{

	uint32_t writes_capacity;
	uint32_t reads_capacity;
	as_txn* txn;
	Local<Object> v8CapacityObj = info[0].As<Object>();
	Local<Value> v8ReadsCapacity;
	Local<Value> v8WritesCapacity;

	v8ReadsCapacity = 
		Nan::Get(v8CapacityObj.As<Object>(), Nan::New("readsCapacity").ToLocalChecked()).ToLocalChecked();
	v8WritesCapacity =
		Nan::Get(v8CapacityObj.As<Object>(), Nan::New("writesCapacity").ToLocalChecked()).ToLocalChecked();


	if (v8ReadsCapacity->IsNumber() && v8ReadsCapacity->IsNumber() ) {
		writes_capacity = (uint32_t) Nan::To<uint32_t>(v8WritesCapacity).FromJust();
		reads_capacity = (uint32_t) Nan::To<uint32_t>(v8ReadsCapacity).FromJust();
		txn = as_txn_create_capacity(reads_capacity, writes_capacity);
	}
	else {
		txn = as_txn_create();
	}


	Transaction *transaction = new Transaction();
	transaction->txn = txn;
	transaction->Wrap(info.This());

	info.GetReturnValue().Set(info.This());
}
/**
 *  Constructor for Transaction.
 */
NAN_METHOD(Transaction::Close)
{

	Transaction *transaction =
		Nan::ObjectWrap::Unwrap<Transaction>(info.This());

	as_txn_destroy(transaction->txn);

	delete transaction;
}

/**
 *  Constructor for Transaction.
 */
NAN_METHOD(Transaction::GetId)
{

	Transaction *transaction =
		Nan::ObjectWrap::Unwrap<Transaction>(info.This());

	info.GetReturnValue().Set(Nan::New<Number>(transaction->txn->id));
}

/**
 *  Constructor for Transaction.
 */
NAN_METHOD(Transaction::GetInDoubt)
{

	Transaction *transaction =
		Nan::ObjectWrap::Unwrap<Transaction>(info.This());

	info.GetReturnValue().Set(Nan::New(transaction->txn->in_doubt));
}


/**
 *  Constructor for Transaction.
 */
NAN_METHOD(Transaction::GetTimeout)
{

	Transaction *transaction =
		Nan::ObjectWrap::Unwrap<Transaction>(info.This());

	info.GetReturnValue().Set(Nan::New<Number>(transaction->txn->timeout));
}

/**
 *  Constructor for Transaction.
 */
NAN_METHOD(Transaction::GetState)
{

	Transaction *transaction =
		Nan::ObjectWrap::Unwrap<Transaction>(info.This());

	info.GetReturnValue().Set(Nan::New<Number>(transaction->txn->state));
}

/**
 *  Constructor for Transaction.
 */
NAN_METHOD(Transaction::SetTimeout)
{

	Transaction *transaction =
		Nan::ObjectWrap::Unwrap<Transaction>(info.This());

	if(info[0]->IsNumber()){
		transaction->txn->timeout = Nan::To<uint32_t>(info[0].As<Number>()).FromJust();
	}
}

/**
 *  Instantiate a new Transaction.
 */
Local<Value> Transaction::NewInstance(Local<Object> capacity_obj)
{
	Nan::EscapableHandleScope scope;
	const int argc = 1;
	Local<Value> argv[argc] = {capacity_obj};

	Local<Function> cons = Nan::New<Function>(constructor());
	Nan::TryCatch try_catch;
	Nan::MaybeLocal<Object> instance = Nan::NewInstance(cons, argc, argv);
	if (try_catch.HasCaught()) {
		try_catch.ReThrow();
		return Nan::Undefined();
	}

	return scope.Escape(instance.ToLocalChecked());
}

/**
 *  Initialize a Transaction object.
 *  This creates a constructor function, and sets up the prototype.
 */
void Transaction::Init()
{
	Local<FunctionTemplate> tpl =
		Nan::New<FunctionTemplate>(Transaction::New);

	tpl->SetClassName(Nan::New("Transaction").ToLocalChecked());

	tpl->InstanceTemplate()->SetInternalFieldCount(1);

	Nan::SetPrototypeMethod(tpl, "getId", GetId);
	Nan::SetPrototypeMethod(tpl, "getInDoubt", GetInDoubt);
	Nan::SetPrototypeMethod(tpl, "getTimeout", GetTimeout);
	Nan::SetPrototypeMethod(tpl, "getState", GetState);

	Nan::SetPrototypeMethod(tpl, "setTimeout", SetTimeout);

	Nan::SetPrototypeMethod(tpl, "close", Close);


	constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
}