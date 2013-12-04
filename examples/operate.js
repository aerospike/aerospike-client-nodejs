
var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config)
client.connect()
var operations = aerospike.Operators

// No of operations to be performed
var n = env.nops
var m = 0

console.time(n + " operate");
for (var i = 0; i < n; i++ ) {

  var k1 = {
    ns: env.namespace,
    set: env.set,
    key: "value"+i
  }

  // Form an array of all the operation that has to be performed, in this operate function call.
  var ops = [
    { operation: operations.INCR, bin_name: 'i', bin_value: i },
    { operation: operations.APPEND, bin_name: 's', bin_value: "append_str" },
    { operation: operations.READ, bin_name: 'i' }
  ]


  // This function increments the bin 'i' by the value i and
  // append the value 'append_str' to the bin 's'.
  client.operate(k1,ops, function(err, rec, meta) {
   if ( err.code != status.AEROSPIKE_OK ) {
      // err.code AEROSPIKE_OK signifies the successful 
      // completion of the operation.
      console.log("error %s",err.message)
    }
    if ( (++m) == n ) {
      console.timeEnd(n + " operate")
    }
  })
}
