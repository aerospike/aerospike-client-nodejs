
var fs = require('fs');
eval(fs.readFileSync('test.js')+'');

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
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: 'test', set: 'demo',key: 'REMOVE' + i }
		client.put (Key, rec, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) { 
			client.remove(key, function ( err, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
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
	it( 'REMOVE TEST WITH READ POLICY', function() {
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: 'test', set: 'demo',key: 'REMOVEPOLICY' + i }
		client.put (Key, rec, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) { 
				var removepolicy = new GetRemovePolicy();
			client.remove(key, removepolicy, function ( err, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				if ( ++m == n) {
					console.log("REMOVE TEST WITH REMOVE POLICY SUCCESS");
				}
			});
			}
		});
	}
	});
});
