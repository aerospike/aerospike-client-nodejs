#include "enums.h"
#include <node.h>
using namespace v8;

Handle<Object> keyPolicy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();

	int size = sizeof(KEY)/sizeof(KEY[0]);
	for ( int i = 0; i < size; i++) {
		obj->Set(String::NewSymbol(KEY[i]),Integer::New(i), ReadOnly);
	}
	// This is not implemented in the server yet
	//obj->Set(String::NewSymbol("AS_POLICY_KEY_STORE", Integer::New(3), ReadOnly));
	
	return scope.Close(obj);
}

Handle<Object> retryPolicy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();

	int size = sizeof(RETRY)/sizeof(RETRY[0]);
	for ( int i = 0; i < size; i++) {
		obj->Set(String::NewSymbol(RETRY[i]), Integer::New(i), ReadOnly);
	}

	return scope.Close(obj);
}

Handle<Object> generationPolicy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();

	int size = sizeof(GENERATION)/sizeof(GENERATION[0]);
	for ( int i = 0; i < size; i++) {
		obj->Set(String::NewSymbol(GENERATION[i]), Integer::New(i), ReadOnly);
	}
	return scope.Close(obj);
}

Handle<Object> existsPolicy()
{
	HandleScope scope;
	Handle<Object> obj = Object::New();

	int size = sizeof(EXISTS)/sizeof(EXISTS[0]);
	for ( int i = 0; i < size; i++) {
		obj->Set(String::NewSymbol(EXISTS[i]), Integer::New(i), ReadOnly);
	}
	return scope.Close(obj);

}
