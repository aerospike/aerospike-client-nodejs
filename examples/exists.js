// Reading n records from the database

var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config).connect()
if (client === null)
{
    console.log("Client object is null \n ---Application Exiting --- ")
	process.exit(1)
}



var n = env.nops
var m = 0

console.time(n + " get");
for (var i = 0; i < n; i++ ) {

  // Key of the record to be read
  var k1 = {
    ns: env.namespace,
    set: env.set,
    key: "value"+i
  }

  // Policy to be followed during read operation.
  var readpolicy = {
    timeout: 10,
    key: policy.Key.KEY
  }

  // This function gets the complete record with all the bins. 
  client.exists(k1, function(err, meta) {
    if ( err.code != status.AEROSPIKE_OK ) {
      // Error code AEROSPIKE_OK signifies successful retrieval
      // of the record
      console.log("error %s",err.message)
    }
	console.log(meta)
    if ( (++m) == n ) {
      console.timeEnd(n + " get")
    }
  })
}


