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
    #include <aerospike/aerospike_query.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_key.h>
    #include <aerospike/as_record.h>
    #include <aerospike/as_query.h>
    #include <aerospike/as_scan.h>
    #include <aerospike/as_bin.h>
    #include <aerospike/as_arraylist.h>
}
#include <inttypes.h>
#include <node.h>
#include "client.h"
#include "conversions.h"
#include "log.h"
#include "query.h"
#include "enums.h"
#include "async.h"
using namespace v8;

/*******************************************************************************
 *  Fields
 ******************************************************************************/

/**
 *  JavaScript constructor for AerospikeQuery
 */
Persistent<FunctionTemplate> AerospikeQuery::constructor;

/*******************************************************************************
 *  Constructor and Destructor
 ******************************************************************************/

AerospikeQuery::AerospikeQuery() {}

AerospikeQuery::~AerospikeQuery() {}

/*******************************************************************************
 *  Methods
 ******************************************************************************/

/**
 *  Initialize a query object. 
 *  This creates a constructor function, and sets up the prototype.
 */
void AerospikeQuery::Init()
{
    // Prepare constructor template
    Local<FunctionTemplate> cons = NanNew<FunctionTemplate>(AerospikeQuery::New);
    cons->SetClassName(NanNew("AerospikeQuery"));
    cons->InstanceTemplate()->SetInternalFieldCount(3);

    // Prototype
	NODE_SET_PROTOTYPE_METHOD(cons, "select", select);
	NODE_SET_PROTOTYPE_METHOD(cons, "apply", apply);
	NODE_SET_PROTOTYPE_METHOD(cons, "foreach", foreach);
	NODE_SET_PROTOTYPE_METHOD(cons, "where", where);
	NODE_SET_PROTOTYPE_METHOD(cons, "setRecordQsize", setRecordQsize);
	NODE_SET_PROTOTYPE_METHOD(cons, "queryInfo", queryInfo);
	NODE_SET_PROTOTYPE_METHOD(cons, "setPercent", setPercent);
	NODE_SET_PROTOTYPE_METHOD(cons, "setNobins", setNobins);
	NODE_SET_PROTOTYPE_METHOD(cons, "setPrority", setPriority);
	NODE_SET_PROTOTYPE_METHOD(cons, "setConcurrent", setConcurrent);
	NODE_SET_PROTOTYPE_METHOD(cons, "setQueryType", setQueryType);
	NanAssignPersistent(constructor, cons);
}

/**
 *  Instantiate a new 'AerospikeQuery(ns, set)'
 */
NAN_METHOD(AerospikeQuery::New)
{
	NanScope();

	// Create a new V8 query object, which in turn contains
	// the as_query ( C structure) 
	// Initialize the as_query with namespace and set which 
	// are constructor arguments.
    AerospikeQuery* query	= new AerospikeQuery();

	AerospikeClient* client =  ObjectWrap::Unwrap<AerospikeClient>(args[2]->ToObject());


	query->q_size	 =  0;
	query->as		 =  client->as;
	LogInfo* log     =  query->log		 =  client->log;
	
	// Default assume it as a scan. (Query without a where clause).
	// Set this variable to true, when there's a where clause in the query.

	// set the default values of scan properties.
	query->percent    = AS_SCAN_PERCENT_DEFAULT;
	query->nobins     = AS_SCAN_NOBINS_DEFAULT;
	query->concurrent = AS_SCAN_CONCURRENT_DEFAULT;
	query->scan_priority   = AS_SCAN_PRIORITY_DEFAULT;

	as_namespace ns  = {'\0'};
	as_set		 set = {'\0'};

	if ( !args[0]->IsString())
	{
		as_v8_error(log, "namespace to be queried should be string");
		NanReturnUndefined();
	}
	else 
	{
		strncpy(ns, *String::Utf8Value(args[0]), AS_NAMESPACE_MAX_SIZE);
		as_v8_debug(log, "namespace to query %s", ns);
	}
	// set is an optional parameter. So the constructor should either have NULL for set or a string.
	if( !args[1]->IsNull() && !args[1]->IsString())
	{
		as_v8_error(log, "set to be queried should be string");
		NanReturnUndefined();
	}
	else
	{
		strncpy(set, *String::Utf8Value(args[1]), AS_SET_MAX_SIZE);
		as_v8_debug(log, "set to query %s", set); 
	}
	
	as_query_init( &query->query, ns, set);
    query->Wrap(args.This());

	NanReturnValue(args.This());
}

/**
 *  Instantiate a new 'AerospikeQuery(ns, set)'
 */
Handle<Value> AerospikeQuery::NewInstance( Local<Object> ns, Local<Object> set, Local<Object> client)
{
	NanEscapableScope();

    const unsigned argc = 3;

	// Invoked with namespace and set.
    Handle<Value> argv[argc] = { ns, set, client};

	Local<FunctionTemplate> constructorHandle = NanNew<FunctionTemplate>(constructor);

	Local<Object> instance	 = constructorHandle->GetFunction()->NewInstance( argc, argv);

	return NanEscapeScope(instance);
}

