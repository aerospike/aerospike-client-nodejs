var aerospike = require('aerospike')

var config = {
	  hosts:[{ addr:"127.0.0.1",port : 3000 }
		]}
var client = aerospike.connect(config);

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 14000
var m = 0

console.time(n + " put")
for (var i = 1; i <= n; i++ ) {

  var k1 = new 	Object();
  k1.ns = "test";
  k1.set = "demo";
  k1.key = "value" + i
  var k0 = ["test", "test", "test" + i ]
  var r0 = { 'i': i, 's': i.toString() }
  
  client.put(k1, r0, function(err) {
    if ( err.code != 0 ) {
      console.log("error: %s", err.message)
    }
    if ( (++m) == n ) {
      console.timeEnd(n + " put")
    }
  });
}
