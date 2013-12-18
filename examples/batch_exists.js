// getting a set of records from a single namespace,
// in a single operation(batch_get).

var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config)
client.connect()

var n = env.nops/4
var m = 0

var namespace = env.namespace
var set = env.set

console.time(n + " batch_get")

// Currently the batch operation is supported only for a batch of 
// keys from the same namespace.
for (var i = 0 ;i < n; i++) {
  var k1 = [
	{ns:namespace,set:set,key:"value" + (i*4) },
	{ns:namespace,set:set,key:"value" + (i*4 + 1) },
	{ns:namespace,set:set,key:"value" + (i*4 + 2) },
	{ns:namespace,set:set,key:"value" + (i* 4 + 3) }
  ]

	/** arguments to callback
	 *  err -- error returned by the callee.
	 *  rec_list -- array of objects containing,  Error object and Record object
	 *  Error.code == 0 && Error.message == 'AREOSPIKE_OK'  implies, record is successfully retrieved.
	 *  recstatus != AEROSPIKE_OK  implies Record could not be retrieved
	 *  record object contains key,meta,bins 
	 **/  
  client.batch_exists(k1,function (err, rec_list){
    if ( err.code == status.AEROSPIKE_OK ) {
	  var num = rec_list.length
	  for(i=0; i<num; i++) {
		if ( rec_list[i].recstatus != status.AEROSPIKE_OK) {
			console.log(rec_list[i].recstatus)
		}
	  }
	} else {
		console.log("Error")
		console.log(err.message)
	}
	if ( (++m) == n ) {
		console.timeEnd(n + " batch_get")
		client.close()
	}
  })
}


