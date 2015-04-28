# Client Class

The `Client` class provides operations which can be performed on an Aerospike
database cluster. In order to get an instance of the Client class, you need
to call `aerospike.client()`:

```js
var aerospike = require('aerospike')

var client = aerospike.client(config)
```

The `config` variable is an instance of the client [Configuration](configuration.md),
which needs to be populated and passed to `aerospike.client()`.

With a new client, you can use any of the methods specified below:

- [Methods](#methods)
  - [batchExists()](#batchExists)
  - [batchGet()](#batchGet)
  - [batchSelect()](#batchSelect)
  - [close()](#close)
  - [connect()](#connect)
  - [createIntegerIndex()](#createIntegerIndex)
  - [createStringIndex()](#createStringIndex)
  - [execute()](#execute)
  - [exists()](#exists)
  - [get()](#get)
  - [info()](#info)
  - [indexRemove()](#indexRemove)
  - [LargeList()](#largeList)
  - [operate()](#operate)
  - [put()](#put)
  - [query()](#query)
  - [remove()](#remove)
  - [select()](#select)
  - [udfRegister()](#udfRegister)
  - [udfRemove()](#udfRemove)
  - [updateLogging()](#updateLogging)


<a name="methods"></a>
## Methods

<!--
################################################################################
batchExists()
################################################################################
-->
<a name="batchExists"></a>

### batchExists(keys, policy=null, callback)

Checks the existence of a batch of records from the database cluster.

Parameters:

- `keys`      – An array of [Key objects](datamodel.md#key), used to locate the records in the cluster.
- `policy`    – (optional) The [Batch Policy object](policies.md#BatchPolicy) to use for this operation.
- `callback`  – The function to call when the operation completes, with the results of the batch operation. 

The parameters for the `callback` argument:

- `error`   – The [Error object](datamodel.md#error) representing the status of 
              the operation.
- `results` – An array of objects, where each object contains the following attributes:
  - `status`     - status of the record. [Status code](status.md). 
  - `key`        - key of the record. [Metadata object](datamodel.md#key).
  - `metadata`   - metadata of the record. [Metadata object](datamodel.md#metadata).

Example:
```js
var key = aerospike.key

var keys = [
  key('test', 'demo', 'key1'),
  key('test', 'demo', 'key2'),
  key('test', 'demo', 'key3')
]

client.batchExists(keys, function(error, results) {
  for ( var i = 0; i<results.length; i++) {
    var result = results[i];
    switch ( result.status ) {
      case status.AEROSPIKE_OK:
      	// record found
      	break;
      case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
      	// record not found
      	break;
      default:
      	// error while reading record
        break;
    }
  }
});
```

<!--
################################################################################
batchGet()
################################################################################
-->
<a name="batchGet"></a>

### batchGet(keys, policy=null, callback)

Reads a batch of records from the database cluster.

Parameters:

- `keys`      – An array of [Key objects](datamodel.md#key), used to locate the records in the cluster.
- `policy`    – (optional) The [Batch Policy object](policies.md#WritePolicy) to use for this operation.
- `callback`  – The function to call when the operation completes, with the results of the batch operation. 

The parameters for the `callback` argument:

- `error`   – The [Error object](datamodel.md#error) representing the status of 
              the operation.
- `results` – An array of objects, where each object contains the following attributes:
  - `status`     - status of the record. [Status code](status.md). 
  - `key`        - key of the record. [Key object](datamodel.md#key).
  - `record`     - the record read from the cluster. [Record object](datamodel.md#record).
  - `metadata`   - metadata of the record. [Metadata object](datamodel.md#metadata).

Example:
```js
var key = aerospike.key

var keys = [
  key('test', 'demo', 'key1'),
  key('test', 'demo', 'key2'),
  key('test', 'demo', 'key3')
]

client.batchGet(keys, function(error, results) {
  for ( var i = 0; i<results.length; i++) {
    var result = results[i];
    switch ( result.status ) {
      case status.AEROSPIKE_OK:
      	// record found
      	break;
      case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
      	// record not found
      	break;
      default:
      	// error while reading record
        break;
    }
  }
});
```
<!--
################################################################################
batchSelect()
################################################################################
-->
<a name="batchSelect"></a>

### batchSelect(keys, policy=null, callback)

Reads a batch of records from the database cluster.

Parameters:

- `keys`      – An array of [Key objects](datamodel.md#key), used to locate the records in the cluster.
- `bins`      – An array of bin names for the bins to be returned for the given keys.
- `policy`    – (optional) The [Batch Policy object](policies.md#WritePolicy) to use for this operation.
- `callback`  – The function to call when the operation completes, with the results of the batch operation. 

The parameters for the `callback` argument:

- `error`   – The [Error object](datamodel.md#error) representing the status of 
              the operation.
- `results` – An array of objects, where each object contains the following attributes:
  - `status`     - status of the record. [Status code](status.md). 
  - `key`        - key of the record. [Key object](datamodel.md#key).
  - `record`     - the record read from the cluster containing only the selected bins. [Record object](datamodel.md#record).
  - `metadata`   - metadata of the record. [Metadata object](datamodel.md#metadata).

Example:
```js
var key = aerospike.key

var keys = [
  key('test', 'demo', 'key1'),
  key('test', 'demo', 'key2'),
  key('test', 'demo', 'key3')
]

var bins = ['name', 'age'];

client.batchSelect(keys, bins, function(error, results) {
  for ( var i = 0; i<results.length; i++) {
    var result = results[i];
    switch ( result.status ) {
      case status.AEROSPIKE_OK:
      	// record found
      	break;
      case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
      	// record not found
      	break;
      default:
      	// error while reading record
        break;
    }
  }
});
```

<!--
################################################################################
close()
################################################################################
-->
<a name="close"></a>

### close()

Closes the client connection to the cluster.

Example:
```js
client.close()
```

<!--
################################################################################
connect()
################################################################################
-->
<a name="connect"></a>

### connect()

Establishes the client connection to the cluster.

Parameters:

- `callback`  – The function to call when the operation completes.

Returns the client object which was used to connect to the cluster.

The parameters for the `callback` argument:

- `error` – An [Error object](datamodel.md#error), which contains the status of the connect call. 

Example:
```js
client.connect(function (error) {
  if ( error.status == aerospike.Status.AEROSPIKE_OK ) {
    // handle success
  }
  else {
    // handle failure
  }
})
```
<!--
################################################################################
createIntegerIndex()
################################################################################
-->
<a name="createIntegerIndex"></a>

### createIntegerIndex(args, callback)

Creates an integer index.

Parameters:
- `args`      - An object with these entries. ns, set, bin, index, policy.
- `ns`		  - namespace on which index is to be created
- `set`       - set on which index is to be created
- `bin`		  - bin to be indexed
- `index`     - name of the index to be created
- `policy`    - (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`  – The function to call when the operation completes.

The parameters for the `callback` argument:

- `error` – An [Error object](datamodel.md#error), which contains the status of the connect call. 

Example:
```js
var args = { ns: "test", set: "demo", bin: "bin1", index:"index_name"}
client.createIntegerIndex(args, function (error) {
  if ( error.status == aerospike.Status.AEROSPIKE_OK ) {
    // handle success
  }
  else {
    // handle failure
  }
})
```
<!--
################################################################################
createStringIndex()
################################################################################
-->
<a name="createStringIndex"></a>

### createStringIndex(args, callback)

Creates a string index.

Parameters:
- `args`      - An object with these entries. ns, set, bin, index, policy.
- `ns`		  - namespace on which index is to be created
- `set`       - set on which index is to be created
- `bin`		  - bin to be indexed
- `index`     - name of the index to be created
- `policy`    - (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`  – The function to call when the operation completes.

The parameters for the `callback` argument:

- `error` – An [Error object](datamodel.md#error), which contains the status of the connect call. 

Example:
```js
var args = { ns: "test", set: "demo", bin: "bin1", index: "index_name"}
client.createStringIndex(args, function (error) {
  if ( error.status == aerospike.Status.AEROSPIKE_OK ) {
    // handle success
  }
  else {
    // handle failure
  }
})
```

<!--
################################################################################
execute()
################################################################################
-->
<a name="execute"></a>

### execute(key, udfArgs, policy=null, callback)

Executes an UDF on a record in the database. 

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `udfArgs`     – A [UDFArgs object](datamodel.md#UDFArgs) used for specifying the fields to store.
- `policy`      – (optional) A [ApplyPolicy object](policies.md#ApplyPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.
- `response`	- The value returned from the udf function.

Example:
```js
var key = aerospike.key
var udfArgs = { module : "udf_module", funcname: "udf_function", args:[args, to, udf, function] }

client.execute(key('test','demo','key1'), udfArgs, function(error, res, key) {
  // do something
});
```


<!--
################################################################################
exists()
################################################################################
-->
<a name="exists"></a>

### exists(key, policy=null, callback)

Using the key provided, checks for the existence of a record in the database cluster .

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `policy`      – (optional) The [ReadPolicy object](policies.md#ReadPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.
- `metadata`    – The [Metadata object](datamodel.md#metadata) for the `record`.
- `key`         – The [Key object](datamodel.md#key) for the `record`.


Example:

```js
var key = aerospike.key

client.exists(key('test','demo','key1'), function(error, metadata, key) {
  // do something
});
```

<!--
################################################################################
get()
################################################################################
-->
<a name="get"></a>

### get(key, policy=null, callback)

Using the key provided, reads a record from the database cluster .

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `policy`      – (optional) The [ReadPolicy object](policies.md#ReadPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.
- `record`      – The [Record object](datamodel.md#record), containing the fields of the record.
- `metadata`    – The [Metadata object](datamodel.md#metadata) for the `record`.
- `key`         – The [Key object](datamodel.md#key) for the `record`.


Example:

```js
var key = aerospike.key

client.gey(key('test','demo','key1'), function(error, record, metadata) {
  // do something
});
```
<!--
################################################################################
indexRemove()
################################################################################
-->
<a name="indexRemove"></a>

### indexRemove(namespace, index, policy, callback)

Remove the index provided.

Parameters:

- `namespace`   – The namespace on which the index is present.
- `index`		– The name of the index to be created.
- `policy`      – (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.


Example:

```js

client.indexRemove('test', 'index', function(error) {
  // do something
});
```

<!--
################################################################################
info()
################################################################################
-->
<a name="info"></a>

### info(request, host=null, policy=null, callback)

Performs an info request against the database cluster or specific host.

Parameters:

- `request`     – The info request to send.
- `host`        – (optional) The specific host to send the request to. An object containing attributes:
  - `addr`      - The IP address of the host.
  - `port`      – The port of the host.
- `policy`      – (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The `request` argument is a string representing an info request. The `host` argument is optional, and allow the request to be sent to a specific host, rather than the entire cluster. With the `host` argument defined, the client is not required to be connected to a cluster.

The callback will be called for each host queried, with their response to the request.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.
- `response`    – The response string.
- `host`        - The host that sent the response represented as an object containing:
  - `addr`      - The address of the host.
  - `port`      - The port of the host.

Example:

```js
client.info("statistics", function(err, response, host) {
  // do something
});
```

Example of sending the request to a single host:

```js
client.info("statistics", {addr: "127.0.0.1", port: 3000}, function(error, response, host) {
  // do something
});
```
<!--
################################################################################
LargeList()
################################################################################
-->
<a name="largeList"></a>

### LargeList(key, binName, writePolicy, createModule):LargeList

creates a new [LargeList](largelist.md) object, which is used to perform all LDT operations in the database.


Parameters:
- `key`			- A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `binName`     - Name of the Large Data Type Bin.
- `applyPolicy` - (optional) A [Apply Policy object](policies.md#ApplyPolicy) to use for this operation.
- `createModule`- (optional) Lua function name that initialized list configuration parameters, pass null for 
                  default list.
				
Example:

```js
var key     = { ns: "test", set: "demo", key: "ldt_key"}
var binName = "ldtBinName";
var policy  = { timeout: 1000 }
var llist = client.LargeList(key, binName, policy);
```

For details, see [LargeList Class](largelist.md)

<!--
################################################################################
operate()
################################################################################
-->
<a name="operate"></a>

### operate(key, operations, policy=null, callback)

Performs multiple operations on a single record. 

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `operations`  – An array of operations.For the list of supported operations please refer [operators](operators.md)
- `policy`      – (optional) A [Operate Policy object](policies.md#OperatePolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.
- `record`      – The [Record object](datamodel.md#record), containing the fields of the record.
- `metadata`    – The [Metadata object](datamodel.md#record) for the `record`.
- `key`         – The [Key object](datamodel.md#key) for the `record`.

Example:

```js
var op = aerospike.Operators

var ops = [
  op.append('a', 'xyz'),
  op.incr('b', 10),
  op.read('b')
]

client.operate(key, ops, function(error, record, metadata, key) {
  // do something
});
```

<!--
################################################################################
put()
################################################################################
-->
<a name="put"></a>

### put(key, record, metadata=null, policy=null, callback)

Writes a record to the database cluster. If the record exists, it modifies the record with bins provided. 
To remove a bin, set its value to `null`.

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `record`      – A [Record object](datamodel.md#record) used for specifying the fields to store.
- `metadata`    – (optional) A [Metadata object](datamodel.md#metadata).
- `policy`      – (optional) A [Write Policy object](policies.md#WritePolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.
- `key`         – A [Key object](datamodel.md#key) for the record that was written.

Example:
```js
var key = aerospike.key

var rec = {
  a: 'xyz',
  b: 123
}

client.put(key('test','demo','key1'), rec, function(error, key) {
  // do something
});
```
<!--
################################################################################
query()
################################################################################
-->
<a name="query"></a>

### query(namespace, set, statement):query

creates a new [query](query.md) object, which is used to define query in the database.


Parameters:
- `namespace`	- Namespace to be queried.
- `set`         - Set on which the query has to be executed.
- `statement`   - an Instance of [Statement](query.md#Statement), which specifies the properties of 
				  a given query.
Example:

```js
var query = client.query(ns, set);
```

For details, see [Query Class](query.md)

<!--
################################################################################
remove()
################################################################################
-->
<a name="remove"></a>

### remove(key, policy=null, callback)

Removes a record with the specified key from the database cluster.

Parameters:

- `key`         – A [Key object](datamodel.md#key) used for locating the record to be removed.
- `policy`      – (optional) The [Remove Policy object](policies.md#RemovePolicy) to use for this operation.
- `callback`    – The function to call when the operation completes wit the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.
- `key`         – A [Key object](datamodel.md#key) for the record that was removed.

Example:
```js
var key = aerospike.key

client.remove(key('test','demo','key1'), function(error, key) {
  // do something
});
```

<!--
################################################################################
select()
################################################################################
-->
<a name="select"></a>

### select(key, bins, policy=null, callback)

Retrieves specified bins for a record of given key from the database cluster.

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `bins`        – An array of bin names for the bins to be returned for the given key.
- `policy`      – (optional) The [Read Policy object](policies.md#ReadPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.
- `record`      – The [Record object](datamodel.md#record), containing the fields of the record.
- `metadata`    – The [Metadata object](datamodel.md#metadata) for the `record`.
- `key`         – The [Key object](datamodel.md#key) for the `record`.

Example:
```js
var key = aerospike.key

client.select(key('test','demo','key1'), ["name","age"] function(error, record, metadata, key) {
  // do something
});
```
<!--
################################################################################
udfRegister()
################################################################################
-->
<a name="udfRegister"></a>

### udfRegister(udfModule, policy=null, callback)

Registers an UDF to the database cluster.

Parameters:

- `udfModule`   – UDF filename specifying absolute file path.
- `policy`      – (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.

Example:
```js

client.udfRegister("path/to/file/filename", function(error) {
  // do something
});
```
<!--
################################################################################
udfRemove()
################################################################################
-->
<a name="udfRemove"></a>

### udfRemove(udfModule, policy=null, callback)

Registers an UDF to the database cluster.

Parameters:

- `udfModule`   – UDF module name to be removed.
- `policy`      – (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of 
                  the operation.

Example:
```js

client.udfRemove("udfModuleName", function(error) {
  // do something
});
```

<!--
################################################################################
updateLogging()
################################################################################
-->
<a name="updateLogging"></a>


### updateLogging(logConfig)

Update the logging configuration of the API.

Parameters:

- `logConfig`     - A object with attributes `level` and `file`.
- `level`         - Specifies the granularity for logging, defined using [Log Object](log.md)
- `file`          - File descriptor opened using fs.open(), the log contents are written using this descriptor. Default value is stderr.
