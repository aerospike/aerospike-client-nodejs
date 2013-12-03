# Introduction

This package describes the Aerospike Node.js Client API in detail. 


## Build and Install

The module can be built and installed using the following command:

```sh
$ npm install
```

If not using npm, then you can build using node-gyp:

```sh
$ node-gyp rebuild
```

## Usage

The aerospike module is the main entry point to the client API. 

    var aerospike = require('aerospike');

Before connecting to a cluster, you must first define the client configuration to use while connected to the cluster. 

Example:

```js    
var config = {
  hosts: [
    { addr: "localhost", port: 3000 }
  ]
}
```

With the client configuration, you can call `connect()` on the aerospike object, to establish a connection with the cluster.

```js
var client = aerospike.connect(config);
```

The application uses this object to perform database operations such as writing and reading records.


## API Reference

- [Aerospike Module](aerospike.md)
- [Client Class](client.md)

