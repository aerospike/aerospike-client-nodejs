# Backward Incompatible API Changes

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
