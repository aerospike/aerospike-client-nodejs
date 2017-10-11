# Aerospike Node.js Client [![travis][travis-image]][travis-url] [![codecov][codecov-image]][codecov-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url]

[travis-image]: https://travis-ci.org/aerospike/aerospike-client-nodejs.svg?branch=master
[travis-url]: https://travis-ci.org/aerospike/aerospike-client-nodejs
[codecov-image]: https://codecov.io/gh/aerospike/aerospike-client-nodejs/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/aerospike/aerospike-client-nodejs
[npm-image]: https://img.shields.io/npm/v/aerospike.svg
[npm-url]: https://www.npmjs.com/package/aerospike
[downloads-image]: https://img.shields.io/npm/dm/aerospike.svg
[downloads-url]: http://npm-stat.com/charts.html?package=aerospike

An Aerospike add-on module for Node.js.

This module is compatible with Node.js v4.x (LTS), v6.x (LTS) and v8.x. It
supports the following operating systems: CentOS/RHEL 6/7, Debian 7/8,
Ubuntu 12.04/14.04/16.04, as well as many Linux destributions compatible with
one of these OS releases. macOS is also supported.

- [Usage](#Usage)
- [Prerequisites](#Prerequisites)
- [Installation](#Installation)
  - [Primer on Node.js Modules](#Primer-on-Node.js-Modules)
  - [Installing via npm Registry](#Installing-via-npm-Registry)
  - [Installing via Git Repository](#Installing-via-Git-Repository)
  - [C Client Resolution](#C-Client-Resolution)
    - [Force Download](#Force-Download)
    - [Custom Search Path](#Custom-Search-Path)
- [Documentation](#Documentation)
- [Tests](#Tests)
- [Benchmarks](#Benchmarks)

<a name="Usage"></a>
## Usage

The following is very simple example how to create, update, read and remove a
record using the Aerospike database.

```js
const Aerospike = require('aerospike')

let config = {
  hosts: '192.168.33.10:3000'
}
let key = new Aerospike.Key('test', 'demo', 'demo')

Aerospike.connect(config)
  .then(client => {
    let bins = {
      i: 123,
      s: 'hello',
      b: Buffer.from('world'),
      d: new Aerospike.Double(3.1415),
      g: new Aerospike.GeoJSON({type: 'Point', coordinates: [103.913, 1.308]}),
      l: [1, 'a', {x: 'y'}],
      m: {foo: 4, bar: 7}
    }
    let meta = { ttl: 10000 }
    let policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE
    })

    return client.put(key, bins, meta, policy)
      .then(() => {
        let ops = [
          Aerospike.operations.incr('i', 1),
          Aerospike.operations.read('i'),
          Aerospike.lists.append('l', 'z'),
          Aerospike.maps.removeByKey('m', 'bar')
        ]

        return client.operate(key, ops)
      })
      .then(result => {
        console.log(result.bins)   // => { c: 4, i: 124, m: null }

        return client.get(key)
      })
      .then(record => {
        console.log(record.bins) // => { i: 124,
                                 //      s: 'hello',
                                 //      b: <Buffer 77 6f 72 6c 64>,
                                 //      d: 3.1415,
                                 //      g: '{"type":"Point","coordinates":[103.913,1.308]}',
                                 //      l: [ 1, 'a', { x: 'y' }, 'z' ],
                                 //      m: { foo: 4 } }
      })
      .then(() => client.close())
      .catch(error => {
        client.close()
        return Promise.reject(error)
      })
  })
  .catch(error => console.log(error))
```

More examples illustrating the use of the API are located in the
[`examples`](examples) directory.

Details about the API are available in the [`docs`](docs) directory.

<a name="Prerequisites"></a>
## Prerequisites

The aerospike package supports Node.js v4.x (LTS), v6.x (LTS) and v8.x. To
download and install the latest stable version of Node.js, visit
[nodejs.org](http://nodejs.org/) or use the version that comes bundled with
your operating system.

The Aerospike package includes a native addon. `gcc`/`g++` v4.8 or newer or
`clang`/`clang++` v3.4 or newer are required to build the addon.

The Aerospike addon depends on the Aerospike C client library, which gets
downloaded during package installation. Either the cURL or Wget command line tool
is required for this. See ["C Client Resolution"](#C-Client-Resolution) below for
further information.

The package has the following compile time/run time dependencies:

| Library Name | .rpm Package | Description |
| --- | --- | --- |
| libssl | openssl | |
| libcrypto | openssl | Required for RIPEMD160 hash function. |

### CentOS/RHEL 6+

To install library prerequisites via `yum`:

```bash
sudo yum install gcc-c++ openssl-devel
```

Note: The `gcc` tool chain included in CentOS/RHEL 6.x is gcc-4.4. To build the
Aerospike addon using Node.js v4 or later, gcc-4.8 or later is required. To
update the gcc tool chain you can install a recent version of the
 [Red Hat Developer Toolset](https://access.redhat.com/documentation/en/red-hat-developer-toolset/)
or a compatible devtoolset version for CentOS.

### Debian 7+

To install library prerequisites via `apt-get`:

```bash
sudo apt-get install g++ libssl1.0.0 libssl-dev
```

### Ubuntu 12.04+

To install library prerequisites via `apt-get`:

```bash
sudo apt-get install g++ libssl1.0.0 libssl-dev
```

Note: The `gcc` tool chain included in Ubuntu 12.04 is gcc-4.6. To build the
Aerospike addon using Node.js v4 or later, gcc-4.8 or later is required. To
update the gcc tool chain you can install a more recent version of gcc
toolchain using several available PPA repositories.

### Mac OS X

Before starting with the Aerospike Nodejs Client, please make sure the following prerequisites are met:

- Mac OS X 10.8 or greater.
- Xcode 5 or greater.

#### Openssl library installation in Mac OS X.

```bash
$ brew install openssl
$ brew link openssl --force
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


<a name="Documentation"></a>
## Documentation

Detailed documentation of the client's API can be found at
[http://www.aerospike.com/apidocs/nodejs](https://www.aerospike.com/apidocs/nodejs).
This documentation is build from the client's source using [JSDocs
v3](http://usejsdoc.org/index.html) for every release.

The API docs also contain a few basic tutorials:

* [Getting Started - Connecting to an Aerospike database cluster](https://www.aerospike.com/apidocs/nodejs/tutorial-getting_started.html)
* [Managing Aerospike connections in a Node cluster](https://www.aerospike.com/apidocs/nodejs/tutorial-node_clusters.html)
* [Handling asynchronous database operations using Callbacks, Promises or async/await](https://www.aerospike.com/apidocs/nodejs/tutorial-callbacks_promises_async_await.html)

A variety of additional example applications are provided in the
[`examples`](examples) directory of this repository.

The list of [backward incompatible API changes](docs/api-changes.md) by release,
to the API by release.

### API Versioning

The Aerospike Node.js client library follows [semantic versioning](http://semver.org/).
Changes which break backwards compatibility will be indicated by an increase in
the major version number. Minor and patch releases, which increment only the
second and third version number, will always be backwards compatible.


<a name="Tests"></a>
## Tests

The client includes a comprehensive test suite using
[Mocha](http://mochajs.org). The tests can be found in the ['test'](test)
directory.

Before running the tests, you need to update the dependencies:

    $ npm update

To run all the test cases:

    $ npm test

To run the tests and also report on test coverage:

    $ npm run coverage

<a name="Benchmarks"></a>
## Benchmarks

Benchmark utilies are provided in the [`benchmarks`](benchmarks) directory.
See the [`benchmarks/README.md`](benchmarks/README.md) for details.


## License

The Aerospike Node.js Client is made available under the terms of the Apache
License, Version 2, as stated in the file `LICENSE`.

Individual files may be made available under their own specific license, all
compatible with Apache License, Version 2. Please see individual files for
details.
