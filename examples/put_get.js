
var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config)
client = client.connect()
if (client === null)
{
    console.log("Client object is null \n ---Application Exiting --- ")
	process.exit(1)
}


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

  
  client.put(key0, bins0, function(err, meta1, key1) {
    if ( err.code !== 0 ) {
      console.log("put error: %s", err.message)
    }
    client.get(key1, function(err, bins2, meta2, key2) {
      if ( err.code !== 0 ) {
        console.log("get error: %s", err.message)
      } else {
        console.log("b = " + bins2['b'].toString())
      }
      if ( (++m) == n ) {
        var ms = console.timeEnd(n + " put+get")
      }
    });
  });
}
