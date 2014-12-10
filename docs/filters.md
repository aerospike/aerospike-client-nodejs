# Filters

Filters object provides functions to easily apply filters to be performed on a given query via [`query()`](client.md#query)
function

Example:

```js
var filter = aerospike.filters

var queryArgs = { filters = [
					filter.equal('a', 'hello'),
					filter.equal('b', 123),
					filter.range('c', 1, 1000)
				  ]
}

client.query(ns, set, queryArgs)
```

<a name="Functions"></a>
## Functions

<!--
################################################################################
equal()
################################################################################
-->
<a name="equal"></a>

### equal(bin, value)

Apply an equality filter criteria on a bin that is indexed. The bin must contain either String or Integer, 
and the value must be of the same type.

Parameters:

- `bin`         – The name of the bin to apply the filter to.
- `value`       – The equality of this value will be checked for the given bin. 

```js
filter.equal('a', 'hello')
filter.equal('b', 123)
```

<!--
################################################################################
range()
################################################################################
-->
<a name="range"></a>

### range(bin, min, max)

Apply a range filter criteria on a bin that is indexed. The bin must contain an Integer, 
and the value must be of the same type.

Parameters:

- `bin`         – The name of the bin to apply the filter to.
- `min`         – The minimum value of the bin, the records with bin value greater than 
				  min will be returned as part of query result.
- `max`			- The maximum value of the bin, the records with bin value less than max
				  will be returned as part of query result.
```js
filter.range('b', 1, 1000)
```


