/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
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

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/aerospike_key.h>
    #include <aerospike/aerospike_scan.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_key.h>
    #include <aerospike/as_record.h>
    #include <aerospike/as_scan.h>
    #include <aerospike/as_bin.h>
    #include <aerospike/as_arraylist.h>
}

#include <node.h>
#include "client.h"
#include "conversions.h"
#include "log.h"
#include "scan.h"
#include "enums.h"
using namespace v8;

/*******************************************************************************
 *  Fields
 ******************************************************************************/

/**
 *  JavaScript constructor for AerospikeScan
 */
Persistent<Function> AerospikeScan::constructor;

/*******************************************************************************
 *  Constructor and Destructor
 ******************************************************************************/

AerospikeScan::AerospikeScan() {}

AerospikeScan::~AerospikeScan() {}

/*******************************************************************************
 *  Methods
 ******************************************************************************/

/**
 *  Initialize a scan object. 
 *  This creates a constructor function, and sets up the prototype.
 */
void AerospikeScan::Init()
{
    // Prepare constructor template
    Local<FunctionTemplate> cons = FunctionTemplate::New(New);
    cons->SetClassName(String::NewSymbol("AerospikeScan"));
    cons->InstanceTemplate()->SetInternalFieldCount(3);
    // Prototype
    cons->PrototypeTemplate()->Set(String::NewSymbol("select"), FunctionTemplate::New(select)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("applyEach"), FunctionTemplate::New(applyEach)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("foreach"), FunctionTemplate::New(foreach)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("setPriority"), FunctionTemplate::New(setPriority)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("setNobins"), FunctionTemplate::New(setNobins)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("setConcurrent"), FunctionTemplate::New(setConcurrent)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("setPercent"), FunctionTemplate::New(setPercent)->GetFunction());
    cons->PrototypeTemplate()->Set(String::NewSymbol("setRecordQsize"), FunctionTemplate::New(setRecordQsize)->GetFunction());
    constructor = Persistent<Function>::New(NODE_ISOLATE_PRE cons->GetFunction());
}

/**
 *  Instantiate a new 'AerospikeScan(ns, set)'
 */
Handle<Value> AerospikeScan::New(const Arguments& args)
{
    NODE_ISOLATE_DECL;
    HANDLESCOPE;

	// Create a new V8 scan object, which in turn contains
	// the as_scan ( C structure) 
	// Initialize the as_scan with namespace and set which 
	// are constructor arguments.
    AerospikeScan* scan = new AerospikeScan();

	AerospikeClient* client =  ObjectWrap::Unwrap<AerospikeClient>(args[2]->ToObject());


	scan->q_size	 =  0;
	scan->as		 =  client->as;
	LogInfo* log     =  scan->log		 =  client->log;


	as_namespace ns  = {'\0'};
	as_set		 set = {'\0'};

	if ( !args[0]->IsString())
	{
		return scope.Close(Undefined());
	}
	else 
	{
		strncpy(ns, *String::Utf8Value(args[0]), AS_NAMESPACE_MAX_SIZE);
		as_v8_debug(log, "namespace to scan %s", ns);
	}

	//set can be optional parameter. Handle that
	if( args.Length() > 2 && !args[1]->IsString())
	{
		return scope.Close(Undefined());
	}
	else
	{
		strncpy(set, *String::Utf8Value(args[1]), AS_SET_MAX_SIZE);
		as_v8_debug(log, "set to scan %s", set); 
	}

	as_scan_init( &scan->scan, ns, set);
    scan->Wrap(args.This());

    return scope.Close(args.This());
}

/**
 *  Instantiate a new 'AerospikeScan(ns, set)'
 */
Handle<Value> AerospikeScan::NewInstance( const Arguments& args)
{
	NODE_ISOLATE_DECL;
    HANDLESCOPE;

    const unsigned argc = 3;

	// Invoked with namespace and set.
    Handle<Value> argv[argc] = {args[0], args[1], args.This()};

    Local<Object> instance = constructor->NewInstance( argc, argv);

    return scope.Close(instance);
}

Handle<Value> AerospikeScan::select(const Arguments& args)
{
	HANDLESCOPE;
	AerospikeScan * asScan    = ObjectWrap::Unwrap<AerospikeScan>(args.This());
	as_scan * scan			  = &asScan->scan; 
	LogInfo * log			  = asScan->log;
	// Parse the bin names and set the bin values to C scan structure.
	if ( args[0]->IsArray() ) 
	{ 
		Local<Array> bins	= Local<Array>::Cast(args[0]);
		int size			= bins->Length();
		as_v8_debug(log, "Number of bins to select in scan %d", size);
		as_scan_select_init(scan, (uint16_t) size);
		for (int i=0; i < size; i++) {
			Local<Value> bin = bins->Get(i);
			as_scan_select( scan, *String::Utf8Value(bin));
			as_v8_debug(log, "bin %d = %s", i, *String::Utf8Value(bin));
		}   
	}   
	else 
	{
		as_v8_error(log, "Select takes an array of bins");
		// Throw an Exception here.
	}   
	return scope.Close(asScan->handle_);
}

