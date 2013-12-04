//Selecting given set of bins (columns) from the record

var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config)
client.connect()

var n = env.nops
var m = 0
console.time(n + " select")

for (var i = 0; i < n; i++ ) {

  var k2 = {
    ns: env.namespace,
    set: env.set,
    key: 'value' + i
  }

  // Name of the bins to be selected through this operation
  var bins = ['s', 'i'];

  // policy to be used for the select operation
  var readpolicy = {
    timeout: 10,
    Key: policy.Key.SEND
  };

  // This function gets the bins specified in the bins variable.
  client.select(k2, bins, function(err, rec, meta, key) {
    if ( err.code != status.AEROSPIKE_OK ) {
      // AEROSPIKE_OK signifies the successful retrieval of above 
      // mentioned bin names.
      console.log("error %s",err.message)
    }
    if ( (++m) == n ) {
      console.timeEnd(n + " select")
    }
  })

}
