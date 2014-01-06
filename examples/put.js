// Writing n records to database.

var env = require('./env')
var aerospike = require('../build/Debug/aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config).connect()

if (client === null)
{
	console.log("Client object is null \n ---Application Exiting --- ")
	process.exit(1)
}
// No of put of operation to be performed
var n = env.nops
var m = 0

console.time(n + " put")

for (var i = 0; i < n; i++ ) {

  // Key of the record.
  var k1 = {
    ns: env.namespace,
    set: env.set,
    key: "value" + i
  }

  // bins to be written 
  var bins = {
    s: i.toString(),
    i: i
  }

  //metadata of the record. 
  var meta = {
    ttl: 10000,
    gen: 0
  }


  /* writepolicy can be used to modify the behaviour of put operation.
   * writepolicy is an optional argument. If the writepolicy is not passed
   * default values passed during client object creation is used.
   * */ 
  /** Policy to be followed while writing. **/
  var write_policy = {
    timeout: 10,
    retry: policy.Retry.ONCE,       // If a write fails, retry the operation once
    key: policy.Key.SEND,           // Send the key 
    gen: policy.Generation.IGNORE,  // Ignore the generation of the record while writing
    exists: policy.Exists.IGNORE    // Write the record regardless of the existence
  }

  // write the record to database
  client.put(k1, bins, meta, write_policy, function(err, meta1, key1) {
    if ( err.code != status.AEROSPIKE_OK ) {
        // Error code AEROSPIKE_OK specifies the success of write operation.
        console.log("error: %s", err.message)
    } else {
        console.log(meta1)
    }
    if ( (++m) == n ) {
        console.timeEnd(n + " put")
    }
  })

}

