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

The client is compatible with Node.js 10, 12 (LTS), 14 (LTS), and 16 (LTS). It
supports the following operating systems: CentOS/RHEL 7/8, Debian 8/9/10,
Ubuntu 18.04/20.04, as well as many Linux distributions compatible with one of
these OS releases. macOS is also supported. The client port to Windows is a
community supported project and suitable for application prototyping and
development.

- [Usage](#Usage)
- [Prerequisites](#Prerequisites)
- [Installation](#Installation)
  - [Primer on Node.js Modules](#Primer-on-Node.js-Modules)
  - [Installing via npm Registry](#Installing-via-npm-Registry)
  - [Installing via Git Repository](#Installing-via-Git-Repository)
- [Documentation](#Documentation)
- [Tests](#Tests)
- [Benchmarks](#Benchmarks)

<a name="Usage"></a>
## Usage

The following is very simple example how to create, update, read and remove a
record using the Aerospike database.

```js
const Aerospike = require('aerospike')

const config = {
  hosts: '192.168.33.10:3000'
}
const key = new Aerospike.Key('test', 'demo', 'demo')

Aerospike.connect(config)
  .then(client => {
    const bins = {
      i: 123,
      s: 'hello',
      b: Buffer.from('world'),
      d: new Aerospike.Double(3.1415),
      g: Aerospike.GeoJSON.Point(103.913, 1.308),
      l: [1, 'a', {x: 'y'}],
      m: {foo: 4, bar: 7}
    }
    const meta = { ttl: 10000 }
    const policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE
    })

    return client.put(key, bins, meta, policy)
      .then(() => {
        const ops = [
          Aerospike.operations.incr('i', 1),
          Aerospike.operations.read('i'),
          Aerospike.lists.append('l', 'z'),
          Aerospike.maps.removeByKey('m', 'bar')
        ]

        return client.operate(key, ops)
      })
      .then(result => {
        console.log(result.bins) // => { i: 124, l: 4, m: null }

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
  })
  .catch(error => {
    console.error('Error: %s [%i]', error.message, error.code)
    if (error.client) {
      error.client.close()
    }
  })
```

<a name="Prerequisites"></a>
## Prerequisites

The Aerospike Node.js client supports all Node.js [LTS
releases](https://github.com/nodejs/Release#release-schedule). To download and
install the latest stable version of Node.js, visit
[nodejs.org](http://nodejs.org/) or use the version that comes bundled with
your operating system.

The package includes a native add-on. `gcc`/`g++` v4.8 or newer or
`clang`/`clang++` v3.4 or newer are required to build the add-on.

The package has the following compile time/run time dependencies:

| Library Name | Description |
| --- | --- |
| libssl | |
| libcrypto | Required for RIPEMD160 hash function. |
| libz | Required for (optional) command compression. |

### CentOS/RHEL

To install library prerequisites via `yum`:

```bash
sudo yum install gcc-c++ openssl-devel zlib-devel
```

### Debian

To install library prerequisites via `apt-get`:

```bash
sudo apt-get install g++ libssl1.0.0 libssl-dev libz-dev
```

### Ubuntu

To install library prerequisites via `apt-get`:

```bash
sudo apt-get install g++ libssl1.0.0 libssl-dev zlib1g-dev
```

### Mac OS X (Intel)

Before starting with the Aerospike Nodejs Client, please make sure the following prerequisites are met:

- Mac OS X 10.8 or greater.
- Xcode 5 or greater.

### Mac OS X (M1 Chip)

Currently C library does not support M1, so you can't install Aerospike Nodejs Client directly on your mac, see [Issue](https://github.com/aerospike/aerospike-client-nodejs/issues/430).
As a workaround, you can build your app inside of Docker with using `--platform` [option](https://docs.docker.com/engine/reference/commandline/build/).
Example of working docker-compose.yaml file will look like this:
```
version: '2.4'
services:
  my-node-js-app:
    build: .
    platform: linux/amd64
```

#### Openssl library installation in Mac OS X.

```bash
$ brew install openssl@1.1
$ brew link openssl@1.1 --force
$ unlink /usr/local/opt/openssl
$ ln -s /usr/local/Cellar/openssl@1.1/1.1.1o/ /usr/local/opt/openssl
```

### Windows

See [Prerequisites for Aerospike Node.js Client on Windows](https://github.com/aerospike/aerospike-client-nodejs/blob/master/README_WINDOWS.md).

<a name="Installation"></a>
## Installation

The Aerospike Node.js client is a Node.js add-on module utilizing the Aerospike
C client. The installation will attempt to install the pre-built binaries.

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

To clone the repository use the following command:

	$ git clone --recursive git@github.com:aerospike/aerospike-client-nodejs.git

Installing via Git Repository is slightly different from installing via npm
registry, in that you will be referencing the module by path, rather than name.

Although the module may be installed globally or locally, we recommend performing
local installs.

#### Building dependancy c client

Make sure to build c client before doing npm install variants
Run the following commands to build c-client:

	$ ./scripts/build-c-client.sh

#### Installing Globally

This option required root permissions. This will download the Aerospike C client
only once, which will improve the experience of using the module for many users.
However, you will need to first install the package globally using root permissions.

Run the following as a user with root permission or using the sudo command:

	$ npm install -g <PATH> --unsafe-perm --build-from-source

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

	$ npm install <PATH> --unsafe-perm --build-from-source

Where `<PATH>` is the path to the Aerospike Node.js client's Git respository is
located.

Once installed, the module can be required in the application:

	const Aerospike = require('aerospike')

<a name="Documentation"></a>
## Documentation

Detailed documentation of the client's API can be found at
[http://www.aerospike.com/apidocs/nodejs](https://www.aerospike.com/apidocs/nodejs).
This documentation is build from the client's source using [JSDocs
v3](http://usejsdoc.org/index.html) for every release.

The API docs also contain a few basic tutorials:

* [Getting Started - Connecting to an Aerospike database cluster](https://www.aerospike.com/apidocs/nodejs/tutorial-getting_started.html)
* [Managing Aerospike connections in a Node cluster](https://www.aerospike.com/apidocs/nodejs/tutorial-node_clusters.html)
* [Handling asynchronous database operations using Callbacks, Promises or `async`/`await`](https://www.aerospike.com/apidocs/nodejs/tutorial-callbacks_promises_async_await.html)

A variety of additional example applications are provided in the
[`examples`](examples) directory of this repository.

Backward incompatible API changes by release are documented at
https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html.

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
