
#include <node.h>
using namespace v8;

Handle<Object> Key_Policy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("AS_POLICY_KEY_UNDEF"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_KEY_DIGEST"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_KEY_SEND"), Integer::New(2), ReadOnly);
	// This is not implemented in the server yet
	//obj->Set(String::NewSymbol("AS_POLICY_KEY_STORE", Integer::New(3), ReadOnly));
	
	return scope.Close(obj);
}

Handle<Object> Retry_Policy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("AS_POLICY_RETRY_UNDEF"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_RETRY_NONE"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_RETRY_ONCE"), Integer::New(2), ReadOnly);

	return scope.Close(obj);
}

Handle<Object> Generation_Policy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("AS_POLICY_GEN_UNDEF"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_GEN_IGNORE"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_GEN_EQ"), Integer::New(2), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_GEN_GT"), Integer::New(3), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_GEN_DUP"), Integer::New(4), ReadOnly);

	return scope.Close(obj);
}

Handle<Object> Exists_Policy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("AS_POLICY_EXISTS_UNDEF"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_EXISTS_IGNORE"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_EXISTS_CREATE"), Integer::New(2), ReadOnly);
	obj->Set(String::NewSymbol("AS_POLICY_EXISTS_UPDATE"), Integer::New(3), ReadOnly);

	return scope.Close(obj);
}
