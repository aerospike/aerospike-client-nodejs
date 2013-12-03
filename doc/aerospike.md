# Aerospike Module

- Usage
- [Functions](#functions)
	- [client()](#client)
	- [connect()](#connect)
- [Fields](#fields)
	- [Operators](#Operators)
	- [Policies](#Policies)
	- [Status](#Status)

<a name="usage"></a>
## Usage

The aerospike module can be imported into your module via:

```js
var aerospike = require("aerospike")
```



<a name="fields"></a>
## Fields



<a name="Operators"></a>
### Operators

The [Operators](operators.md) object contains an enumeration of values for defining operations.

Example:

```js
var operators = aerospike.Operators
```

For details, see: [Operators Object](operators.md).



<a name="Policies"></a>
### Policies

The [Policies](policies.md) object contains an enumeration of values for policies. modify the behavior of database operations. The policies object provides values that are available for each policy.

Example:

```js
var policies = aerospike.Policies
```

For details, see: [Policies Object](policies.md).


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