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

- [query on an index](#QueryIndex)
- [aggregation on an index](#QueryAggregate)
- [Scan foreground](#ScanForeground)
- [scan backgorund](#ScanBackground)
- [Scan info](#ScanInfo)

<!--
################################################################################
Statement
################################################################################
-->
<a name="Statement"></a>

###Statement Attributes

#### `select` 

`select` is an array of bins to be projected in a given query resultset.

#### `filters`

 `filters` is an array of [filter](filters.md) in a given query.

#### `aggregationUDF` 

  `aggregationUDF` is an instance [udfArgs](datamodel.md#UDFArgs). It is the aggregation UDF to be
   be run on a query resultset.

#### `scanUDF` 

  `scanUDF` is an instance of [udfArgs](datamodel.md#UDFArgs). It is the UDF to be run on all the records
   in the Aerospike database through a background job.

#### `priority` 

  `priority` is an instance of [scanPriority](scanproperties.md#scanPriority). 

#### `percent` 

  `percent` is the percentage of data to be scanned in each partitiion.

#### `nobins` 

  `nobins` is a bool value, setting to true results in projection of zero bins.

#### `concurrent` 

  `concurrent` is a bool value, setting to true results in parallel scanning of data in
	all nodes in Aerospike cluster.


<!--
################################################################################
QueryIndex()
################################################################################
-->
<a name="QueryIndex"></a>
###QueryIndex

To query data on a secondar index, the `Query` object has to be instantiated.
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.
'data' event is emitted for every record that is returned by the query.
'errror' is emitted in an event of error.
'end' marks the end of recordset returned by query.
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
	stream.on('data', dataCallback);
	stream.on('error', errorCallback);
	stream.on('end', endCallback);

```

<!--
################################################################################
QueryAggregate()
################################################################################
-->
<a name="QueryAggregate"></a>
###QueryAggregate

To do an aggregation on data by a  query, the `Query` object has to be instantiated. 
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.
'data' event is emitted for every result returned by query aggregation.
'errror' is emitted in an event of error.
'end' marks the end of resultset returned by query.

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
	stream.on('data', dataCallback);
	stream.on('error', errorCallback);
	stream.on('end', endCallback);

```
<!--
################################################################################
ScanForeground()
################################################################################
-->
<a name="ScanForeground"></a>
###scanForeground

To do full scan of Aerospike database which returns all the records,  the `Query` object has to be instantiated. 
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.
'data' event is emitted for every record that returned by scan.
'errror' is emitted in an event of error.
'end' marks the end of recordset returned by query.

```js

	// no filters should be applied during query instantiation.
	// however 0 or more bins can be projected.
	var statement = { nobins: false, concurrent: true, select: ['a', 'b']}
	var query = client.query(ns, set, statement); // returns a query object.

	var dataCallback = function(record) { //do something}
	var errorCallback = function(error) { //do something}
	var endCallback = function() { //do something}
	var stream = query.execute(); // returns a stream object.
	stream.on('data', dataCallback);
	stream.on('error', errorCallback);
	stream.on('end', endCallback);

```
<!--
################################################################################
ScanBackground()
################################################################################
-->
<a name="ScanBackground"></a>

##ScanBackground

To do full scan of Aerospike database and apply an UDF through a background job,  
the `Query` object has to be instantiated and background scan does not return any data.
Query on execution returns a stream object, which emits 'error' and 'end' events.
'errror' is emitted in an event of error.
'end'  signifies that a scan background job has been fired successfully..

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
	stream.on('error', errorCallback);
	stream.on('end', endCallback);

```
<!--
################################################################################
ScanInfo()
################################################################################
-->
<a name="ScanInfo"></a>

##Info(scanid, callback)

To get the information of the background scan fired using `Query` object. The result contains information 
about the percentage of scan completed in Aeropsike database, number of records scanned so far and the status of the scan(aborted, in-progress and completed).

Parameters:

- `scanid` - A valid scan Id returned when a scan background job is triggered.

The parameters for the `callback` argument:
Returns an object with the following entries.
- `progressPct`   - Percentage of records in Aerospike database on which scan UDF has been applied.
- `recordScanned` - Total number of records in Aerospike database on which scan UDF has been applied.
- `status`		  - An instance [Scan Status](scanproperties.md#scanStatus) object and it contains status 
					of scan(in-progress, completed, aborted).
```js
 var query = client.query(namespace, set);
 query.Info( scanId, function(scanInfo) {
	 if (scanInfo.status == scanStatus.COMPLETED)
	 {
		 // implies scan completed.
	 }
 }); 

```





