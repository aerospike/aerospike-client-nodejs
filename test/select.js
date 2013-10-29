var fs = require('fs');
eval(fs.readFileSync('test.js')+'');


describe( 'SELECT FUNCTIONALITY', function() {
	it (' SIMPLE SELECT TEST', function() {
		console.log('SIMPLE SELECT TEST');
			//for ( var i = 1; i <= n; i++ ) {
				var K = { ns: 'test', set : 'demo', key: 'value' + 1};
				var rec = ["i","s"];
				client.select(K, rec, function (err, bins, meta, key_val) {
					expect(err).to.exist;
					expect(err.code).to.equal(return_code.AEROSPIKE_OK);
					expect(key_val).not.to.be.null;
					var ind = key_val.key.substr(5);
					expect(bins.s).to.equal(ind);
					expect(bins.i).to.equal(parseInt(ind));
				});
			//}
	});
});

