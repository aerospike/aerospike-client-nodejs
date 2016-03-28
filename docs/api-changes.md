# Backward Incompatible API Changes

## Version 2.0.0

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