NAN_METHOD(AerospikeQuery::select)
{
	NanScope();
	AerospikeQuery* asQuery		= ObjectWrap::Unwrap<AerospikeQuery>(args.This());
	as_query * query			= &asQuery->query; 
	LogInfo * log				= asQuery->log;
	// Parse the bin names and set the bin values to query object
	// Query returns only this set of seleted bins.
	if ( args[0]->IsArray() ) 
	{ 
		Local<Array> bins	= Local<Array>::Cast(args[0]);
		int size			= bins->Length();
		as_v8_debug(log, "Number of bins to select in query %d", size);
		as_query_select_init(query, (uint16_t)size);
		for (int i=0; i < size; i++) {
			Local<Value> bin = bins->Get(i);
			as_query_select( query, *String::Utf8Value(bin));
			as_v8_debug(log, "bin %d = %s", i, *String::Utf8Value(bin));
		}   
	}   
	else 
	{
		// Throw an Exception here.
		as_v8_error(log, "Bins to be selected should be an array");
		return NanThrowError(NanNew("Bins must be an array"));
	}   
	NanReturnValue(args.This());
}

NAN_METHOD(AerospikeQuery::where)
{
	NanScope();
	AerospikeQuery* asQuery		= ObjectWrap::Unwrap<AerospikeQuery>(args.This());
	as_query * query			= &asQuery->query; 
	LogInfo * log				= asQuery->log;



	// Parse the filters and set the filters to query object
	if ( args[0]->IsArray() ) 
	{ 
		Local<Array> filters = Local<Array>::Cast(args[0]);
		int size			 = filters->Length();
		as_v8_debug(log, "Number of filters %d", size);
		as_query_where_init(query, (uint16_t)size);
		for (int i=0; i < size; i++) 
		{
			Local<Object> filter = filters->Get(i)->ToObject();
			Local<Value> bin	 = filter->Get(NanNew("bin"));
			char * bin_val		 = NULL;
			if( !bin->IsString() ) {
				as_v8_error(log, "Bin value must be string");
				return NanThrowError(NanNew("Bin value must be string"));
			}
			int predicate		 = filter->Get(NanNew("predicate"))->ToObject()->IntegerValue();
			as_v8_debug(log, "Bin name in the filter %s \n", *String::Utf8Value(bin));
			switch(predicate)
			{
				case AS_PREDICATE_RANGE:
					{
						Local<Value> v8min = filter->Get(NanNew("min"));
						Local<Value> v8max = filter->Get(NanNew("max"));
						int64_t min = 0, max = 0;
						if( v8min->IsNumber()) {
							min = v8min->NumberValue();
						}
						else {
							as_v8_error(log, "The range value passed must be an integer");
							return NanThrowError(NanNew("The range value passed must be an integer"));
						}
						if( v8max->IsNumber()){
							max = v8max->NumberValue();
						}
						else {
							as_v8_error(log, "The range value passed must be an integer");
							return NanThrowError(NanNew("The range value passed must be an integer"));
						}
						as_query_where( query, *String::Utf8Value(bin), as_integer_range(min, max));
						as_v8_debug(log, "Integer range predicate from %d to %d", min, max);
						break;
					}
				case AS_PREDICATE_EQUAL:
					{
						as_index_datatype type = (as_index_datatype)filter->Get(NanNew("type"))->ToObject()->IntegerValue();
						if( type == AS_INDEX_NUMERIC) 
						{
							int64_t val = filter->Get(NanNew("val"))->ToObject()->NumberValue();
							as_query_where( query, *String::Utf8Value(bin), as_integer_equals(val));
							as_v8_debug(log," Integer equality predicate %llu", val);
							break;
						}
						else if(type == AS_INDEX_STRING)
						{
							Local<Value> val = filter->Get(NanNew("val"));
							bin_val   = strdup(*String::Utf8Value(val));
							as_query_where( query, *String::Utf8Value(bin),as_string_equals(bin_val));
							as_v8_debug(log, " String equality predicate %s", bin_val);
							break;
						}
					}

			}   
		}
	}
	else 
	{
		// Throw an Exception here.
		as_v8_error(log, "Filters should be passed as an array");
		return NanThrowError(NanNew("filters should be passed as an array"));
	} 
	NanReturnValue(args.This());
}

NAN_METHOD(AerospikeQuery::setRecordQsize)
{
	NanScope();
	AerospikeQuery * asQuery	= ObjectWrap::Unwrap<AerospikeQuery>(args.This());
	LogInfo * log				= asQuery->log;

	//Set the queue size here.
	//This is the temporary queue where objects returned by query callback is stored.
	if(args[0]->IsNumber())
	{
		asQuery->q_size = (int) args[0]->ToObject()->IntegerValue();
		as_v8_debug(log, "Record Q size is set to %d ", (int) args[0]->ToObject()->IntegerValue());

	}
	else
	{
		// Throw exception.
		as_v8_error(log, "The queue size must be an integer");
		return NanThrowError(NanNew("Queue size must be an integer"));
	}
	NanReturnValue(args.This());
}


