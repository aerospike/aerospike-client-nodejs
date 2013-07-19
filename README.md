# Aerospike Client for node.js

The Aerospike client for node.js is an add-on module, written in C++. 


## Building

The add-on module is built using [node-gyp](https://github.com/TooTallNate/node-gyp). 

To build:

	node-gyp rebuild



## Usage
	
	var aerospike = require('aerospike')
	var key = aerospike.key
	
	var client = aerospike.connect({
		hosts: [
			{ addr: "127.0.0.1", port: 3000 }
		]
	})
	
	client.get(["test", "demo", "a"], function(err, rec) {
	  //
	})

