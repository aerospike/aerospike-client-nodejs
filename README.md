# Aerospike Client for Node.js

An Aerospike add-on module for Node.js.

This module is compatible with Node.js 0.10.x. 

## Usage

The following is very simple example of how to write and read a record from Aerospike. 

```js
var aerospike = require('aerospike');

var client = aerospike.client({
    hosts: [ { addr: '127.0.0.1', port: 3000 } ]
});

var key = aerospike.key('test','demo','foo');

var rec = {
  name: 'John Doe',
  age: 32
};

client.put(key, rec, function(err) {
  // check the error object
  if ( err.code == aerospike.status.AEROSPIKE_OK ) {
    client.get(key, function(err, rec2, meta2) {
      // The record read should be equal to the record written
      assert.equal(rec.name, rec2.name);
      assert.equal(rec.age, rec2.age);
    });
  }
  else {
      console.error('An error occurred: ', err);
  }
});
```

More examples illustrating the use of the API are located in the 
[`examples`](examples/README.md) directory. 

Details about the API are available in the [`docs`](docs/README.md) directory.


## Prerequisites

[Node.js](http://nodejs.org) version v0.10.x is required. 

To install the latest stable version of Node.js, visit 
[http://nodejs.org/download/](http://nodejs.org/download/)

## Installation

The Aerospike Node.js client is a Node.js add-on module utilizing the Aerospike 
C client. The installation will attempt to build the add-on module prior to 
installation. The build step will resolve the Aerospike C client dependency as 
described in [C Client Resolution](#c-client-resolution).

The Aerospike Node.js client can be installed like any other Node.js module, however
we provided the following information for those not so familiar with Node.js modules. 

### Primer on Node.js Modules

Node.js modules are containers of JavaScript code and a `package.json`, which defines
the module, its dependencies and requirements. Modules are usually installed as 
dependencies of others Node.js application or module. The modules are installed in 
the application's `node_modules` directory, and can be utilized within the program 
by requiring the module by name. 

A module may be installed in global location via the `-g` flag. The global location
is usually reserved for modules that are not directly depended on by an application,
but may have executables which you want to be able to call regardless of the 
application. This is usually the case for tools like tools like `npm` and `mocha`.

### Installing via NPM Registry

Installing via NPM Registry is pretty simple and most common install method, as 
it only involves a single step.

Although the module may be installed globally or locally, we recommend performing 
local installs.

To install the module as a dependency of your application, run the following 
from your application's directory:

	$ npm install aerospike

In most cases, an application should specify `aerospike` as a dependency in 
its `package.json`.

Once installed, the module can be required in the application:

	var aerospike = require('aerospike')

### Installing via Git Repository

The following is relevant for users who have cloned the repository, and want 
to install it as a dependency of their application.

Installing via Git Repository is slightly different from installing via NPM 
registry, in that you will be referencing the module by path, rather than name.

Although the module may be installed globally or locally, we recommend performing 
local installs.

To install the module as a dependency of your application, run the following 
from your application's directory:

	$ npm install <PATH>

Where `<PATH>` is the path to the Aerospike Node.js client's Git respository is 
located. 

Once installed, the module can be required in the application:

	var aerospike = require('aerospike')


<a name="c-client-resolution"></a>
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

You can modify the C client resolution via:

- [force download](#force-download) the C client
- Specifying a [custom search path](#custome-search-path) for the C client.

<a name="force-download"></a>
#### Force Download

To force downloading of the C client, you can specify the `DOWNLOAD=1` 
environment variable. Example:

    $ DOWNLOAD=1 npm install

<a name="custom-search-path"></a>
#### Custom Search Path 

If you have the Aerospike C client installed in a non-standard location or 
built from source, then you can specify the search path for the build step to
use while resolving the Aerospike C client library.

Use the `PREFIX=<PATH>` environment variable to specify the search path for the
Aerospike C client. The `<PATH>` must be the path to a directory containing 
`lib` and `include` subdirectories. 

The following is an example of specifying the path to the Aerospike C client 
build directory:

    $ PREFIX=~/aerospike-client-c/target/Linux-x86_64 npm install

## Tests

This module is packaged with a number of tests in the `test` directory.

To run all the test cases:

	$ npm test

For details on the tests, see [`test/README.md`](test/README.md).


## Examples

This module is packaged with a number of examples in the `examples` directory.

The `examples` directory contains the following subdirectories:

- [`benchmark`](examples/benchmark/README.md) - Benchmark applications, used 
  gain understanding of the performance of the module.
- [`client`](examples/client/README.md) – Client applications, used to 
  illustrate the use of some of the client APIs.

Each example directory contains a `README.md`, which provides details on using the examples.


## API Documentations

API documentation is provided in the [`docs`](docs/README.md) directory.
