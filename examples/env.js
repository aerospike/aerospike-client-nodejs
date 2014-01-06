var aerospike = require('aerospike')
var policy    = aerospike.Policy;
var log		  = aerospike.Log;
// environment settings
var env = {
  host:       "127.0.0.1",
  port:       3000,
  namespace:  "test",
  set:        "demo",
  nops:       1000
}

// client settings
env.config = {
    // server address - host and port
    hosts: [
      { addr: env.host, port: env.port }
    ],
    // Default policies to be used for all the database operations.
	policies: {
	  timeout : 10,
	  read:{
		timeout: 10,
		key    : policy.Key.SEND
	  },
	  write:{
		timeout: 10,
		retry  : policy.Retry.ONCE,
		key	   : policy.Key.SEND,
		gen	   : policy.Generation.IGNORE,
		exists : policy.Exists.IGNORE 
	  },
	  remove:{	
		timeout: 10,
		key    : policy.Key.SEND,
		retry  : policy.Retry.ONCE
	  },
	  batch:{
		timeout: 10
	  },
	  operate:{
		timeout: 10,
		retry  : policy.Retry.ONCE,
		key    : policy.Key.SEND,
		gen    : policy.Generation.IGNORE
		},
	  info:{
		timeout     : 10,
		send_as_is  : true,
		check_bounds: false
	  }

	},
    // log level granularity. Logging is provided only for V8, not node.js application.
	log : {
		level : log.INFO
	}
}

module.exports = env
