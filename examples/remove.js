var aerospike = require('aerospike')
var assert = require('assert')
var msgpack = require('msgpack')
var sleep = require('sleep')
var key = aerospike.key
var policy = aerospike.Policy;
var config = {
	hosts:[{ addr:"127.0.0.1", port: 3000 }
	      ]}

var status = aerospike.Status;
var client = aerospike.connect(config)

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 14000
var m = 0

console.time(n + " delete");
for (var i = 1; i <= n; i++ ) {

  var k1 = {'ns':"test",'set':"demo",'key':"value"+i}; 

var removepolicy = { timeout : 10, gen : 1, Retry : policy.Retry.ONCE,
					 Key: policy.Key.SEND }
  //This function deletes the complete record with all the bins.	
  client.remove(k1,removepolicy, function (err, key){
	 if ( err.code != status.AEROSPIKE_OK ) {
        console.log("error %s",err.message);
		console.log(key);
    }
    if ( (++m) == n ) {
        console.timeEnd(n + " delete");
	    client.close();
    }
	});
 
}

