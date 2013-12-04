var fs = require('fs');
eval(fs.readFileSync('test.js')+'');

var params = new Object;

ParseConfig(params);


function GetReadPolicy()
{
	var readpolicy = { timeout : 10, Key :Policy.Key.SEND }
	return readpolicy;
}

describe( 'GET FUNCTIONALITY', function() {
	it( 'SIMPLE GET TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: params.ns, set: params.set,key: 'GET' + i }
		client.put (Key, rec.bins, rec.metadata, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) { 
			client.get(key, function ( err, bins, meta, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				var ind = key.key.substr(3);
				expect(bins.string_bin).to.equal(ind);
				expect(bins.integer_bin).to.equal(parseInt(ind));
				var obj = msgpack.unpack(bins.blob_bin);
				expect(obj.integer).to.equal(parseInt(ind));
				expect(obj.string).to.equal('Some String');
				expect(obj.array).to.eql([1,2,3]);
				if ( ++m == n) {
					m = 0;
					console.log("GET TEST SUCCESS");
					CleanRecords('GET');
				}
			});
			}
		});
	}
	});
});

describe( 'GET FUNCTIONALITY', function() {
	it( 'GET TEST WITH READ POLICY', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: params.ns, set: params.set, key: 'READPOLICY' + i }
		client.put (Key, rec.bins, rec.metadata, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) { 
				var readpolicy = new GetReadPolicy();
			client.get(key, readpolicy, function ( err, bins, meta, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				var ind = key.key.substr(10);
				expect(bins.string_bin).to.equal(ind);
				expect(bins.integer_bin).to.equal(parseInt(ind));
				var obj = msgpack.unpack(bins.blob_bin);
				expect(obj.integer).to.equal(parseInt(ind));
				expect(obj.string).to.equal('Some String');
				expect(obj.array).to.eql([1,2,3]);
				if ( ++m == n) {
					console.log("GET TEST WITH READ POLICY SUCCESS");
					CleanRecords('READPOLICY');
				}
			});
			}
		});
	}
	});
});
