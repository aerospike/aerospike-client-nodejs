var aerospike = require('aerospike')
var key = aerospike.key
var config = {
	hosts:[{ addr:"127.0.0.1", port: 3000 }
	      ]}

var client = aerospike.connect(config)



// Currently the batch operation is supported only for a set of 
// keys from the same namespace.
for (var i = 0 ;i < 3500; i++) {
  var k1 = [
	 {ns:'test',set:'demo',key:"value" + (i*4) },
	 {ns:'test',set:'demo',key:"value" + (i*4 + 1) },
	 {ns:'test',set:'demo',key:"value" + (i*4 + 2) },
	 {ns:'test',set:'demo',key:'valuexyz'},
	 {ns:'test',set:'demo',key:"value" + (i* 4 + 3) },
	 {ns:'test',set:'demo1',key:'value'+5}]

 /** arguments to callback
  *  err -- error returned by the callee.
  *  rec_list -- array of objects containing,  Error object and Record object
  *  Error.code==0 && Error.message == 'AREOSPIKE_OK'  implies, record is successfully retrieved.
  *  Error.code != 0 && Error.message != 'AEROSPIKE_OK'  Record could not be retrieved
  *  record object contains key,meta,bins 
  **/  
 client.batch_get(k1,function (err, rec_list){
	if ( err.message == 'AEROSPIKE_OK' ) {
		var n = rec_list.length;
		for(i=0; i<n; i++) {
			if ( rec_list[i].Error.message != 'AEROSPIKE_OK') {
				console.log(rec_list[i].Error);
			} else {
				console.log(rec_list[i].Record);
			}
		}
	}else {
			console.log(err.message);
	}

});

}

	
