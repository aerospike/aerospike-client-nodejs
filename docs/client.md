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
  - [add()](#add)
  - [append()](#append)
  - [batchExists()](#batchExists)
  - [batchGet()](#batchGet)
  - [batchSelect()](#batchSelect)
  - [close()](#close)
  - [connect()](#connect)
  - [createIntegerIndex()](#createIntegerIndex)
  - [createStringIndex()](#createStringIndex)
  - [createGeo2DSphereIndex()](#createGeo2DSphereIndex)
  - [execute()](#execute)
  - [exists()](#exists)
  - [get()](#get)
  - [info()](#info)
  - [indexCreateWait()](#indexCreateWait)
  - [indexRemove()](#indexRemove)
  - [LargeList()](#largeList)
  - [operate()](#operate)
  - [prepend()](#prepend)
  - [put()](#put)
  - [query()](#query)
  - [remove()](#remove)
  - [select()](#select)
  - [udfRegister()](#udfRegister)
  - [udfRegisterWait()](#udfRegisterWait)
  - [udfRemove()](#udfRemove)
  - [updateLogging()](#updateLogging)


<a name="methods"></a>
## Methods

<!--
################################################################################
add()
################################################################################
-->
<a name="add"></a>

### add(key, bins, metadata=null, policy=null, callback)

Adds integer values to existing record bin values. This call only works for integers values.

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `bins`        – A [Record Object](datamodel.md#record), used to specify the bins to be added with integer values.
- `metadata`    – (optional) A [Metadata object](datamodel.md#metadata).
- `policy`      – (optional) A [Operate Policy object](policies.md#OperatePolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of
                  the operation.

Example:

```js
var bins = {itemsShopped: 5}

client.add(key, bins, function (error, record, metadata, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```
<!--
################################################################################
append()
################################################################################
-->
<a name="append"></a>

### append(key, bins, metadata=null, policy=null, callback)

Appends bin string values to existing record bin values. This call only works for string values.

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `bins`        – A [Record Object](datamodel.md#record), used to specify the bins to be added with integer values.
- `metadata`    – (optional) A [Metadata object](datamodel.md#metadata).
- `policy`      – (optional) A [Operate Policy object](policies.md#OperatePolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of
                  the operation.
- `record`      – The [Record object](datamodel.md#record), containing the fields of the record.
- `metadata`    – The [Metadata object](datamodel.md#record) for the `record`.Only generation is returned.
- `key`         – The [Key object](datamodel.md#key) for the `record`.

Example:

```js
var bins = {LastMovieSeen: 'Imitation Game'}

client.append(key, bins, function (error, record, metadata, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```

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

client.batchExists(keys, function (error, results) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    for (var i = 0; i < results.length; i++) {
      var result = results[i]
      switch (result.status) {
        case status.AEROSPIKE_OK:
          // record found
          break
        case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
          // record not found
          break
        default:
          // error while reading record
          break
      }
    }
  }
})
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

client.batchGet(keys, function (error, results) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    for (var i = 0; i < results.length; i++) {
      var result = results[i]
      switch (result.status) {
        case status.AEROSPIKE_OK:
          // record found
          break
        case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
          // record not found
          break
        default:
          // error while reading record
          break
      }
    }
  }
})
```

<!--
################################################################################
batchSelect()
################################################################################
-->
<a name="batchSelect"></a>

### batchSelect(keys, bins, policy=null, callback)

Reads a subset of bins for a batch of records from the database cluster.

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
var bins = ['s', 'i']

client.batchSelect(keys, bins, function (error, results) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    for (var i = 0; i < results.length; i++) {
      var result = results[i]
      switch (result.status) {
        case status.AEROSPIKE_OK:
          // record found
          break
        case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
          // record not found
          break
        default:
          // error while reading record
          break
      }
    }
  }
})
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
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
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

Creates an integer index. It's an asynchronous API that issues the index create command
to the aerospike cluster. To verify that the index has been created and populated with all the
data use the [indexCreateWait()](#indexCreateWait) API.

Parameters:
- `args`      - An object with these entries. ns, set, bin, index, policy.
- `ns`        - namespace on which index is to be created
- `set`       - set on which index is to be created
- `bin`       - bin to be indexed
- `index`     - name of the index to be created
- `policy`    - (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`  – The function to call when the operation completes.

The parameters for the `callback` argument:

- `error` – An [Error object](datamodel.md#error), which contains the status of the connect call.

Example:
```js
var args = {ns: 'test', set: 'demo', bin: 'bin1', index: 'index_name'}
client.createIntegerIndex(args, function (error) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
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

Creates a string index. It's an asynchronous API that issues the index create command
to the aerospike cluster. To verify that the index has been created and populated with all the
data use the [indexCreateWait()](#indexCreateWait) API.

Parameters:
- `args`      - An object with these entries. ns, set, bin, index, policy.
- `ns`        - namespace on which index is to be created
- `set`       - set on which index is to be created
- `bin`       - bin to be indexed
- `index`     - name of the index to be created
- `policy`    - (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`  – The function to call when the operation completes.

The parameters for the `callback` argument:

- `error` – An [Error object](datamodel.md#error), which contains the status of the connect call.

Example:
```js
var args = {ns: 'test', set: 'demo', bin: 'bin1', index: 'index_name'}
client.createStringIndex(args, function (error) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```

<!--
################################################################################
createGeo2DSphereIndex()
################################################################################
-->
<a name="createGeo2DSphereIndex"></a>

### createGeo2DSphereIndex(args, callback)

Creates a geospatial index. It's an asynchronous API that issues the index create command
to the aerospike cluster. To verify that the index has been created and populated with all the
data use the [indexCreateWait()](#indexCreateWait) API.

Parameters:
- `args`      - An object with these entries. ns, set, bin, index, policy.
- `ns`        - namespace on which index is to be created
- `set`       - set on which index is to be created
- `bin`       - bin to be indexed
- `index`     - name of the index to be created
- `policy`    - (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`  – The function to call when the operation completes.

The parameters for the `callback` argument:

- `error` – An [Error object](datamodel.md#error), which contains the status of the connect call.

Example:
```js
var args = {ns: 'test', set: 'demo', bin: 'bin1', index: 'index_name'}
client.createStringIndex(args, function (error) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
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
- `response`    - The value returned from the udf function.

Example:
```js
var key = aerospike.key
var udfArgs = {module: 'udf_module', funcname: 'udf_function', args: ['abc', 123, 4.5]}

client.execute(key('test', 'demo', 'key1'), udfArgs, function (error, res, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
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

client.exists(key('test', 'demo', 'key1'), function (error, metadata, key) {
  switch (error.code) {
    case status.AEROSPIKE_OK:
      // record exists
      break
    case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
      // record does not exist
      break
    default:
      // handle error
      break
  }
})
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

client.get(key('test', 'demo', 'key1'), function (error, record, metadata) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
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
- `index`       – The name of the index to be created.
- `policy`      – (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of
                  the operation.


Example:

```js

client.indexRemove('test', 'index', function (error) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
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
client.info('statistics', function (error, response, host) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```

Example of sending the request to a single host:

```js
client.info('statistics', {addr: '127.0.0.1', port: 3000}, function (error, response, host) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```

<!--
################################################################################
indexCreateWait()
################################################################################
-->
<a name="indexCreateWait"></a>

### indexCreateWait(namespace, index, pollInterval, callback)

Wait until an index create command succeeds in aerospike cluster. This function returns
only when index is ready to be queried.

Parameters:

- `namespace`   – The namespace on which the index is created.
- `index`       – The name of the index created.
- `pollInterval`- The poll interval in milliseconds to check the index creation status.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of
                  the operation.


Example:

```js
var args = {ns: 'test', set: 'demo', bin: 'bin1', index: 'index_name'}
client.createIntegerIndex(args, function (error) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    client.indexCreateWait('test', 'index_name', 1000, function (error) {
      if (error && error.code !== status.AEROSPIKE_OK) {
        // handle failure
      } else {
        // handle success
      }
    })
  }
})

```

<!--
################################################################################
LargeList()
################################################################################
-->
<a name="largeList"></a>

### LargeList(key, binName, writePolicy, createModule):LargeList

Creates a new [LargeList](largelist.md) object, which is used to perform all LDT operations in the database.

Parameters:
- `key`         - A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `binName`     - Name of the Large Data Type Bin.
- `applyPolicy` - (optional) A [Apply Policy object](policies.md#ApplyPolicy) to use for this operation.
- `createModule`- (optional) Lua function name that initialized list configuration parameters, pass null for
                  default list.

Example:

```js
var key     = {ns: 'test', set: 'demo', key: 'ldt_key'}
var binName = 'ldtBinName';
var policy  = {timeout: 1000}
var llist = client.LargeList(key, binName, policy);
```

For details, see [LargeList Class](largelist.md)

<!--
################################################################################
operate()
################################################################################
-->
<a name="operate"></a>

### operate(key, operations, metadata=null, policy=null, callback)

Performs multiple operations on a single record.

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `operations`  – An array of operations.For the list of supported operations please refer [operators](operators.md)
- `metadata`    – (optional) A [Metadata object](datamodel.md#metadata).
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
var op = aerospike.operator

var ops = [
  op.append('a', 'xyz'),
  op.incr('b', 10),
  op.read('b')
]

client.operate(key, ops, function (error, record, metadata, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```
<!--
################################################################################
prepend()
################################################################################
-->
<a name="prepend"></a>

### prepend(key, bins, metadata=null, policy=null, callback)

Prepends bin string values to existing record bin values. This call only works for string values.

Parameters:

- `key`         – A [Key object](datamodel.md#key), used to locate the record in the cluster.
- `bins`        – A [Record Object](datamodel.md#record), used to specify the bins to be added with integer values.
- `metadata`    – (optional) A [Metadata object](datamodel.md#metadata).
- `policy`      – (optional) A [Operate Policy object](policies.md#OperatePolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of
                  the operation.
- `record`      – The [Record object](datamodel.md#record), containing the fields of the record.
- `metadata`    – The [Metadata object](datamodel.md#record) for the `record`. Only generation is returned.
- `key`         – The [Key object](datamodel.md#key) for the `record`.

Example:

```js
var bins = {FirstMovieSeen: '12 Angry Man'}

client.prepend(key, bins, function (error, record, metadata, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
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

client.put(key('test', 'demo', 'key1'), rec, function (error, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```

Note: The client does not perform any automatic data type conversions. Attempting to write an unsupported data type (e.g. boolean) into a record bin will cause an error to be returned. Setting an `undefined` value will also cause an error.

<!--
################################################################################
query()
################################################################################
-->
<a name="query"></a>

### query(namespace, set, statement):query

Creates a new [query](query.md) object, which is used to define query in the database.

Parameters:
- `namespace`   - Namespace to be queried.
- `set`         - Set on which the query has to be executed.
- `statement`   - an Instance of [Statement](query.md#Statement), which specifies the properties of
                  a given query.
Example:

```js
var query = client.query(ns, set)
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

client.remove(key('test', 'demo', 'key1'), function (error, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
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

client.select(key('test', 'demo', 'key1'), ['name', 'age'], function (error, record, metadata, key) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```

<!--
################################################################################
udfRegister()
################################################################################
-->
<a name="udfRegister"></a>

### udfRegister(udfModule, policy=null, callback)

Registers an UDF to the database cluster. To verify that UDF is present in all the nodes
refer [udfRegisterWait()](#udfREgisterWait)

Parameters:

- `udfModule`   – UDF filename specifying absolute file path.
- `policy`      – (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of
                  the operation.

Example:
```js

client.udfRegister('path/to/file/filename', function (error) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
```

<!--
################################################################################
udfRegisterWait()
################################################################################
-->
<a name="udfRegisterWait"></a>

### udfRegisterWait(udfFilename, pollInterval, policy=null, callback)

Wait until the UDF registration succeeds in aerospike cluster. This function returns only when the
UDF registered is available with all the nodes in aerospike cluster.

Parameters:

- `udfFilename` – UDF filename for which the status has to be checked.
- `pollInterval`- The status of UDF registration checked regularly with this Interval. Specified in milliseconds.
- `policy`      – (optional) The [Info Policy object](policies.md#InfoPolicy) to use for this operation.
- `callback`    – The function to call when the operation completes with the results of the operation.

The parameters for the `callback` argument:

- `error`       – The [Error object](datamodel.md#error) representing the status of
                  the operation.

Example:
```js

client.udfRegister('path/to/file/filename', function (error) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    client.udfRegisterWait(filename, 1000, function (error) {
      if (error && error.code !== status.AEROSPIKE_OK) {
        // handle failure
      } else {
        // handle success
      }
    })
  }
})
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
client.udfRemove('udfModuleName', function (error) {
  if (error && error.code !== status.AEROSPIKE_OK) {
    // handle failure
  } else {
    // handle success
  }
})
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
