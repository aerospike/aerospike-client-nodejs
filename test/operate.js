var fs = require('fs');
eval(fs.readFileSync('test.js')+'');

var params = new Object;
ParseConfig(params);

function GetOperatePolicy()
{
	var operatepolicy = { timeout : 10,
						Gen : Policy.Generation.EQ,
						Retry: Policy.Retry.ONCE, 
						Key: Policy.Key.SEND }
	return operatepolicy;
	
}

describe ( 'OPERATE FUNCTIONALITY', function() {
	it( 'INCR OPERATION  TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : params.ns, set : params.set, key : 'INCR' + i }
			var rec = new GetRecord(i);
			client.put(Key, rec,function(err, meta, key1) {
				if (err.code == return_code.AEROSPIKE_OK){
					var op_list = [{ operation: Operator.INCR, binName:'integer_bin', binValue:10 }]
					var ops = { binOps : op_list };
					client.operate(key1, ops, function( err, rec, meta, key2) {
						expect(err).to.exist;
						expect(err.code).to.equal(return_code.AEROSPIKE_OK);
						client.get(key2, function(err, rec, meta, key3) {
							expect(err).to.exist;
							expect(err.code).to.equal(return_code.AEROSPIKE_OK);
							var num = key3.key.substr(4);
							expect(rec.integer_bin).to.equal(parseInt(num) + 10);
							if ( ++m == n) {
								console.log("INCR OPERATION TEST SUCCESS");
								m = 0;
								CleanRecords('INCR');
							}
						});
					});
				}
			});
		}
	});
});


describe ( 'OPERATE FUNCTIONALITY', function() {
	it( 'PREPEND STRING OPERATION  TEST', function() {
		var  m = 0;
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : params.ns, set : params.set, key : 'PREPENDSTRING' + i }
			var rec = new GetRecord(i);
			client.put(Key, rec,function(err, meta, key1) {
				if (err.code == return_code.AEROSPIKE_OK){
					var op_list = [{ operation: Operator.PREPEND, binName:'string_bin', binValue:'prepend' }]
					var ops = {binOps : op_list };
					client.operate(key1, ops, function( err, rec, meta, key2) {
						expect(err).to.exist;
						expect(err.code).to.equal(return_code.AEROSPIKE_OK);
						client.get(key2, function(err, rec, meta, key3) {
							expect(err).to.exist;
							expect(err.code).to.equal(return_code.AEROSPIKE_OK);
							var num = key3.key.substr(13);
							expect(rec.string_bin).to.equal('prepend'+num);
							if ( ++m == n) {
								console.log("PREPEND STRING OPERATION TEST SUCCESS");
								m = 0;
								CleanRecords('PREPENDSTRING');
							}
						});
					});
				}
			});
		}
	});
});


describe( 'OPERATE FUNCTIONALITY', function() {
	it( 'APPEND STRING OPERATION  TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : params.ns, set : params.set, key : 'APPENDSTRING' + i }
			var rec = new GetRecord(i);
			client.put(Key, rec,function(err, meta, key1) {
				if (err.code == return_code.AEROSPIKE_OK){
					var op_list = [{ operation: Operator.APPEND, binName:'string_bin', binValue:'append' }]
					var ops = { binOps : op_list}
					client.operate(key1, ops, function( err, rec, meta, key2) {
						expect(err).to.exist;
						expect(err.code).to.equal(return_code.AEROSPIKE_OK);
						client.get(key2, function(err, rec, meta, key3) {
							expect(err).to.exist;
							expect(err.code).to.equal(return_code.AEROSPIKE_OK);
							var num = key3.key.substr(12);
							expect(rec.string_bin).to.equal(num+'append');
							if ( ++m == n) {
								console.log("APPEND STRING OPERATION TEST SUCCESS");
								m = 0;
								CleanRecords('APPENDSTRING');
							}
						});
					});
				}
			});
		}
	});
});


describe ( 'OPERATE FUNCTIONALITY', function() {
	it( 'TOUCH OPERATION  TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : params.ns, set : params.set, key : 'TOUCHSTRING' + i }
			var rec = new GetRecord(i);
			client.put(Key, rec,function(err, meta, key1) {
				if (err.code == return_code.AEROSPIKE_OK){
					op_list = [{ operation: Operator.TOUCH }];
					var ops = { ttl : 10000, binOps : op_list }
					client.operate(key1, ops, function( err, rec, meta, key2) {
						expect(err).to.exist;
						expect(err.code).to.equal(return_code.AEROSPIKE_OK);
						client.get(key2, function(err, bins, meta, key3) {
							expect(err).to.exist;
							expect(err.code).to.equal(return_code.AEROSPIKE_OK);
							if ( meta.ttl != 10000 ) {
								expect(meta.ttl).to.be.above(9000);
								expect(meta.ttl).to.be.below(10000);
							}
							expect(meta.gen).to.equal(2);
							if ( ++m == n) {
								console.log("TOUCH OPERATION TEST SUCCESS");
								m = 0;
								CleanRecords('TOUCHSTRING');
							}
						});
					});
				}
			});
		}
	});
});


describe ( 'OPERATE FUNCTIONALITY', function() {
	it( 'READ OPERATION  TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : params.ns, set : params.set, key : 'READ' + i }
			var rec = new GetRecord(i);
			client.put(Key, rec,function(err, meta, key1) {
				if (err.code == return_code.AEROSPIKE_OK){
					var op_list = [{ operation: Operator.READ, binName:'integer_bin'}]
					var ops = { binOps : op_list };
					client.operate(key1, ops, function( err, rec, meta, key2) {
						expect(err).to.exist;
						expect(err.code).to.equal(return_code.AEROSPIKE_OK);
						client.get(key2, function(err, rec, meta, key3) {
							expect(err).to.exist;
							expect(err.code).to.equal(return_code.AEROSPIKE_OK);
							var num = key3.key.substr(4);
							expect(rec.integer_bin).to.equal(parseInt(num));
							if ( ++m == n) {
								console.log("READ OPERATION TEST SUCCESS");
								m = 0;
								CleanRecords('READ');
							}
						});
					});
				}
			});
		}
	});
});

describe ( 'OPERATE FUNCTIONALITY', function() {
	it( 'WRITE OPERATION  TEST', function() {
		var m = 0;
		for ( var i = 1; i <= n; i++) {
			var Key = { ns : params.ns, set : params.set, key : 'WRITE' + i }
			var rec = new GetRecord(i);
			client.put(Key, rec,function(err, meta, key1) {
				if (err.code == return_code.AEROSPIKE_OK){
					var op_list = [{ operation: Operator.WRITE, binName:'string_bin', binValue : 'WRITEOPBIN'}]
					var ops = { binOps : op_list };
					client.operate(key1, ops, function( err, rec, meta, key2) {
						expect(err).to.exist;
						expect(err.code).to.equal(return_code.AEROSPIKE_OK);
						client.get(key2, function(err, rec, meta, key3) {
							expect(err).to.exist;
							expect(err.code).to.equal(return_code.AEROSPIKE_OK);
							expect(rec.string_bin).to.equal('WRITEOPBIN');
							if ( ++m == n) {
								console.log("WRITE OPERATION TEST SUCCESS");
								m = 0;
								CleanRecords('WRITE');
							}
						});
					});
				}
			});
		}
	});
});

