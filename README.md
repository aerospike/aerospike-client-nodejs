# Aerospike Node.js Client [![travis][travis-image]][travis-url] [![codecov][codecov-image]][codecov-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url]

[travis-image]: https://travis-ci.org/aerospike/aerospike-client-nodejs.svg?branch=master
[travis-url]: https://travis-ci.org/aerospike/aerospike-client-nodejs
[codecov-image]: https://codecov.io/gh/aerospike/aerospike-client-nodejs/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/aerospike/aerospike-client-nodejs
[npm-image]: https://img.shields.io/npm/v/aerospike.svg
[npm-url]: https://www.npmjs.com/package/aerospike
[downloads-image]: https://img.shields.io/npm/dm/aerospike.svg
[downloads-url]: http://npm-stat.com/charts.html?package=aerospike

The Aerospike Node.js client is a Node.js add-on module, written using V8.

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


## Prerequisites

The client is compatible with Node.js 10, 12 (LTS), 14 (LTS), 16 (LTS) and 18 (LTS). It
supports the following operating systems: CentOS/RHEL 7/8, Debian 8/9/10,
Ubuntu 18.04/20.04, as well as many Linux distributions compatible with one of
these OS releases. macOS is also supported. The client port to Windows is a
community supported project and suitable for application prototyping and
development.

The Aerospike Node.js client supports all Node.js [LTS
releases](https://github.com/nodejs/Release#release-schedule). To download and
install the latest stable version of Node.js, visit
[nodejs.org](http://nodejs.org/) or use the version that comes bundled with
your operating system.

### Libraries

The client library requires the following libraries to be present on the machine for building and running:

|Library Name |	.rpm Package | Description
|--|--|--
| libssl | openssl |
|libcrypto | openssl | Required for the `RIPEMD160` hash function.

#### CentOS/RHEL

To install library prerequisites using `yum`:

```bash
sudo yum install openssl-devel
```
Some CentOS installation paths do not include required C development tools. These packages may also be required:

```bash
sudo yum install gcc gcc-c++
```

#### Debian

To install library prerequisites using `apt-get`:

```bash
sudo apt-get install g++ libssl1.0.0 libssl-dev libz-dev
```

#### Ubuntu

To install library prerequisites using `apt-get`:

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

**Openssl Library**

```bash
$ brew install openssl
$ brew link openssl --force
```
**LIBUV Library**

```bash
$ brew install libuv
$ brew link libuv --force
```

## Installation

The Aerospike Node.js client is an add-on module that uses the Aerospike C client. The installation will attempt to install the pre-built binaries including dependent C client.

You can install the Aerospike Node.js client like any other Node.js module.

### Primer on Node.js Modules

Node.js modules are containers of JavaScript code and a `package.json`, which defines
the module, its dependencies and requirements. Modules are usually installed as
dependencies of other Node.js applications or modules. The modules are installed in
the application's `node_modules` directory, and can be utilized within the program
by requiring the module by name.

### npm Registry Installations

To install `aerospike` as a dependency of your project, in your project directory run:

```bash
$ npm install aerospike
```

To add `aerospike` as a dependency in _package.json_, run:

```bash
$ npm install aerospike --save-dev
```

To require the module in your application:
```bash
const Aerospike = require('aerospike')
```

### Git Repository Installations

When using a cloned repository, install `aerospike` as a dependency of your application. Instead of referencing the module by name, you reference it by path.

To clone the repository use the following command:

	$ git clone --recursive git@github.com:aerospike/aerospike-client-nodejs.git

:::note
Install the Aerospike Node.js module locally.
:::

#### Building dependancy C client

Make sure to build the C client before doing npm install variants
Run the following commands to build the C client:

	$ ./scripts/build-c-client.sh

To install the module as a dependency of your application, run the following in the application directory:

```bash
$ npm install --unsafe-perm --build-from-source
```

To require it in the application:

```bash
const Aerospike = require('aerospike')
```

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

## Benchmarks

Benchmark utilies are provided in the [`benchmarks`](benchmarks) directory.
See the [`benchmarks/README.md`](benchmarks/README.md) for details.


## License

The Aerospike Node.js Client is made available under the terms of the Apache
License, Version 2, as stated in the file `LICENSE`.

Individual files may be made available under their own specific license, all
compatible with Apache License, Version 2. Please see individual files for
details.
