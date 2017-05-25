# Aerospike Node.js Client [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url]

[travis-image]: https://travis-ci.org/aerospike/aerospike-client-nodejs.svg?branch=master
[travis-url]: https://travis-ci.org/aerospike/aerospike-client-nodejs
[npm-image]: https://img.shields.io/npm/v/aerospike.svg
[npm-url]: https://www.npmjs.com/package/aerospike
[downloads-image]: https://img.shields.io/npm/dm/aerospike.svg
[downloads-url]: http://npm-stat.com/charts.html?package=aerospike

An Aerospike add-on module for Node.js.

This module is compatible with Node.js v4.x (LTS), v6.x (LTS) and v7.x. It
supports the following operating systems: CentOS/RHEL 6/7, Debian 7/8,
Ubuntu 12.04/14.04/16.04, as well as many Linux destributions compatible with
one of these OS releases and macOS.

- [Usage](#Usage)
- [Prerequisites](#Prerequisites)
- [Installation](#Installation)
  - [Primer on Node.js Modules](#Primer-on-Node.js-Modules)
  - [Installing via npm Registry](#Installing-via-npm-Registry)
  - [Installing via Git Repository](#Installing-via-Git-Repository)
  - [C Client Resolution](#C-Client-Resolution)
    - [Force Download](#Force-Download)
    - [Custom Search Path](#Custom-Search-Path)
- [Tests](#Tests)
- [Examples](#Examples)
- [Benchmarks](#Benchmarks)
- [API Documentaion](#API-Documentation)

<a name="Usage"></a>
## Usage

The following is very simple example of how to write and read a record from Aerospike.

```js
const Aerospike = require('aerospike')
const op = Aerospike.operations
const lists = Aerospike.lists
const maps = Aerospike.maps
const Key = Aerospike.Key
const Double = Aerospike.Double
const GeoJSON = Aerospike.GeoJSON

const config = {
  hosts: '192.168.33.10:3000'
}
Aerospike.connect(config, (error, client) => {
  if (error) throw error

  var key = new Key('test', 'demo', 'demo')
  var record = {
    i: 123,
    s: 'hello',
    b: new Buffer('world'),
    d: new Double(3.1415),
    g: new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]}),
    l: [1, 'a', {x: 'y'}],
    m: {foo: 4, bar: 7}
  }
  var meta = { ttl: 10000 }
  var policy = { exists: Aerospike.policy.exists.CREATE_OR_REPLACE }

  client.put(key, record, meta, policy, (error) => {
    if (error) throw error

    var ops = [
      op.incr('i', 1),
      op.read('i'),
      lists.append('l', 'z'),
      maps.removeByKey('m', 'bar')
    ]

    client.operate(key, ops, (error, result) => {
      if (error) throw error
      console.log(result)   // => { c: 4, i: 124 }

      client.get(key, (error, record, meta) => {
        if (error) throw error
        console.log(record) // => { i: 124,
                            //      s: 'hello',
                            //      b: <Buffer 77 6f 72 6c 64>,
                            //      d: 3.1415,
                            //      g: '{"type":"Point","coordinates":[103.913,1.308]}',
                            //      l: [ 1, 'a', { x: 'y' }, 'z' ] },
                            //      m: { foo: 4 }
        client.close()
      })
    })
  })
})
```

More examples illustrating the use of the API are located in the
[`examples`](examples) directory.

Details about the API are available in the [`docs`](docs) directory.

<a name="Prerequisites"></a>
## Prerequisites

The aerospike package supports Node.js v0.12.x, v4.2.x (LTS) and v5.x as well
as io.js. To download and install the latest stable version of Node.js, visit
[nodejs.org](http://nodejs.org/) or use the version that comes bundled with
your operating system.

The Aerospike package includes a native addon. `gcc`/`g++` v4.8 or newer or
`clang`/`clang++` v3.4 or newer are required to build the addon with Node.js
v4.x/v5.x.

The Aerospike addon depends on the Aerospike C client library, which gets
downloaded during package installation. Either the cURL or Wget command line tool
is required for this. See ["C Client Resolution"](#C-Client-Resolution) below for
further information.

The package has the following compile time/run time dependencies:

| Library Name | .rpm Package | Description |
| --- | --- | --- |
| libssl | openssl | |
| libcrypto | openssl | Required for RIPEMD160 hash function. |
| liblua5.1 | lua | Required for Lua execution, used in query aggregation. |

Note: Lua is used for query aggregation. If the application is not using the aggregation feature, lua installation can be skipped.

### CentOS/RHEL 6+

To install library prerequisites via `yum`:

```bash
sudo yum install gcc-c++ openssl-devel lua-devel
```

Note: The `gcc` tool chain included in CentOS/RHEL 6.x is gcc-4.4. To build the
Aerospike addon using Node.js v4 or later, gcc-4.8 or later is required. To
update the gcc tool chain you can install a recent version of the
 [Red Hat Developer Toolset](https://access.redhat.com/documentation/en/red-hat-developer-toolset/)
or a compatible devtoolset version for CentOS.

### Debian 7+

To install library prerequisites via `apt-get`:

```bash
sudo apt-get install g++ libssl1.0.0 libssl-dev liblua5.1-dev
```

The following symlinks need to be created for Aerospike's packaged examples to compile:

```bash
sudo ln -s /usr/lib/liblua5.1.so /usr/lib/liblua.so
sudo ln -s /usr/lib/liblua5.1.a /usr/lib/liblua.a
```

### Ubuntu 12.04+

To install library prerequisites via `apt-get`:

```bash
sudo apt-get install g++ libssl1.0.0 libssl-dev liblua5.1-dev
```

Note: The `gcc` tool chain included in Ubuntu 12.04 is gcc-4.6. To build the
Aerospike addon using Node.js v4 or later, gcc-4.8 or later is required. To
update the gcc tool chain you can install a more recent version of gcc
toolchain using several available PPA repositories.

The following symlinks need to be created for Aerospike's packaged examples to compile:

```bash
sudo ln -s /usr/lib/x86_64-linux-gnu/liblua5.1.so /usr/lib/liblua.so
sudo ln -s /usr/lib/x86_64-linux-gnu/liblua5.1.a /usr/lib/liblua.a
```

### Mac OS X

Before starting with the Aerospike Nodejs Client, please make sure the following prerequisites are met:

- Mac OS X 10.8 or greater.
- Xcode 5 or greater.
- Lua 5.1.5 library.  Required when running queries with user defined aggregations.

#### Openssl library installation in Mac OS X.

```bash
$ brew install openssl
$ brew link openssl --force
```

#### Lua Installation in Mac OS X

Lua is required for performing aggregations on results returned from the database. The following are instruction for installing Lua 5.1:

```bash
$ curl -O http://www.lua.org/ftp/lua-5.1.5.tar.gz
$ tar xvf lua-5.1.5.tar.gz
$ cd lua-5.1.5
$ make macosx
$ make test
$ sudo make install
```

<a name="Installation"></a>
## Installation

The Aerospike Node.js client is a Node.js add-on module utilizing the Aerospike
C client. The installation will attempt to build the add-on module prior to
installation. The build step will resolve the Aerospike C client dependency as
described in [C Client Resolution](#C-Client-Resolution).

The Aerospike Node.js client can be installed like any other Node.js module, however
we provided the following information for those not so familiar with Node.js modules.

<a name="Primer-on-Node.js-Modules"></a>
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

If the application uses query aggregation feature, LUA library should be installed
following the instruction given in [Prerequisites](#Prerequisites). The last step
in aggregation is executed in the client machine which  uses LUA. To install `aerospike`
library with LUA enabled, an environment variable `USELUA` must be set. For more details
[Aerospike with Aggregation](#Aerospike with Aggregation)

```bash
$ export USELUA=1
```

<a name="Installing-via-npm-Registry"></a>
### Installing via npm Registry

Installing via npm Registry is pretty simple and most common install method, as
it only involves a single step.

Although the module may be installed globally or locally, we recommend performing
local installs.

To install the module as a dependency of your application, run the following
from your application's directory:

	$ npm install aerospike

In most cases, an application should specify `aerospike` as a dependency in
its `package.json`.

Once installed, the module can be required in the application:

	const Aerospike = require('aerospike')

<a name="Installing-via-Git-Repository"></a>
### Installing via Git Repository

The following is relevant for users who have cloned the repository, and want
to install it as a dependency of their application.

Installing via Git Repository is slightly different from installing via npm
registry, in that you will be referencing the module by path, rather than name.

Although the module may be installed globally or locally, we recommend performing
local installs.

#### Installing Globally

This option required root permissions. This will download the Aerospike C client
only once, which will improve the experience of using the module for many users.
However, you will need to first install the package globally using root permissions.

Run the following as a user with root permission or using the sudo command:

	$ npm install -g <PATH>

Where `<PATH>` is the path to the Aerospike Node.js client's Git respository is
located. This will install the module in a globally accessible location.

To install the module as a dependency of your application, run the following
from your application's directory:

	$ npm link aerospike

Linking to the module does not require root permission.

Once linked, the module can be required in the application:

	const Aerospike = require('aerospike')

#### Installing Locally

This option does not require root permissions to install the module as a
dependency of an application. However, it will require resolving the Aerospike
C client each time you install the dependency, as it will need to exist local
to the application.

To install the module as a dependency of your application, run the following
from your application's directory:

	$ npm install <PATH>

Where `<PATH>` is the path to the Aerospike Node.js client's Git respository is
located.

Once installed, the module can be required in the application:

	const Aerospike = require('aerospike')

<a name="Aerospike with Aggregation"></a>
### Aerospike with Aggregation

Aerospike nodejs client does not include LUA by default during installation. Application can set
an environment variable `USELUA` to inclue LUA library, and can use the Aggregation feature in
Aerospike. To install with Aggregation enabled:

	$ USELUA=1 npm install

If application includes `aerospike` as a dependency in `package.json` the variable `USELUA`
can be exported as a environment variable as follows:

	$ export USELUA=1

<a name="C-Client-Resolution"></a>
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

- [force download](#Force-Download) the C client
- Specifying a [custom search path](#Custom-Search-Path) for the C client.

<a name="Force-Download"></a>
#### Force Download

To force downloading of the C client, you can specify the `DOWNLOAD=1`
environment variable. Example:

    $ DOWNLOAD=1 npm install

<a name="Custom-Search-Path"></a>
#### Custom Search Path

If you have the Aerospike C client installed in a non-standard location or
built from source, then you can specify the search path for the build step to
use while resolving the Aerospike C client library.

Use the `PREFIX=<PATH>` environment variable to specify the search path for the
Aerospike C client. The `<PATH>` must be the path to a directory containing
`lib` and `include` subdirectories.

The following is an example of specifying the path to the Aerospike C client
build directory:

    $ export PREFIX=~/aerospike-client-c/target/Linux-x86_64

When Aerospike C Client is resolved through the environment variable PREFIX,
the location to lua files that comes with C client installation must also be specified.
Specifying lua file location is done using environment variable `AEROSPIKE_LUA_PATH=<PATH>`.
The `<PATH>` must be a path to a directory containing files `aerospike.lua` and `as.lua`.

The following is an example of specifying `AEROSPIKE_LUA_PATH` and then installing.

	$ export AEROSPIKE_LUA_PATH=/opt/aerospike/client/sys/udf/lua/
	$ npm install

<a name="Tests"></a>
## Tests

This module is packaged with a number of tests in the `test` directory.

Before running the tests, you need to update the dependencies:

    $ npm update

To run all the test cases:

    $ npm test

For details on the tests, see [`test/README.md`](test/README.md).


<a name="Examples"></a>
## Examples

A variety of example applications are provided in the [`examples`](examples) directory.
See the [`examples/README.md`](examples/README.md) for details.

<a name="Benchmarks"></a>
## Benchmarks

Benchmark utilies are provided in the [`benchmarks`](benchmarks) directory.
See the [`benchmarks/README.md`](benchmarks/README.md) for details.

<a name="API-Documentation"></a>
## API Documentation

API documentation is generated from the JS source code using JSDocs v3 and is
hosted at [http://www.aerospike.com/apidocs/nodejs](http://www.aerospike.com/apidocs/nodejs).

<a name="Versioning"></a>
## API Versioning

The Aerospike Node.js client library follows [semantic versioning](http://semver.org/).
Changes which break backwards compatibility will be indicated by an increase in
the major version number. Minor and patch releases, which increment only the
second and third version number, will always be backwards compatible.

<a name="API-Changes"></a>
### Backward Incompatible Changes

The documentation contains a list of [backward incompatible changes](docs/api-changes.md)
to the API by release.

## License

The Aerospike Node.js Client is made available under the terms of the Apache
License, Version 2, as stated in the file `LICENSE`.

Individual files may be made available under their own specific license, all
compatible with Apache License, Version 2. Please see individual files for
details.
