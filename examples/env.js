var aerospike = require('aerospike')
var policy    = aerospike.Policy;
var log       = aerospike.Log;

// environment settings
var env = {
  host:       { addr: "192.168.5.102", port: 3000},
  namespace:  "test",
  set:        "demo",
  nops:       1000 * 1
};

// client settings
env.config = {
  // server address - host and port
  hosts: [ env.host ],
	log : {
		level : log.INFO
	}
};

module.exports = env
