# Operators

The Operators object provides functions to easily define operations to be performed on a record via the [`operate()`](client.md#operate) function.

Example:

```js
var op = aerospike.operator

var ops = [
  op.append('a', 'hello'),
  op.append('a', 'world'),
  op.incr('b', 10),
  op.read('a'),
  op.read('b')
]

client.operate(key, ops, function (error, record, meta, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```

<a name="Functions"></a>
## Functions

<!--
################################################################################
append()
################################################################################
-->
<a name="append"></a>

### `append(bin, value)`

Append the value to the bin. The bin must contain either String or a Byte Array, and the value must be of the same type.

Parameters:

- `bin`         – The name of the bin to append a value to.
- `value`       – The value to append to the bin.

```js
op.append('a', 'hello')
op.append('a', 'world')
```

<!--
################################################################################
increment()
################################################################################
-->
<a name="increment"></a>

### `incr(bin, value)`

Add the value to the bin. The bin must contain an Integer.

Parameters:

- `bin`         – The name of the bin to increment the value.
- `value`       – The value to increment the bin by.

```js
op.incr('b', 10)
```

<!--
################################################################################
prepend()
################################################################################
-->
<a name="prepend"></a>

### `prepend(bin, value)`

Prepend the value to the bin. The bin must contain either String or a Byte Array, and the value must be of the same type.

Parameters:

- `bin`         – The name of the bin to prepend a value to.
- `value`       – The value to prepend to the bin.

```js
op.prepend('c', 'world')
op.prepend('c', 'hello')
```

<!--
################################################################################
read()
################################################################################
-->
<a name="read"></a>

### `read(bin)`

Read the value of the bin, after all other operations have completed.

Parameters:

- `bin` – The name of the bin to read the value of.

Example:

```js
op.read('d')
```

<!--
################################################################################
append()
################################################################################
-->
<a name="append"></a>

### `touch(ttl=null)`

Update the TTL for a record.

Parameters:

- `ttl` – (optional) The new relative TTL to set for the record, when it is touched.

Example:

```js
op.touch()
```

<!--
################################################################################
write()
################################################################################
-->
<a name="write"></a>

### `write(bin, value)`

Update the value of the bin.

Parameters:

- `bin`         – The name of the bin to set the value for.
- `value`       – The value to set the bin to.

Example:

```js
op.write('e','hello world')
```

<a name="CDTListFunctions"></a>
## List (CDT) Functions

Additional operations are supported on the [List](http://www.aerospike.com/docs/guide/cdt-list.html) data type.

<a name="listAppend"></a>
### `listAppend(bin, value)`

Adds an element to the end of the list.

Parameters:

- `bin`         - The name of the bin containing the List.
- `value`       - The value to be appended.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listAppend('tags', 'orange')
// => record = {tags: ['blue', 'yellow', 'pink', 'orange']}
```

<a name="listAppendItems"></a>
### `listAppendItems(bin, list)`

Adds a list of elements to the end of the list.

Parameters:

- `bin`         - The name of the bin containing the List.
- `list`        - Array of elements to appended.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listAppendItems('tags', ['orange', 'green'])
// => record = {tags: ['blue', 'yellow', 'pink', 'orange', 'green']}
```

<a name="listInsert"></a>
### `listInsert(bin, index, value)`

Inserts an element at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - List index at which the new element should be inserted.
- `value`       - The value to be inserted.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listInsert('tags', 2, 'orange')
// => record = {tags: ['blue', 'yellow', 'orange', 'pink']}
```

<a name="listInsertItems"></a>
### `listInsertItems(bin, index, list)`

Inserts a list of elements at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - List index at which the new element should be inserted.
- `list`        - Array of elements to be inserted.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listInsertItems('tags', 2, ['orange', 'green'])
// => record = {tags: ['blue', 'yellow', 'orange', 'green', 'pink']}
```

<a name="listPop"></a>
### `listPop(bin, index)`

Removes and returns the list element at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - Index of the element to be removed.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listPop('tags', 1)
// returns: 'yellow'
// => record = {tags: ['blue', 'pink']}
```

<a name="listPopRange"></a>
### `listPopRange(bin, index)`

Removes and returns the list elements at the specified range.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - Index of the first element in the range of elements to be removed.
- `count`       - [optional] Number of elements to be removed; if not specified, remove and return all elements until the end of the list.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listPopRange('tags', 0, 2)
// returns: ['blue', 'yellow']
// => record = {tags: ['pink']}
```

<a name="listRemove"></a>
### `listRemove(bin, index)`

Removes the list element at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - Index of the element to be removed.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listRemove('tags', 1)
// => record = {tags: ['blue', 'pink']}
```

<a name="listRemoveRange"></a>
### `listRemoveRange(bin, index)`

Removes the list elements at the specified range.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - Index of the first element in the range of elements to be removed.
- `count`       - [optional] Number of elements to be removed; if not specified, remove all elements until the end of the list.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listRemoveRange('tags', 1, 2)
// => record = {tags: ['blue']}
```

<a name="listClear"></a>
### `listClear(bin)`

Removes all elements from the list.

Parameters:

- `bin`         - The name of the bin containing the List.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listClear('tags')
// => record = {tags: []}
```

<a name="listSet"></a>
### `listSet(bin, index, value)`

Sets a list element at the specified index to a new value.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - The index of the element to be replaced
- `value`       - The new value of the list element.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listSet('tags', 1, 'green')
// => record = {tags: ['blue', 'green', 'pink']}
```

<a name="listTrim"></a>
### `listTrim(bin, index, count)`

Removes all list elements not within the specified range.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - The start index of the range of elements to retain.
- `number`      - The number of elements to retain.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listTrim('tags', 1, 1)
// => record = {tags: ['yellow']}
```

<a name="listGet"></a>
### `listGet(bin, index)`

Returns the list element at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - The index of the element to be returned.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listGet('tags', 0)
// returns: 'blue'
```

<a name="listGetRange"></a>
### `listGetRange(bin, index, count)`

Returns a list of element at the specified range.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - The start index of the range of elements to return.
- `number`      - [optional] The number of elements to return; if not specified, return all elements until the end of the list.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listGetRange('tags', 0, 2)
// returns: ['blue', 'yellow']

op.listGetRange('tags', 1)
// returns: ['yellow', 'pink']
```

<a name="listSize"></a>
### `listSize(bin)`

Returns the element count of the list.

Parameters:

- `bin`         - The name of the bin containing the List.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.listSize('tags')
// returns: 3
