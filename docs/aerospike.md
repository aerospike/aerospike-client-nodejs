# Aerospike Module

- [Usage](#usage)
- [Fields](#fields)
	- [filter](#filter)
    - [log](#log)
	- [operators](#operators)
	- [policies](#Policies)
	- [status](#status)
	- [scanStatus](#scanStatus)
	- [scanPriority](#scanPriority)
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
aerospike.policy
```

For details, see [Policies Object](policies.md)


<!--
################################################################################
operators
################################################################################
-->
<a name="operators"></a>

### operators

operators is a collection of functions that simplify the construction of operations for the [client](client.md) [`operate()`](client.md#operate) function.

```js
aerospike.operator
```

For details, see [operators Object](operators.md)

<!--
################################################################################
status
################################################################################
-->
<a name="status"></a>

### status

status is a collection of the Aerospike status codes. These can be used to compare against the status codes returned from operations.

```js
aerospike.status
```

For details, see [status Object](status.md)

<!--
################################################################################
scanStatus
################################################################################
-->
<a name="scanStatus"></a>

### scanStatus

Status of a particular background scan.

```js
aerospike.scanStatus
```

For details, see [scanStatus Object](scanproperties.md#scanStatus)

<!--
################################################################################
scanPriority
################################################################################
-->
<a name="scanPriority"></a>

### scanPriority

Priority levels for a given scan operation.

```js
aerospike.scanPriority
```

For details, see [scanPriority Object](scanproperties.md#scanPriority)

<!--
################################################################################
Log
################################################################################
-->
<a name="Log"></a>

### Log

Log is a collection of the various logging levels available in Aerospike. This logging levels can be used to modify the granularity of logging from the API.
Default level is INFO.

```js
aerospike.log
```

For details, see [log Object](log.md)

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

For details, see [Key Object](datamodel.md#key).

