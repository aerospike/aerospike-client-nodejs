var aerospike = require('../build/Release/aerospike')
var key = aerospike.key

var client = aerospike.connect({
  hosts: [
    { addr: "127.0.0.1", port: 3000 }
  ]
})

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 14000
var m = 0

console.time(n + " get")
for (var i = 1; i <= n; i++ ) {

  var k1 = ["test", "test", "test"+i]
    
  client.get(k1, function(err, bins, meta){
    if ( err.code != 0 ) {
      console.log("error: %s", err.message)
    }
    if ( (++m) == n ) {
      console.timeEnd(n + " get")
    }
  });
}
