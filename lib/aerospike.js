var as = require('../build/Release/aerospike.node')
var LargeList = require('./llist.js');
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

  // @TO-DO options can be passed to V8 directly and parsed 
  // inside query.cc file.
  // It's not neat to invoke a V8 function to set each property 
  // of query.
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
		  queryObj.setQueryType(as.queryType.SCANUDF);
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

parseOperateArgs = function(args)
{
	var arglength = args.length;
	
	var options   = {}
	options.callback = args[arglength-1];

	if( arglength == 3)
	{
		options.policy = undefined;
		options.metadata = undefined;
	}
	else if( arglength == 4)
	{
		options.metadata = args[arglength-2];
		options.policy = undefined;
	}

	else if( arglength == 5)
	{
		options.policy = args[arglength-2];
		options.metadata = args[arglength-3];
	}
		
	return options;
}

add = function(key, bins, metadata, policy, callback)
{
	var options = parseOperateArgs(arguments);

	// populate ops from bins argument here
	var ops= new Array;

	for( var prop in bins) {
		ops.push(aerospike.operator.incr(prop, bins[prop]));
	}
	this.operate(key, ops, options.metadata, options.policy, options.callback);

}

append = function(key, bins, metadata, policy, callback)
{
	var options = parseOperateArgs(arguments);

	// populate ops from bins argument here
	var ops= new Array;

	for( var prop in bins) {
		ops.push(aerospike.operator.append(prop, bins[prop]));
	}
	this.operate(key, ops, options.metadata, options.policy, options.callback);
}

prepend = function(key, bins, metadata, policy, callback)
{
	var options = parseOperateArgs(arguments);


	// populate ops from bins argument here
	var ops= new Array;

	for( var prop in bins) {
		ops.push(aerospike.operator.prepend(prop, bins[prop]));
	}

	this.operate(key, ops, options.metadata, options.policy, options.callback);
}
/******************************************************************************
 * `aerospike` shim
 *****************************************************************************/

var aerospike = {
  // client:   as.client,
  key:      as.key,
  status:   as.status,
  policy:   as.policy,
  operations: as.operations,
  language: as.language,
  log:      as.log,
  scanPriority: as.scanPriority,
  predicates  :	as.predicates,
  indexType : as.indexType,
  scanStatus: as.scanStatus
};

aerospike.client = function(config) {
  var client = as.client(config);
  if( client === null)
  {
	  console.error("Error in client object creation");
	  return client;
  }
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

  if( !proto.LargeList) {
	  proto.LargeList = LargeList;
  }

  if( !proto.add) {
	  proto.add = add;
  }

  if( !proto.append) {
	  proto.append = append;
  }

  if( !proto.prepend) {
	  proto.prepend = prepend;
  }

  return client;
};

var populate_op =  function(op, bin, value)
{
	var obj = {};
	obj.operation = op;
	obj.bin = bin;
	obj.value = value;
	return obj;
}

var read_op = function(args)
{
	return populate_op(as.operations.READ, arguments[0]);
}

var write_op = function(args)
{
	return populate_op(as.operations.WRITE, arguments[0], arguments[1]);
}

var incr_op = function(args)
{
	return populate_op(as.operations.INCR, arguments[0], arguments[1]);
}

var append_op = function(args)
{
	return populate_op(as.operations.APPEND, arguments[0], arguments[1]);
}

var prepend_op = function(args)
{
	return populate_op(as.operations.PREPEND, arguments[0], arguments[1]);
}

var touch_op  = function(args)
{
	var obj = {};
	obj.operation = as.operations.TOUCH;
	obj.ttl = arguments[0];
	return obj;
}

aerospike.operator = {
	read : read_op,
	write: write_op,
	incr: incr_op,
	append: append_op,
	prepend: prepend_op,
	touch: touch_op
}

var equal_filter = function(args) {
	var obj = {};
	obj.predicate = as.predicates.EQUAL;
	if(typeof(arguments[1]) == "number")
	{
		obj.type = as.indexType.NUMERIC;
	}
	else if(typeof(arguments[1]) == "string")
	{
		obj.type = as.indexType.STRING;
	}
	obj.bin = arguments[0];
	obj.val = arguments[1];
	return obj;
}

var range_filter = function(args) {
	var obj = {};
	obj.predicate = as.predicates.RANGE;
	obj.type = as.indexType.NUMERIC;
	obj.bin = arguments[0];
	obj.min = arguments[1];
	obj.max = arguments[2];
	return obj;
}

aerospike.filter = {
	equal: equal_filter,
	range: range_filter
}

module.exports = aerospike;
