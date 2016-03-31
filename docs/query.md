This document covers the 1.x version of the Aerospike Node.js client. The API
documentation for the alpha release of the new 2.0 client is
[available here](http://www.aerospike.com/apidocs/nodejs/).

# Query Class

The `Query` class provides an interface to perform all query operations on
an Aerospike database cluster. The `Query` class can be instantiated as follows:


```js
var aerospike = require('aerospike')
var client = aerospike.client(config)
var query = client.query(ns, set, stmt)

```
`stmt` is an instance of [Statement](#Statement)

The `statement` in the query object can be modified to perform any of the following functionalities.

- [Query on an index](#QueryIndex)
- [Aggregation on an index](#QueryAggregate)
- [Scan foreground](#ScanForeground)
- [Scan backgorund](#ScanBackground)
- [Scan info](#ScanInfo)

<!--
################################################################################
Statement
################################################################################
-->
<a name="Statement"></a>

Statement is used to specify the attributes of query object, during the object creation.
The statement should be well formed for creating a query object, in case of error during the
query creation, an exception is thrown with appropriate error messages.

###Statement Attributes

#### `select`

`select` is an array of bins to be projected in a given query resultset.

#### `filters`

 `filters` is an array of [filter](filters.md) in a given query.

#### `aggregationUDF`

  `aggregationUDF` is an instance [udfArgs](datamodel.md#UDFArgs). It is the aggregation UDF to be
   be run on a query resultset.

#### `UDF`

  `UDF` is an instance of [udfArgs](datamodel.md#UDFArgs). It is the UDF to be run on all the records
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
var statement = {filters: [filter.equal('a', 'abc')]}

// NOTE bin a has to be indexed for it to be queried.
//To projects bins 'a' and 'b' alone
statement.select = ['a', 'b']

var query = client.query(ns, set, statement) // returns a query object.

var dataCallback = function (record) {
  // process the scanned record
}
var errorCallback = function (error) {
  // process the error
}
var endCallback = function () {
  //process the end of query results
}
var stream = query.execute() // returns a stream object.
stream.on('data', dataCallback)
stream.on('error', errorCallback)
stream.on('end', endCallback)
```

<!--
################################################################################
QueryAggregate()
################################################################################
-->
<a name="QueryAggregate"></a>
###QueryAggregate

Query Aggregation executes a Map-Reduce job on all the records returned by a given query.
The Map-Reduce job is in written in LUA using UDF. The UDF used by the aggregation
job must be registered prior to using the given UDF in aggregation.
To do an aggregation on data by a  query, the `Query` object has to be instantiated.
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.
'data' event is emitted for every result returned by query aggregation.
'errror' is emitted in an event of error.
'end' marks the end of resultset returned by query.

```js
var statement = {
  filters: [filter.equal['a', 'abc'],
  aggregationUDF: {module: 'agg_module', funcname: 'agg_func'}
}

// NOTE bin a has to be indexed for it to be queried.
//To projects bins 'a' and 'b' alone
statement.select = ['a', 'b']

var query = client.query(ns, set, statement) // returns a query object

var dataCallback = function (result) {
  //process the result of aggregation
}
var errorCallback = function (error) {
  //process the error
}
var endCallback = function( ) {
  //process the end of aggregation
}
var stream = query.execute() // returns a stream object
stream.on('data', dataCallback)
stream.on('error', errorCallback)
stream.on('end', endCallback)
```

<!--
################################################################################
ScanForeground()
################################################################################
-->
<a name="ScanForeground"></a>
###ScanForeground

To do full scan of Aerospike database which returns all the records,  the `Query` object has to be instantiated.
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.
'data' event is emitted for every record that returned by scan.
'errror' is emitted in an event of error.
'end' marks the end of recordset returned by query.

```js
// no filters should be applied during query instantiation.
// however 0 or more bins can be projected.
var statement = {nobins: false, concurrent: true, select: ['a', 'b']}
var query = client.query(ns, set ) // returns a query object.

var dataCallback = function (record) {
  //process the record
}
var errorCallback = function (error) {
  //do something
}
var endCallback = function () {
  //process the end of scan
}
var stream = query.execute() // returns a stream object
stream.on('data', dataCallback)
stream.on('error', errorCallback)
stream.on('end', endCallback)
```

<!--
################################################################################
ScanAggregate()
################################################################################
-->
<a name="ScanAggregate"></a>
###ScanAggregate

Scan Aggregation executes a Map-Reduce job on all the records in the Aerospike database.
Scan Aggregation is supported by Aerospike server on versions later than 3.4.1
The Map-Reduce job is in written in LUA using UDF. The UDF used by the aggregation
job must be registered prior to using the given UDF in aggregation.
To do an aggregation on data , the `Query` object has to be instantiated.
Query on execution returns a stream object, which emits 'data', 'error' and 'end' events.
'data' event is emitted for every result returned by scan aggregation.
'errror' is emitted in an event of error.
'end' marks the end of resultset returned by scan aggregation.

NOTE: Query aggregation without any filter becomes scan aggregation.

```js
var statement = {
  aggregationUDF: {module: 'agg_module', funcname: 'agg_func'}
}

var query = client.query(ns, set, statement ) // returns a query object

var dataCallback = function (result) {
  //process the result of aggregation
}
var errorCallback = function (error) {
  //process the error
}
var endCallback = function () {
  //process the end of aggregation
}
var stream = query.execute() // returns a stream object
stream.on('data', dataCallback)
stream.on('error', errorCallback)
stream.on('end', endCallback)
```

<!--
################################################################################
ScanBackground()
################################################################################
-->
<a name="ScanBackground"></a>

##ScanBackground

To do full scan of Aerospike database and apply an UDF on each record in Aerospike database
through a background job,the `Query` object has to be instantiated. The background scan
does not return any data.
Query on execution returns a stream object, which emits 'error' and 'end' events.
The UDF used by scan background job must already be registered in the system.
'errror' is emitted in an event of error.
'end'  signifies that a scan background job has been fired successfully..

```js
// no filters should be applied during query instantiation.
// however 0 or more bins can be projected.
// And scanUDF argument must be present.
var statement = {
  concurrent: true,
  UDF: {module:'scanUdf', funcname: 'scanFunc'}
}
var query = client.query(ns, set, statement) // returns a query object

// callback to handle the error event emitted by query stream
var errorCallback = function (error) {
  //process the error
}

// callback to handle the end event emitted by query stream
var endCallback = function () {
  //signals that the scan background job has been successfully fired
}

var stream = query.execute() // returns a stream object
stream.on('error', errorCallback)
stream.on('end', endCallback)
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
- `status`        - An instance [Scan Status](scanproperties.md#scanStatus) object and it contains status
                    of scan(in-progress, completed, aborted).
```js
var query = client.query(namespace, set)
query.Info(scanId, function (scanInfo) {
  if (scanInfo.status == scanStatus.COMPLETED) {
    // implies scan completed
  }
})
```
