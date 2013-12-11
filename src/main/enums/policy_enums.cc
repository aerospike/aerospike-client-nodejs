
#include <node.h>
using namespace v8;

Handle<Object> keyPolicy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("UNDEF"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("DIGEST"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("SEND"), Integer::New(2), ReadOnly);
	// This is not implemented in the server yet
	//obj->Set(String::NewSymbol("AS_POLICY_KEY_STORE", Integer::New(3), ReadOnly));
	
	return scope.Close(obj);
}

Handle<Object> retryPolicy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("UNDEF"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("NONE"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("ONCE"), Integer::New(2), ReadOnly);

	return scope.Close(obj);
}

Handle<Object> generationPolicy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("UNDEF"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("IGNORE"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("EQ"), Integer::New(2), ReadOnly);
	obj->Set(String::NewSymbol("GT"), Integer::New(3), ReadOnly);
	obj->Set(String::NewSymbol("DUP"), Integer::New(4), ReadOnly);

	return scope.Close(obj);
}

Handle<Object> existsPolicy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();
	obj->Set(String::NewSymbol("UNDEF"), Integer::New(0), ReadOnly);
	obj->Set(String::NewSymbol("IGNORE"), Integer::New(1), ReadOnly);
	obj->Set(String::NewSymbol("CREATE"), Integer::New(2), ReadOnly);
	obj->Set(String::NewSymbol("UPDATE"), Integer::New(3), ReadOnly);

	return scope.Close(obj);
}
