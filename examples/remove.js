// deleting n records in the database.

var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config)
client = client.connect()
if (client === null)
{
    console.log("Client object is null \n ---Application Exiting --- ")
	process.exit(1)
}


var n = env.nops
var m = 0

console.time(n + " delete");
for (var i = 0; i < n; i++ ) {

  var k1 = {
    ns: env.namespace,
    set: env.set,
    key: "value"+i
  }
 
  /** Behaviour of remove operation can be modified using removepolicy.
   * removepolicy is an optional argument.
   * if it's not passed as an argument, default values for remove policy is 
   * used. 
   */ 

  var removepolicy = {
    timeout : 10,
    gen: 1,                     // generation of the record
    retry: policy.Retry.ONCE,   // if the delete operation fails, retry once again(only once).
    key: policy.Key.SEND        // send the key over the network not digest
  }

  // This function deletes the complete record with all the bins.  
  client.remove(k1,removepolicy, function(err, key) {
    if ( err.code != status.AEROSPIKE_OK ) {
      // err.code AEROSPIKE_OK signifies the successfull deletion of record.
      console.log("error %s",err.message);
      console.log(key);
    }
    if ( (++m) == n ) {
      console.timeEnd(n + " delete");
      client.close();   // Close the connection to the aerospike server.
    }
  });

}

