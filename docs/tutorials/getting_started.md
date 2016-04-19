### Installing

Install the `aerospike` npm package and save it in your applications dependency list:

    npm install aerospike --save

(To install the package temporarily and not add it to the dependencies list, omit the `--save` option.)

The package contains a native C/C++ add-on which will be build automatically
during the installation. For more information, please refer to the
[prerequisites](https://github.com/aerospike/aerospike-client-nodejs#prerequisites)
and detailed [installation
instructions](https://github.com/aerospike/aerospike-client-nodejs#installation)
in the `aerospike-client-nodejs` Github repository.

### Configuration

First, you need to require the `aerospike` module in your application:

    const Aerospike = require('aerospike')

Before you can connect to the Aerospike database, you need to configure the
client and specify the hostname of at least one of the Aerospike server nodes
in your cluster. The client will be able to retrieve the details of the entire
cluster from the first node it manages to connect to. But you can specify the
hostnames of more than one cluster node, in case one of them is not reachable.

The specify the hostnames, you can either set the `AEROSPIKE_HOSTS` environment
variable, or you can set the hostnames in the client configuration inside your
code.

The `AEROSPIKE_HOSTS` environment variable can take a comma-separate list of
hostnames with optional port numbers, e.g.

    export AEROSPIKE_HOSTS=192.168.1.10:3000,192.168.1.11:3100

The port number is optional and defaults to the default port of the Aerospike
server (3000). If no hostname is specified, the client will try to connect to
localhost (127.0.0.1:3000) by default.

Alternatively, you can configure the client programatically by creating a config object:

    var config = {
      hosts: "192.168.1.10:3000,192.168.1.11:3100"
    }

The `hosts` key takes the same comma-separated list of hostnames and ports as
the `AEROSPIKE_HOSTS` environment variable.

The config object can also be used to configure other aspects of the client.
Please refer to the [Config]{@link Client~Config} type definition for more
details.

### Connecting

With the client configured, it's time to connect to the database cluster:

    Aerospike.connect(config, function (error, client) {
      // client is ready to accept commands
    })

The [Aerospike.connect()]{@link module:aerospike.connect} method takes the
config object as an optional parameter and connects to the Aerospike cluster.
It will establish separate connections to all the nodes in the cluster and will
maintain the a copy of the cluster configuration for as long as it is
connected. That allows it so send client commands to one or more server nodes
as appropriate.

Once the client has established the connections, it will call the callback
method passed in the connect() function. If there was an error connecting, the
`error` parameter will contain an instance of the {@link AerospikeError} class.
Otherwise it will be `null` and the `client` parameter will contain an instance
of the {@link Client} class.

### Sending Commands

The client instance can be used to send various commands to the Aerospike
cluster for creating records, reading records, running queries, etc. Please
refer to the documentation of the {@link Client} class for details. Most client
commands work asynchronously and use callback functions to return the status of
the command and results (if any) back to the client.

Example of writing, then reading a database record:

```
const Aerospike = require('aerospike')
const Key = Aerospike.Key

function assertOk (error, message) {
  if (error) {
    console.error('ERROR - %s: %s [%s]\n%s', message, error.message, error.code, error.stack)
    throw error
  }
}

Aerospike.connect(function (error, client) {
  assertOk(error, 'Connecting to Aerospike cluster')

  var key = new Key('test', 'demo', 'test1')
  client.put(key, {name: 'Bob', age: 49}, function (error) {
    assertOk(error, 'Writing database record')

    client.get(key, function (error, record) {
      assertOk(error, 'Reading database record')

      console.info(record) // => { name: 'Bob', age: 49 }

      client.close()
    })
  })
})
```

### Closing the Connection

As seen in the previous example, it is important to close the connection to the
Aerospike cluster once it is no longer required. The client's C/C++ add-on is
using Node.js's libuv event loop for executing the client commands
asynchronously, and keeping the connection open will prevent the  event loop
from terminating.
