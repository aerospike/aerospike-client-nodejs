# Aerospike Client for node.js

An Aerospike add-on module for Node.js.

## Prerequisites

[Node.js](http://nodejs.org) version v0.10.16 or greater is required. 

To install the latest stable version of Node.js, visit [http://nodejs.org/download/](http://nodejs.org/download/)

## Building and Installing

The Aerospike Node.js client is built on the Aerspike C client. The following commands will run `node-gyp` to resolve the C client and build the module.

To install the module:

    $ npm install

You may also link the module:

    $ npm link


### C Client Resolution

When running `npm install`, `npm link` or `node-gyp rebuild`, the `.gyp` 
script will run `scripts/aerospike-client-c.sh` to resolve the C client 
dependency.

The resolution steps are check the following directories:

1. `./aerospike-client-c`
2. `/usr`

In each directory it will check for:

- `lib/libaerospike.a`
- `include/aerospike/aerospike.h`

If neither are found, then it will download the C client and create the 
`./aerospike-client-c` directory.

You may also force downloading or the C client or specify a path to 
a custom built C client. (see below)

### Force Downloading of the C Client

You can force downloading of the C client, by specifying the `DOWNLOAD=1` 
environment variable. Example:

    $ DOWNLOAD=1 npm install

### Using Custom C Client Builds

If you have built the C client from source, and want the Node.js
client to use that build, then you can specify the `PREFIX=<PATH>` environment
variable:

    $ PREFIX=~/aerospike-client-c/target/Linux-x86_64 npm install

The `<PATH>` must be the directory path containing `lib` and `include` 
subdirectories. It may also point to `/usr`, if you wish to use an installed
C client, and not use a previously downloaded C client.

## Examples

In order to use the examples, you will need to "link" to the aerospike module:

    $ cd examples
    $ npm link aerospike

Then you can run any of the examples:

    $ node exists.js


## Testing

The test cases are written using mocha. Refer to README under the test directory to run
all the test cases.

