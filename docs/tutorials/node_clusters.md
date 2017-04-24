### The Node.js Cluster Module

The `cluster` module, that's part of the core Node.js library, provides a
simple, yet powerful interface to launch a cluster of Node.js processes. This
allows a Node.js application to take advantage of multi-core systems to handle
more load than a single Node.js instance running in a single thread.

The child processes can all share server ports and the cluster module can provide
simple load balancing to distribute incoming requests between worker processes.

### Connecting to the Aerospike Cluster

In a Node.js application using the cluster module, each worker process will
have to maintain it's own connection to the Aerospike database cluster. That
means the {@link Client#connect} method must be called in the worker, not in
the master process.

### Using Shared Memory to More Efficiently Manage Cluster Status

Each Aerospike client instance runs an extra cluster _tend_ thread that
periodically polls the server nodes for cluster status. This is required to,
among other things, maintain the data partition map, so that the client knows
how to send database commands to the cluster node that holds the master replica
of a given record.

To reduce the overhead of the cluster tend process in a
multi-process/single-thread environment like a Node.js cluster, the client can
use shared memory to store cluster status, including nodes and data partition
maps, in a shared memory segment. Only one cluster tend owner process polls the
server nodes for cluster status and writes to this shared memory segment. All
other client processes read the cluster status from shared memory and do not
have to poll the server nodes.

The usage of shared memory needs to be configured when a new client instance is
created, e.g. using {@link module:aerospike.connect}:

```
const config = {
  sharedMemory: {
    key: 0xa5000000
  }
}
const client = Aerospike.client(config)
```

See {@link Config#sharedMemory} for more details.

### Closing the Aerospike Connection

It is recommended that you close the connection to the Aerospike cluster using
the {@link Client#close} method, before you terminate the worker process. When
the Aerospike client is configured to use shared memory to maintain the cluster status,
one of the client instances will hold a lock on the shared memory region. If
this instance is killed without closing the connection, the lock will not be
released. Another instance may have to wait for the lock to expire (default: 30
seconds) before it can take over the cluster tending process.

### A Simple Example

In this simple example, we will setup a clustered HTTP server that connects to
an Aerospike database to read and write database records to server the incoming
HTTP requests. Besides the `Aerospike` module we will use the `cluster` module
and the `http` module that ship with Node.js, as well as a few utility modules:

```
const Aerospike = require('aerospike')
const cluster = require('cluster')
const http = require('http')
const url = require('url')
const debug = require('util').debuglog('server')
```

We setup the Aerospike client to use shared memory:

```
const config = {
  sharedMemory: {
    key: 0xa5000000
  }
}
const client = Aerospike.client(config)
```

If this is the master process, we spawn off a number of worker processes. If we
are in a worker process, then start the server. Before the worker process
exists we should stop the server cleanly.

```
const noWorkers = 4 // pick this no. based on number of CPUs, size of RAM, etc.

if (cluster.isMaster) {
  // spawn new worker processes
  for (var i = 0; i < noWorkers; i++) {
    cluster.fork()
  }
} else {
  // in spawend worker process
  var id = cluster.worker.id
  debug('worker %s starting', id)
  startServer()
  process.on('SIGINT', () => {
    debug('worker %s exiting', id)
    stopServer()
    process.exit()
  })
}
```

Next we setup our HTTP server and connect to the Aerospike cluster. For
incoming GET requests we read a record from the database and return it; a POST
request is used to write a new record to the database. The key is derived from
the request path.

```
function startServer () {
  client.connect((err) => { if (err) throw err })
  http.createServer((req, res) => {
    debug('incoming request on worker %s', cluster.worker.id)
    var key = keyFromPath(req)
    var responder = sendResponse.bind(null, res)
    switch (req.method) {
      case 'GET':
        client.get(key, responder)
        break
      case 'POST':
        var body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          var record = JSON.parse(body)
          client.put(key, record, responder)
        })
        break
    }
  }).listen(8000)
}

function stopServer () {
  client.close()
}

function keyFromPath (req) {
  var path = url.parse(req.url)['pathname']
  var key = path.slice(1) // remove leading '/'
  return new Aerospike.Key('test', 'demo', key)
}
```

Next we define a method `sendResponse` that send the response back to the
client. If there was an error, we send an HTTP error status code, e.g. "404 Not
Found" if the database record was not found. In case of a succesful request, we
format the response as JSON and send it to the client.

```
function sendResponse (res, error, body) {
  if (error) {
    switch (error.code) {
      case Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
        res.writeHead(404, error.message)
        break
      default:
        res.writeHead(500, error.message)
    }
  } else if (body) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.write(JSON.stringify(body))
  }
  res.end()
}
```

And that's it! We can test our sample application and set `NODE_DEBUG=server` for some extra debugging output:

```
$ NODE_DEBUG=server node node_clusters.js
SERVER 56288: worker 1 starting
SERVER 56290: worker 3 starting
SERVER 56289: worker 2 starting
SERVER 56291: worker 4 starting
```

Let's do some test requests to read and write some records:

```
$ curl -i -H "Content-Type: application/json" http://localhost:8000/myTestKey
HTTP/1.1 404 Not Found
Date: Thu, 12 May 2016 08:21:31 GMT
Connection: keep-alive
Transfer-Encoding: chunked

$ curl -i -H "Content-Type: application/json" --data-binary '{"x": 1234, "y": "abcd"}' http://localhost:8000/myTestKey
HTTP/1.1 200 OK
Content-Type: application/json
Date: Thu, 12 May 2016 08:21:49 GMT
Connection: keep-alive
Transfer-Encoding: chunked

{"ns":"test","set":"demo","key":"myTestKey","digest":{"type":"Buffer","data":[149,186,200,254,138,5,9,52,115,70,1,194,131,184,51,95,232,241,179,74]}}

$ curl -i -H "Content-Type: application/json" http://localhost:8000/myTestKey
HTTP/1.1 200 OK
Content-Type: application/json
Date: Thu, 12 May 2016 08:21:55 GMT
Connection: keep-alive
Transfer-Encoding: chunked

{"x":1234,"y":"abcd"}
```

We can see the incoming requests in the server console:

```
SERVER 56288: incoming GET request for /myTestKey on worker 1
SERVER 56290: incoming POST request for /myTestKey on worker 3
SERVER 56289: incoming GET request for /myTestKey on worker 2
```

When we end the server by pressing CTRL+C in the console, we can see that the worker processes are being shutdown cleanly:

```
SERVER 56288: worker 1 exiting
SERVER 56290: worker 3 exiting
SERVER 56289: worker 2 exiting
SERVER 56291: worker 4 exiting
```
