# Aerospike Client for node.js

The Aerospike client for node.js is an add-on module, written in C++. 

Download the C client from the aerospike website.
Follow the instruction in C client README and build the C client.
Set the environment variable AS_C_CLIENT to the downloaded C client directory.

## Building

The add-on module is built using [node-gyp](https://github.com/TooTallNate/node-gyp). 


To install node-gyp

 npm install node-gyp.


To build:

	node-gyp rebuild



## Usage
	
	var aerospike = require('./build/Release/aerospike')
	var key = aerospike.key
	var hosts = { addr:"127.0.0.1", port : 3000 }
	
	var client = aerospike.connect(hosts)
	
	var bins = {
		a: 123,
		b: "xyz"
	}

	client.put(["test", "demo", "a"], bins, function(err, meta, key) {
	  // handle the response
	})
	
	client.get(["test", "demo", "b"], function(err, bins, meta, key) {
	  // handle the response
	})

	var bins = { a };
	client.select(["test","demo","a"],bins, function(err, bins, meta) {
		//handle the response
	})

Refer to examples folder which demonstrates the above functionality.
