## Aerospike Client for node.js

The Aerospike client for node.js is an add-on module, written in C++.
 
The Aerospike node.js client supports Integer, String, Binary datatypes. 

## Prerequisites

[Node.js](http://nodejs.org) version v0.10.x is required. 
To install the latest stable version of  Node.js, visit http://nodejs.org/download/

[Node-gyp](https://github.com/TooTallNate/node-gyp) is used for building the 
library. 

The nodejs installed must be of version >= v0.10.16


Install the latest stable version of nodejs available at http://nodejs.org/download/

## Building

Aerospike Nodejs client requires C client to be installed.

	Downloading and installing C client has been moved as a part of 
	npm install. So no nedd to explicitly download and install the C client.

If the aerospike C client is already installed in the system, and if you want to 
avoid downloading from the website, set the environment variable,

	$export SKIP_C_CLIENT=1


Install `aerospike-node.js` client as a addon node_module
    
	$sudo npm install -g 

Set the environment variable `NODE_PATH` to `/usr/lib/node_modules`.
    
	$export NODE_PATH=/usr/lib/node_modules

## Examples

	Refer to examples folder which demonstrates the all the operations available in Aerospike Database.

## Documentation.

	To generate documentation cd to docs folder and do make html
	cd doc/
	make html


