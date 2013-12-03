# Operators

The Operators object provides functions to easily define operations to be performed on a record via the [`operate()`](client.md#operate) function.

Example:

```js
var op = aerospike.Operators

var ops = [
  op.append('a', 'hello'),
  op.append('a', 'world'),
  op.incr('b',10),
  op.read('a'),
  op.read('b'),
]

client.operate(key, ops, callback)
```

## Functions

### append(bin, value)

Append the value to the bin. The bin must contain either String or a Byte Array, and the value must be of the same type.

```js
operators.append('a', 'hello')
operators.append('a', 'world')
```

### incr(bin, value)

Add the value to the bin. The bin must contain an Integer.

```js
operators.incr('b', 10)
```

### prepend(bin, value)

Prepend the value to the bin. The bin must contain either String or a Byte Array, and the value must be of the same type.

```js
operators.prepend('c', 'world')
operators.prepend('c', 'hello')
```

### read(bin, value)

Read the value of the bin, after all other operations have completed.

```js
operators.read('d')
```

### touch([ttl])

Update the TTL for a record.

```js
operators.touch()
```

### write(bin, value)

Update the value of the bin.


```js
operators.write('e','hello world')
```

