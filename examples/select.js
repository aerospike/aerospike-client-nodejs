var aerospike = require('../build/Release/aerospike')
var key = aerospike.key

hosts = {addr:"127.0.0.1", port:3000}
var client = aerospike.connect(hosts)

var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 14000
var m = 0
for (var i = 1; i <= n; i++ ) {

  var k2 = { 'ns':'test','set':'demo','value':'value' + i}
  var bins =['s'];

  //This function gets the bins specified in the bins variable.
  client.select(k2, bins,function (err, rec, meta){
     if ( err.code != 0 ) {
        console.log("error %s",err.message);
     }
     console.log(rec);
     console.log(meta);
     if ( (++m) == n ) {
        console.timeEnd(n + " get");
     }
     console.time(n + " get");
  });

}


