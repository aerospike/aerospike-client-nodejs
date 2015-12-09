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
Nan::Persistent<FunctionTemplate> AerospikeQuery::constructor;

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
    Nan::HandleScope scope;
    LogInfo * log               = query->log;
    // Parse the bin names and set the bin values to query object
    // Query returns only this set of seleted bins.
    if ( select->IsArray() )
    {
        Local<Array> bins   = Local<Array>::Cast(select);
        int size            = bins->Length();
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
                Nan::ThrowError("Bin name passed is not a string");
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
        Nan::ThrowError("Bins to be selected is not an array ");
    }
}

void ParseWhereClause(as_query* query, Local<Object> filter, LogInfo* log)
{
    Nan::HandleScope scope;

    // Parse the filters and set the filters to query object
    if ( filter->IsArray() ) {
        Local<Array> filters = Local<Array>::Cast(filter);
        int size             = filters->Length();
        as_v8_debug(log, "Number of filters %d", size);
        as_query_where_init(query, (uint16_t)size);
        for (int i=0; i < size; i++) {
            Local<Object> filter = filters->Get(i)->ToObject();
            Local<Value> bin     = filter->Get(Nan::New("bin").ToLocalChecked());
            char * bin_val       = NULL;
            if( !bin->IsString() ) {
                as_v8_error(log, "Bin value must be string");
                Nan::ThrowError("Bin value is not a string");
            }
            int predicate        = filter->Get(Nan::New("predicate").ToLocalChecked())->ToObject()->IntegerValue();
            as_v8_debug(log, "Bin name in the filter %s \n", *String::Utf8Value(bin));
            switch(predicate)
            {
                case AS_PREDICATE_RANGE:
					{
						as_index_datatype type = (as_index_datatype)filter->Get(Nan::New("type").ToLocalChecked())->ToObject()->IntegerValue();
						if( type == AS_INDEX_NUMERIC) {
							Local<Value> v8min = filter->Get(Nan::New("min").ToLocalChecked());
							Local<Value> v8max = filter->Get(Nan::New("max").ToLocalChecked());
							int64_t min = 0, max = 0;
							if( v8min->IsNumber()) {
								min = v8min->NumberValue();
							}
							else {
								as_v8_error(log, "The range value passed must be an integer");
								Nan::ThrowError("The range value passed is not an integer");
							}
							if( v8max->IsNumber()){
								max = v8max->NumberValue();
							}
							else {
								as_v8_error(log, "The range value passed must be an integer");
								Nan::ThrowError("The range value passed is not an integer");
							}
							as_query_where( query, *String::Utf8Value(bin), as_integer_range(min, max));
							as_v8_debug(log, "Integer range predicate from %d to %d", min, max);
							break;
						}
						else if(type == AS_INDEX_GEO2DSPHERE) {
							Local<Value> val = filter->Get(Nan::New("val").ToLocalChecked());
							if( !val->IsString()) {
								as_v8_error(log, "The region value passed must be a GeoJSON string");
								Nan::ThrowError("The region value passed is not a GeoJSON string");
							}
							bin_val = strdup(*String::Utf8Value(val));
							as_query_where(query, *String::Utf8Value(bin), as_geo_within(bin_val));
							as_v8_debug(log, " Geo range predicate %s", bin_val);
							break;
						}
					}
                case AS_PREDICATE_EQUAL:
                    {
                        as_index_datatype type = (as_index_datatype)filter->Get(Nan::New("type").ToLocalChecked())->ToObject()->IntegerValue();
                        if( type == AS_INDEX_NUMERIC) {
                            if( !filter->Get(Nan::New("val").ToLocalChecked())->IsNumber()) {
                                as_v8_error(log, "querying an integer index with equal predicate - value must be an integer");
                                Nan::ThrowError("Querying an integer index with equal predicate - value is not an integer");
                            }
                            int64_t val = filter->Get(Nan::New("val").ToLocalChecked())->ToObject()->NumberValue();
                            as_query_where( query, *String::Utf8Value(bin), as_integer_equals(val));
                            as_v8_debug(log," Integer equality predicate %llu", val);
                            break;
                        }
                        else if(type == AS_INDEX_STRING) {
                            Local<Value> val = filter->Get(Nan::New("val").ToLocalChecked());
                            if( !val->IsString()) {
                                as_v8_error(log," querying a string index with equal predicate - value must be a string");
                                Nan::ThrowError("Querying a string index with equal predicate - value is not a string");
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
        Nan::ThrowError("filters should be passed as an array");
    }
}

void ParseRecordQSize( int* q_size, Local<Value> qSize, LogInfo* log)
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
        Nan::ThrowError("Queue size must be an integer");
    }
}


void ParseUDFArgs(QueryScan* queryScan, Local<Object> udf, LogInfo* log, bool isQuery)
{
    Nan::HandleScope scope;
    // Parse the UDF info from jsobject and populate the query object with it.
    char module[255];
    char func[255];

    char* filename = module;
    char* funcname = func;
    as_arraylist * arglist= NULL;
    int ret = udfargs_from_jsobject(&filename, &funcname, &arglist, udf, log);

    if(ret) {
        as_v8_error(log, " Parsing udfArgs for query object failed");
        Nan::ThrowError("Error in parsing the UDF parameters");
    }

    if( isQuery) {
        as_query_apply( queryScan->query, filename, funcname, (as_list*) arglist);
    }
    else {
        as_scan_apply_each(queryScan->scan, filename, funcname, (as_list*) arglist);
    }
}


void ParseScanPriority(as_scan* scan, Local<Value> obj, LogInfo* log)
{
    //Nan::HandleScope scope;
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
        Nan::ThrowError("Scan priority must be of type aerospike.scanPriority");
    }
}

void ParseScanPercent(as_scan* scan, Local<Value> obj, LogInfo* log)
{
    Nan::HandleScope scope;
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
        Nan::ThrowError("Scan percentage is not an integer - expected integer value");
    }
}

void ParseScanNobins( as_scan* scan, Local<Value> obj, LogInfo* log)
{
    Nan::HandleScope scope;
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
        Nan::ThrowError("setNobins must be a boolean value");
    }
}

