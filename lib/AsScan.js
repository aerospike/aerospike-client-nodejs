var aerospike = require('../build/Release/aerospike.node');
var inherits  = require('util').inherits;
var Readable  = require('stream').Readable;
var util = require('util');
var sleep = require('sleep');
module.exports = AsScan;
var counter = 0;
function AsScan(opts) {
	if(!(this instanceof AsScan)) {
		return new AsScan(opts);
	}
	var self = this;
	Readable.call(this, opts);
	this.scan = opts.client_obj.scan(opts.ns, opts.set)
	this.setUDFargs = function(udf_args) {
		this.scan.applyEach(udf_args);
	}
	this.scan.foreach(onRecord, onError, onEnd);
	function onRecord(record) {
		scanStarted = true;
		rec			= JSON.stringify(record, null, ' ');
		if(!self.push(rec)){
			return;
		}
		return;
	}

	function onError(error) {
		err = JSON.stringify(error, null, ' ');
		if(!self.push(err)) {
			return;
		}
		return;
	}

	function onEnd(end_msg) {
		if(!self.push(JSON.stringify(end_msg))) {
				return;
		}
		self.push(null);
		return;
	}

}

inherits(AsScan, Readable);

// Every time some data is read from the stream, _read() is invoked.
// Invoking scan.foreach inside this is a bad idea, because the foreach
// function will be invoked for every record that scan returns.
// So a better design would be, to expose another interface which will invoke scan.foreach and
// push the data to readable stream, or invoke the scan.foreach in the constructor so that
// it starts the scan and pushes the data onto the stream, whenever the constructor is invoked.
AsScan.prototype._read = function() {
}
