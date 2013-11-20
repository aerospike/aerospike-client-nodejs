var aerospike = require('aerospike')
var msgpack = require('msgpack')
var status = aerospike.Status;
var policy = aerospike.Policy;
var config = {
	hosts:[{ addr:"127.0.0.1", port: 3000 }
	      ]}

var client = aerospike.connect(config)

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 1
var m = 0

console.time(n + " get");
for (var i = 1; i <= n; i++ ) {

	client.info ( "127.0.0.1", 3000, "statistics", function( err, response) {
		console.log(err);
		console.log(response);
	});
 
}

