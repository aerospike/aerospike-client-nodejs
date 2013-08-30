var aerospike = require('aerospike')
var key = aerospike.key
var config = {
	hosts:[{ addr:"127.0.0.1", port: 3000 }
	      ]}

var client = aerospike.connect(config)



// Currently the batch operation is supported only for a set of 
// keys from the same namespace.
  var k1 = [
	 {ns:'test',set:'demo',key:"value"+1},
	 {ns:'test',set:'demo',key:'value'+2},
	 {ns:'test',set:'demo',key:'value'+3},
	 {ns:'test',set:'demo',key:'valuexyz'},
	 {ns:'test',set:'demo1',key:'value'+4},
	 {ns:'test',set:'demo',key:'value'+5}]

 /** arguments to callback
  *  err -- error returned by the callee.
  *  n -- number of objects in the array rec_list.
  *  rec_list -- array of objects containing, status and a record object
  *  status = 0  implies, record is successfully retrieved.
  *  status != 0 Record could not be retrieved
  *  record object contains key,meta,bins 
  **/  
 client.batch_get(k1,function (err, n, rec_list){
	console.log(err);
	for(i=0; i<n; i++) {
		console.log(rec_list[i]);
	}
});
	
