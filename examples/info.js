
var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config)
if (client === null)
{
    console.log("Client object is null \n ---Application Exiting --- ")
	process.exit(1)
}
// Connect is an optional call here. 
// Client.info can be invoked prior to client connecting to cluster.
//client.connect()
var infopolicy = {
  timeout: 1,
  send_as_is: true,
  check_bounds: false
}

client.info ( env.host, env.port, "objects", infopolicy, function(err, response) {
  console.log(response);
});

