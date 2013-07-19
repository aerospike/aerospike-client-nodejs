var aerospike = require('../build/Release/aerospike')
var key = aerospike.key

var client = aerospike.connect({
	hosts: [
		{ addr: "127.0.0.1", port: 3000 }
	]
})

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 7000
var m = 0

console.time(n + " put+get")
for (var i = 1; i <= n; i++ ) {

	var key0 = ["test", "test", "test"+i]
	var bins0 = { 'i': i, 's': i.toString() }
	
	client.put(key0, bins0, function(err, meta1, key1) {
    if ( err.code != 0 ) {
      console.log("put error: %s", err.message)
    }
		client.get(key1, function(err, bins2, meta2, key2) {
	    if ( err.code != 0 ) {
	      console.log("get error: %s", err.message)
	    }
			if ( (++m) == n ) {
				var ms = console.timeEnd(n + " put+get")
			}
		});
	});
}
