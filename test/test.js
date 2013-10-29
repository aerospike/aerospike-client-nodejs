var assert = require('assert');
var request = require('superagent');
var expect = require('expect.js');
var aerospike = require('aerospike');
var msgpack = require('msgpack');
var client;
var return_code = aerospike.Status;
var policy = aerospike.Policy;
before(function () {
	var config = { 
		hosts:[{ addr:"127.0.0.1",port : 3000 }
		]}  
	client = aerospike.connect(config);
	var n = 12;
	var m = 0
	console.log(n);
});

/*describe.skip ( 'GET PUT FUNCTIONALITY', function() {
	it( 'SIMPLE PUT TEST', function() {
		console.log('SIMPLE PUT TEST');
		//for ( var i = 1; i <= n; i++) {
			var Key = { ns : 'test', set : 'demo', key : 'value' + i }
			var obj = { 'a' : 1, 'b' : "Some String" , 'c' : [1,2,3] };
			var packed_obj = msgpack.pack(obj);
			var binlist = { 's' : i.toString(), 'i': i, 'b' : packed_obj };
			var rec = { ttl:100, gen : 0, bins : binlist };
			client.put(Key, rec,function(err) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
			})

		//}
	});
});

describe.skip( 'GET FUNCTIONALITY', function() {
	it( 'SIMPLE GET TEST', function() {
		console.log('SIMPLE GET TEST');
		for ( var j = 1; j <= n; j++) {
			var Key = { ns: 'test', set: 'demo',key: 'value' + j }
			client.get(Key, function ( err, bins, meta, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				var ind = key.key.substr(5);
				expect(bins.s).to.equal(ind);
				expect(bins.i).to.equal(parseInt(ind));
				var obj = msgpack.unpack(bins.b);
				expect(obj.a).to.equal(1);
				expect(obj.b).to.equal('Some String');
				expect(obj.c).to.eql([1,2,3]);
			});
		}
	});
});

describe.skip( 'SELECT FUNCTIONALITY', function() {
	it (' SIMPLE SELECT TEST', function() {
		console.log('SIMPLE SELECT TEST');
		for ( var i = 1; i <= n; i++ ) {
			var K = { ns: 'test', set : 'demo', key: 'value' + i};
			var rec = ["i","s"];
			client.select(K, rec, function (err, bins, meta, key_val) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				expect(key_val).not.to.be.null;
				var ind = key_val.key.substr(5);
				expect(bins.s).to.equal(ind);
				expect(bins.i).to.equal(parseInt(ind));
			});
		}
	 });
});

describe.skip( 'BATCH-GET FUNCTION', function() {
	 it ( 'SIMPLE BATCH-GET TEST' , function() {
		console.log('SIMPLE BATCH-GET TEST');
		for ( var i = 0; i < n/4; i++) {
			var K_array = [ {ns:'test',set:'demo',key:"value" + (i*4 + 1) },
							{ns:'test',set:'demo',key:"value" + (i*4 + 2) },
							{ns:'test',set:'demo',key:"value" + (i*4 + 3) },
							{ns:'test',set:'demo',key:"value" + (i*4 + 4) } ];
			client.batch_get(K_array, function(err, rec_list){
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				expect(rec_list.length).to.equal(4);
				for ( var j = 0; j < rec_list.length; j++) {
					expect(rec_list[j].RecStatus).to.equal(return_code.AEROSPIKE_OK);
					var ind = rec_list[j].Record.key.key.substr(5);
					expect(rec_list[j].Record.bins.s).to.equal(ind);
					expect(rec_list[j].Record.bins.i).to.equal(parseInt(ind));
					var obj = msgpack.unpack(rec_list[j].Record.bins.b);
					expect(obj.a).to.equal(1);
					expect(obj.b).to.equal('Some String');
					expect(obj.c).to.eql([1,2,3]);
				}
			});
		}
	 });
});

describe.skip('WRITE POLICY TEST', function() {
	it(' WRITE POLICY TEST -- GENERATION BASED WRITE', function() {
		console.log('WRITE POLICY TEST -- GENERATION BASED WRITE');
		for ( var i = 1; i <= n; i++) {
			var K = { ns:'test', set: 'demo', key:'value' + i };
			
			var writepolicy = { timeout : 10,
								Gen : policy.GenerationPolicy.AS_POLICY_GEN_EQ };

			var obj = { 'a' : 1, 'b' : "Some String" , 'c' : [1,2,3] };
			var packed_obj = msgpack.pack(obj);
			var binlist = { 's' : i.toString() + 'GENUPDATED', 'i': i, 'b' : packed_obj };
			var rec = { ttl : 0, gen: 1, bins: binlist };  
			client.put( K, rec, writepolicy, function (err) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
			});
		}
	});
});

describe.skip('SIMPLE REMOVE TEST', function() {
	 it ( 'SIMPLE REMOVE TEST', function() {
		console.log('SIMPLE REMOVE TEST');
		for ( var i = 1; i <= n; i++ ) {
			var K = { ns:'test', set: 'demo', key: 'value' + i };
			client.remove(K, function(err, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
			});
		}
		});
});*/
