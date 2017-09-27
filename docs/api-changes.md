# Backward Incompatible API Changes

## Version 3.0.0

### Removal of LargeList (LDT) Functionality

The `Client#LargeList` function and all related functionality supporting Large Data Types (LDT) have been removed.
Deprecation of LDT was first announced on the Aerospike Blog in [November 2016](http://www.aerospike.com/blog/aerospike-ldt/).
Aerospike Server v3.14 is the last server release to support LDT functionality.

### Promise-based API & Changes in Callback Method Signatures

In addition to callback functions, the v3 client also supports an async API
based on Promises. The callback function parameter on all async client commands
is now optional. If no callback function is passed, the command will return a
Promise instead. A [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
object represents the eventual completion (or failure) of an asynchronous
operation, and its resulting value.

In contrast to callback functions, a Promise can only resolve to a single
result value. In v2, several of the client's callback functions passed more
than one result value. For example, the record callback
function used by the `Client#get` command, passed the record's bins, meta
data and the record's keys in three separate parameters to the provided
callback function: `recordCallback(error, bin, meta, key)`.

To harmonize the result values passed to callback functions and returned by
Promises, all client commands in v3 return a single result value. The method
signatures of several callback functions have been updated to combine multiple
separate result values into a single result object.

| Callback | v2 Method Signature | v3 Method Signature | Affected Client Commands | Remarks |
| -------- | ------------------- | ------------------- | ------------------------ | ------- |
| [Record Callback](http://www.aerospike.com/apidocs/nodejs/Client.html#~recordCallback__anchor) | `cb(error, bins, meta, key)` | `cb(error, record)` | `Client#get`, `Client#operate`, `Client#append`, `Client#prepend`, `Client#add`, `Client#select` | The `record` passed in v3 is an instance of the `Record` class, which contains the records bins, key and meta-data. |
| [Batch Record Callback](http://www.aerospike.com/apidocs/nodejs/Client.html#~batchRecordCallback__anchor) | `cb(error, results)` | `cb(error, results)` | `Client#batchRead`, `Client#batchGet`, `Client#batchSelect` | The `results` array passed in v3 contains instances of the `Record` class instead of separate bins, meta-data and key values. |
| [Record Stream `data` Event Callback](http://www.aerospike.com/apidocs/nodejs/RecordStream.html#event:data__anchor) | `cb(bins, meta, key)` | `cb(record)` | `Query#foreach`, `Scan#foreach` | The `record` passed in v3 is an instance of the `Record` class, which contains the records bins, key and meta-data. |

### Update Error Status Codes & Messages

The constants for the error status codes in the `Aerospike.status` module have
been renamed to drop the redundant `AEROSPIKE_` prefix. E.g.

* `Aerospike.status.AEROSPIKE_OK` → `Aerospike.status.OK`
* `Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND` → `Aerospike.status.ERR_RECORD_NOT_FOUND`
* `Aerospike.status.AEROSPIKE_ERR_NO_MORE_CONNECTIONS` → `Aerospike.status.ERR_NO_MORE_CONNECTIONS`
* ...

The old contants (with `AEROSPIKE_` prefix) still exist for now, but are
undocumented; they will be removed in the next major client version.

`AerospikeError` instances now also have proper error messages in most cases.

### Changed Semantics of `Client#exists` Command

The `Client#exists` command now returns a simple boolean value to indicate
whether a record exists in the database under the given key. It is no longer
necessary, nor possible, to check the command's error code for the
`ERR_RECORD_NOT_FOUND` status code.

Usage under v2:

```JavaScript
let key = new Aerospike.Key('test', 'test', 'noSuchKey')
client.exists(key, error => {
  if (error && error.code !== Aerospike.status.ERR_RECORD_NOT_FOUND) {
    // An error occurred while executing the command.
  } else if (error) {
    // The record does not exist.
  } else {
    // The record for the key exists.
  }
})
```

Usage under v3:

```JavaScript
let key = new Aerospike.Key('test', 'test', 'noSuchKey')
client.exists(key, (error, result) => {
  if (error) {
    // An error occurred while executing the command.
  } else if (result) {
    // The record for the key exists.
  } else {
    // The record does not exist.
  }
})
```

### Changed Semantics of `Client#createIndex` and `Client#indexRemove` Commands

The `Client#createIndex` command now returns an error with status code
`ERR_INDEX_FOUND` if an index with the same name already exists and/or if an
index of any name already exists on the same bin.

The `Client#removeIndex` command now returns an error with status code
`ERR_INDEX_NOT_FOUND` if no index with the given name exists in the cluster.

### Shared Memory Layout & Key Changes

Shared memory layout has changed. If you are using shared memory clients, it is
critical to change the shared memory key (`Config#sharedMemory.key`) when
upgrading from Node.js client v2 to v3. The default value for the key has
changed from 0xA6000000 to 0xA7000000.

Please refer to the [Shared
Memory](http://www.aerospike.com/docs/client/c/usage/shm.html) section in the
Aerospike C Client's documentation for more information about the client's
usage of shared memory.

### Removal of Client Functions Deprecated under v2

The following Client functions have been marked as deprecated under v2.x and have been removed in v3:

| Removed Function                 | Replacement                                    | Remarks                                     |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `Aerospike.Double()`             | `new Double()`                                 | -                                           |
| `Aerospike.filter.geoContains()` | `Aerospike.filter.geoContainsGeoJSONPoint()`   | -                                           |
| `Aerospike.filter.geoWithin()`   | `Aerospike.filter.geoWithinGeoJSONRegion()`    | -                                           |
| `Aerospike.indexType.<STRING, NUMERIC, GEO2DSPHERE>` | `Aerospike.indexDataType.<STRING, NUMERIC, GEO2DSPHERE>` | -             |
| `Aerospike.info.parseInfo()`     | `Aerospike.info.parse()`                       | -                                           |
| `Aerospike.key()`                | `new Key()`                                    | -                                           |
| `Aerospike.operator.<*>`         | `Aerospike.operations.<*>`                     | -                                           |
| `Aerospike.operator.list<*>`     | `Aerospike.lists.<*>`                          | -                                           |
| `Client#LargeList()`             | -                                              | See "Removal of LDT functionality"          |
| `Client#execute()`               | `Client#apply()`                               | -                                           |
| `Client#info()` w/o `host` param | `Client#infoAll()`                             | -                                           |
| `Client#udfRegisterWait()`       | `UdfJob#wait()`                                | `Client#udfRegister()` & `Client#udfRemove()` return a `UdfJob` instance.         |
| `Client#createIndexWait()`       | `IndexTask#wait()`                             | `Client#createIndex()` & `Client#create<*>Index()` return an `IndexJob` instance. |
| `InfoPolicy#send_as_is`          | `InfoPolicy#sendAsIs`                          | -                                           |
| `InfoPolicy#check_bounds`        | `InfoPolicy#checkBounds`                       | -                                           |
| `LargeList#*`                    | -                                              | See "Removal of LDT functionality"          |
| `Query#execute()`                | `Query#foreach()`                              |                                             |
| `Scan#execute()`                 | `Scan#foreach()`                               |                                             |

## Version 2.6.0

### Deprecations

| Deprecated Function          | Replacement                                    | Remarks                                     |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `Info#parseInfo`             | `Info#parse`                                   | `parse` and `parseInfo` both parse the info data returned by the Aerospike server; there are some minor differences between the parsed data returned by the two functions for some info keys |
| `Client#udfRegisterWait`     | `UdfJob#waitUntilDone`                         | An `UdfJob` instance is passed to the client's `udfRegister`/`udfRemove` callback functions. |

## Version 2.4.4

### Deprecation of LargeList Functionality

Aerospike will no longer support the Large Data Type (LDT) feature so all
LargeList related functions have been marked as deprecated. Please refer to
[this article](http://www.aerospike.com/blog/aerospike-ldt/) on the Aerospike
company blog for more details.

### Deprecations

| Deprecated Function          | Replacement                                    | Remarks                                     |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `Client#LargeList`           | -                                              | see above                                   |
| `LargeList#*`                | -                                              | see above                                   |

## Version 2.4.0

### Shared Memory Layout Changes

Multiple client instances running in separate processes on the same machine can
use shared memory to share cluster status, including nodes and data partition
maps. See [sharedMemory config](http://www.aerospike.com/apidocs/nodejs/Config.html#sharedMemory)
for more information.

In v4.1.0 of the Aerospike C client library, which is included in v2.4.0 of the
Aerospike Node.js client, the shared memory layout has changed. The default
shm_key config has changed to 0xA6000000 so old client applications do not mix
shared memory with new client applications. If you are using shared memory
clients with a custom shm_key, it's critical that this key changes when
upgrading to v2.4.0 of the Aerospike Node.js client.

### Deprecations

| Deprecated Function          | Replacement                                    | Remarks                                     |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `InfoPolicy#send_as_is`      | `InfoPolicy#sendAsIs`                          | -                                           |
| `InfoPolicy#check_bounds`    | `InfoPolicy#checkBounds`                       | -                                           |
| `ReadPolicy#retry`           | -                                              | -                                           |
| `WritePolicy#retry`          | -                                              | -                                           |
| `RemovePolicy#retry`         | -                                              | -                                           |
| `OperatePolicy#retry`        | -                                              | -                                           |

*Notes:*

* The `retry` policy value for read, write, remove and operate policies
  has not been effective for any single key read/write commands, the batch read
  command or query/scan commands in client versions v2.x.

## Version 2.1.0

### New modules for Scalar, List & Map operations

The `Aerospike.operator` module has been split into three separate modules for operations on scalar values, lists and maps:

 - `Aerospike.operations` - Operations on scalar values (Strings, Integers, Doubles, etc.).
 - `Aerospike.lists` - Operations on Lists, e.g. append, insert, remove.
 - `Aerospike.maps` - Operations on Sorted Maps, e.g. put, getByKey, removeByIndex.

The old `Aerospike.operator` module has been deprecated and will be removed in the next major release.

### Deprecations

| Deprecated Function          | Replacement                                    | Remarks                                     |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `Aerospike.operator.append`  | `Aerospike.operations.append`                  | -                                           |
| `Aerospike.operator.incr`    | `Aerospike.operations.incr`                    | -                                           |
| `Aerospike.operator.prepend` | `Aerospike.operations.prepend`                 | -                                           |
| `Aerospike.operator.read`    | `Aerospike.operations.read`                    | -                                           |
| `Aerospike.operator.touch`   | `Aerospike.operations.touch`                   | -                                           |
| `Aerospike.operator.write`   | `Aerospike.operations.write`                   | -                                           |
| `Aerospike.operator.list<*>` | `Aerospike.lists.<*>`                          | -                                           |

## Version 2.0.0

None. But see 2.0.0-alpha.1 through 2.0.0-alpha.3 for list of backward incompatible changes since v1.x.

## Version 2.0.0-alpha.3

### New Query Interface

The Client API for executing Queries was revised in this release and has several backward incompatible changes.

#### Processing Query Results

Prior to v2.0.0-alpha.3 the `data` event on the `RecordStream` interface would
pass a single record object to the event handler function, with two properties
`bins` and `meta` containing the bin values and the meta data for the
record respectively. Starting with v2.0.0-alpha.3, the `data` event instead
pass the bin values and the meta data as two separate parameters into the event
handler. (Same as the Scan interface introduced in v2.0.0-alpha.2.)

*Before:*

    # broken code - do not use in v2 client
    var statement = {
      'filters': [...]
    }
    var query = client.query('ns', 'set', statement)
    var stream = query.execute()
    stream.on('error', function (error) {
      // handle error
    })
    stream.on('data', function (record) {
      console.log(record.bins)
      console.log(record.meta)
    })
    stream.on('end', function () {
      // query completed
    })

*After:*

    var statement = {
      'filters': [...]
    }
    var query = client.query('ns', 'set', statement)
    var stream = query.foreach()
    stream.on('error', function (error) {
      // handle error
    })
    stream.on('data', function (bins, meta) {
      console.log(bins)
      console.log(meta)
    })
    stream.on('end', function () {
      // query completed
    })

#### Separation of Query and Scan APIs

In Aerospike Node.js client v1.x, both queries (with filter predicates) and
scans (without filter predicates) where handled via the `Client#query` command
and the `Query#execute` method. In v2.0.0-alpha.2, the new Scan API was
introduced, and scan operations should now be initiated via `Client#scan`.
Starting with v2.0.0-alpha.3, the Query API will no longer accept any of the
properties specific to scans in the query statment when calling `Client#query`.
Including any of the following five keys will result in an exception being
raised by the client:

- `UDF`
- `concurrent`
- `percentage`
- `nobins`
- `priority`

The `concurrent`, `percentage`, `nobins` and `priority` values should be set
via the Scan API instead and the Lua UDF parameters for applying a Aerospike
Record UDF on a background scan should be passed directly to `Scan#background`.

*Before: Executing Background Scan*

    # broken code - do not use in v2 client
    var statement = {
      'UDF': {
        module: 'myLuaModule',
        funcname: 'myLuaFunction',
        args: ['some', 'function', 'arguments']
      }
    }
    var query = client.query('ns', 'set', statement)
    var stream = query.execute()
    stream.on('error', function (error) {
      // handle error
    })
    stream.on('end', function (scanID) {
      // retrieve scanID, which can be used to check scan job status
    })

*After: Executing Background Scan*

    var udfArgs = ['some', 'function', 'arguments']
    var scan = client.scan('ns', 'set')
    scan.background('myLuaModule', 'myLuaFunction', udfArgs, function (error, scanJob) {
      if (error) {
        // handle error
      } else {
        // use scanJob.info() and/or scanJob.waitUntilDone() to check scan job status
      }
    })


*Before: Setting Scan Priority, Concurrent Execution, etc.*

    # broken code - do not use in v2 client
    var statement = {
      concurrent: true,
      priority: Aerospike.scanPriority.HIGH,
      nobins: true,
      percentage: 50
    }
    var query = client.query('ns', 'set', statement)
    var stream = query.execute()
    stream.on('error', function (error) {
      // handle error
    })
    stream.on('data', function (record) {
      // process scan results
    })
    stream.on('end', function () {
      // scan completed
    })

*After: Setting Scan Priority, Concurrent Execution, etc.*

    var scan = client.scan('ns', 'test')
    scan.concurrent = true
    scan.priority = Aerospike.scanPriority.HIGH
    scan.nobins = true
    scan.percentage = 50
    var stream = scan.foreach()
    stream.on('error', function (error) {
      // handle error
    })
    stream.on('data', function (bins, meta) {
      // process scan results
    })
    stream.on('end', function () {
      // scan completed
    })


#### Query Aggregation using Stream UDFs

Applying a Lua user-defined function (UDF) as an Aerospike Stream UDF for query
aggregation is now done via the new `Query#apply` function, rather than by
passing the `aggregationUDF` parameter in the query statement and calling
`Query#execute`. `Query#apply` returns the aggregation result via asynchronous
callback so it is no longer necessary to extract the single result value from a
record stream.

*Before:*

    # broken code - do not use in v2 client
    var statement = {
      aggregationUDF: {
        module: 'myLuaModule',
        funcname: 'myLuaFunction',
        args: ['some', 'function', 'arguments']
      }
    }
    var query = client.query('ns', 'set', statement)
    var stream = query.execute()
    stream.on('error', function (error) {
      // handle error
    })
    stream.on('data', function (result) {
      // handle result
    })

*After:*

    var query = client.query('ns', 'set')
    var udfArgs = ['some', 'function', 'arguments']
    query.apply('myLuaModule', 'myLuaFunction', udfArgs, function (error, result) {
      if (error) {
        // handle error
      } else {
        // handle result
      }
    })

*Note:* `Client#query` will now throw an exception if the query statement includes an `aggregationUDF` property.

### Deprecations

| Deprecated Function            | Replacement                                | Remarks                                     |
| ------------------------------ | ------------------------------------------ | ------------------------------------------- |
| `Aerospike#scanStatus`         | `Aerospike#jobStatus`                      | -                                           |
| `Query#execute`                | `Query#foreach`                            | -                                           |
| `Scan#execute`                 | `Scan#foreach`                             | Scan class was introduced in 2.0.0-alpha.2  |
| `Scan#selectBins`              | `Scan#select`                              | Scan class was introduced in 2.0.0-alpha.2  |

## Version 2.0.0-alpha.2

### Deprecations

| Deprecated Function            | Replacement                                | Remarks                                     |
| ------------------------------ | ------------------------------------------ | ------------------------------------------- |
| `Client#createIndexWait`       | `IndexTask#waitUntilDone`                  | -                                           |
| `Aerospike.filter.geoWithin`   | `Aerospike.filter.geoWithinGeoJSONRegion`  | -                                           |
| `Aerospike.filter.geoContains` | `Aerospike.filter.geoContainsGeoJSONPoint` | -                                           |

When creating new secondary indexes via the `Client#createIndex` method (or
`Client#createIntegerIndex`, etc. short-hand methods), the optional info policy
should be passed as a separate function parameter instead of passing it in the
first `options` parameter. The `options.policy` parameter is deprecated.

In the info object returned by `Query#info` the `recordScanned` property has
been renamed to `recordsScanned`. For now the info object will contain the same
value under both the new and old name but the `recordScanned` property will be
removed in some future release.

## Version 2.0.0-alpha.1

### Error-first callbacks

Callbacks no longer return an error object with status code
`AEROSPIKE_OK` (0). Instead, if the client command succeeds, the first
argument to the callback (the `error` argument) will be `null`.

To revert to the previous callback behavior, set the callback handler for the
client to the `LegacyCallbackHandler` using the `Client.setCallbackHandler`
method. You need to set the callback handler, before instantiating any client
instances, e.g. using the `Aerospike.connect` or `Aerospike.client` methods.

```javascript
const Aerospike = require('aerospike')
const Client = Aerospike.Client
Client.setCallbackHandler(Client.LegacyCallbackHandler)

Aerospike.connect((error, client) => {
  console.log(error) => // { code: 0, message: '', func: '', file: '', line: 0 }
  if (error.code !== Aerospike.status.AEROSPIKE_OK) {
    // handle error
  } else {
    // client instance is ready receive commands
    client.close()
  }
})
```

### Releasing of event loop resources

To handle asynchronous client commands send to the Aerospike server cluster,
the client needs to register an async handle on Node.js event loop. This handle
needs to be freed explicitly in order for the event loop to exit and the
Node.js application to terminate.

#### Single Aerospike client instance

When working with a single Aerospike Node.js client instance, you can use the
client's `close` method to close the connection to the server nodes and release
all event loop resources. It is important to call the client's `close` method
as otherwise the application might not terminate.

Example:

```javascript
const Aerospike = require('aerospike')

Aerospike.connect((error, client) => {
  if (error) throw error
  // client instance is ready receive commands
  client.close()
})
```

#### Multiple (concurrent) Aersopike client instances

When the application needs to instantiate more than one Aerospike client, e.g.
to connect to multiple Aerospike server clusters, then the event loop resources
should only be released after the last client instance was closed. To prevent
automatic release of the event loop resources, the client's `close` method
needs to be called with the `releaseEventLoop` parameter set to false:

    var releaseEventLoop = false
    client.close(releaseEventLoop)

Then, after the last client instance was close, the `releaseEventLoop` method
on the `Aerospike` module needs to be called before the program terminates:

    Aerospike.releaseEventLoop()

Example:

````javascript
const Aerospike = require('aerospike')

// called one or more times to handle a new work request
function handleRequest (request) {
  Aerospike.connect((error, client) => {
    if (error) throw error
    // handle request
    client.close(false) // do not release event loop
  })
}

// called when application shuts down
function shutdown () {
  Aerospike.releaseEventLoop()
}
````

### Supported Node.js versions

Node.js v0.10 is no longer supported. Node.js v0.12 or later are required to
run Aerospike Node.js client v2.0.

### Deprecations

The following functions have been deprecated and/or replaced:

| Deprecated Function  | Replacement             | Remarks                                     |
| -------------------- | ----------------------- | ------------------------------------------- |
| `Aerospike.key`      | `new Aerospike.Key`     | -                                           |
| `Aerospike.Double`   | `new Aerospike.Double`  | -                                           |
| `Aerospike.GeoJSON`  | `new Aerospike.GeoJSON` | -                                           |
| `Client#batchExists` | `Client#batchRead`      | Requires Aerospike server version >= 3.6.0. |
| `Client#batchGet`    | `Client#batchRead`      | Requires Aerospike server version >= 3.6.0. |
| `Client#batchSelect` | `Client#batchRead`      | Requires Aerospike server version >= 3.6.0. |
| `Client#execute`     | `Client#apply`          | -                                           |
| `Client#add`         | `Client#incr`           | -                                           |
:q
