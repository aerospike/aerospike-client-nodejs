var fs = require('fs');
eval(fs.readFileSync('test.js')+'');



function GetWritePolicyDefault()
{
	var writepolicy = { timeout : 10,
						Gen : Policy.Generation.IGNORE,
						Retry: Policy.Retry.ONCE, 
						Key: Policy.Key.SEND, 
						Exists: Policy.Exists.IGNORE};
	return writepolicy;
	
}

describe ( 'PUT FUNCTIONALITY', function() {
	it( 'SIMPLE PUT TEST', function() {
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : 'test', set : 'demo', key : 'PUT' + i }
			var rec = new GetRecord(i);
			client.put(Key, rec,function(err) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				if ( ++m == n) {
					console.log("SIMPLE PUT TEST SUCCESS");
					m = 0;
					CleanRecords('PUT');
				}
			});
		}
	});
});

//Expected to pass
describe('WRITE POLICY TEST', function() {
	it(' GENERATION EQUALITY -- SHOULD SUCCEED', function() {
		var recGen = 0;
		for ( var i = 1; i <= n; i++) {
			var K = { ns:'test', set: 'demo', key:'GEN_SUCCESS' + i };
			var rec = new GetRecord(i);
			client.put(K, rec,function(err, meta, key) {
			client.get(key, function (err, bins, meta, key) {
				if ( err.code == return_code.AEROSPIKE_OK) {
					recGen = meta.gen ;
				}
				var writepolicy = new GetWritePolicyDefault();
				var rec = new GetRecord(i);
				rec.gen = recGen;
				client.put( key, rec, writepolicy, function (err, meta, key) {
					expect(err).to.exist;
					expect(err.code).to.equal(return_code.AEROSPIKE_OK);
					if( ++m == n) {
						m = 0;
						console.log("GENERATION EQUALITY SUCCESS");
						CleanRecords('GEN_SUCCESS');
					}
				});
			});

			});
		}
	});
});

//Expected to fail
describe('WRITE POLICY TEST', function() {
	it(' GENERATION EQUALITY -- NEGATIVE', function() {
		var recGen = 0;
		for ( var i = 1; i <= n; i++) {
			var K = { ns:'test', set: 'demo', key:'GEN_FAILURE' + i };
			var rec = new GetRecord(i);
			client.put(K, rec,function(err, meta, key) {
			client.get(key, function (err, bins, meta, key) {
				if ( err.code == return_code.AEROSPIKE_OK) {
					recGen = meta.gen ;
				}
				var writepolicy = new GetWritePolicyDefault();
				writepolicy.Gen = Policy.Generation.EQ;
				var rec = new GetRecord(i);
				rec.gen = recGen+10;
				client.put( key, rec, writepolicy, function (err, meta, key) {
					expect(err).to.exist;
					expect(err.code).to.equal(return_code.AEROSPIKE_ERR_RECORD_GENERATION);
					if( ++m == n) {
						m = 0;
						console.log("GENERATION EQUALITY NEGATIVE PUT SUCCESS");
						CleanRecords('GEN_FAILURE');
					}
				});
			});

			});
		}
	});
});

// better way to test timeout error
describe('WRITE POLICY TEST', function() {
	it ('WRITE POLICY TEST -- TEST FOR TIMEOUT ERROR ', function() {
		m = 0;
		n = 10000;
		for ( var i = 1; i <= n; i++) {
			var K = { ns: 'test', set : 'demo', key : 'TIMEOUT' + i };
			var writepolicy = { timeout : 1 }
			var obj = { a : 1, b: "Some String", c: [1,2,3] };
			var packed_obj = msgpack.pack(obj);
			var binlist = {s : i.toString(), i : i, b : packed_obj };
			var rec = { ttl : 100, gen : 1, bins : binlist };
			client.put( K, rec, writepolicy, function (err) {
				expect(err).to.exist;
				if ( err.code > 0 ) {
					expect(err.code).to.equal(return_code.AEROSPIKE_ERR_TIMEOUT);
				}
				if ( ++m == n ) {	
					console.log("TIMEOUT ERROR TEST SUCCESS");
					CleanRecords("TIMEOUT");
					n = 1000;
					m = 0;
				}
			});
		}
	});
});


//Expected to pass
describe('WRITE POLICY TEST', function() {
	it(' EXISTS POLICY  CREATE-- SHOULD SUCCEED', function() {
		for ( var i = 1; i <= n; i++) {
			var K = { ns:'test', set: 'demo', key:'EXIST_SUCCESS' + i };
			var rec = new GetRecord(i);
			var writepolicy = new GetWritePolicyDefault();
			writepolicy.Exists = Policy.Exists.CREATE;
			client.put(K, rec, writepolicy, function(err, meta, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				if( ++m == n) {
					m = 0;
					console.log("EXISTS POLICY BASED PUT SUCCESS");
					CleanRecords('EXIST_SUCCESS');
				}
			});
		}
	});
});

//Expected to fail

describe('WRITE POLICY TEST', function() {
	it(' EXISTS POLICY  CREATE -- NEGATIVE TEST', function() {
		for ( var i = 1; i <= n; i++) {
			var K = { ns:'test', set: 'demo', key:'EXIST_FAIL' + i };
			var rec = new GetRecord(i);
			var writepolicy = new GetWritePolicyDefault();
			writepolicy.Exists = Policy.Exists.CREATE;
			client.put(K, rec, writepolicy, function(err, meta, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				client.put(K, rec, writepolicy, function(err, meta, key) {
					expect(err).to.exist;
					expect(err.code).to.equal(return_code.AEROSPIKE_ERR_RECORD_EXISTS);
					if( ++m == n) {
						m = 0;
						console.log("EXISTS POLICY CREATE NEGATIVE  -- SUCCESS");
						CleanRecords('EXIST_FAIL');
					}
				});
			});
		}
	});
});


