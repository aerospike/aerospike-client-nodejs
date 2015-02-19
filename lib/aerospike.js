var as = require('../build/Release/aerospike.node')
var stream = require('stream');
var inherits = require('util').inherits;

/******************************************************************************
 * RecordStream - used for Scan and Query operations
 *****************************************************************************/

function RecordStream() {}

inherits(RecordStream, stream);

RecordStream.prototype.writable = false;
RecordStream.prototype.readable = true;
RecordStream.prototype._read = function(){};

/******************************************************************************
 * Streaming Scan Operation
 *****************************************************************************/


// wrapper function around query_foreach function.
// This wrapper receives results from V8 layer and emits 'data' event
// to node.js layer.
// On error, emits 'error' event. 
// When all the results are consumed it emits 'end' event.
execute = function() {

	var rs = new RecordStream();

    var self = this;


	var onResult = function( res, key) {
		rs.emit('data', res);
	}

	var onError = function(error) {
		rs.emit('error', error);
	};

	var onEnd = function(end) {
		if( !self.isQuery && self.hasUDF ) {
			self.scanId = end;
			rs.emit('end', end);
		}
		else
		{
			rs.emit('end');
		}
	};

	if(self.isQuery) // it is a query request.
	{
		if(self.hasUDF)
		{
			// query UDF is not supported currently.
			return null; 
		}
		else
		{
			// normal query and query aggregation is invoked here.
			self.foreach(onResult, onError, onEnd);
		}
	
	}
	else // it is a scan request
	{
		if(self.hasUDF) // scan with a UDF - so background scan.
		{
			// background scan does not return records. So callback for record is NULL.
			self.foreach(null, onError, onEnd);
		}
		else // it is a foreground scan or scan aggregation.
		{
			self.foreach(onResult, onError, onEnd);
		}

	}
	return rs;

}


Info = function(scanId, callback) {
	var self = this;
	self.queryInfo(scanId, callback);
}

query = function(ns, set, options) {


  if(typeof(set) != "string")
  {
	  set = '';
  }
  var queryObj = this.createQuery(ns, set);

  queryObj.isQuery = false; // true implies it is query instance.
							// false implies it is an instance of scan.
  queryObj.hasUDF = false;
  queryObj.hasAggregation = false;

  if( options && options.select) {
	  queryObj.select(options.select);
  }

  if( options && options.filters) {
	  queryObj.where(options.filters)
	  queryObj.isQuery = true;
  }

  if(options && 'recordQsize' in options) {
	  queryObj.setRecordQsize(options.recordQsize)
  }

  if ( options && 'aggregationUDF' in options) {
    queryObj.apply(options.aggregationUDF);
	queryObj.hasAggregation = true;
  }

  if ( options && 'UDF' in options) {
    queryObj.apply(options.UDF);
	queryObj.hasUDF = true;
  }

  if ( options && 'priority' in options) {
	  queryObj.setPriority(options.priority);
  }

  if( options && 'percent' in options) {
	  queryObj.setPercent(options.percent);
  }

  if( options && 'nobins' in options) {
	  queryObj.setNobins(options.nobins);
  }

  if(options && 'concurrent' in options) {
	  queryObj.setConcurrent(options.concurrent);
  }

  if(queryObj.isQuery)
  { // it is a query instance.
	  if(queryObj.hasUDF)
	  {
		  // query and has a UDF, implies query UDF - this is currently not supported.
		  queryObj.setQueryType(as.queryType.QUERYUDF);
	  }
	  else if(queryObj.hasAggregation)
	  {
		  // query and has aggregationUDF, this is query Aggregation
		  queryObj.setQueryType(as.queryType.QUERYAGGREGATION);
	  }
	  else
	  {
		  // query and does not have UDF or aggregationUDF.
		  // It is a normal query.
		  queryObj.setQueryType(as.queryType.QUERY);
	  }
  }
  else
  {
	  if(queryObj.hasUDF)
	  {
		  query.setQueryType(as.queryType.SCANUDF);
	  }
	  else if(queryObj.hasAggregation)
	  {
		  queryObj.setQueryType(as.queryType.SCANAGGREGATION);
	  }
	  else
	  {
		  queryObj.setQueryType(as.queryType.SCAN);
	  }
  }

  var queryProto = Object.getPrototypeOf(queryObj);

  if( !queryProto.execute) 
  {
	  queryProto.execute = execute;
  }

  if( !queryProto.Info)
  {
	  queryProto.Info = Info;
  }

  return queryObj;
}

createIntegerIndex = function(options, callback ){
	var policy = undefined;
	var set = undefined;
	if(options && options.policy){
		policy = options.policy;
	}
	if(options && options.set) {
		set = options.set;
	}
	this.indexCreate(options.ns, set, options.bin, options.index, as.indexType.NUMERIC, policy, callback) 
}

createStringIndex = function(options, callback ){
	var policy = undefined;
	var set = undefined;
	if(options && options.policy){
		policy = options.policy;
	}
	if(options && options.set) {
		set = options.set;
	}
	this.indexCreate(options.ns, set, options.bin, options.index, as.indexType.STRING, policy, callback) 

}
/******************************************************************************
 * `aerospike` shim
 *****************************************************************************/

var aerospike = {
  // client:   as.client,
  key:      as.key,
  status:   as.status,
  policy:   as.policy,
  operator: as.operator,
  language: as.language,
  log:      as.log,
  scanPriority: as.scanPriority,
  filter:	as.filter,
  indexType : as.indexType,
  scanStatus: as.scanStatus
};

aerospike.client = function(config) {
  var client = as.client(config);
  var proto = Object.getPrototypeOf(client);

  if( !proto.createQuery ) {
	  proto.createQuery = proto.query;
	  proto.query = query;
  }
	
  if( !proto.createIntegerIndex ) {
	  proto.createIntegerIndex = createIntegerIndex;
  }

  if( !proto.createStringIndex ) {
	  proto.createStringIndex = createStringIndex;
  }
  return client;
};


module.exports = aerospike;
