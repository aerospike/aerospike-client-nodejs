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

  if ( options && options.applyEach ) {
    scanObj.applyEach(options.applyEach);
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

  var scanObj = this.createScan(ns, set);
  scanObj.foreach(onRecord, onError, onEnd);

  return rs;
};

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
};

aerospike.client = function(config) {
  var client = as.client(config);
  var proto = Object.getPrototypeOf(client);
  
  if ( !proto.createScan ) {
    proto.createScan = proto.scan;
    proto.scan = scan;
  }
  
  return client;
};

module.exports = aerospike;