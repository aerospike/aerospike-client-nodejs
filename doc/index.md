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

    var aerospike = require('aerospike');

Before connecting to a cluster, you must first define the client configuration to use while connected to the cluster. 

Example:

```node    
var config = {
  hosts: [
    { addr: "localhost", port: 3000 }
  ]
}
```

With the client configuration, you can call `connect()` on the aerospike object, to establish a connection with the cluster.

```node
var client = aerospike.connect(config);
```

The application uses this object to perform database operations such as writing and reading records.


## Data Model

### Records

A record is represented as an object. The keys of the object are the names of the fields (bins) or a record. The values for each field can either be Integer, String or Buffer. 

Example of a record with 3 fields:

```node
var record = {
  a: 123,
  b: "xyz",
  c: new Buffer("hello world!")
}
```

### Metadata

Some operations allow you to provide metadata with a record, including:

- `gen` – (optional) The generation (version) of the record. Must be an Integer.
- `ttl` – (optional) The time-to-live (expiration) of the record. Must be an Integer.

Example:

```node
var metadata = {
  gen: 1,
  ttl: 6000
}
```

### Keys

Records are addressable via their key. A key is an object containing:

- `ns` — The namespace of the key. Must be a String.
- `set` – (optional) The set of the key. Must be a String.
- `key` – The value of the key. May be either Integer, String or Buffer.

Example:

```node
var key = {
  ns: "test",
  set: "demo",
  key: 123
}
```

## Aerospike Module


### connect(config): [Client](#client_class)

Connect to the aerospike cluster. Returns a new [`Client`](#client_class) object.

```node
var client = aerospike.connect(config)
```

Arguments:

- `config` – The client configuration to use while attempting to connect.


<a name="client_class"></a>
## Client Class



### close()

Close the connection to the cluster.

	client.close()


