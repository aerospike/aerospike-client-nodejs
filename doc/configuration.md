# Configuration

The Aerospike client can be configured using a JavaScript object. 

The following is a configuration example and some guidlines on how to configure a client.

```js
var aerospike = require('aerospike');

var config = {
  hosts: [
    // add three nodes in the cluster.
    { addr: "192.168.0.1", port: 3000 },
    { addr: "192.168.0.2", port: 3000 },
    { addr: "192.168.0.3", port: 3000 }
  ],
  policies = {
    // default timeout for all operations is 100ms
    timeout: 100 
  }
};

var client = aerospike.client(config);
```

The attributes of the configuration enumerated below.

## Configuration Attributes

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
- `scan` – The global policy for scan operations, defined using a [Scan Policy Object](policies.md#ScanPolicy)
- `write` – The global policy for write operations, defined using a [Write Policy Object](policies.md#WritePolicy)



