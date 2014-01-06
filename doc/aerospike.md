# Aerospike Module

- [Usage](#usage)
- [Fields](#fields)
	- [Operators](#Operators)
	- [Policies](#Policies)
	- [Status](#Status)
- [Functions](#functions)
	- [client()](#client)
	- [key()](#key)


<a name="usage"></a>
## Usage

The aerospike module can be imported into your module via:

```js
var aerospike = require("aerospike")
```



<a name="fields"></a>
## Fields

<!--
################################################################################
Policies
################################################################################
-->
<a name="Policies"></a>

### Policies

Policies contains the allowed values for policies for each of the [client](client.md) operations.

```js
aerospike.Policies
```

For details, see [Policies Object](policies.md)


<!--
################################################################################
Operators
################################################################################
-->
<a name="Operators"></a>

### Operators

Operators is a collection of functions that simplify the construction of operations for the [client](client.md) [`operate()`](client.md#operate) function.

```js
aerospike.Operators
```

For details, see [Operators Object](operators.md)

<!--
################################################################################
Status
################################################################################
-->
<a name="Status"></a>

### Status

Status is a collection of the Aerospike status codes. These can be used to compare against the status codes returned from operations.

```js
aerospike.Status
```

For details, see [Status Object](status.md)

<a name="functions"></a>
## Functions

<!--
################################################################################
client
################################################################################
-->
<a name="client"></a>

### client(config): Client

Creates a new [client](client.md) with the provided configuration.

Parameters:

- `config` – The configuration for the new client.

Returns a new client object.

Example:

```js
var client = aerospike.client(config)
```

For detals, see [Client Class](client.md).

<!--
################################################################################
key
################################################################################
-->
<a name="key"></a>

### key(ns, set, key, digest=null): Client

Creates a new [key object](datamodel.md#key) with the provided fields.

Parameters:

- `ns` – The namespace for the key.
- `set` – The set for the key. Must be String or `null`.
- `key` – The value for the key. Must be either Integer, String or Buffer.
- `digest` – The digest for the key. Must be a Buffer. Default is `null`, which means it will be generated on first use.

Returns a new key.

Example:

```js
var key = aerospike.key("test", "demo", 123)
```

For detals, see [Key Object](datamodel.md#key).

