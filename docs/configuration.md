# Configuration

The Aerospike client can be configured using a JavaScript object.

The following is a configuration example and some guidlines on how to configure a client.

```js
var aerospike = require('aerospike')

var config = {
  // username and password must be passed only to cluster with security feature enabled.
  // security feature is available only in Enterprise edition of Aerospike.
  user: 'username',
  password: 'password',
  hosts: [
    // add three nodes in the cluster.
    { addr: '192.168.0.1', port: 3000 },
    { addr: '192.168.0.2', port: 3000 },
    { addr: '192.168.0.3', port: 3000 }
  ],
  policies = {
    // default timeout for all operations is 100ms
    timeout: 100
  },
  log : {
     level: aerospike.log.INFO,
     file: fd  // fd opened by the application using fs.open()
  },
  modlua: {
    systemPath: 'path to system UDF files',
    userPath: 'path to user UDF files'
  }
}

var client = aerospike.client(config)
```

The attributes of the configuration are enumerated below.

## Configuration Attributes
### `username` attribute
User authentication to cluster.  Leave empty for clusters running without restricted access.

### `password` Attribute
Password authentication to cluster.  The hashed value of the password will be stored by the client
and sent to server in same format.  Leave empty for clusters running without restricted access.

### `hosts` attribute

The `hosts` attribute should contain an Array of hosts with which the client should attempt to connect. On `client.connect()`, the client iterates through the list of hosts until it successfully connects with one.

Each entry in the list is a Object containing the following attributes:

- `addr` - The IP address or domain name of the host.
- `port` - The listening port of the host. If not specified, the default is 3000.

### `policies` attribute

The `policies` attribute should contain an Object that contains global policies for the client. A policy is a set of values which modify the behavior of an operation, like timeouts and how an operation handles data. The policies defined in the configuration are used as global defaults, which can be overridden by individual operations as needed.

The attributes of the `policies` Object:

- `timeout` – The global timeout value, which is used if one is not explicitly defined for an operation.
- `batch` – The global policy for batch operations, defined using a [Batch Policy Object](policies.md#BatchPolicy)
- `info` – The global policy for info operations, defined using an [Info Policy Object](policies.md#InfoPolicy)
- `operate` – The global policy for info operations, defined using an [Operate Policy Object](policies.md#OperatePolicy)
- `query` – The global policy for query operations, defined using a [Query Policy Object](policies.md#QueryPolicy)
- `read` – The global policy for read operations, defined using a [Read Policy Object](policies.md#ReadPolicy)
- `remove` – The global policy for write operations, defined using a [Remove Policy Object](policies.md#RemovePolicy)
- `scan` – The global policy for scan operations, defined using a [Scan Policy Object](policies.md#ScanPolicy)
- `write` – The global policy for write operations, defined using a [Write Policy Object](policies.md#WritePolicy)


### `log` attribute

The `log` attribute is an object that contatins configuration for logging from the API. Logging is provided only for the API, not application.

The attributes of `log` object.

- `level` - logging severity, defined using [aerospike.log object](log.md).
- `file`  - file descriptor which is obtained using fs.open().

### `modlua` attribute

The `modlua` object contains configuration values for mod-lua system and user paths.

The attributes of `mod-lua` object.

- `systemPath` - The path to the system UDF files. These UDF files are installed with the aerospike client library. Default location relative to node_modules is : 'node_modules/aerospike/aerospike-client-c/package/opt/aerospike/client/sys/udf/lua/'
- `userPath`   - The path to user's UDF files. Default location relative to node modules is : 'node_modules/aerospike/aerospike-client-c/package/opt/aerospike/client/usr/udf/lua/'
