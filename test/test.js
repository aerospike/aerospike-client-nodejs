var assert = require('assert');
var request = require('superagent');
var expect = require('expect.js');
var aerospike = require('aerospike');
var msgpack = require('msgpack');
var client;
var return_code = aerospike.Status;

before(function () {
	var config = { 
		hosts:[{ addr:"127.0.0.1",port : 3000 }
		]}  
	client = aerospike.connect(config);
	n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 14000
	m = 0 
});

describe ( 'GET PUT FUNCTIONALITY', function() {
	var n,Key;
	it( 'SIMPLE PUT TEST', function(done) {
		console.log('SIMPLE PUT TEST');
		n = 14000;
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : 'test', set : 'demo', key : 'value' + i }
			var obj = { 'a' : 1, 'b' : "Some String" , 'c' : [1,2,3] };
			var packed_obj = msgpack.pack(obj);
			var binlist = { 's' : i.toString(), 'i': i, 'b' : packed_obj };
			var rec = { ttl:100, gen : 0, bins : binlist };
			client.put(Key, rec,function(err) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
			})

		}
	done();
	});
	it( 'SIMPLE GET TEST', function(done) {
		console.log('SIMPLE GET TEST');
		m = 14000;
		for ( var j = 1; j <= m; j++) {
			var Key = { ns: 'test', set: 'demo',key: 'value' + j }
			client.get(Key, function ( err, bins, meta) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
				expect(bins.s).to.equal(j.toString());
				expect(bins.i).to.equal(j);
				var obj = msgpack.unpack(bins.b);
				expect(obj.a).to.equal(1);
				expect(obj.b).to.equal('Some String');
				expect(obj.c).to.equal([1,2,3]);
			});
		}
	});

});
