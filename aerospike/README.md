# Aerospike Client for node.js

An Aerospike add-on module for Node.js.

The current implementation supports only node-v0.10.x versions.

## Prerequisites

[Node.js](http://nodejs.org) version v0.10.x is required. 

To install the latest stable version of Node.js, visit [http://nodejs.org/download/](http://nodejs.org/download/)

## Building and Installing

The Aerospike Node.js client is built on the Aerspike C client. 

The Aerospike Node.js client can be installed using any one of the following three methods.

1 To install the module as a root user, in the global space.

1.1 To install the module as a root user.

    $ sudo npm install -g

1.2 Set the environment variable NODE_PATH, for node processes to look up aerospike modules.
   
   $export NODE_PATH=$NODE_INSTALL/lib/node_modules.

`$NODE_INSTALL` is either `/usr/local/` or `/usr/`, that is the default location where node.js is installed.

2 Installing the module as a non-root user, in the current folder.

2.1 To install the module as a non-root user.

    $npm install

2.2 Set the environment variable NODE_PATH, for the processes to look up aerospike module.

    $export NODE_PATH=`pwd`/..


3 Install the package as a non-root user locally and create a globally-installed symbolic link.

3.1 Install as a non-root user locally.   

    $npm install

3.2 Create a globally-installed symbolic link.

    $ sudo npm link

3.2 Export NODE_PATH, for the node processes to look up aerospike module.

    $export NODE_PATH=$NODE_INSTALL/lib/node_modules.

`$NODE_INSTALL` is either `/usr/local/` or `/usr/`, that is the default location where node.js is installed.


### C Client Resolution

When running `npm install`, `npm link` or `node-gyp rebuild`, the `.gyp` 
script will run `scripts/aerospike-client-c.sh` to resolve the C client 
dependency.

The script will check for the following files in the search paths:

- `lib/libaerospike.a`
- `include/aerospike/aerospike.h`

By default, the search paths are:

- `./aerospike-client-c`
- `/usr`

If neither are found, then it will download the C client and create the 
`./aerospike-client-c` directory.

You may also force downloading or the C client or specify a specify search
path.

### Force Downloading

You can force downloading of the C client, by specifying the `DOWNLOAD=1` 
environment variable. Example:

    $ DOWNLOAD=1 npm install

### Custom Search Path

You may specify a custom search path for the C client for the Node.js client
to use when building. This is useful if you have built the C client from source.
To specify the custom search path, then specify the `PREFIX=<PATH>` environment
variable:

    $ PREFIX=~/aerospike-client-c/target/Linux-x86_64 npm install

The `<PATH>` must be the path to a directory containing `lib` and `include` 
subdirectories. 

## Examples

In order to use the examples, you will need to "link" to the aerospike module:

    $ cd examples
    $ npm link aerospike

Then you can run any of the examples:

    $ node exists.js


## Testing

The test cases are written using mocha. Refer to README under test directory for detailed description.



