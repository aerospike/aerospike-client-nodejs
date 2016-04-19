**This document covers the 1.x version of the Aerospike Node.js client. For the
2.0 client, please refer to the API documentation available at
[http://www.aerospike.com/apidocs/nodejs/](http://www.aerospike.com/apidocs/nodejs/).**

----------

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
    - [Double()](#Double)
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
Double
################################################################################
-->
<a name="Double"></a>

### Double(num)

Returns a Number object, which will be stored as double in Aerospike server.
Node.js supports only Number datatype, which includes int32, int64(precision is lost for values greater than 2^53-1),
float and double. `123.00` is interpreted as int32 in node.js. If the application want to enforce `123.00` be stored
as double in Aerospike, `aerospike.Double(123.00)` interface should be used. This is useful when writing data using node.js
application and reading data in a language(C, JAVA, PYTHON)  which supports double datatype.

Parameters:

- `num` – data of type Number.


Example:

```js
var doubleNumber = aerospike.Double(123.00)
```

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
var key = aerospike.key('test', 'demo', 123)
```

For details, see [Key Object](datamodel.md#key).

