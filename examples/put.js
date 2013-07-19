var aerospike = require('../build/Release/aerospike')
var key = aerospike.key

var client = aerospike.connect({
  hosts: [
    { addr: "127.0.0.1", port: 3000 }
  ]
})

var n = 14000
var m = 0

console.time(n + " put")
for (var i = 1; i <= n; i++ ) {

  var k0 = ["test", "test", "test"+i]
  var r0 = { 'i': i, 's': i.toString() }
  
  client.put(k0, r0, function(err){
    if ( (++m) == n ) {
      console.timeEnd(n + " put")
    }
  });
}
