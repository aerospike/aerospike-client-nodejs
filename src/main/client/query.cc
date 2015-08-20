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
AerospikeQuery::AerospikeQuery() {
    this->isQuery_         = false;
    this->hasUDF_          = false;
    this->hasAggregation_  = false;
}


AerospikeQuery::~AerospikeQuery() {}

/*******************************************************************************
 *  Methods
 ******************************************************************************/




void ParseSelectBins( AerospikeQuery* query, Local<Object> select)
{
	NanScope();
	LogInfo * log				= query->log;
	// Parse the bin names and set the bin values to query object
	// Query returns only this set of seleted bins.
	if ( select->IsArray() ) 
	{ 
		Local<Array> bins	= Local<Array>::Cast(select);
		int size			= bins->Length();
		as_v8_debug(log, "Number of bins to select in query %d", size);
        if( query->type == SCAN || query->type == SCANUDF) {
            as_scan_select_init( query->query_scan.scan, size);
        } 
        else {
    		as_query_select_init(query->query_scan.query, (uint16_t)size);
        }
		for (int i=0; i < size; i++) {
			Local<Value> bin = bins->Get(i);
            if(!bin->IsString()) {
                as_v8_error(log, "Bin value passed must be string");
                NanThrowError(NanNew("Bin name passed is not a string"));
            }
            if( query->type == SCAN || query->type == SCANUDF) {
                as_scan_select(query->query_scan.scan, *String::Utf8Value(bin));
            }
            else {
    			as_query_select( query->query_scan.query, *String::Utf8Value(bin));
            }
			as_v8_debug(log, "bin %d = %s", i, *String::Utf8Value(bin));
		}   
	}   
	else 
	{
		// Throw an Exception here.
		as_v8_error(log, "Bins to be selected should be an array");
		NanThrowError(NanNew("Bins to be selected is not an array "));
	}   
}

void ParseWhereClause(as_query* query, Local<Object> filter, LogInfo* log)
{
	NanScope();

	// Parse the filters and set the filters to query object
	if ( filter->IsArray() ) { 
		Local<Array> filters = Local<Array>::Cast(filter);
		int size			 = filters->Length();
		as_v8_debug(log, "Number of filters %d", size);
		as_query_where_init(query, (uint16_t)size);
		for (int i=0; i < size; i++) {
			Local<Object> filter = filters->Get(i)->ToObject();
			Local<Value> bin	 = filter->Get(NanNew("bin"));
			char * bin_val		 = NULL;
			if( !bin->IsString() ) {
				as_v8_error(log, "Bin value must be string");
				NanThrowError(NanNew("Bin value is not a string"));
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
							NanThrowError(NanNew("The range value passed is not an integer"));
						}
						if( v8max->IsNumber()){
							max = v8max->NumberValue();
						}
						else {
							as_v8_error(log, "The range value passed must be an integer");
							NanThrowError(NanNew("The range value passed is not an integer"));
						}
						as_query_where( query, *String::Utf8Value(bin), as_integer_range(min, max));
						as_v8_debug(log, "Integer range predicate from %d to %d", min, max);
						break;
					}
				case AS_PREDICATE_EQUAL:
					{
						as_index_datatype type = (as_index_datatype)filter->Get(NanNew("type"))->ToObject()->IntegerValue();
						if( type == AS_INDEX_NUMERIC) {
                            if( !filter->Get(NanNew("val"))->IsNumber()) {
                                as_v8_error(log, "querying an integer index with equal predicate - value must be an integer");
                                NanThrowError(NanNew("Querying an integer index with equal predicate - value is not an integer"));
                            }
							int64_t val = filter->Get(NanNew("val"))->ToObject()->NumberValue();
							as_query_where( query, *String::Utf8Value(bin), as_integer_equals(val));
							as_v8_debug(log," Integer equality predicate %llu", val);
							break;
						}
						else if(type == AS_INDEX_STRING) {
							Local<Value> val = filter->Get(NanNew("val"));
                            if( !val->IsString()) {
                                as_v8_error(log," querying a string index with equal predicate - value must be a string");
                                NanThrowError(NanNew("Querying a string index with equal predicate - value is not a string"));
                            }
							bin_val   = strdup(*String::Utf8Value(val));
							as_query_where( query, *String::Utf8Value(bin),as_string_equals(bin_val));
							as_v8_debug(log, " String equality predicate %s", bin_val);
							break;
						}
					}
			}   
		}
	}
	else {
		// Throw an Exception here.
		as_v8_error(log, "Filters should be passed as an array");
		NanThrowError(NanNew("filters should be passed as an array"));
	} 
}