Handle<Value> AerospikeScan::setPriority( const Arguments& args)
{
	HANDLESCOPE;
	AerospikeScan * asScan	= ObjectWrap::Unwrap<AerospikeScan>(args.This());
	as_scan * scan			= &asScan->scan;
	LogInfo * log			= asScan->log;
	//Set the priority of the scan.
	if( args[0]->IsNumber() )
	{
		as_scan_set_priority( scan, (as_scan_priority) args[0]->ToObject()->IntegerValue());
		as_v8_debug(log, "Scan priority is set to %d ", args[0]->ToObject()->IntegerValue()); 
	}
	else
	{
		as_v8_error(log, "Scan priority must be an enumerator of type scanPriority");
		//Throw an exception.
	}
	return scope.Close(asScan->handle_);
}
Handle<Value> AerospikeScan::setPercent( const Arguments& args)
{
	HANDLESCOPE;
	AerospikeScan * asScan	= ObjectWrap::Unwrap<AerospikeScan>(args.This());
	as_scan * scan			= &asScan->scan;
	LogInfo * log			= asScan->log;

	//Set the percentage to be scanned in each partition.
	if( args[0]->IsNumber() )
	{
		as_scan_set_percent( scan, (uint8_t) args[0]->ToObject()->IntegerValue());
		as_v8_debug(log, "Scan percent is set to %u", (uint8_t) args[0]->ToObject()->IntegerValue());
	}
	else
	{
		//Throw an exception.
		as_v8_error(log, "scan percentage is a number less than 100");
	}
	return scope.Close(asScan->handle_);
}

Handle<Value> AerospikeScan::setNobins( const Arguments& args)
{
	HANDLESCOPE;
	AerospikeScan * asScan	= ObjectWrap::Unwrap<AerospikeScan>(args.This());
	as_scan * scan		= &asScan->scan;
	LogInfo * log		= asScan->log;

	// Set the nobins value here.
	// When nobins is true in a scan, only metadata of the record
	// is returned not bins
	if( args[0]->IsBoolean() ) 
	{
		
		as_scan_set_nobins( scan, (bool) args[0]->ToObject()->ToBoolean()->Value());
		as_v8_debug(log, "scan nobins value is set");
	}
	else
	{
		// Throw exception.
		as_v8_error(log," setNobins should be a boolean value");
	}
	return scope.Close(asScan->handle_);
}

Handle<Value> AerospikeScan::setConcurrent( const Arguments& args)
{
	HANDLESCOPE;
	AerospikeScan * asScan	= ObjectWrap::Unwrap<AerospikeScan>(args.This());
	as_scan * scan			= &asScan->scan;
	LogInfo * log			= asScan->log;
	//Set the concurrent value here.
	if(args[0]->IsBoolean())
	{
		as_scan_set_concurrent( scan, (bool) args[0]->ToObject()->ToBoolean()->Value());
		as_v8_debug(log, "Concurrent node scan property is set");
	}
	else
	{
		as_v8_error(log, "setConcuurent should be a boolean value");
		// Throw exception.
	}
	return scope.Close(asScan->handle_);
}

Handle<Value> AerospikeScan::setRecordQsize( const Arguments& args)
{
	HANDLESCOPE;
	AerospikeScan * asScan	= ObjectWrap::Unwrap<AerospikeScan>(args.This());
	LogInfo * log			= asScan->log;

	//Set the record queue size.
	//In this Queue records from scan callback is pushed into.
	if(args[0]->IsNumber())
	{
		asScan->q_size = (int) args[0]->ToObject()->IntegerValue();
		as_v8_debug(log, "Record Q size is set to %d ", (int) args[0]->ToObject()->IntegerValue());

	}
	else
	{
		// Throw exception.
		as_v8_error(log, "Record q size must be an integer");
	}
	return scope.Close(asScan->handle_);
}


Handle<Value> AerospikeScan::applyEach(const Arguments& args)
{
	HANDLESCOPE;
	AerospikeScan * scan	= ObjectWrap::Unwrap<AerospikeScan>(args.This());
	
	// Parse the UDF args from jsobject and populate the scan object with it.
	char module[255];
	char func[255];

	char* filename = module;
	char* funcname = func;
	as_arraylist * arglist= NULL;
	int ret = udfargs_from_jsobject(&filename, &funcname, &arglist, args[0]->ToObject(), NULL);

	if( ret == AS_NODE_PARAM_OK) 
	{
		as_scan_apply_each( &scan->scan, filename, funcname, (as_list*) arglist);
	}
	else
	{
		as_v8_error(scan->log, "Error parsing udfArgs for scan applyEach");
	}

	return scope.Close(scan->handle_);
}


