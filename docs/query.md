# Query Class

The `Query` class provides an interface to perform all query operations on 
an Aerospike database cluster. The `Query` class can be instantiated as follows:


```js
var aerospike = require('aerospike');
var client = aerospike.client(config);
var query = client.query(ns, set, stmt);

```
`stmt` is an instance of [Statement](#Statement)

The `statement` in the query object can be modified to perform any of the following functionalities.

- [query on an index](#QueryIndex())
- [aggregation on an index](#QueryAggregate())
- [Scan foreground](#ScanForeground())
- [scan backgorund](#ScanBackground())

<!--
################################################################################
Statement
################################################################################
-->
<a name="Statement"></a>

###Statement Attributes

#### `select` attribute

`select` is an array of bins to be projected in a given query resultset.

#### `filters` attribute

 `filters` is an array of [filter](#filters.md) in a given query.

#### `aggregationUDF` attribute

  `aggregationUDF` is an instance [udfArgs](datamodel.md#UDFArgs). It is the aggregation UDF to be
   be run on a query resultset.

#### `scanUDF` attribute

  `scanUDF` is an instance of [udfArgs](datamodel.md#UDFArgs). It is the UDF to be run on all the records
   in the Aerospike database through a background job.

#### `priority` attribute

	`priority` is an instance of [scanPriority](scanproperties.md#scanPriority). 

#### `percent` attribute

	`percent` is the percentage of data to be scanned in each partitiion.

#### `nobins` attribute

	`nobins` is a bool value, setting to true results in projection of zero bins.

#### `concurrent` attribute

	`concurrent` is a bool value, setting to true results in parallel scanning of data in
	all nodes in Aerospike cluster.


###QueryIndex()

To query data on a secondar index, the `Query` object has to be instantiated.
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.

```js
	var statement = { filters:[filter.equal['a', 'abc']} 

	// NOTE bin a has to be indexed for it to be queried.
	//To projects bins 'a' and 'b' alone
	statement.select = ['a', 'b']

	var query = client.query(ns, set, statement); // returns a query object.

	var dataCallback = function(record) { //do something}
	var errorCallback = function(error) { //do something}
	var endCallback = function() { //do something}
	var stream = query.execute(); // returns a stream object.
	stream.on('data', callback);
	stream.on('error', callback);
	stream.on('end', callback);

```

###QueryAggregate()

To do an aggregation on data by a  query, the `Query` object has to be instantiated. 
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.

```js
	var statement = { filters:[filter.equal['a', 'abc'],
					  aggregationUDF: {module: 'agg_module', funcname: 'agg_func'}
					} 

	// NOTE bin a has to be indexed for it to be queried.
	//To projects bins 'a' and 'b' alone
	statement.select = ['a', 'b']

	var query = client.query(ns, set, statement); // returns a query object.

	var dataCallback = function(result) { //do something}
	var errorCallback = function(error) { //do something}
	var endCallback = function() { //do something}
	var stream = query.execute(); // returns a stream object.
	stream.on('data', callback);
	stream.on('error', callback);
	stream.on('end', callback);

```
###scanForeground()

To do full scan of Aerospike database,  the `Query` object has to be instantiated. 
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.

```js

	// no filters should be applied during query instantiation.
	// however 0 or more bins can be projected.
	var statement = { nobins: false, concurrent: true, select: ['a', 'b']}
	var query = client.query(ns, set, statement); // returns a query object.

	var dataCallback = function(record) { //do something}
	var errorCallback = function(error) { //do something}
	var endCallback = function() { //do something}
	var stream = query.execute(); // returns a stream object.
	stream.on('data', callback);
	stream.on('error', callback);
	stream.on('end', callback);

```
###scanBackground()

To do full scan of Aerospike database and apply an UDF through a background,  the `Query` object has to be instantiated. 
Query on execution returns a stream object, which emits 'error' and 'end' events.

```js

	// no filters should be applied during query instantiation.
	// however 0 or more bins can be projected.
	// And scanUDF argument must be present.
	var statement = { concurrent: true, 
					  select: ['a', 'b'],
					  scanUDF: {module:'scanUdf', funcname: 'scanFunc'}
					}
	var query = client.query(ns, set, statement); // returns a query object.

	var errorCallback = function(error) { //do something}
	var endCallback = function() { //do something}
	var stream = query.execute(); // returns a stream object.
	stream.on('error', callback);
	stream.on('end', callback);

```





