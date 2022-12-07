# Aerospike Node.js Client API

This documentation describes the Aerospike Node.js Client API in detail. The
Aerospike Client API package is available for download from
[www.aerospike.com](http://www.aerospike.com/download/client/nodejs/).
The source code is available on [GitHub](https://github.com/aerospike/aerospike-client-nodejs). 
The Aerospike Client API package can also be
installed via npm from the [npmjs.com](https://www.npmjs.com/package/aerospike)
package repository. For more information about the Aerospike high-performance 
NoSQL database, please refer to [http://www.aerospike.com/](http://www.aerospike.com/).

## Contents

The `aerospike`  package provides the `aerospike` module, which includes 
submodules, classes, and module level functions that enable Node.js
applications to connect to Aerospike database clusters.

### Modules

The main modules included in the `aerospike` package are:

* The {@link module:aerospike|aerospike module} contains the core classes
  that make up the Client API, such as the {@link Client}, {@link Record},
  {@link Query} classes, etc. It provides module level functions to connect to
  an Aerospike cluster.
* The {@link module:aerospike/policy|policy module} defines policies and policy
  values that define the behavior of database operations.
* The {@link module:aerospike/filter|filter module} and {@link
  module:aerospike/exp|exp module} define secondary index (SI) filters and
  expressions that can be used to limit the scope of query
  operations.
* The {@link module:aerospike/operations|operations}, {@link
  module:aerospike/lists|lists} and {@link module:aerospike/maps|maps} modules
  define the operations on scalar, list and map values that can be executed
  with the {@link Client#operate} command.
* The {@link module:aerospike/info|info module} includes utility functions 
  for parsing the info data returned by the Aerospike cluster. 
  The info protocol provides access to configuration and statistics for the Aerospike server.

### Classes

The main classes included in the `aerospike` module are:

* {@link Client} - The main interface of the Aerospike client. Commands such as put, get or query can be sent to an Aerospike
  database cluster using the Client class.
* {@link Key} - Keys are used to uniquely identify a record in the Aerospike database.
* {@link Record} - Records consists of one or more record "bins" (name-value
  pairs) and meta-data (time-to-live and generation); a
  record is uniquely identified by it's key within a given namespace.
* {@link Query} - The Query class can be used to perform value-based searches
  on secondary indexes.
* {@link Scan} - The Scan class scans the entirety of a namespace and performs 
  various read and write operations on records within.
* {@link RecordStream} - Queries and scans return records through a
  RecordStream instance which acts as an EventEmitter.
* {@link Job} - The Job class is used to query the status of long running
  background jobs, such as background scans or index creation.
* {@link Double} - Wrapper class for double precision floating point values.
* {@link GeoJSON} - A representation of GeoJSON values.
* {@link AerospikeError} - Error class representing a Aerospike server and/or client error.

All modules and classes can also be accessed directly through the drop-down menu at the top of each page.

## Supported Data Types

Aerospike supports the following data types:

| Aerospike data type | Mapping to Node.js data type |
|---------------------|------------------------------|
| Integer             | Number or BigInt             |
| Double              | Number                       |
| String              | String                       |
| Boolean             | Boolean                      |
| Bytes               | Buffer                       |
| List                | Array                        |
| Map                 | Object                       |
| HyperLogLog         | Buffer                       |

**Note:** Support for the **Boolean** data type requires server 5.6+
and Aerospike Node.js client version 4.0+.

### Nested Data Structure

Lists and Maps can contain any of the other supported data types and
can be nested, e.g. lists-within-lists, maps-within-maps, lists-within-maps,
etc., to an arbitrary depth. To perform operations on nested lists and maps,
you can provide a {@link CdtContext CDT Context} object to the list and map
operations.

## Example

The following is very simple example of how to write and read a record from Aerospike.

```js
const Aerospike = require('aerospike')

// INSERT HOSTNAME AND PORT NUMBER OF AEROPSIKE SERVER NODE HERE!
const config = {
  hosts: '192.168.33.10:3000',
}

const key = new Aerospike.Key('test', 'demo', 'demo')

Aerospike.connect(config)
  .then(client => {
    const bins = {
      i: 123,
      s: 'hello',
      b: Buffer.from('world'),
      d: new Aerospike.Double(3.1415),
      g: Aerospike.GeoJSON.Point(103.913, 1.308),
      l: [1, 'a', {x: 'y'}],
      m: {foo: 4, bar: 7}
    }
    const meta = { ttl: 10000 }
    const policy = new Aerospike.WritePolicy({
      exists: Aerospike.policy.exists.CREATE_OR_REPLACE,
      // Timeouts disabled, latency dependent on server location. Configure as needed.
      socketTimeout : 0, 
      totalTimeout : 0
    })

    return client.put(key, bins, meta, policy)
      .then(() => {
        const ops = [
          Aerospike.operations.incr('i', 1),
          Aerospike.operations.read('i'),
          Aerospike.lists.append('l', 'z'),
          Aerospike.maps.removeByKey('m', 'bar')
        ]

        return client.operate(key, ops)
      })
      .then(result => {
        console.log(result.bins) // => { i: 124, l: 4, m: null }

        return client.get(key)
      })
      .then(record => {
        console.log(record.bins) // => { i: 124,
                                 //      s: 'hello',
                                 //      b: <Buffer 77 6f 72 6c 64>,
                                 //      d: 3.1415,
                                 //      g: '{"type":"Point","coordinates":[103.913,1.308]}',
                                 //      l: [ 1, 'a', { x: 'y' }, 'z' ],
                                 //      m: { foo: 4 } }
      })
      .then(() => client.close())
  })
  .catch(error => {
    console.error('Error: %s [%i]', error.message, error.code)
    if (error.client) {
      error.client.close()
    }
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
