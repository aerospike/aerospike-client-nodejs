var aerospike = require('../build/Release/aerospike')
var key = aerospike.key

var client = aerospike.connect({
  hosts: [
    { addr: "127.0.0.1", port: 3000 }
  ]
})

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 14000
var m = 0

function callback(err, bins, meta){
	if ( err.code != 0 ) {
		console.log("error %s",err.message);
	}
	console.log(bins);
	console.log(meta);
	if ( (++m) == n ) {
		console.timeEnd(n + " get");
	}
 	console.time(n + " get");
}

for (var i = 1; i <= n; i++ ) {

  var k1 = ["test", "demo", "value"+i]
  var k2 = { 'ns':'test','set':'demo','value':'value' + i}
  var bins =['i'];  

  //This function gets the bins specified in the bins variable.
  client.get(k2, bins,function (err, bins, meta){
	 if ( err.code != 0 ) {
        console.log("error %s",err.message);
     }
     console.log(bins);
     console.log(meta);
     if ( (++m) == n ) {
        console.timeEnd(n + " get");
     }
     console.time(n + " get");
  });

  //This function gets the complete record with all the bins.	
  client.get(k1,function (err, bins, meta){
	 if ( err.code != 0 ) {
        console.log("error %s",err.message);
    }
    console.log(meta);
    if ( (++m) == n ) {
        console.timeEnd(n + " get");
    }
    console.time(n + " get");
	});
 }
	
