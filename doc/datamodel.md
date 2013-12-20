
# Data Model

<<<<<<< HEAD
<!--
################################################################################
record
################################################################################
-->
<a name="record"></a>

=======
>>>>>>> d39fa88f028e87f1b5585798cd9f3a01d71ee656
## Record

A record is how the data is represented and stored in the database. A record represented as an object. The keys of the object are the names of the fields (bins) of a record. The values for each field can either be Integer, String or Buffer. 

Example of a record with 3 fields:

```js
var record = {
  a: 123,
  b: "xyz",
  c: new Buffer("hello world!")
}
```

<<<<<<< HEAD
<!--
################################################################################
metadata
################################################################################
-->
<a name="metadata"></a>

=======
>>>>>>> d39fa88f028e87f1b5585798cd9f3a01d71ee656
## Metadata

Some operations allow you to provide metadata with a record, including:

- `gen` – (optional) The generation (version) of the record. Must be an Integer.
- `ttl` – (optional) The time-to-live (expiration) of the record. Must be an Integer.

Example:

```js
var metadata = {
  gen: 1,
  ttl: 6000
}
```

<<<<<<< HEAD
<!--
################################################################################
key
################################################################################
-->
<a name="key"></a>

=======
>>>>>>> d39fa88f028e87f1b5585798cd9f3a01d71ee656
## Key

A record is addressable via its key. A key is an object containing:

- `ns` — The namespace of the key. Must be a String.
- `set` – (optional) The set of the key. Must be a String.
<<<<<<< HEAD
- `key` – (optional) The value of the key. May be either Integer, String or Buffer.
- `digest` – (optional) The digest value of the current key. Must be a Buffer.

A key can be defined as an object or using [`aerospike.key()`](aerospike.md#key):
=======
- `key` – The value of the key. May be either Integer, String or Buffer.
>>>>>>> d39fa88f028e87f1b5585798cd9f3a01d71ee656

Example:

```js
var key = {
  ns: "test",
  set: "demo",
  key: 123
}
<<<<<<< HEAD
```

Alternatively:

```js
aerospike.key("test", "demo", 123)
```


<!--
################################################################################
error
################################################################################
-->
<a name="error"></a>

## Error

Error is an object which is populated with the status of client operations. The
`code` attribute is set for all operations. On success, it will be 
`AEROSPIKE_OK`. On failure, the `code` will not be `AEROSPIKE_OK` and the other 
attributes will be populated.

Attributes:

- `code`    – Is a constant of type [`Status`](status.md), it is the return status of any database operation
- `file`    – The file in which the error occured.
- `func`    – The function in which the error occured.
- `line`    – The line number in which the error occured.


=======
```
>>>>>>> d39fa88f028e87f1b5585798cd9f3a01d71ee656
