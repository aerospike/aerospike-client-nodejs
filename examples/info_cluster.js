
var env = require('./env')
var aerospike = require('aerospike')

var status = aerospike.Status
var policy = aerospike.Policy
var client = aerospike.client(env.config)
client.connect()

var infopolicy = {
  timeout: 1,
  send_as_is: true,
  check_bounds: false
}

client.info_cluster ( "objects", infopolicy, function(err, response) {
	console.log("callback called");
	console.log(response);
  //console.log(response);
});

