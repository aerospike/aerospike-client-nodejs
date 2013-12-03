# Aerospike Module

- [Usage](#usage)
- [Fields](#fields)
	- [Operators](#Operators)
	- [Policies](#Policies)
	- [Status](#Status)
- [Functions](#functions)
	- [client()](#client)
	- [connect()](#connect)

<a name="usage"></a>
## Usage

The aerospike module can be imported into your module via:

```js
var aerospike = require("aerospike")
```



<a name="fields"></a>
## Fields

<a name="Policies"></a>
### policies

For details, see [Policies Object](policies.md)


<a name="Operators"></a>
### operators

For details, see [Operators Object](operators.md)

<a name="functions"></a>
## Functions


<a name="client"></a>
### client(config): Client

Creates a new [client](client.md) with the provided configuration.

Example:

```js
var client = aerospike.client(config)
```

For detals, see [Client Class](client.md).



<a name="connect"></a>
### connect(config): Client

Creates a new [client](client.md) with the provided configuration and connect to the cluster.

This is a convenience function for:

```js
var client = aerospike.client(config)
client.connect()
```

For details, see [Client Class](client.md).