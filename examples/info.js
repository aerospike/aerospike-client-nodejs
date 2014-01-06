
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
/* Connect is an optional call here. 
 * Client.info can be invoked prior to client connecting to cluster.
 */ 
client.connect()

/* infopolicy is an optional argument.
 * if infopolicy is not an argument, default values passed during client object 
 * creation is used
 * */ 
var infopolicy = {
  timeout: 10,
  send_as_is: true,
  check_bounds: false
}

var host = { addr : env.host,  port : env.port }

/** info call to a particular host in the cluster. **/
client.info( "objects", host, infopolicy, function(err, response, host) {
  console.log("individual node")
  console.log(response);
  console.log(host)
});

/** info call to the entire cluster **/
client.info( "objects", infopolicy, function( err, response, host) {
   console.log("full cluster")
    console.log(response);
    console.log(host)
});

