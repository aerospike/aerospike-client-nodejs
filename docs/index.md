**This document covers the 1.x version of the Aerospike Node.js client. For the
2.0 client, please refer to the API documentation available at
[http://www.aerospike.com/apidocs/nodejs/](http://www.aerospike.com/apidocs/nodejs/).**

----------

# Introduction

This package describes the Aerospike Node.js Client API in detail.


## Build and Install

The module can be built and installed using the following command:

```shell
$ npm install
```

If not using npm, then you can build using node-gyp:

```shell
$ node-gyp rebuild
```

## Usage

The aerospike module is the main entry point to the client API.

```node
var aerospike = require('aerospike')
```

Before connecting to a cluster, you must first define the client configuration to use while connected to the cluster.

Example:

```node
var config = {
  hosts: [
    { addr: 'localhost', port: 3000 }
  ]
}
```

With the client configuration, you can call `connect()` on the aerospike object, to establish a connection with the cluster.

```node
var client = aerospike.connect(config)
```

The application uses this object to perform database operations such as writing and reading records.

## API Reference

- [Aerospike Module](aerospike.md)
- [Client Class](client.md)
- [Policies Object](policies.md)
- [Operators Object](operators.md)