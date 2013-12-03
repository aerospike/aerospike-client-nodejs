
var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.connect(env.config)

var n = env.nops
var m = 0

console.time(n + " put+get")
for (var i = 0; i < n; i++ ) {

  var key0 = {
    ns: env.namespace,
    set: env.set,
    key: "test"+i
  }

  var bins0 = {
    i: i,
    s: i.toString(),
    b: new Buffer("hello world")
  }

  var rec = {
    bins: bins0
  }
  
  client.put(key0, rec, function(err, meta1, key1) {
    if ( err.code !== 0 ) {
      console.log("put error: %s", err.message)
    }
    client.get(key1, function(err, bins2, meta2, key2) {
      console.log("b = " + bins2['b'].toString())
      if ( err.code !== 0 ) {
        console.log("get error: %s", err.message)
      }
      if ( (++m) == n ) {
        var ms = console.timeEnd(n + " put+get")
      }
    });
  });
}
