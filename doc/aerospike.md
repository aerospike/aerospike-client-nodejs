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



<a name="Operators"></a>
### Operators

The Operators object contains an enumeration of values for defining operations.

**Values:**

- `APPEND` – Append the value to the bin. The bin must contain either String or a Byte Array, and the value must be of the same type.
- `INCR` – Add the value to the bin. The bin must contain an Integer.
- `PREPEND` – Prepend the value to the bin. The bin must contain either String or a Byte Array, and the value must be of the same type.
- `READ` – Read the value of the bin, after all other operations have completed.
- `TOUCH` – Update the TTL for a record.
- `WRITE` – Update the value of the bin.

Example:

```js
var operators = aerospike.Operators

var ops = [
  { operator: operators.APPEND, bin: 'a', value: 'xyz'}
]

client.operate(key, ops, callback)
```



<a name="Policies"></a>
### Policies

The Policies object contains an enumeration of values for policies. modify the behavior of database operations. The policies object provides values that are available for each policy.

**Key Policy Values:**

- `Key.DIGEST` – Send the digest value of the key. This is the recommended mode of operation. This calculates the digest and send the digest to the server. The digest is only calculated on the client, and not on the server. 
- `Key.SEND` – Send the key. This policy is ideal if you want to reduce the number of bytes sent over the network. This will only work if the combination the set and key value are less than 20 bytes, which is the size of the digest. This will also cause the digest to be computer once on the client and once on the server. If your values are not less than 20 bytes, then you should just use Policy.Key.DIGEST

**Retry Policy Values:**

- `Retry.NONE` – Only attempt an operation once
- `Retry.ONCE` – If an operation fails, attempt the operation one more time

**Generation Policy Values:**

- `Generation.IGNORE` – Write a record, regardless of generation.
- `Generation.EQ` – Write a record, ONLY if generations are equal.
- `Generation.GT` – Write a record, ONLY if local generation is greater-than remote generation.
- `Generation.DUP` – Write a record creating a duplicate, ONLY if the generation collides.

**Exists Policy Values:**

- `Exists.IGNORE` – Write the record, regardless of existence
- `Exists.CREATE` – Create a record, ONLY if it doesn't exist


Example:

```js
var policies = aerospike.Policies

client.get(key, {key=policies.Key.SEND}, callback)
```


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