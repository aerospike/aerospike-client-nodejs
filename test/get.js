
var fs = require('fs');
eval(fs.readFileSync('test.js')+'');


describe( 'GET FUNCTIONALITY', function() {
	it( 'SIMPLE GET TEST', function() {
		console.log('SIMPLE GET TEST');
		//for ( var j = 1; j <= n; j++) {
		var Key = { ns: 'test', set: 'demo',key: 'value' + 1 }
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
		//}
	});
});

