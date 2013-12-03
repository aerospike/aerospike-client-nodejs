
# Data Model

## Records

A record is represented as an object. The keys of the object are the names of the fields (bins) or a record. The values for each field can either be Integer, String or Buffer. 

Example of a record with 3 fields:

```js
var record = {
  a: 123,
  b: "xyz",
  c: new Buffer("hello world!")
}
```

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

## Keys

Records are addressable via their key. A key is an object containing:

- `ns` — The namespace of the key. Must be a String.
- `set` – (optional) The set of the key. Must be a String.
- `key` – The value of the key. May be either Integer, String or Buffer.

Example:

```js
var key = {
  ns: "test",
  set: "demo",
  key: 123
}
```