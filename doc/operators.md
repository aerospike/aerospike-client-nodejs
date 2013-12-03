# Operators

The Operators object contains an enumeration of values for defining operations.

Example:

```js
var operators = aerospike.Operators

var ops = [
  { operator: operators.APPEND, bin: 'a', value: 'xyz'}
]

client.operate(key, ops, callback)
```


#### APPEND

Append the value to the bin. The bin must contain either String or a Byte Array, and the value must be of the same type.

```js
operators.APPEND
```

#### INCR

Add the value to the bin. The bin must contain an Integer.

```js
operators.APPEND
```

#### PREPEND

Prepend the value to the bin. The bin must contain either String or a Byte Array, and the value must be of the same type.

```js
operators.APPEND
```

#### READ

Read the value of the bin, after all other operations have completed.

```js
operators.APPEND
```

#### TOUCH

Update the TTL for a record.

#### WRITE

Update the value of the bin.
