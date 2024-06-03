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

The client is compatible with Node.js 22, (Upcoming LTS), Node.js 20 (LTS),and 18 (LTS).
It supports the following operating systems:
- RHEL 8/9
- Debian 11
- Amazon Linux 2023
- Ubuntu 20.04/22.04/24.04 (Focal Fossa, Jammy Jellyfish, Noble Numbat)
- Many Linux distributions compatible with one of the above OS releases.
- macOS 12/13/14

The client is compatible with arm64, aarch64, and x86_64 architectures.

The Aerospike Node.js client supports all Node.js [LTS
releases](https://github.com/nodejs/Release#release-schedule). To download and
install the latest stable version of Node.js, visit
[nodejs.org](http://nodejs.org/).

Install the necessary "development tools" and other libraries to build the client software. 
Reference various docker files in the repository under the docker directory for more information.

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
npm install aerospike
```

To add `aerospike` as a dependency in _package.json_, run:

```bash
npm install aerospike --save-dev
```

To require the module in your application:
```bash
const Aerospike = require('aerospike')
```

## Usage

The following is very simple example how to create, update, read and remove a
record using the Aerospike database.

```js
const Aerospike = require('aerospike')

// INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
const config = {
  hosts: '192.168.33.10:3000',
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
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE,
      // Timeouts disabled, latency dependent on server location. Configure as needed.
      socketTimeout : 0, 
      totalTimeout : 0
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

#### RHEL/CentOS

To install library prerequisites using `yum`:

```bash
sudo yum group install "Development Tools" 
sudo yum install openssl openssl-devel
sudo yum install python3 python3-devel
```

#### Alpine Linux

```bash
apk add build-base \
    linux-headers \
    bash \
    libuv-dev \
    openssl-dev \
    lua5.1-dev \
    zlib-dev \
    git \
    python3
```

#### Amazon Linux

```bash
yum groupinstall "Development Tools"
yum install openssl openssl-devel
yum install python3 python3-devel
```

#### Debian

To install library prerequisites using `apt-get`:

```bash
sudo apt -y install software-properties-common
sudo apt -y install build-essential
sudo apt -y install libssl-dev
sudo apt -y install libarchive-dev cmake rsync curl libcurl4-openssl-dev zip
sudo apt -y install python3 python3-dev python3-pip
sudo apt install zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev \
    libsqlite3-dev libreadline-dev libffi-dev libbz2-dev -y
sudo apt -y install wget libtool m4 automake
```

#### Ubuntu

To install library prerequisites using `apt`:

```bash
sudo apt install g++ libssl libssl-dev zlib1g-dev
```

### Windows

See our [Windows README.md](https://github.com/aerospike/aerospike-client-nodejs/blob/master/README_WINDOWS.md) for details on how to build and install on windows.

### macOS

Before starting with the Aerospike Nodejs Client, verify that you have the following prerequisites:

- macOS 10.8 or greater.
- Xcode 5 or greater.


**OpenSSL Library**
OpenSSL is needed to build the Aerospike C Client. If downloading from NPM at version 5.6.0 or later, you will not need to 
have OpenSSL installed to use the Aerospike Nodejs Client. If you are using version 5.5.0 and below, you will need to do 
some additional linking to use the client, which is specified below.

We recommend using brew to install OpenSSL:

```bash
brew install openssl
```

For a Mac using ARM architecture, OpenSSL should be linked as shown below:

```bash
# When building from source before version 5.6 with openssl@3
sudo ln -s /opt/homebrew/opt/openssl@3/ /usr/local/opt/openssl;
# link here if before version 5.6.0
sudo ln -s /opt/homebrew/opt/openssl@3/ /usr/local/opt/openssl@3;

# When building from source with openssl@1.1
sudo ln -s /opt/homebrew/opt/openssl@1.1/ /usr/local/opt/openssl;
# link here if before version 5.6.0 with openssl@1.1
sudo ln -s /opt/homebrew/opt/openssl@1.1/ /usr/local/opt/openssl@1.1;
```

For a Mac using X86 architecture, OpenSSL should be linked as shown below:

```bash
# When building from source before version 5.6 with openssl@1.1
sudo ln -s /opt/homebrew/opt/openssl@1.1/ /usr/local/opt/openssl;
# link here if before version 5.6.0 with openssl@1.1
sudo ln -s /opt/homebrew/opt/openssl@1.1/ /usr/local/opt/openssl@1.1;
```

Before version 5.6.0, you may need to some add some variables to your profile for OpenSSL to be found.

```bash
export PATH="/usr/local/bin/:/usr/local/opt/openssl/bin:$PATH"
export LDFLAGS="-L/usr/local/opt/openssl/lib"
export CPPFLAGS="-I/usr/local/opt/openssl/include"  
export EXT_CFLAGS="-I/usr/local/opt/openssl/include"
# Make sure to source the changes to your shell profile
source ~/.bashrc
source ~/.profile
source ~/.zshrc
```

For 4x client support, install OpenSSL&#64;1.1 version.

**LIBUV Library**

Libuv is needed to build the Aerospike C Client. If downloading from NPM at version 5.6.0 or later, you will not need to 
have Libuv installed to use the Aerospike Nodejs Client. If you are using version 5.5.0 and below, you will need to do 
some additional linking to use the client, which is specified below.

We recommend using brew to install Libuv:

```bash
brew install libuv
```

For a Mac using ARM architecture, Libuv should be linked as shown below:

```bash
# When building from source before version 5.6
sudo ln -s /opt/homebrew/opt/libuv/ /usr/local/opt/libuv;
```

### Git Repository Installations

When using a cloned repository, install `aerospike` as a dependency of your application. Instead of referencing the module by name, you reference it by path.

To clone the repository use the following command:
```bash
  git clone --recursive git@github.com:aerospike/aerospike-client-nodejs.git
```

#### Building dependancy C client

Make sure to build the C client before doing npm install variants
Run the following commands to build the C client:
```bash
  ./scripts/build-c-client.sh
```

#### Building and installing Node.js client

To install the module as a dependency of your application, run the following in the application directory:

```bash
npm install --unsafe-perm --build-from-source
```

To require it in the application:

```bash
const Aerospike = require('aerospike')
```

## Documentation

Access the client API documentation at:
[https://docs.aerospike.com/apidocs/nodejs](https://docs.aerospike.com/apidocs/nodejs).
This documentation is built from the client's source using [JSDocs
v4](https://www.npmjs.com/package/jsdoc) for every release.

The API docs also contain a few basic tutorials:

* [Getting Started - Connecting to an Aerospike database cluster](https://www.aerospike.com/apidocs/nodejs/tutorial-getting_started.html)
* [Managing Aerospike connections in a Node cluster](https://www.aerospike.com/apidocs/nodejs/tutorial-node_clusters.html)
* [Handling asynchronous database operations using Callbacks, Promises or `async`/`await`](https://www.aerospike.com/apidocs/nodejs/tutorial-callbacks_promises_async_await.html)

A variety of additional example applications are provided in the
[`examples`](examples) directory of this repository.

Access backward incompatible API changes by a release at:
https://developer.aerospike.com/client/nodejs/usage/incompatible.

### API Versioning

The Aerospike Node.js client library follows [semantic versioning](http://semver.org/).
By Aerospike versioning guidelines, changes which may break backwards compatibility are
indicated by an increase in the major version number.
Minor, or patch releases, which are incremented only the
second and third version number, are always backwards compatible.


## Tests

The client includes a comprehensive test suite using
[Mocha](http://mochajs.org). The tests can be found in the repository under test directory.

Before running the tests, you need to update the dependencies:

    npm update

To run all the test cases:

    npm test

Note: make sure your server has TTL enabled for the `test` namespace ([Namespace Retention Configuration](https://docs.aerospike.com/server/operations/configure/namespace/retention)) to allow all tests to run correctly.

To run the tests and also report on test coverage:

    npm run coverage

## Benchmarks

Benchmark utilities are provided in the repository under benchmarks directory. See the benchmarks/README.md for details.

## License

The Aerospike Node.js Client is made available under the terms of the Apache
License, Version 2, as stated in the LICENSE file.

Individual files may be made available under their own specific license, all
compatible with Apache License, Version 2. Refer to individual files for
details.