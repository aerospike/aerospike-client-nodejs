**This document covers the 1.x version of the Aerospike Node.js client. For the
2.0 client, please refer to the API documentation available at
[http://www.aerospike.com/apidocs/nodejs/](http://www.aerospike.com/apidocs/nodejs/).**

----------

# Introduction

This package describes the Aerospike Node.js Client API in detail.

## Usage

The aerospike module is the main entry point to the client API.

```js
var aerospike = require('aerospike')
```

Before connecting to a cluster, you must require `aerospike`, to get the aerospike object.

You can then define a client configuration, which is used to setup a client object for connecting to and operating against as cluster.

```js
var config = {
  hosts: [
    { addr: 'localhost', port: 3000 }
  ]
}

var client = aerospike.client(config)
```

The application will use the client object to connect to a cluster, then perform operations such as writing and reading records.

For more details on client operations, see [Client Class](client.md).

## API Reference

- [Aerospike Module](aerospike.md)
- [Client Class](client.md)
- [Configuration Object](configuration.md)
- [Data Models](datamodel.md)
- [Filters](filters.md)
- [Operator Objects](operators.md)
- [Policy Objects](policies.md)
- [Status Codes](status.md)
- [Scan Properties](scanproperties.md)

