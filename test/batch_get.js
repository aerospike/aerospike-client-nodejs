var fs = require('fs');
eval(fs.readFileSync('test.js')+'');

describe( 'BATCH-GET FUNCTION', function() {
	it ( 'SIMPLE BATCH-GET TEST' , function() {
		console.log('SIMPLE BATCH-GET TEST');
		for ( var i = 0; i < n/4; i++) {
			var K_array = [ {ns:'test',set:'demo',key:"value" +  1 },
							{ns:'test',set:'demo',key:"value" +  2 },
							{ns:'test',set:'demo',key:"value" +  3 },
							{ns:'test',set:'demo',key:"value" +  4 } ];
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