void ParseRecordQSize( int* q_size, Local<Object> qSize, LogInfo* log)
{
	//Set the queue size here.
	//This is the temporary queue where objects returned by query callback is stored.
	if(qSize->IsNumber()) {
		*q_size = (int) qSize->IntegerValue();
		as_v8_debug(log, "Record Q size is set to %d ", (int) qSize->IntegerValue());

	}
	else {
		// Throw exception.
		as_v8_error(log, "The queue size must be an integer");
		NanThrowError(NanNew("Queue size must be an integer"));
	}
}


void ParseUDFArgs(QueryScan* queryScan, Local<Object> udf, LogInfo* log, bool isQuery)
{
    NanScope();
	// Parse the UDF args from jsobject and populate the query object with it.
	char module[255];
	char func[255];

	char* filename = module;
	char* funcname = func;
	as_arraylist * arglist= NULL;
	int ret = udfargs_from_jsobject(&filename, &funcname, &arglist, udf, log);

    if(ret) {
		as_v8_error(log, " Parsing udfArgs for query object failed");
		NanThrowError(NanNew("Error in parsing the UDF parameters"));
    }

    if( isQuery) {
	    as_query_apply( queryScan->query, filename, funcname, (as_list*) arglist);
    }
    else {
        as_scan_apply_each(queryScan->scan, filename, funcname, (as_list*) arglist);
    }
}


void ParseScanPriority(as_scan* scan, Local<Object> obj, LogInfo* log)
{
    //NanScope();
	//Set the scan_priority of the scan.
	if( obj->IsNumber() )
	{
		as_scan_set_priority(scan, (as_scan_priority)obj->IntegerValue());
		as_v8_debug(log, "Scan scan_priority is set to %d ", obj->IntegerValue()); 
	}   
	else
	{   
		//Throw an exception.
		as_v8_error(log, "Scan scan_priority must be an enumerator of type scanPriority");
		NanThrowError(NanNew("Scan priority must be of type aerospike.scanPriority"));
	}   
}

void ParseScanPercent(as_scan* scan, Local<Object> obj, LogInfo* log)
{
    NanScope();
	//Set the percentage to be scanned in each partition.
	if( obj->IsNumber() )
	{
        as_scan_set_percent(scan, obj->IntegerValue());
		as_v8_debug(log, "Scan percent is set to %u", (uint8_t) obj->IntegerValue());
	}
	else
	{
		//Throw an exception.
		as_v8_error(log, "scan percentage should be a number");
		NanThrowError(NanNew("Scan percentage is not an integer - expected integer value"));
	}
}

void ParseScanNobins( as_scan* scan, Local<Value> obj, LogInfo* log)
{
    NanScope();
	// Set the nobins value here.
	// When nobins is true in a scan, only metadata of the record
	// is returned not bins
	if( obj->IsBoolean() )
	{
        as_scan_set_nobins(scan, obj->ToBoolean()->Value());
		as_v8_debug(log, "scan nobins value is set %d", (int)obj->ToBoolean()->Value());
	}
	else
	{
		// Throw exception.
		as_v8_error(log," setNobins should be a boolean value");
		NanThrowError(NanNew("setNobins must be a boolean value"));
	}
}

void ParseScanConcurrent(as_scan* scan, Local<Value> obj, LogInfo* log)
{
    NanScope();
	//Set the concurrent value here.
	if(obj->IsBoolean())
	{
        as_scan_set_concurrent( scan, obj->ToBoolean()->Value());
		as_v8_debug(log, "Concurrent node scan property is set");
	}
	else
	{
		// Throw exception.
		as_v8_error(log, "setConcuurent should be a boolean value");
		NanThrowError(NanNew("setConcurrent must be a boolean value"));
	}
}

