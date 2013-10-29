var fs = require('fs');
eval(fs.readFileSync('test.js')+'');
var n = 12;

describe ( 'GET PUT FUNCTIONALITY', function() {
	it( 'SIMPLE PUT TEST', function() {
		console.log('SIMPLE PUT TEST');
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : 'test', set : 'demo', key : 'value' + i }
			var obj = { 'a' : 1, 'b' : "Some String" , 'c' : [1,2,3] };
			var packed_obj = msgpack.pack(obj);
			var binlist = { 's' : i.toString(), 'i': i, 'b' : packed_obj };
			var rec = { ttl:100, gen : 0, bins : binlist };
			client.put(Key, rec,function(err) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
			});
		}
	});
});

//Expected to pass
describe('WRITE POLICY TEST', function() {
	it(' WRITE POLICY TEST -- GENERATION BASED WRITE', function() {
		var recGen = 0;
		//for ( var i = 1; i <= n; i++) {
			var K = { ns:'test', set: 'demo', key:'value' + 1 };
			client.get(K, function (err, bins, meta) {
				if ( err.code == return_code.AEROSPIKE_OK) {
					recGen = meta.gen ;
				}
				var writepolicy = { timeout : 10,
									Gen : policy.GenerationPolicy.AS_POLICY_GEN_EQ,
									Retry: policy.RetryPolicy.AS_POLICY_RETRY_ONCE, 
									Key: policy.KeyPolicy.AS_POLICY_KEY_SEND, 
									Exists: policy.ExistsPolicy.AS_POLICY_EXISTS_IGNORE};
				var obj = { 'a' : 1, 'b' : "Some String" , 'c' : [1,2,3] };
				var packed_obj = msgpack.pack(obj);
				var binlist = { 's' : '1' + 'GENUPDATED', 'i': 1, 'b' : packed_obj };
				var rec = { ttl : 100, gen: recGen, bins: binlist };
				client.put( K, rec, writepolicy, function (err) {
					expect(err).to.exist;
					expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				});
			});
		//}
	});
});

//Expected to fail
describe('WRITE POLICY TEST', function() {
	it(' WRITE POLICY TEST -- GENERATION BASED WRITE', function() {
		var recGen = 0;
		var K = {ns: 'test', set : 'demo', key : 'value' + 1 };
		client.get(K, function ( err, bins, meta) {
			if( err.code == return_code.AEROSPIKE_OK) {
				recGen = meta.gen + 10;
			}
			var timeout = 5;
			var Gen = 5;
			var writepolicy = { timeout : 10,
								Gen: policy.GenerationPolicy.AS_POLICY_GEN_EQ };
			var obj = { 'a' : 1, 'b' : "Some String" , 'c' : [1,2,3] };
			var packed_obj = msgpack.pack(obj);
			console.log(writepolicy);
			var binlist = { s : '1' + 'GENUPDATED', i: 1, b : packed_obj };
			var rec = { ttl : 100, gen: recGen, bins: binlist };
			client.put( K, rec, writepolicy, function (err) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_ERR_RECORD_GENERATION);
			});
		});
	});
});

describe('WRITE POLICY TEST', function() {
	it ('WRITE POLICY TEST -- TEST FOR TIMEOUT ERROR ', function() {
		for ( var i = 1; i <= 10000; i++) {
			var K = { ns: 'test', set : 'demo', key : 'value' + i };
			var writepolicy = { timeout : 1 }
			var obj = { a : 1, b: "Some String", c: [1,2,3] };
			var packed_obj = msgpack.pack(obj);
			var binlist = {s : i.toString(), i : i, b : packed_obj };
			var rec = { ttl : 100, gen : 1, bins : binlist };
			client.put( K, rec, writepolicy, function (err) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_ERR_TIMEOUT);
			});
		}
	});
});





