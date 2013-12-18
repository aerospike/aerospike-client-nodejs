var request = require('superagent');
var expect = require('expect.js');
var aerospike = require('aerospike');
var msgpack = require('msgpack');
var return_code = aerospike.Status;
var Policy = aerospike.Policy;
var Operator = aerospike.Operators;

var test = require('./test')
var client = test.client;
var params = new Object;
var ParseConfig = test.ParseConfig
var GetRecord = test.GetRecord
var CleanRecords = test.CleanRecords
var n = test.n

ParseConfig(params);

function GetSelectPolicy()
{
	var selectpolicy = { timeout : 10, key :Policy.Key.SEND }
	return selectpolicy;
}

describe( 'SELECT FUNCTIONALITY', function() {
	it( 'SIMPLE SELECT TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: params.ns, set: params.set, key: 'SELECT' + i }
		client.put (Key, rec.bins, rec.metadata, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) {
				var bins = ['string_bin', 'integer_bin'];
			client.get(key, bins, function ( err, bins, meta, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				var ind = key.key.substr(6);
				expect(bins.string_bin).to.equal(ind);
				expect(bins.integer_bin).to.equal(parseInt(ind));
				if ( ++m == n) {
					m = 0;
					console.log("SELECT TEST SUCCESS");
					CleanRecords('SELECT');
				}
			});
			}
		});
	}
	});

	it( 'SELECT TEST WITH READ POLICY', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: params.ns, set: params.set, key: 'READPOLICY' + i }
		client.put (Key, rec.bins, rec.metadata, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) { 
				var readpolicy = new GetSelectPolicy();
				var bins = [ 'string_bin', 'integer_bin'];
			client.get(key, readpolicy, function ( err, bins, meta, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				var ind = key.key.substr(10);
				expect(bins.string_bin).to.equal(ind);
				expect(bins.integer_bin).to.equal(parseInt(ind));
				if ( ++m == n) {
					console.log("SELECT TEST WITH READ POLICY SUCCESS");
					CleanRecords('READPOLICY');
				}
			});
			}
		});
	}
	});
});
