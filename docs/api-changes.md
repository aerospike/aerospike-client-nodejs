# Backward Incompatible API Changes

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
