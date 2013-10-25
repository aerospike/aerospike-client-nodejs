#pragma once

#include <node.h>
using namespace v8;

/**********************************************************
 * FUNCTIONS
 **********************************************************/


//Exposes all C error codes as a map of <String,Int> to nodejs 
//application. Eg <AEROSPIKE,0>
 Handle<Object> Error_Codes();

//Exposes key Policy in C to nodejs application as a map <String,Int>
//Eg < AS_POLICY_KEY_DIGEST, 1 >
 Handle<Object> Key_Policy();

//Exposes Retry  Policy in C to nodejs application as a map <String,Int>
//Eg < AS_POLICY_RETRY_ONCE, 1 >
 Handle<Object> Retry_Policy();

//Exposes Generation  Policy in C to nodejs application as a map <String,Int>
//Eg < AS_POLICY_GENERATION_EQ, 1 >
 Handle<Object> Generation_Policy();

//Exposes Exists  Policy in C to nodejs application as a map <String,Int>
//Eg < AS_POLICY_EXISTS_IGNORE, 1 >
 Handle<Object> Exists_Policy();

