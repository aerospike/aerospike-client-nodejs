var aerospike = require('aerospike')
var msgpack = require('msgpack')
var status = aerospike.Status;
var config = {
	hosts:[{ addr:"127.0.0.1", port: 3000 }
	      ]}

var SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler();

var client = aerospike.connect(config)
var n = process.argv.length >= 3 ? parseInt(process.argv[2]) : 3500
var m = 0

console.time(n + " batch_get")
 
// Currently the batch operation is supported only for a set of 
// keys from the same namespace.
for (var i = 0 ;i < n; i++) {
  var k1 = [
	 {ns:'test',set:'demo',key:"value" + (i*4) },
	 {ns:'test',set:'demo',key:"value" + (i*4 + 1) },
	 {ns:'test',set:'demo',key:"value" + (i*4 + 2) },
	 {ns:'test',set:'demo',key:"value" + (i* 4 + 3) }]

 /** arguments to callback
  *  err -- error returned by the callee.
  *  rec_list -- array of objects containing,  Error object and Record object
  *  Error.code == 0 && Error.message == 'AREOSPIKE_OK'  implies, record is successfully retrieved.
  *  RecStatus != AEROSPIKE_OK  implies Record could not be retrieved
  *  Record object contains key,meta,bins 
  **/  
 client.batch_get(k1,function (err, rec_list){
	if ( err.code == status.AEROSPIKE_OK ) {
		var num = rec_list.length;
		for(i=0; i<num; i++) {
			if ( rec_list[i].recstatus != status.AEROSPIKE_OK) {
				console.log(rec_list[i].recstatus);
			} 
		}
	}else {
			console.log("Error");
			console.log(err.message);
	}
	if ( (++m) == n ) {
      console.timeEnd(n + " batch_get")
      client.close();
    }
});

}

	
