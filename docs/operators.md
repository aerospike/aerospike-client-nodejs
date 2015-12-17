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

client.operate(key, ops, callback)
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

Additional operations are supported on the List [Complex Data Type](http://www.aerospike.com/docs/guide/data-types.html#complex-data-types).

<a name="list_append"></a>
### `list_append(bin, value)`

Adds an element to the end of the list.

Parameters:

- `bin`         - The name of the bin containing the List.
- `value`       - The value to be appended.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_append('tags', 'orange')
// => record = {tags: ['blue', 'yellow', 'pink', 'orange']}
```

<a name="list_append_items"></a>
### `list_append_items(bin, list)`

Adds a list of elements to the end of the list.

Parameters:

- `bin`         - The name of the bin containing the List.
- `list`        - Array of elements to appended.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_append_items('tags', ['orange', 'green'])
// => record = {tags: ['blue', 'yellow', 'pink', 'orange', 'green']}
```

<a name="list_insert"></a>
### `list_insert(bin, index, value)`

Inserts an element at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - List index at which the new element should be inserted.
- `value`       - The value to be inserted.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_insert('tags', 2, 'orange')
// => record = {tags: ['blue', 'yellow', 'orange', 'pink']}
```

<a name="list_insert_items"></a>
### `list_insert_items(bin, index, list)`

Inserts a list of elements at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - List index at which the new element should be inserted.
- `list`        - Array of elements to be inserted.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_insert_items('tags', 2, ['orange', 'green'])
// => record = {tags: ['blue', 'yellow', 'orange', 'green', 'pink']}
```

<a name="list_pop"></a>
### `list_pop(bin, index)`

Removes and returns the list element at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - Index of the element to be removed.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_pop('tags', 1)
// returns: 'yellow'
// => record = {tags: ['blue', 'pink']}
```

<a name="list_pop_range"></a>
### `list_pop_range(bin, index)`

Removes and returns the list elements at the specified range.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - Index of the first element in the range of elements to be removed.
- `count`       - [optional] Number of elements to be removed; if not specified, remove and return all elements until the end of the list.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_pop_range('tags', 0, 2)
// returns: ['blue', 'yellow']
// => record = {tags: ['pink']}
```

<a name="list_remove"></a>
### `list_remove(bin, index)`

Removes the list element at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - Index of the element to be removed.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_remove('tags', 1)
// => record = {tags: ['blue', 'pink']}
```

<a name="list_remove_range"></a>
### `list_remove_range(bin, index)`

Removes the list elements at the specified range.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - Index of the first element in the range of elements to be removed.
- `count`       - [optional] Number of elements to be removed; if not specified, remove all elements until the end of the list.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_remove_range('tags', 1, 2)
// => record = {tags: ['blue']}
```

<a name="list_clear"></a>
### `list_clear(bin)`

Removes all elements from the list.

Parameters:

- `bin`         - The name of the bin containing the List.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_clear('tags')
// => record = {tags: []}
```

<a name="list_set"></a>
### `list_set(bin, index, value)`

Sets a list element at the specified index to a new value.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - The index of the element to be replaced
- `value`       - The new value of the list element.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_set('tags', 1, 'green')
// => record = {tags: ['blue', 'green', 'pink']}
```

<a name="list_trim"></a>
### `list_trim(bin, index, count)`

Removes all list elements not within the specified range.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - The start index of the range of elements to retain.
- `number`      - The number of elements to retain.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_trim('tags', 1, 1)
// => record = {tags: ['green']}
```

<a name="list_get"></a>
### `list_get(bin, index)`

Returns the list element at the specified index.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - The index of the element to be returned.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_get('tags', 0)
// returns: 'blue'
```

<a name="list_get_range"></a>
### `list_get_range(bin, index, count)`

Returns a list of element at the specified range.

Parameters:

- `bin`         - The name of the bin containing the List.
- `index`       - The start index of the range of elements to return.
- `number`      - [optional] The number of elements to return; if not specified, return all elements until the end of the list.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_get_range('tags', 0, 2)
// returns: ['blue', 'yellow']

op.list_get_range('tags', 1)
// returns: ['yellow', 'pink']
```

<a name="list_size"></a>
### `list_size(bin)`

Returns the element count of the list.

Parameters:

- `bin`         - The name of the bin containing the List.

Example:

```js
// record = {tags: ['blue', 'yellow', 'pink']}
op.list_size('tags')
// returns: 3
```