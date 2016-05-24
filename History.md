HEAD
===================

* **Fixes**
  * Fix compile time error with Node 0.12 using gcc 4.4. [#131](https://github.com/aerospike/aerospike-client-nodejs/issues/131)

* **Improvements**
  * Key objects returned in callbacks now include the digest
  * Code cleanup to support standard@7.0.0 which adds several new rules

* **Documentation**
  * Pulled client configuration out into a separate class and expanded the documentation.
  * Documented `sharedMemory` configuration.
  * Added tutorial for using Aerospike client in Node.js cluster setup.

v2.0.4 / 2016-05-09
===================

* **Fixes**
  * Query and Scan operations do not return record keys.
    [#126](https://github.com/aerospike/aerospike-client-nodejs/issues/126),
    [PR #127](https://github.com/aerospike/aerospike-client-nodejs/pull/127).
    Thanks to [@sel-fish](https://github.com/sel-fish)!

v2.0.3 / 2016-05-03
===================

* **Fixes**
  * Event loop does not get released if module gets required but never used to open & close client connection.
    [#124](https://github.com/aerospike/aerospike-client-nodejs/issues/124)

v2.0.2 / 2016-04-29
===================

* **Improvements**
  * Add support for node v6 by bumping nan dependency. [#121](https://github.com/aerospike/aerospike-client-nodejs/issues/121),
    [PR #122](https://github.com/aerospike/aerospike-client-nodejs/pull/122).
    Thanks to [@djMax](https://github.com/djMax)!
  * Add support for Ubuntu 16.04. [#118](https://github.com/aerospike/aerospike-client-nodejs/issues/118),
    [PR #123](https://github.com/aerospike/aerospike-client-nodejs/pull/123).
    Thanks to [@NawarA](https://github.com/NawarA)!

v2.0.1 / 2016-04-27
===================

* **Improvements**
  * Optimize callback handler performance. [#119](https://github.com/aerospike/aerospike-client-nodejs/issues/119)
  * Removed some unused async C++ helper functions; minor code cleanup

* **Fixes**
  * Ensure callbacks are always called asynchronously, even for param errors
    raised by the client itself. [#120](https://github.com/aerospike/aerospike-client-nodejs/issues/120)

* **Tests**
  * Complete tests for writing bins with specific data types
  * Extend query/scan performance tests

* **Documentation**
  * Minor JSDoc documentation fixes

v2.0.0 / 2016-04-19
===================

* **Documentation**
  * Added overview page for API docs
  * Added "Getting Started" tutorial to API docs
  * Updated documentation for aerospike module

v2.0.0-alpha.3 / 2016-04-18
===========================

* **Improvements**
  * Added new filter predicates in the `Aerospike.filter` module:
    - contains() to match on list/map membership for integer & string values
    - geoWithinRadius() to match on geospatial locations within a given radius
      from another point (incl. geospatial locations in lists and maps)
    - geoContainsPoint() to match on geospatial regions that include given
      lng/lat coordinates (incl. geospatial regions in lists and maps)
    - geoContains() is deprecated and has been replaced by
      geoContainsGeoJSONPoint()
    - geoWithin() is deprecated and has been replaced by
      geoWithinGeoJSONRegion()
  * New async. implementation for Query#foreach (renamed from Query#execute).
  * Added support for background queries with Record UDF via Query#background.
  * Support aborting background queries via RecordStream#abort.
  * Consolidated ScanTask, IndexTask into new Job class with support for
    querying background queries as well.
  * Combined Scan#applyEach and Scan#background to reduce chance of mis-use.
    (Record UDF can only be applied on background scan.)

* **Fixes**
  * Fix possible memory corruption parsing UDF module or function names.

v2.0.0-alpha.2 / 2016-04-12
===========================

* **Improvements**
  * Added support for creating secondary indexes on list and map values;
    requires Aerospike server version >= 3.8. [CLIENT-684]
  * Added `Aerospike.info` module with `parseInfo` utility method to parse info
    string returned by Aerospike cluster nodes using `Client#info` method.
  * Added IndexTask class returned by `Client#createIndex` to replace
    `Client#createIndexWait`; `IndexTask#waitUntilDone` polls for task
    completion asynchronously.
  * Added new Scan API implementation via `Client#scan`.

v2.0.0-alpha.1 / 2016-03-30
===========================

* **Improvements**
  * Use asynchronous client commands of the new Aerospike C/C++ client library
    version 4.0.
  * Follow Node.js error-first callback conventions: The client now returns
    null as the first parameter (`error`) in most callbacks when the command
    was executed successfully. See
    [backward incompatible API changes](https://github.com/aerospike/aerospike-client-nodejs/blob/master/docs/api-changes.md)
    for more details. [#105](https://github.com/aerospike/aerospike-client-nodejs/issues/105),
    [PR #106](https://github.com/aerospike/aerospike-client-nodejs/pull/106). Thanks to
    [@eljefedelrodeodeljefe](https://github.com/eljefedelrodeodeljefe)!
  * Add support for pluggable callback handler logic for backwards
    compatibility with legacy error callback semantics.
  * The `Key`, `Double` and `GeoJSON` functions can be used as
    Constructors now to create instances of the respective data types, e.g.
    `var key = new Key(ns, set, 'mykey1')`. Use of the `Double` and `GeoJSON`
    functions as well as the `key` function as regular functions without the `new`
    keyword is deprecated but still supported for backwards compatibility.
  * The new `batchRead` command was added to support reading different
    namespaces/bins for each key in a batch. This method requires Aerospike
    server version >= 3.6.0. The batchGet/batchExists/batchSelect client
    commands deprecated but still supported for backwards compatibility.
  * Added `isConnected` client method to check cluster connection status.
  * Improvements to the client's mocha test suite, incl. performance
    improvements by re-using a single client connection for all tests.
  * Add missing status codes to `Aerospike.status`.
  * Added support for set compression threshold policy for write operations,
    retry policy for read operations, and ttl policy for apply operations.

* **Fixes**
  * Node segfault when trying to query the aerospike client after closing the
    connection. [#88](https://github.com/aerospike/aerospike-client-nodejs/issues/88)

* **Changes**
  * Drop support for Node.js v0.10. The Aerospike Node.js client now requires
    Node.js v0.12 or later.
  * The `add` client command was renamed to `incr`; the `add` function
    is maintained as an alias for the new `incr` function for backwards
    compatibility but is deprecated.
  * The `execute` client command was renamed to `apply`; the `execute` function
    is maintained as an alias for the new `apply` function for backwards
    compatibility but is deprecated.

* **Documentation**
  * JSDoc-style annotations have been added throughout the library code and new
    API documentation is generated from the source code using JSDoc v3. This is
    work-in-progress and will be completed before v2.0.0-final is released.

1.0.57 / 2016-03-18
===================

* **Improvements**
  * Update build script to support Fedora 23 as well as Korora 22/23.
    [#113](https://github.com/aerospike/aerospike-client-nodejs/issues/113),
    [#115](https://github.com/aerospike/aerospike-client-nodejs/issues/115)
  * Update Aerospike C client library to v4.0.3.
  * Optionally read hosts config from `AEROSPIKE_HOSTS` environment variable.
    Thanks to [@mrbar42](https://github.com/mrbar42)!
  * Collect TPS stats in benchmarks.
  * Update Travis CI config to test latest Node.js release & add badge. Thanks
    to [@revington](https://github.com/revington)!

* **Fixes**
  * Fix replica policy value overwriting gen policy [CLIENT-699]
  * Fix lists being returned as bytes in listGetRange/listPopRange operations
    (via C client library v4.0.3).

1.0.56 / 2016-02-11
===================

* **Improvements**
  * Support `operator.incr()` operation on double values.
  * Refactor test suite to improve performance and maintainability.

* **Fixes**
  * Fix segfault when `client.connect()` is called without callback function.

* **Documentation**
  * Fix wrong method name in llist documentation. Thanks to [@srinivasiyer](https://github.com/srinivasiyer)!
  * Update build dependencies for CentOS/RHEL 6.
  * Clarify supported data types and (lack of) automatic data type conversions.
  * Update supported Node.js versions.

1.0.55 / 2016-01-15
===================

* **Improvements**
  * Update to C Client v4.0.0.
  * Documentation updates. Thanks to [@mrbar42](https://github.com/mrbar42)!
  * Avoid polluting global namespace. Thanks to [@mrbar42](https://github.com/mrbar42)!
  * Use `standard` module to enforce coding style.
  * Add `connTimeoutMs` and `tenderInterval` client configs.

* **Fixes**
  * Fix connection issues when using V8 profiler (`node --prof`)