void AerospikeQuery::SetQueryType( Local<Value> configVal)
{
    NanScope();
    // Scan can be invoked with no config option, in which case
    // the default parameters for scan operation will be used.
    if(configVal->IsNull()) {
        this->type = SCAN;
        return;
    }
    
    Local<Object> config = configVal->ToObject();
    // If config is passed, a combination of UDF, Aggregation and Where 
    // parameters determine the type of query/scan operation.

    if( config->Has(NanNew("filters"))) {
        this->isQuery_ = true;
    }
    if( config->Has(NanNew("aggregationUDF"))) {
        this->hasAggregation_  = true;
    }
    if( config->Has(NanNew("UDF"))) {
        this->hasUDF_  = true;
    }

    if(this->isQuery_) {
        if(this->hasUDF_) {
            this->type = QUERYUDF;
        }
        else if(this->hasAggregation_) {
            this->type = QUERYAGGREGATION;
        }
        else {
            this->type = QUERY;
        }
    }
    else {
        if(this->hasUDF_) {
            this->type = SCANUDF;
        }
        else if(this->hasAggregation_) {
            this->type = SCANAGGREGATION;
        }
        else {
            this->type = SCAN;
        }
    }
}

void ParseConfig( AerospikeQuery* query, Local<Object> config)
{
    NanScope();
    LogInfo* log        = query->log;

    if( config->Has(NanNew("filters"))) {
        Local<Object> filters = config->Get(NanNew("filters"))->ToObject();
        ParseWhereClause( query->query_scan.query, filters, log);
    }

    if( config->Has(NanNew("select"))) {
        Local<Object> select = config->Get(NanNew("select"))->ToObject();
        ParseSelectBins( query, select);
    }

    if( config->Has(NanNew("recordQSize"))) {
        ParseRecordQSize(&query->q_size, config->Get(NanNew("recordQSize"))->ToObject(), log);
    }

    if( config->Has(NanNew("aggregationUDF"))) {
        Local<Object> agg = config->Get(NanNew("aggregationUDF"))->ToObject();
        ParseUDFArgs( &query->query_scan, agg, query->log, true);
    }

    if( config->Has(NanNew("UDF"))) {
        Local<Object> udf = config->Get(NanNew("UDF"))->ToObject();
        if(query->type == QUERYUDF) {
            ParseUDFArgs( &query->query_scan, udf, query->log, true);
        }
        else if (query->type == SCANUDF) {
            ParseUDFArgs( &query->query_scan, udf, query->log, false);
        }
    } 

    if( query->type == SCAN || query->type == SCANUDF) {
        as_scan* scan = query->query_scan.scan;
        if(config->Has(NanNew("priority"))) {
            ParseScanPriority(scan, config->Get(NanNew("priority"))->ToObject(), log);
        }
        if(config->Has(NanNew("percent"))) {
            ParseScanPercent(scan, config->Get(NanNew("percent"))->ToObject(), log);
        }
        if(config->Has(NanNew("nobins"))) {
            ParseScanNobins(scan, config->Get(NanNew("nobins")), log);
        }
        if(config->Has(NanNew("concurrent"))) {
            ParseScanConcurrent(scan, config->Get(NanNew("concurrent")), log);
        }
    }
}

NAN_GETTER(AerospikeQuery::GetIsQuery)
{
    NanScope();
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(args.Holder());
    Local<Boolean> value     = NanNew<Boolean>(queryObj->isQuery_);
    NanReturnValue(value);
}

NAN_SETTER(AerospikeQuery::SetIsQuery)
{
    NanScope();
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(args.Holder());
    queryObj->isQuery_       = value->ToBoolean()->Value();
}

NAN_GETTER(AerospikeQuery::GetHasUDF)
{
    NanScope();
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(args.Holder());
    Local<Boolean> value     = NanNew<Boolean>(queryObj->hasUDF_);
    NanReturnValue(value);
}

NAN_SETTER(AerospikeQuery::SetHasUDF)
{
    NanScope();
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(args.Holder());
    queryObj->hasUDF_        = value->ToBoolean()->Value();
}

NAN_GETTER(AerospikeQuery::GetHasAggregation)
{
    NanScope();
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(args.Holder());
    Local<Boolean> value     = NanNew<Boolean>(queryObj->hasAggregation_);
    NanReturnValue(value);
}

NAN_SETTER(AerospikeQuery::SetHasAggregation)
{
    NanScope();
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(args.Holder());
    queryObj->hasAggregation_= value->ToBoolean()->Value();
}

