#pragma once

#include <node.h>
using namespace v8;

static const char * log_severity_strings[]= { "ERROR", "WARN", "INFO", "DEBUG", "DETAIL"};

static const char * KEY[] = {"UNDEF", "DIGEST", "SEND"};

static const char * RETRY[] = {"UNDEF", "NONE", "ONCE"};

static const char * GENERATION[] = {"UNDEF", "IGNORE", "EQ", "GT", "DUP" };

static const char * EXISTS[] = { "UNDEF", "IGNORE", "CREATE", "UPDATE" };

/**********************************************************
 * FUNCTIONS
 **********************************************************/


//Exposes all C error codes as a map of <String,Int> to node.js 
//application. Eg <AEROSPIKE,0>
 Handle<Object> errorCodes();

//Exposes key Policy in C to node.js application as a map <String,Int>
//Eg < AS_POLICY_KEY_DIGEST, 1 >
 Handle<Object> keyPolicy();

//Exposes Retry  Policy in C to node.js application as a map <String,Int>
//Eg < AS_POLICY_RETRY_ONCE, 1 >
 Handle<Object> retryPolicy();

//Exposes Generation  Policy in C to node.js application as a map <String,Int>
//Eg < AS_POLICY_GENERATION_EQ, 1 >
 Handle<Object> generationPolicy();

//Exposes Exists  Policy in C to node.js application as a map <String,Int>
//Eg < AS_POLICY_EXISTS_IGNORE, 1 >
 Handle<Object> existsPolicy();

// Exposes as_operator in C to node.js application as a map <String, Int>
// Eg < AS_OPERATOR_WRITE, 0 >
 Handle<Object> operatorsEnum();

//Exposes as_log_level in C to node.js application as a map <String, Int>
// Eg < AS_LOG_LEVEL_INFO, 0 >
Handle<Object> logLevel();