void ParseScanConcurrent(as_scan* scan, Local<Value> obj, LogInfo* log)
{
    Nan::HandleScope scope;
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
        Nan::ThrowError("setConcurrent must be a boolean value");
    }
}

void AerospikeQuery::SetQueryType( Local<Value> configVal)
{
    Nan::HandleScope scope;
    // Scan can be invoked with no config option, in which case
    // the default parameters for scan operation will be used.
    if(configVal->IsNull()) {
        this->type = SCAN;
        return;
    }

    Local<Object> config = configVal->ToObject();
    // If config is passed, a combination of UDF, Aggregation and Where
    // parameters determine the type of query/scan operation.

    if( config->Has(Nan::New("filters").ToLocalChecked())) {
        this->isQuery_ = true;
    }
    if( config->Has(Nan::New("aggregationUDF").ToLocalChecked())) {
        this->hasAggregation_  = true;
    }
    if( config->Has(Nan::New("UDF").ToLocalChecked())) {
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
    Nan::HandleScope scope;
    LogInfo* log        = query->log;

    if( config->Has(Nan::New("filters").ToLocalChecked())) {
        Local<Object> filters = config->Get(Nan::New("filters").ToLocalChecked())->ToObject();
        ParseWhereClause( query->query_scan.query, filters, log);
    }

    if( config->Has(Nan::New("select").ToLocalChecked())) {
        Local<Object> select = config->Get(Nan::New("select").ToLocalChecked())->ToObject();
        ParseSelectBins( query, select);
    }

    if( config->Has(Nan::New("recordQSize").ToLocalChecked())) {
        ParseRecordQSize(&query->q_size, config->Get(Nan::New("recordQSize").ToLocalChecked()), log);
    }

    if( config->Has(Nan::New("aggregationUDF").ToLocalChecked())) {
        Local<Object> agg = config->Get(Nan::New("aggregationUDF").ToLocalChecked())->ToObject();
        ParseUDFArgs( &query->query_scan, agg, query->log, true);
    }

    if( config->Has(Nan::New("UDF").ToLocalChecked())) {
        Local<Object> udf = config->Get(Nan::New("UDF").ToLocalChecked())->ToObject();
        if(query->type == QUERYUDF) {
            ParseUDFArgs( &query->query_scan, udf, query->log, true);
        }
        else if (query->type == SCANUDF) {
            ParseUDFArgs( &query->query_scan, udf, query->log, false);
        }
    }

    if( query->type == SCAN || query->type == SCANUDF) {
        as_scan* scan = query->query_scan.scan;
        if(config->Has(Nan::New("priority").ToLocalChecked())) {
            ParseScanPriority(scan, config->Get(Nan::New("priority").ToLocalChecked()), log);
        }
        if(config->Has(Nan::New("percent").ToLocalChecked())) {
            ParseScanPercent(scan, config->Get(Nan::New("percent").ToLocalChecked()), log);
        }
        if(config->Has(Nan::New("nobins").ToLocalChecked())) {
            ParseScanNobins(scan, config->Get(Nan::New("nobins").ToLocalChecked()), log);
        }
        if(config->Has(Nan::New("concurrent").ToLocalChecked())) {
            ParseScanConcurrent(scan, config->Get(Nan::New("concurrent").ToLocalChecked()), log);
        }
    }
}

NAN_GETTER(AerospikeQuery::GetIsQuery)
{
    Nan::HandleScope scope;
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(info.Holder());
    Local<Boolean> value     = Nan::New<Boolean>(queryObj->isQuery_);
    info.GetReturnValue().Set(value);
}

NAN_SETTER(AerospikeQuery::SetIsQuery)
{
    Nan::HandleScope scope;
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(info.Holder());
    queryObj->isQuery_       = value->ToBoolean()->Value();
}

NAN_GETTER(AerospikeQuery::GetHasUDF)
{
    Nan::HandleScope scope;
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(info.Holder());
    Local<Boolean> value     = Nan::New<Boolean>(queryObj->hasUDF_);
    info.GetReturnValue().Set(value);
}

NAN_SETTER(AerospikeQuery::SetHasUDF)
{
    Nan::HandleScope scope;
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(info.Holder());
    queryObj->hasUDF_        = value->ToBoolean()->Value();
}

NAN_GETTER(AerospikeQuery::GetHasAggregation)
{
    Nan::HandleScope scope;
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(info.Holder());
    Local<Boolean> value     = Nan::New<Boolean>(queryObj->hasAggregation_);
    info.GetReturnValue().Set(value);
}

NAN_SETTER(AerospikeQuery::SetHasAggregation)
{
    Nan::HandleScope scope;
    AerospikeQuery* queryObj = ObjectWrap::Unwrap<AerospikeQuery>(info.Holder());
    queryObj->hasAggregation_= value->ToBoolean()->Value();
}

NAN_METHOD(AerospikeQuery::New)
{
    Nan::HandleScope scope;

    AerospikeClient* client =  ObjectWrap::Unwrap<AerospikeClient>(info[3]->ToObject());
    // Create a new V8 query object, which in turn contains
    // the as_query ( C structure)
    // Initialize the as_query with namespace and set which
    // are constructor arguments.
    AerospikeQuery* query   = new AerospikeQuery();

    query->q_size           =  0;
    query->as               =  client->as;
    LogInfo* log            =  query->log        =  client->log;


    as_namespace ns  = {'\0'};
    as_set       set = {'\0'};

    if ( !info[0]->IsString()) {
        as_v8_error(log, "namespace to be queried should be string");
        Nan::ThrowError("Namespace to be queried is not a string - expected a string value");
    }
    else {
        strncpy(ns, *String::Utf8Value(info[0]), AS_NAMESPACE_MAX_SIZE);
        as_v8_debug(log, "namespace to query %s", ns);
    }
    // set is an optional parameter. So the constructor should either have NULL for set or a string.
    if( !info[1]->IsNull() && !info[1]->IsString()) {
        as_v8_error(log, "set to be queried should be string");
        Nan::ThrowError("Set to be queried is not a string");
    }
    else {
        strncpy(set, *String::Utf8Value(info[1]), AS_SET_MAX_SIZE);
        as_v8_debug(log, "set to query %s", set);
    }

    // Decide if the Constructor is invoked for Scan or Query operation.
    // If the ConfigObject(passed as a parameter during query/scan construction)
    // has a where clause, it is a query operation otherwise it's a scan operation.

    Local<Value> config= info[2];
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

    query->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
}

Local<Value> AerospikeQuery::NewInstance( Local<Object> ns, Local<Object> set, Local<Object> config, Local<Object> client)
{
    Nan::EscapableHandleScope scope;

    const unsigned argc = 4;

    // Invoke the query constructor method with namespace, set, query configration options and client object .
    Local<Value> argv[argc] = { ns, set, config, client};

    Local<FunctionTemplate> constructorHandle = Nan::New<FunctionTemplate>(constructor);

    Local<Object> instance   = constructorHandle->GetFunction()->NewInstance( argc, argv);

    return scope.Escape(instance);
}

/*
 *  Initialize a query object.
 *  This creates a constructor function, and sets up the prototype.
 */
void AerospikeQuery::Init()
{
    // Prepare constructor template
    Local<FunctionTemplate> cons = Nan::New<FunctionTemplate>(AerospikeQuery::New);
    cons->SetClassName(Nan::New("AerospikeQuery").ToLocalChecked());

    // When AerospikeQuery is initialized from node.js an internal reference is created to
    // a wrapped AerospikeQuery object. It should create a single reference to this query object
    // as constructor initializes only one wrapped object.
    cons->InstanceTemplate()->SetInternalFieldCount(1);

    // Prototype
    Nan::SetPrototypeMethod(cons, "foreach", AerospikeQuery::foreach);
    Nan::SetPrototypeMethod(cons, "queryInfo", AerospikeQuery::queryInfo);
    Nan::SetAccessor(cons->InstanceTemplate(), Nan::New("isQuery").ToLocalChecked(), GetIsQuery, SetIsQuery);
    Nan::SetAccessor(cons->InstanceTemplate(), Nan::New("hasUDF").ToLocalChecked(), GetHasUDF, SetHasUDF);
    Nan::SetAccessor(cons->InstanceTemplate(), Nan::New("hasAggregation").ToLocalChecked(), GetHasAggregation, SetHasAggregation);

    constructor.Reset(cons);
}