NAN_METHOD(AerospikeQuery::New)
{
	NanScope();

	AerospikeClient* client =  ObjectWrap::Unwrap<AerospikeClient>(args[3]->ToObject());
	// Create a new V8 query object, which in turn contains
	// the as_query ( C structure) 
	// Initialize the as_query with namespace and set which 
	// are constructor arguments.
    AerospikeQuery* query   = new AerospikeQuery();

	query->q_size	        =  0;
	query->as		        =  client->as;
	LogInfo* log            =  query->log		 =  client->log;


    as_namespace ns  = {'\0'};
	as_set		 set = {'\0'};

	if ( !args[0]->IsString()) {
		as_v8_error(log, "namespace to be queried should be string");
        NanThrowError(NanNew("Namespace to be queried is not a string - expected a string value"));
	}
	else {
		strncpy(ns, *String::Utf8Value(args[0]), AS_NAMESPACE_MAX_SIZE);
		as_v8_debug(log, "namespace to query %s", ns);
	}
	// set is an optional parameter. So the constructor should either have NULL for set or a string.
	if( !args[1]->IsNull() && !args[1]->IsString()) {
		as_v8_error(log, "set to be queried should be string");
        NanThrowError(NanNew("Set to be queried is not a string"));
	}
	else {
		strncpy(set, *String::Utf8Value(args[1]), AS_SET_MAX_SIZE);
		as_v8_debug(log, "set to query %s", set); 
	}

	// Decide if the Constructor is invoked for Scan or Query operation. 
    // If the ConfigObject(passed as a parameter during query/scan construction)
    // has a where clause, it is a query operation otherwise it's a scan operation.

    Local<Value> config= args[2]; 
    query->SetQueryType(config);

    // The C API for scan and scan udf is different.
    // And the C API is shared for query, queryUDF, queryAggregation and ScanAggregation.
    // Initialize structures accordingly.
    if(query->type == SCAN || query->type == SCANUDF) {
        query->query_scan.scan  = (as_scan*) cf_malloc(sizeof(as_scan));
        as_scan_init(query->query_scan.scan, ns, set);
    }
    else {
        query->query_scan.query = (as_query*)cf_malloc(sizeof(as_query));
        as_query_init(query->query_scan.query, ns, set);
    }
   
    if(!config->IsNull()) {
        ParseConfig( query, config->ToObject());
    }

    query->Wrap(args.This());
    
	NanReturnValue(args.This());
}

Handle<Value> AerospikeQuery::NewInstance( Local<Object> ns, Local<Object> set, Local<Object> config, Local<Object> client)
{
	NanEscapableScope();

    const unsigned argc = 4;

	// Invoke the query constructor method with namespace, set, query configration options and client object .
    Handle<Value> argv[argc] = { ns, set, config, client};

	Local<FunctionTemplate> constructorHandle = NanNew<FunctionTemplate>(constructor);

	Local<Object> instance	 = constructorHandle->GetFunction()->NewInstance( argc, argv);

	return NanEscapeScope(instance);
}

/*
 *  Initialize a query object. 
 *  This creates a constructor function, and sets up the prototype.
 */
void AerospikeQuery::Init()
{
    // Prepare constructor template
    Local<FunctionTemplate> cons = NanNew<FunctionTemplate>(AerospikeQuery::New);
    cons->SetClassName(NanNew("AerospikeQuery"));

    // When AerospikeQuery is initialized from node.js an internal reference is created to 
    // a wrapped AerospikeQuery object. It should create a single reference to this query object
    // as constructor initializes only one wrapped object.
    cons->InstanceTemplate()->SetInternalFieldCount(1);

    // Prototype
	NODE_SET_PROTOTYPE_METHOD(cons, "foreach", AerospikeQuery::foreach);
	NODE_SET_PROTOTYPE_METHOD(cons, "queryInfo", AerospikeQuery::queryInfo);
    cons->InstanceTemplate()->SetAccessor(NanNew<String>("isQuery"), 
            AerospikeQuery::GetIsQuery, AerospikeQuery::SetIsQuery);
    cons->InstanceTemplate()->SetAccessor(NanNew<String>("hasUDF"), 
            AerospikeQuery::GetHasUDF, AerospikeQuery::SetHasUDF);
    cons->InstanceTemplate()->SetAccessor(NanNew<String>("hasAggregation"), 
            AerospikeQuery::GetHasAggregation, AerospikeQuery::SetHasAggregation);

	NanAssignPersistent(constructor, cons);
}