NAN_METHOD(AerospikeQuery::apply)
{
	NanScope();
	AerospikeQuery * query	= ObjectWrap::Unwrap<AerospikeQuery>(args.This());

	// Parse the UDF args from jsobject and populate the query object with it.
	char module[255];
	char func[255];

	char* filename = module;
	char* funcname = func;
	as_arraylist * arglist= NULL;
	int ret = udfargs_from_jsobject(&filename, &funcname, &arglist, args[0]->ToObject(), query->log);

	if( ret == AS_NODE_PARAM_OK) 
	{
		as_query_apply( &query->query, filename, funcname, (as_list*) arglist);
	}
	else
	{
		as_v8_error(query->log, " Parsing udfArgs for query object failed");
		return NanThrowError(NanNew("Error in parsing the query aggregate parameters"));
	}
	NanReturnValue(args.This());
}


NAN_METHOD(AerospikeQuery::setPriority)
{
	NanScope();
	AerospikeQuery* asQuery  = ObjectWrap::Unwrap<AerospikeQuery>(args.This());
	LogInfo * log           = asQuery->log;
	//Set the scan_priority of the scan.
	if( args[0]->IsNumber() )
	{
		asQuery->scan_priority = args[0]->ToObject()->IntegerValue();
		as_v8_debug(log, "Scan scan_priority is set to %d ", args[0]->ToObject()->IntegerValue()); 
	}   
	else
	{   
		//Throw an exception.
		as_v8_error(log, "Scan scan_priority must be an enumerator of type scanPriority");
		return NanThrowError(NanNew("Scan priority must be of type aerospike.scanPriority"));
	}   
	NanReturnValue(args.This());
}

NAN_METHOD(AerospikeQuery::setPercent)
{
	NanScope();
	AerospikeQuery * asQuery  = ObjectWrap::Unwrap<AerospikeQuery>(args.This());
	LogInfo * log           = asQuery->log;

	//Set the percentage to be scanned in each partition.
	if( args[0]->IsNumber() )
	{
		asQuery->percent = args[0]->ToObject()->IntegerValue();
		as_v8_debug(log, "Scan percent is set to %u", (uint8_t) args[0]->ToObject()->IntegerValue());
	}
	else
	{
		//Throw an exception.
		as_v8_error(log, "scan percentage is a number less than 100");
		return NanThrowError(NanNew("Scan percentage must be an integer less than 100"));
	}
	NanReturnValue(args.This());
}

NAN_METHOD(AerospikeQuery::setNobins)
{
	NanScope();
	AerospikeQuery * asQuery  = ObjectWrap::Unwrap<AerospikeQuery>(args.This());
	LogInfo * log       = asQuery->log;

	// Set the nobins value here.
	// When nobins is true in a scan, only metadata of the record
	// is returned not bins
	if( args[0]->IsBoolean() )
	{
		asQuery->nobins = (bool) args[0]->ToBoolean()->Value();
		as_v8_debug(log, "scan nobins value is set %d", (int)asQuery->nobins);
	}
	else
	{
		// Throw exception.
		as_v8_error(log," setNobins should be a boolean value");
		return NanThrowError(NanNew("setNobins must be a boolean value"));
	}
	NanReturnValue(args.This());
}

NAN_METHOD(AerospikeQuery::setConcurrent)
{
	NanScope();
	AerospikeQuery * asQuery  = ObjectWrap::Unwrap<AerospikeQuery>(args.This());
	LogInfo * log			  = asQuery->log;
	//Set the concurrent value here.
	if(args[0]->IsBoolean())
	{
		asQuery->concurrent =  (bool) args[0]->ToObject()->ToBoolean()->Value();
		as_v8_debug(log, "Concurrent node scan property is set");
	}
	else
	{
		as_v8_error(log, "setConcuurent should be a boolean value");
		// Throw exception.
		return NanThrowError(NanNew("setConcurrent must be a boolean value"));
	}
	NanReturnValue(args.This());
}

NAN_METHOD(AerospikeQuery::setQueryType)
{
	NanScope();
	AerospikeQuery * asQuery = ObjectWrap::Unwrap<AerospikeQuery>(args.This());
	LogInfo * log			 = asQuery->log;

	if(args[0]->IsNumber())
	{
		asQuery->type= (asQueryType)(args[0]->ToObject()->IntegerValue());
		as_v8_debug(log, "scanQuery API is set to enum %d", asQuery->type);
	}
	else
	{
		as_v8_error(log, "scanQueryAPI is an enumerator and takes integer value");
		return NanThrowError(NanNew("Configuration Error while creating query object"));
	}
	NanReturnValue(args.This());
}
