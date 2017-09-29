# Aerospike Node.js Client API

This documentation describes the Aerospike Node.js Client API in detail. The
client API package is available for download from
[www.aerospike.com](http://www.aerospike.com/download/client/nodejs/) or can be
installed via npm from the [npmjs.com](https://www.npmjs.com/package/aerospike)
package repository. The source code is available on
[GitHub](https://github.com/aerospike/aerospike-client-nodejs). For more
information about the Aerospike high-performance NoSQL database, please refer
to [http://www.aerospike.com/](http://www.aerospike.com/).

## Contents

The `aerospike` npm package provides the `aerospike` module, which includes a
number of submodules, classes as well as module level functions which together
form the Client SDK enabling Node.js applications to connect to Aerospike
database clusters.

### Modules

The main modules included in the `aerospike` package are:

* {@link module:aerospike} - The aerospike module contains the core classes
  that make up the Client API, such as the Client, Query and Scan classes. It
  provides module level functions to connect to an Aerospike cluster.
* {@link module:aerospike/policy} - The policy module defines policies and
  policy values that define the behavior of database operations.
* {@link module:aerospike/filter} - The filter module is a submodule containing
  predicate helpers for use with the Query class.
* {@link module:aerospike/operations}, {@link module:aerospike/lists},
  {@link module:aerospike/maps} - These three modules define the operations on
  scalar, list and map values that can be executed with the {@link
  Client#operate} command.
* {@link module:aerospike/info} - The info protocol provides access to
  configuration and statistics for the Aerospike server. This module
  includes utility functions for parsing the info data returned by the
  Aerospike server.

### Classes

The main classes included in the `aerospike` module are:

* {@link Client} - The main interface of the Aerospike client. Through the
  Client class commands such as put, get or query can be sent to an Aerospike
  database cluster.
* {@link Key} - Keys are used to uniquely identify a record in the Aerospike database.
* {@link Record} - Records consists of one or more record "bins" (name-value
  pairs) and meta-data, incl. time-to-live and generation; a
  record is uniquely identified by it's key within a given namespace.
* {@link Query} - The Query class can be used to perform value-based searches
  on secondary indexes.
* {@link Scan} - Through the Scan class scans of an entire namespaces can be
  performed.
* {@link RecordStream} - Queries and scans return records through a
  RecordStream instance which acts as an EventEmitter.
* {@link Job} - The Job class is used to query the status of long running
  background jobs, such as background scans or index creation.
* {@link Double} - Wrapper class for double precision floating point values.
* {@link GeoJSON} - A representation of GeoJSON values.
* {@link AerospikeError} - Error class representing a Aerospike server and/or client error.

All modules and classes can also be accessed directly through the drop-down menu at the top of each page.

## Supported Data Types

Aerospike supports integer, double, string, bytes, list and map data types.
Within the Node.js client these values are represented as JS numbers
(integer and double), JS strings, Buffers (bytes), Arrays (list) and Objects
(map). Lists and Maps can contain any of the other supported data types and
can be nested (e.g. lists-within-lists, maps-within-maps, lists-within-maps,
etc.).

Aerospike currently does not support a boolean data type. To store boolean
values in the database, the application needs to convert them to a supported
data type as the client does not do any automatica data type conversions.
Attempting to store a boolean value in a record bin will lead to a parameter
error being returned by the client.

## Example

The following is very simple example of how to write and read a record from Aerospike.

```js
const Aerospike = require('aerospike')
const Key = Aerospike.Key
const Double = Aerospike.Double
const GeoJSON = Aerospike.GeoJSON
const op = Aerospike.operations
const lists = Aerospike.lists
const maps = Aerospike.maps

const config = {
  hosts: '192.168.33.10:3000'
}
Aerospike.connect(config, (error, client) => {
  if (error) throw error

  let key = new Key('test', 'demo', 'demo')
  let record = {
    i: 123,
    s: 'hello',
    b: new Buffer('world'),
    d: new Double(3.1415),
    g: new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]}),
    l: [1, 'a', {x: 'y'}],
    m: {foo: 4, bar: 7}
  }
  let meta = { ttl: 10000 }
  let policy = new Aerospike.WritePolicy({
    exists: Aerospike.policy.exists.CREATE_OR_REPLACE
  })

  client.put(key, record, meta, policy, (error) => {
    if (error) throw error

    let ops = [
      op.incr('i', 1),
      op.read('i'),
      lists.append('l', 'z'),
      maps.removeByKey('m', 'bar')
    ]

    client.operate(key, ops, (error, result) => {
      if (error) throw error
      console.log(result)   // => { c: 4, i: 124 }

      client.get(key, (error, record, meta) => {
        if (error) throw error
        console.log(record) // => { i: 124,
                            //      s: 'hello',
                            //      b: <Buffer 77 6f 72 6c 64>,
                            //      d: 3.1415,
                            //      g: '{"type":"Point","coordinates":[103.913,1.308]}',
                            //      l: [ 1, 'a', { x: 'y' }, 'z' ] },
                            //      m: { foo: 4 }
        client.close()
      })
    })
  })
})
```

## Tutorials

The following tutorials provide more in-depth examples for specific aspects of working with the Aerospike Node.js Client SDK:

* {@tutorial getting_started}
* {@tutorial node_clusters}
* {@tutorial callbacks_promises_async_await}

## Further Documentation

For a detailed technical documentation of the Aerospike distributed NoSQL
database, including an architecture overview and in-depth feature guides,
please visit <a href="http://www.aerospike.com/docs">http://www.aerospike.com/docs</a>.
