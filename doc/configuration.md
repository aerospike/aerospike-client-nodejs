# Configuration

The Aerospike client can be configured using a JavaScript object. 

The following is an example of a configuration and how to configure a client.

```js
var aerospike = require('aerospike');

var config = {
  hosts: [
    // add thre nodes in the cluster.
    { addr: 192.168.0.1, port: 3000 },
    { addr: 192.168.0.2, port: 3000 },
    { addr: 192.168.0.3, port: 3000 }
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

The `hosts` attribute should contain an Array of hosts the client should attempt to connect with. On `client.connect()`, The client will iterate through the list of hosts until it successfully connects with one of the connect.

Each entry in the list is a Object containing the following attributes:

- `addr` - The IP address or domain name of the host. 
- `port` - The listening port of the host. If not specified, the default is 3000.

### `policies` attribute

The `policies` attribute should contain an Object containing global policies for the client. A policy is a set of values which modify the behavior of an operation, such as timeouts and how an operation handles data.

The attributes of the `policies` Object:

- `timeout` – The global timeout value, if one is not explicitly defined for an operation.
- `read` – The read policy, defined using a `read` policy object.



