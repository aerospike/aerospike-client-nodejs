var fs = require('fs');
eval(fs.readFileSync('test.js')+'');
var n = 12;
describe('SIMPLE REMOVE TEST', function() {
	it ( 'SIMPLE REMOVE TEST', function() {
		console.log('SIMPLE REMOVE TEST');
		console.log(n);
		//for ( var i = 1; i <= n; i++ ) { 
			var K = { ns:'test', set: 'demo', key: 'value' + 1 };
			client.remove(K, function(err, key) {
				expect(err).to.exist;
				expect(err.code).to.equal(return_code.AEROSPIKE_OK);
			}); 
		//}   
	}); 
});

