var aerospike = require('aerospike');
var assert = require('assert');
var msgpack = require('msgpack');
var sleep = require('sleep');

var status = aerospike.Status;
var policy = aerospike.Policy;
var config = {
	  hosts:[{ addr:"127.0.0.1",port : 3000 }
		]}
var client = aerospike.connect(config);

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) :14000
var m = 0

console.time(n + " put")
for (var i = 0; i < n; i++ ) {

  var str = "This is abnormally lengthy string. This is to test batch_get functioning for more than 8 bytes";
  var o = {"a" : 1, "b" : 2, "c" : [1, 2, 3],"d": str};
  // pack the object o using msgpack
  var pbuf = msgpack.pack(o);
  var k1 = {'ns':"test", 'set':"demo", 'key':"value" + i }
 
  var binlist = { "s": i.toString(),"i" : i, "b": pbuf}
  var meta = { ttl : 10000, gen : 0 }
  var rec = {metadata: meta, bins: binlist}

  var write_policy = {timeout : 10, 
					  Retry: policy.Retry.ONCE, 
					  Key: policy.Key.SEND, 
					  Gen: policy.Generation.IGNORE,
					  Exists: policy.Exists.IGNORE }
// Write a record with gen policy EQUAL
  client.put(k1, rec, write_policy, function(err) {
    if ( err.code != status.AEROSPIKE_OK ) {
      console.log("error: %s", err.message);
    }
    if ( (++m) == n ) {
      console.timeEnd(n + " put")
    }
  });

}

