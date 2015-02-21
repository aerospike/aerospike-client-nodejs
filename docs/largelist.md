# LargeList Class

Create and Manage a list within a single bin.

```js
var aerospike = require('aerospike');
var config    = { hosts: [ addr: localhost, port: 3000]}
var client    = aerospike.client(config);
var key		  = { ns:"test", set:"demo", key:"llistKey"}
var policy    = { timeout: 1000}
var binName   = "LDTbin"
var createModule = "ListInitializer"
var llist	  = client.LargeList(key, binName, policy);

```

`key`         - A [Key object](datamodel.md#key), used to locate the record in the cluster.
`binName`     - Name of the LDT bin. 
`policy`      - (optional) A [Apply Policy object](policies.md#ApplyPolicy) to use for this operation.
`createModule`- (optional) Lua function name that initializes list configuration parameters, pass null for default list.

`LargeList` has following APIs to modify a LargeList in the Aerospike server.

- [add(value)](#add)
- [add([values])](#addArray)
- [add(val1, val2, ...)](#addMany)
- [destroy()](#destroy)
- [filter()](#filter)
- [find()](#find)
- [findThenFilter()](#findThenFilter)
- [getCapacity()](#getCapacity)
- [getConfig()](#getConfig)
- [range()](#range)
- [rangeFilter()](#rangeFilter)
- [remove(value)](#remove)
- [remove([values])](#removeArray)
- [remove(val1, val2, val3, ...)](#removeMany)
- [removeRange()](#rangeRemove)
- [scan()](#scan)
- [setCapacity()](#setCapacity)
- [size()](#size)
- [update(value)](#update)
- [update([values])](#updateArray)
- [update(val1, val2, val3, ...)](#updateMany)

<a name="methods"></a>
##Methods

<!--
################################################################################
add(value)
################################################################################
-->

<a name="add"></a>

###add(value, callback)
Add value to list. Fail if value's key exists and list is configured for unique keys. If value is a map, 
the key is identified by "key" entry. Otherwise, the value is the key. If large list does not exist, 
create it using specified userModule configuration.

Parameters:

- `value`   - Value to add
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The value returned from by the LDT function `add`.

Example:
```js
llist.add({"key":"ldt_key", "value":"ldtvalue"}, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
add([values])
################################################################################
-->

<a name="addArray"></a>

###add([values], callback)
Add an array of values to list. Fail if value's key exists and list is configured for unique keys. If value is a map, 
the key is identified by "key" entry. Otherwise, the value is the key. If large list does not exist, 
create it using specified userModule configuration.

Parameters:

- `[value]`   - Values to add
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The value returned from by the LDT function `add`.

Example:
```js
var valArray = [ {"key":"ldt_key", "value":"ldtvalue"}, {"key":"ldt_array", "value":"ldtarrayvalue"}]
llist.add(valArray, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
add(values, ...)
################################################################################
-->

<a name="addMany"></a>

###add([values], callback)
Add values to list. Fail if value's key exists and list is configured for unique keys. If value is a map, 
the key is identified by "key" entry. Otherwise, the value is the key. If large list does not exist, 
create it using specified userModule configuration.

Parameters:

- `values`   - Values to add
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The value returned from by the LDT function `add`.

Example:
```js
var val1 = {"key":"ldt_key", "value":"ldtvalue"};
var val2 = {"key":"ldt_array", "value":"ldtarrayvalue"}
llist.add(val1, val2, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
update(value)
################################################################################
-->

<a name="update"></a>

###update(value, callback)
Update/Add each value in array depending if key exists or not. If value is a map, the key is identified by "key" entry. 
Otherwise, the value is the key. If large list does not exist, create it using specified userModule configuration.

Parameters:

- `value`   - Value to update
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The value returned from by the LDT function `add`.

Example:
```js
llist.update({"key":"ldt_key", "value":"ldtupdatedvalue"}, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
update([values])
################################################################################
-->

<a name="updateArray"></a>
Update/Add each value in values in the list depending if key exists or not. If value is a map, the key is 
identified by "key" entry. Otherwise, the value is the key. If large list does not exist, create it using 
specified userModule configuration.

###update([values], callback)

Parameters:

- `[value]` - Values to update
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- The value returned from by the LDT function `add`.

Example:
```js
var valArray = [ {"key":"ldt_key", "value":"ldtupdatevalue"}, {"key":"ldt_array", "value":"ldtarrayupdatedvalue"}]
llist.update(valArray, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
udpate(values, ...)
################################################################################
-->

<a name="updateMany"></a>

###update(values..., callback)

Update/Add each value depending if key exists or not. If value is a map, the key is identified by "key" entry. 
Otherwise, the value is the key. If large list does not exist, create it using specified userModule configuration.

Parameters:

- `values`   - Values to update
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The value returned from by the LDT function `add`.

Example:
```js
var val1 = {"key":"ldt_key", "value":"ldtupdatedvalue"};
var val2 = {"key":"ldt_array", "value":"ldtarrayupdatedvalue"}
llist.update(val1, val2, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
remove(value)
################################################################################
-->

<a name="remove"></a>

###remove(value, callback)
Delete value from list
Parameters:

- `value`   - Value to delete
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The value returned from by the LDT function `add`.

Example:
```js
llist.delete({"key":"ldt_key"}, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
remove([values])
################################################################################
-->

<a name="removeArray"></a>
Delete values from list

###remove([values], callback)

Parameters:

- `[value]` - Values to delete
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- The value returned from by the LDT function `add`.

Example:
```js
var valArray = [ {"key":"ldt_key"},{"key":"ldt_array"}]
llist.remove(valArray, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
remove(values, ...)
################################################################################
-->

<a name="removeMany"></a>

###remove(values..., callback)

Delete values from list.

Parameters:

- `values`   - Values to delete
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The value returned from by the LDT function `add`.

Example:
```js
var val1 = {"key":"ldt_key" };
var val2 = {"key":"ldt_array" }
llist.remove(val1, val2, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
removeRange()
################################################################################
-->

<a name="removeRange"></a>

###remove(begin, end, callback)

Delete values from list between a given range.

Parameters:
- `begin` - low value of the range (inclusive).
- `end`   - high value of the range (inclusive).
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The count of entries removed.

Example:
```js
llist.remove("begin", "end", function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
find()
################################################################################
-->

<a name="find"></a>

###find(value, callback)

Select values from list.

Parameters:
- `value`   - value to select.
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- List of entries selected.

Example:
```js
llist.find("search_key", function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
findThenFilter()
################################################################################
-->

<a name="findThenFilter"></a>

###find(value, udfArgs, callback)

Select values from list and apply  specified Lua filter.

Parameters:
- `value`   - value to select.
- `udfArgs` - A [UDFArgs object](datamodel.md#UDFArgs) used for specifying LUA file, function 
	          and arguments to Lua function.
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- List of entries selected.

Example:
```js
var udfargs =  { module : "udf_module", funcname: "udf_function", args:[args, to, udf, function] }
llist.find("search_key", udfagrs, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
range()
################################################################################
-->

<a name="range"></a>

###range(begin, end, callback)

Select a range of values from the large list.

Parameters:
- `begin` - low value of the range (inclusive).
- `end`   - high value of the range (inclusive).
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The list of entries selected.

Example:
```js
llist.range("begin", "end", function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
rangeThenFilter()
################################################################################
-->

<a name="rangeThenFilter"></a>

###range(begin, end, udfArgs, callback)

Select a range of values from the large list, then apply a Lua filter.

Parameters:
- `begin` - low value of the range (inclusive).
- `end`   - high value of the range (inclusive).
- `udfArgs`- A [UDFArgs object](datamodel.md#UDFArgs) used for specifying the Lua file, function
			 and arguments to the Lua function.
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`  - The list of entries selected.

Example:
```js

var udfargs = { module : "udf_module", funcname: "udf_function", args:[args, to, udf, function] }
llist.range("begin", "end", udfargs, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
scan()
################################################################################
-->

<a name="scan"></a>

###scan(callback)

Select all the objects in the list.

Parameters:
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- All the entries in the list.

Example:
```js
llist.scan(function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
filter()
################################################################################
-->

<a name="filter"></a>

###filter(udfArgs, callback)

Select values from the list and apply specified Lua filter.

Parameters:
- `udfArgs` - A [UDFArgs object](datamodel.md#UDFArgs) used for specifying for specifying the Lua file, function
			  and arguments to the Lua function.
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`-list of entries selected.

Example:
```js
var udfargs = { module : "udf_module", funcname: "udf_function", args:[args, to, udf, function] }
llist.filter(function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
destroy()
################################################################################
-->

<a name="destroy"></a>

###destroy(callback)

Delete bin containing the list.

Parameters:
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- `undefined`

Example:
```js
llist.destroy(function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
size()
################################################################################
-->

<a name="size"></a>

###size(callback)

To retrieve the size of the list

Parameters:
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- Size of the list.

Example:
```js
llist.size(function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
getConfig()
################################################################################
-->

<a name="getConfig"></a>

###getConfig(callback)

To get the list configuration parameters.

Parameters:
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- Map of list configuration parameters.

Example:
```js
llist.getConfig(function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```
<!--
################################################################################
setCapacity()
################################################################################
-->

<a name="setCapacity"></a>

###setCapacity(callback)

Set maximum number of entries in the list.

Parameters:
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- `undefined`

Example:
```js
llist.setCapacity(capacity, function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

<!--
################################################################################
getCapacity()
################################################################################
-->

<a name="getCapacity"></a>

###getCapacity(callback)

Retrieves the capacity of the list - that is maximum number of entries.

Parameters:
- `callback`- The function to call when the operation completes with the results of the operation.

The parameters for `callback` argument:

- `error`   - The [Error object](datamodel.md#error) representing the status of
				  the operation.
- `response`- Maximum number of entries in the list.

Example:
```js
llist.getCapacity(function(err, res){
	//check for err.code
	if(err.code != aerospike.status.AEROSPIKE_OK) 
		//signals error.
});

```

