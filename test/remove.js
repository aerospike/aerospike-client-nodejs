var fs = require('fs');
eval(fs.readFileSync('test.js')+'');

var params = new Object;

ParseConfig(params);

function GetRemovePolicy()
{
	var removepolicy = { timeout : 10, 
						 gen : 1,
						 Key :Policy.Key.SEND,
						 Retru: Policy.Retry.ONCE };
	return removepolicy;
}

describe( 'REMOVE FUNCTIONALITY', function() {
	it( 'SIMPLE REMOVE TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: params.ns, set: params.set, key: 'REMOVE' + i }
		client.put (Key, rec, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) { 
			client.remove(key, function ( err, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				client.get( key, function ( err, rec, meta) {
					expect(err).to.exist;
					expect(err.code).to.equal(return_code.AEROSPIKE_ERR_RECORD_NOT_FOUND);
				});
				if ( ++m == n) {
					m = 0;
					console.log("REMOVE TEST SUCCESS");
				}
			});
			}
		});
	}
	});
});

describe( 'REMOVE FUNCTIONALITY', function() {
	it( 'REMOVE TEST WITH REMOVE POLICY', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: params.ns, set: params.set, key: 'REMOVEPOLICY' + i }
		client.put (Key, rec, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) { 
				var removepolicy = new GetRemovePolicy();
			client.remove(key, removepolicy, function ( err, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				client.get( key, function (err) {
					expect(err).to.exist;
					expect(err.code).to.equal(return_code.AEROSPIKE_ERR_RECORD_NOT_FOUND);
				});
				if ( ++m == n) {
					console.log("REMOVE TEST WITH REMOVE POLICY SUCCESS");
				}
			});
			}
		});
	}
	});
});
