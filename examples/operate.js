var aerospike = require('aerospike')
var msgpack = require('msgpack')
var status = aerospike.Status;
var policy = aerospike.Policy;
var operations = aerospike.Operators;
var config = {
	hosts:[{ addr:"127.0.0.1", port: 3000 }
	      ]}

var client = aerospike.connect(config)

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 14000
var m = 0

console.time(n + " operate");
for (var i = 0; i < n; i++ ) {

  var k1 = {ns:"test",set:"demo",key:"value"+i}; 

  var ops = [ { operation: operations.INCR, binName:'i', binValue:i }]
  //This function gets the complete record with all the bins.	
  var op_list = { binOps : ops }
  client.operate(k1,op_list, function (err, rec, meta){
	 if ( err.code != status.AEROSPIKE_OK ) {
        console.log("error %s",err.message);
    }
    if ( (++m) == n ) {
        console.timeEnd(n + " operate");
    }
	});
 
}

