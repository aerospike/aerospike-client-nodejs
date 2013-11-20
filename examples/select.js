var aerospike = require('aerospike')
var config ={
	hosts:[{addr:"127.0.0.1", port:3000}
	      ]}
var client = aerospike.connect(config)

var policy = aerospike.Policy;
var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 14000
var m = 0
console.time(n + " select");
for (var i = 0; i < n; i++ ) {

  var k2 = { 'ns':'test','set':'demo','key':'value' + i}
  var bins =['s', 'i'];

  var readpolicy = { timeout : 10, Key: policy.Key.SEND } 
  //This function gets the bins specified in the bins variable.
  client.select(k2, bins, function (err, rec, meta, key){
     if ( err.code != 0 ) {
        console.log("error %s",err.message);
     }
     if ( (++m) == n ) {
        console.timeEnd(n + " select");
     }
  });
}


