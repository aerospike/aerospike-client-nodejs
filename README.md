## Aerospike Client for node.js

The Aerospike client for node.js is an add-on module, written in C++.
 
The Aerospike node.js client supports Integer, String, Binary datatypes. 

## Prerequisites

[Node.js](http://nodejs.org) version v0.10.16 or greater is required. 
To install the latest stable version of Node.js, visit http://nodejs.org/download/


## Building and Installing

For Debian and Ubuntu distribution, grant permissions for npm to become root 
user. This is done using
	sudo npm config set unsafe-perm true

Aerospike node.js client `aerospike-node.js` requires Aerspike C client to be installed.
This is done automatically as part of the addon module installation:

		$sudo npm install -g 

If the Aerospike C client is already installed on the system, set the following SKIP_C_CLIENT 
environment variable before installing the module:

		$sudo SKIP_C_CLIENT=1 npm install -g 

After installation, set the environment variable `NODE_PATH` to where node modules path is:
Some installation of nodejs puts the node_modules directory in /usr/lib/node_modules, then set 
the NODE_PATH as
	$export NODE_PATH=/usr/lib/node_modules
Some other installation of nodejs puts the node_modules directory in /usr/local/lib/node_modules,
in this case set NODE_PATH as
	$export NODE_PATH=/usr/local/lib/node_modules

## Examples

Refer to examples folder which demonstrates the all the operations available in Aerospike Database.
     

##Testing

The test cases are written using mocha. Refer to README under the test directory to run
all the test cases.

