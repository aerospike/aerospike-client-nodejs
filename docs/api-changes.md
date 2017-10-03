# Backward Incompatible API Changes

## Version 3.0.0

### Removal of LargeList (LDT) Functionality

The `Client#LargeList` function and all related functionality supporting Large Data Types (LDT) have been removed. Deprecation of LDT was first announced on the [Aerospike Blog](http://www.aerospike.com/blog/aerospike-ldt/) in November 2016. Aerospike Server v3.14 is the last server release to support LDT functionality.

### Promise-based API & Changes in Callback Method Signatures

In addition to callback functions, the v3 client also supports an async API
based on Promises. (And `async`/`await` when using Node.js v8 or later!) The callback function parameter on all async client commands
is now optional. If no callback function is passed, the command will return a
Promise instead. A [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
object represents the eventual completion (or failure) of an asynchronous
operation, and its resulting value.

In contrast to callback functions, a Promise can only resolve to a single
result value. In v2, several of the client's callback functions passed more
than one result value. For example, the record callback
function used by the v2 `Client#get` command, passes the record bins, meta
data and the keys in three separate parameters to the callback function: `recordCallback(error, bin, meta, key)`.

To harmonize the result values passed to callback functions and the values
returned by Promises, all client commands in v3 return a single result value.
The method signatures of several callback functions have been updated to
combine multiple separate result values into a single result object.

| Callback | v2 / v3 Method Signature | Affected Client Commands |
| -------- | ------------------------ | ------------------------ |
| [Record Callback](http://www.aerospike.com/apidocs/nodejs/Client.html#~recordCallback__anchor) | v2:&nbsp;`cb(error, bins, meta, key)`<br> v3:&nbsp;`cb(error, record)` | `Client#get`, `Client#operate`, `Client#append`, `Client#prepend`, `Client#add`, `Client#select` |
| [Batch Record Callback](http://www.aerospike.com/apidocs/nodejs/Client.html#~batchRecordCallback__anchor) | v2:&nbsp;`cb(error, [{status:, key:, bins:, meta:}])`<br> v3:&nbsp;`cb(error, [{status:, record:}])` | `Client#batchRead`, `Client#batchGet`, `Client#batchSelect` |
| [Record Stream `data` Event Callback](http://www.aerospike.com/apidocs/nodejs/RecordStream.html#event:data__anchor) | v2:&nbsp;`cb(bins, meta, key)`<br> v3:&nbsp;`cb(record)` | `Query#foreach`, `Scan#foreach` |

Note: The `record` object passed in v3 is an instance of the new [`Record`](http://www.aerospike.com/apidocs/nodejs/Record.html) class, which contains the records bins, key and meta-data.

### Update Error Status Codes & Messages

The constants for the error status codes in the `Aerospike.status` module have
been renamed to drop the redundant `AEROSPIKE_` prefix. E.g.

* `Aerospike.status.AEROSPIKE_OK` → `Aerospike.status.OK`
* `Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND` → `Aerospike.status.ERR_RECORD_NOT_FOUND`
* `Aerospike.status.AEROSPIKE_ERR_NO_MORE_CONNECTIONS` → `Aerospike.status.ERR_NO_MORE_CONNECTIONS`
* ...

The old contants (with `AEROSPIKE_` prefix) still exist for now, but are
undocumented; they will be removed in the next major client version.

`AerospikeError` instances now also have proper, human readable error messages in most cases.

### Policy Changes, Improved Timeout & Retry Handling

The v3 client provides separate ES6 classes for all client transaction
policies, e.g. `Aerospike.ReadPolicy`, `Aerospike.WritePolicy`, etc. Passing
policy values as plain objects to client commands is still supported but maybe
deprecated at some point in the future. The policy classes will provide
additional functionality like validation, support for handling future, backward
incompatible policy changes, etc. It is recommended that you start using
the new policy classes over plain objects.

Global default policies can be set when creating a new client instance. Default policies need to be set separately for all transaction types, e.g. read, write, operate, etc. Setting global default policy values that apply to all transaction policies is no longer supported.

All [[1]](#f1) client transaction policies are based on a new `BasePolicy` class which
encode some important differences in how the v3 client handles timeouts and automatic retries.

The `timeout` policy value of the v2 client has been renamed to `totalTimeout`
and specifies the total transaction timeout in milliseconds. The `totalTimeout`
is tracked on the client and sent to the server along with the transaction in
the wire protocol. The client will most likely timeout first, but the server
also has the capability to timeout the transaction. If `totalTimeout` is not
zero and `totalTimeout` is reached before the transaction completes, the
transaction will return error `ERR_TIMEOUT`. If `totalTimeout` is zero, there
will be no total time limit. The default value for `totalTimeout` is 1,000 milliseconds.

The new `socketTimeout` policy value specifies the socket idle timeout in
milliseconds. If `socketTimeout` is not zero and the socket has been idle for
at least `socketTimeout`, both `maxRetries` and `totalTimeout` are checked. If
`maxRetries` and `totalTimeout` are not exceeded, the transaction is retried.
The default value for `socketTimeout` is zero, i.e. no socket idle time limit.

`maxRetries` is used to specify the maximum number of retries before aborting
the current transaction. The default value for `maxRetries` is 2. The initial
attempt is not counted as a retry. If `maxRetries` is exceeded, the transaction
will return error `ERR_TIMEOUT`.

WARNING: Database writes that are not idempotent (such as `Client#incr`) should not be
retried because the write operation may be performed multiple times if the
client timed out previous transaction attempts. It is important to use a
distinct `WritePolicy` for non-idempotent writes which sets `maxRetries` to
zero.

Example: Using the new policy classes to specify timeout and retry handling:

```javascript
const Aerospike = require('aerospike')

let defaults = {
  socketTimeout: 200,
  totalTimeout: 500,
  maxRetries: 2
}
let config = {
  policies: {
    read: new Aerospike.ReadPolicy(defaults),
    write: new Aerospike.WritePolicy(defaults)
    // timeout: 500 - Can no longer specify global defaults here!
  }
}

let key = new Aerospike.Key('test', 'demo', 'k1')

Aerospike.connect(config)
  .then(client => {
    return client.put(key, {value: 10})
      .then(() => {
        let policy = new Aerospike.OperatePolicy({ maxRetries: 0 })
        return client.incr(key, {value: 20}, {}, policy)
      })
      .then(() => client.get(key))
      .then(record => console.info('Value:', record.bins.value))
      .then(() => client.close())
      .catch(error => {
        client.close()
        return Promise.reject(error)
      })
  })
  .catch(error => console.error('Error:', error))
```

<a name="f1"/>[1]</a> Except `InfoPolicy` and `MapPolicy`.

### Changed Semantics of `Client#exists` Command

The `Client#exists` command now returns a simple boolean value to indicate
whether a record exists in the database under the given key. It is no longer
necessary, nor possible, to check the transactions's status code for the
`ERR_RECORD_NOT_FOUND` error.

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
| `Aerospike.Double()`             | `new Aerospike.Double()`                                 | -                                           |
| `Aerospike.filter.geoContains()` | `Aerospike.filter.geoContainsGeoJSONPoint()`   | -                                           |
| `Aerospike.filter.geoWithin()`   | `Aerospike.filter.geoWithinGeoJSONRegion()`    | -                                           |
| `Aerospike.indexType.<STRING, NUMERIC, GEO2DSPHERE>` | `Aerospike.indexDataType.<STRING, NUMERIC, GEO2DSPHERE>` | -             |
| `Aerospike.info.parseInfo()`     | `Aerospike.info.parse()`                       | -                                           |
| `Aerospike.key()`                | `new Aerospike.Key()`                                    | -                                           |
| `Aerospike.operator.<*>`         | `Aerospike.operations.<*>`                     | -                                           |
| `Aerospike.operator.list<*>`     | `Aerospike.lists.<*>`                          | -                                           |
| `Client#LargeList()`             | -                                              | See "Removal of LDT functionality"          |
| `Client#execute()`               | `Client#apply()`                               | -                                           |
| `Client#info()` w/o `host` param | `Client#infoAll()`                             | -                                           |
| `Client#udfRegisterWait()`       | `UdfJob#wait()`                                | `Client#udfRegister()` & `Client#udfRemove()` return a `UdfJob` instance.         |
| `Client#createIndexWait()`       | `IndexJob#wait()`                             | `Client#createIndex()` & `Client#create<*>Index()` return an `IndexJob` instance. |
| `InfoPolicy#send_as_is`          | `InfoPolicy#sendAsIs`                          | -                                           |
| `InfoPolicy#check_bounds`        | `InfoPolicy#checkBounds`                       | -                                           |
| `LargeList#*`                    | -                                              | See "Removal of LDT functionality"          |
| `Query#execute()`                | `Query#foreach()`                              |                                             |
| `Scan#execute()`                 | `Scan#foreach()`                               |                                             |

### Supported Node.js versions

Node.js v0.12 is no longer supported. Node.js v4 (LTS) or later are required to
run Aerospike Node.js client v3.0.

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
