var aerospike = require('aerospike')
var key = aerospike.key
var config = {
	hosts:[{ addr:"127.0.0.1", port: 3000 }
	      ]}

var client = aerospike.connect(config)



  var k1 = [
	 {ns:'test',set:'demo',key:"value"+1},
	 {ns:'test',set:'demo',key:'value'+2},
	 {ns:'test',set:'demo',key:'value'+3},
	 {ns:'test',set:'demo',key:'valuexyz'},
	 {ns:'test',set:'demo1',key:'value'+4}]

 //This function gets the complete record with all the bins.	
 client.batch_get(k1,function (err, n, rec_list){
	console.log(err);
	for(i=0; i<n; i++) {
		console.log(rec_list[i]);
	}
});
	
