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

Downloading and installing C client has been moved as a part of 
npm install.
Just perform step no.5 for installing.

The aerospike-client-node.js uses aerospike-client-c library.

1. Download the C client from Aerospike website

2. Extract and go to the resulting directory.

        tar -xzvf  aerospike-client-c-<version>-<os>-x86_64.tgz
        cd aerospike-client-c-<version>-<os>-x86_64

3. Install aerospike-client-c library
    
    Centos/RHEL: 

        sudo rpm -i aerospike-client-c-devel-<version>-<os>.x86_64.rpm
        
    Debian/Ubuntu: 
    
        sudo dpkg -i aerospike-client-c-devel-<version>-<os>.x86_64.deb

4. cd to aerospike-client-node.js-0.1.0 directory.
    
        cd path/to/aerospike-client-node.js-0.1.0

5. Install `aerospike-node.js` client as a addon node_module
    
        sudo npm install -g 

6. Set the environment variable `NODE_PATH` to `/usr/lib/node_modules`.
    
        export NODE_PATH=/usr/lib/node_modules

## Examples

	Refer to examples folder which demonstrates the all the operations available in Aerospike Database.

## Documentation.

	To generate documentation cd to docs folder and do make html
	cd doc/
	make html


