// Reading n records from the database

var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config).connect()
if (client === null)
{
    console.log("Client object is null \n ---Application Exiting--- ")
	process.exit(1)
}



var n = env.nops
var m = 0

console.time(n + " exists");
for (var i = 0; i < n; i++ ) {

  /** Key of the record to be read **/
  var k1 = {
    ns: env.namespace,
    set: env.set,
    key: "value"+i
  }

  /** readpolicy is an optional argument to get function call.
   *  if readpolicy is not passed, default values are used as readpolicy.
   * */

  /* *policy to be used for the exits operation* */
  var readpolicy = { 
    timeout: 1, 
    key: policy.Key.SEND
  };  


  /**This function checks for existence of record in the database. 
   * meta null signifies the record is not present in the database.
   * */ 
  client.exists(k1, readpolicy, function(err, meta, key) {
    if ( err.code != status.AEROSPIKE_OK ) {
      console.log("error %s",err.message)
    }
    else {
    	console.log(meta)
    }
    if ( (++m) == n ) {
      console.timeEnd(n + " exists")
    }
  })
}


