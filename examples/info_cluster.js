
var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config)
//Connect call is necessary for info_cluster call.
client = client.connect()

if (client === null)
{
    console.log("Client object is null \n ---Application Exiting --- ")
	process.exit(1)
}

/* infopolicy is an optional argument 
 * If infopolicy is not passed, default value is used 
 * */

var infopolicy = {
  timeout: 1,
  send_as_is: true,
  check_bounds: false
}

client.info_cluster ( "objects", infopolicy, function(err, response) {
	console.log(response);
});

