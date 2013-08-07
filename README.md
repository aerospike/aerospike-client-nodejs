## Aerospike Client for node.js

The Aerospike client for node.js is an add-on module, written in C++. 

## Prerequisites

The add-on module is built using [node-gyp](https://github.com/TooTallNate/node-gyp). 

node,npm and node-gyp must to be installed to compile this client library

The nodejs installed must be of version >= v0.10.*

For Debian-based distributions (Debian, Ubuntu, etc.):

        $ sudo apt-get install node
	$ sudo apt-get install npm
 	$ sudo npm install -g node-gyp

For Redhat-based distributions (RHEL, CentOS, etc.):
   1.Enable EPEL repository for yum.

   2.Install nodejs,npm and node-gyp
        $ sudo yum install nodejs
	$ sudo yum install npm
	$ sudo npm install -g node-gyp

## Building

The aerospike-client-node.js uses aerospike-client-C library.

1.Download the C client from Aerospike website

2.Extract and go to the resulting directory.

	$ tar -xzvf  aerospike-client-c-<version>-<os>-x86_64.tgz
	$ cd aerospike-client-c-<version>-<os>-x86_64

3.Install aerospike-client-c library
	Centos/RHEL: sudo rpm -i aerospike-client-c-devel-<version>-<os>.x86_64.rpm
        Debian/Ubuntu: sudo dpkg -i aerospike-client-c-devel-<version>-<os>.x86_64.deb

4.cd to aerospike-client-node.js-0.1.0 directory.
	$cd path/to/aerospike-client-node.js-0.1.0

5.Install aerospike-node.js client as a addon node_module
	$ sudo npm install -g 

6.Set the environment variable NODE_PATH to /usr/lib/node_modules.
	$ export NODE_PATH=/usr/lib/node_modules

## Test

Test the working of aerospike-client-node.js 
	$ npm test

## Usage
	
	var aerospike = require('aerospike')
	var config = {
		hosts:[{ addr:"127.0.0.1", port : 3000 
			//specify the list of node ip and port in the
			//aerospike cluster, following the above format.
		    ]}
	
	
	var client = aerospike.connect(config)
	
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

	var bins = [ 'a','b' ];
	client.select(["test","demo","a"],bins, function(err, rec, meta) {
		//handle the response 
		console.log(rec);
	})

Refer to examples folder which demonstrates the above functionality.
