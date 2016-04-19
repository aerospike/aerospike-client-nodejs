# Aerospike Node.js Client API

This documentation describes the Aerospike Node.js Client API in detail. The
client API package is available for download from
[www.aerospike.com](http://www.aerospike.com/download/client/nodejs/) or can be
installed via npm from the [npmjs.com](https://www.npmjs.com/package/aerospike)
package repository. The source code is available at
[github.com](https://github.com/aerospike/aerospike-client-nodejs). For more
information about the Aerospike high-performance NoSQL database, please refer
to [http://www.aerospike.com/](http://www.aerospike.com/).

## Contents

The `aerospike` package exports the `aerospike` module, which provides a number
of submodules, classes as well as module level functions which provide a client
for Aerospike database clusters.

*Modules*

* [`aerospike`]{@link module:aerospike} - The aerospike module contains the
  core classes that make up the Client API, such as the {@link Client}, {@link
  Query} and {@link Scan} classes. It provides module level functions to
  connect to an Aerospike cluster.
* [`aerospike.filter`]{@link module:aerospike/filter} - The filter module is a
  submodule containing predicate helpers for use with the {@link Query} class.
* [`aerospike.operator`]{@link module:aerospike/operator} - The operator module provides
  helper functions for the {@link Client#operate} command.

*Classes*

* {@link Client} - The main interface of the Aerospike client. Through the
  Client class commands such as {@link Client#put|put}, {@link Client#get|get}
  or {@link Client#query|query} can be sent to an Aerospike database cluster.
* {@link Query} - The Query class can be used to perform value-based searches
  on secondary indexes.
* {@link Scan} - Through the Scan class scans of an entire namespaces can be
  performed.
* {@link RecordStream} - Queries and scans return records through a
  RecordStream instance.
* {@link Key} - Keys are used to uniquely identify a record in the Aerospike database.
* {@link Double} - Wrapper class for double precision floating point values.
* {@link GeoJSON} - A representation of GeoJSON values.
* {@link AerospikeError} - Error class representing a Aerospike server and/or client error.
* {@link LargeList} - The LargeList class provides an interface to the
  (Aerospike LDT feature)[http://www.aerospike.com/docs/guide/ldt_guide.html).
* {@link Job} - The Job class is used to query the status of long running
  background jobs.

All modules and classes can also be accessed directly through the drop-down menu at the top of each page.

## Tutorials

* {@tutorial getting_started}

## Further Documentation

For a detailed technical documentation of the Aerospike distributed, NoSQL
database, including an architecture overview and in-depth feature guides,
please visit http://www.aerospike.com/docs.
