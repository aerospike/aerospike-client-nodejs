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

scan = function(ns, set, options) {

  var rs = new RecordStream();


  var scanObj = this.createScan(ns, set);

  if( options && options.select) {
	  scanObj.select(options.select);
  }

  if ( options && 'priority' in options) {
	  scanObj.setPriority(options.priority);
  }

  if( options && 'percent' in options) {
	  scanObj.setPercent(options.percent);
  }

  if( options && 'nobins' in options) {
	  scanObj.setNobins(options.nobins);
  }

  if(options && 'concurrent' in options) {
	  scanObj.setConcurrent(options.concurrent);
  }

  if(options && 'recordQsize' in options) {
	  scanObj.setRecordQsize(options.recordQsize)
  }

  if ( options && options.udfArgs) {
    scanObj.applyEach(options.udfArgs);
  }

  
  var onRecord = function(record, meta, key) {
    rs.emit('data', {'bins': record, 'meta': meta, 'key': key});
  };

  var onError = function(error) {
    rs.emit('error', error);
  };

  var onEnd = function(end) {
    rs.emit('end');
  };

  scanObj.foreach(onRecord, onError, onEnd);

  return rs;
};

queryData = function() {

	var rs = new RecordStream();

	var onRecord = function(record, meta, key) {
		rs.emit('data', {'bins': record, 'meta': meta, 'key': key});
	};

	var onError = function(error) {
		rs.emit('error', error);
	};

	var onEnd = function(end) {
		rs.emit('end');
	};
	var self = this;

	self.foreach(onRecord, onError, onEnd);

	return rs;

}

queryAggregate = function() {
	
	var rs = new RecordStream();

	var onResult = function(result ) {
		rs.emit('data', result);
	};

	var onError = function(error) {
		rs.emit('error', error);
	};

	var onEnd = function(end) {
		rs.emit('end');
	};
	var self = this;

	self.foreach(onResult, onError, onEnd);

	return rs;
}

query = function(ns, set, options) {

  var queryObj = this.createQuery(ns, set);

  if( options && options.select) {
	  queryObj.select(options.select);
  }

  if( options && options.filters) {
	  queryObj.where(options.filters)
  }

  if(options && 'recordQsize' in options) {
	  queryObj.setRecordQsize(options.recordQsize)
  }

  if ( options && options.udfArgs) {
    queryObj.apply(options.udfArgs);
  }

 
  var queryProto = Object.getPrototypeOf(queryObj);
  if( !queryProto.queryData) 
  {
	  queryProto.queryData = queryData;
  }

  if( !queryProto.aggregate)
  {
	  queryProto.aggregate = queryAggregate;
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
  indexType : as.indexType
};

aerospike.client = function(config) {
  var client = as.client(config);
  var proto = Object.getPrototypeOf(client);
  
  if ( !proto.createScan ) {
    proto.createScan = proto.scan;
    proto.scan = scan;
  }
 
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
