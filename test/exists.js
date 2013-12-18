var fs = require('fs');
eval(fs.readFileSync('test.js')+'');

var params = new Object;

ParseConfig(params);


function GetReadPolicy()
{
	var readpolicy = { timeout : 10, key :Policy.Key.SEND }
	return readpolicy;
}

describe( 'EXISTS FUNCTIONALITY', function() {
	it( 'SIMPLE EXISTS TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
		var rec = GetRecord(i);
		var Key = { ns: params.ns, set: params.set,key: 'EXISTS' + i }
		client.put (Key, rec.bins, rec.metadata, function (err, meta, key) {
			if ( err.code == return_code.AEROSPIKE_OK) { 
			client.exists(key, function ( err, meta, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				expect(meta).to.exist;
				expect(meta.gen).to.equal(1);
				expect(meta.ttl).to.be.equal(100);
				if ( ++m == n) {
					m = 0;
					console.log("EXISTS TEST SUCCESS");
					CleanRecords('EXISTS');
				}
			});
			}
		});
	}
	});
});


