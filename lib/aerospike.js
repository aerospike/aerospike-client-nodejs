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

execute = function() {

	var rs = new RecordStream();

    var self = this;

	var onRecord = function(record, meta, key) {
		rs.emit('data', {'bins': record, 'meta': meta, 'key': key});
	};

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

	if(self.isQuery && !self.hasUDF) // query 
	{
		self.foreach(onRecord, onError, onEnd);
	}
	else if( self.isQuery && self.hasUDF) // query aggregation
	{
		self.foreach(onResult, onError, onEnd);
	}
	else if( !self.isQuery && self.hasUDF) // scan background
	{
		self.foreach(null, onError, onEnd);
	}
	else //scan foreground
	{
		self.foreach(onRecord, onError, onEnd);
	}	

	return rs;

}


Info = function(scanId, callback) {
	var self = this;
	self.queryInfo(scanId, callback);
}

query = function(ns, set, options) {


  var queryObj = this.createQuery(ns, set);

  queryObj.isQuery = false;
  queryObj.hasUDF = false;

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
	queryObj.hasUDF = true;
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
