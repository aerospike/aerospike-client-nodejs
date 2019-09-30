# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [3.13.0] - 2019-09-30

* **New Features**
  * Support for bitwise operations. Requires server version 4.6 or later. [#312](https://github.com/aerospike/aerospike-client-nodejs/pull/312)

## [3.12.0] - 2019-08-31

* **New Features**
  * Support for operations on nested lists & maps. Requires server version 4.6 or later. [#307](https://github.com/aerospike/aerospike-client-nodejs/pull/307)

* **Updates**
  * Update C client library to [v4.6.7](http://www.aerospike.com/download/client/c/notes.html#4.6.7).
  * Support Debian 10. Drop support for Debian 7.
  * Fix tests for certain out-of-bounds list operations due to changed error code sent by server v4.6.
  * Update dev dependecies: standard v14, yargs v14, nyc

## [3.11.0] - 2019-05-22

* **New Features**
  * TLS support - Linux only, macOS & Windows not supported for now. [#298](https://github.com/aerospike/aerospike-client-nodejs/pull/298)
  * Add new infoNode & getNodes functions. [#196](https://github.com/aerospike/aerospike-client-nodejs/pull/196)
  * Support for Node.js 12 [#295](https://github.com/aerospike/aerospike-client-nodejs/pull/295)

* **Updates**
  * Update C client library to [v4.6.3](http://www.aerospike.com/download/client/c/notes.html#4.6.3). [#297](https://github.com/aerospike/aerospike-client-nodejs/pull/297)

## [3.10.0] - 2019-04-08

* **New Features**
  * Support new relaxed read modes for SC namespaces. (via C client v4.6)
  * Use stack based connection pools for more aggressive trimming of idle connections. (via C client v4.6)

* **Updates**
  * *BREAKING*: Read consistency level changes - see [Incompatible API Changes](https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html#version-3-10-0) for details.
  * Update C client library to [v4.6.1](http://www.aerospike.com/download/client/c/notes.html#4.6.1).
  * Update nan to [v2.13.2](https://github.com/nodejs/nan/blob/master/CHANGELOG.md).
  * Update mocha, codecov & other dev dependencies to latest version.

## [3.9.0] - 2019-02-20

* **Updates**
  * Update C client library to [v4.5.0](http://www.aerospike.com/download/client/c/notes.html#4.5.0).
  * Update nan to [v2.12.1](https://github.com/nodejs/nan/blob/master/CHANGELOG.md).
  * Update nyc to v13.3 to address multiple potential vulnerabilities in nyc dependencies.
  * Update docs for udfRemove function to document changes in server behavior when trying to delete a UDF module that does not exist.
  * Drop Node.js v4 from the test matrix. The client still runs on Node.js v4 for now, but not all of its dev dependencies do.

## [3.8.0] - 2018-12-14

* **New Features**
  * Add support for rack-aware clients.
  * Add client run-time stats.

* **Updates**
  * Update C client library to [v4.4.0](http://www.aerospike.com/download/client/c/notes.html#4.4.0).
  * Remove unused error codes.
  * Improve global command queue docs.
  * Shared memory layout has changed. The default Config#sharedMemory.key has changed to 0xA8000000 so old client applications do not mix shared memory with new client applications. If you are using shared memory clients with a custom shared memory key, it's critical that you change the key when upgrading to this version.

## [3.7.2] - 2018-11-09

* **Bug Fixes**
  * Fix Alpine Linux builds [#286](https://github.com/aerospike/aerospike-client-nodejs/issues/286)
  * Fix policies constructor to support setting totalTimeout to zero [#289](https://github.com/aerospike/aerospike-client-nodejs/issues/289)
  * Fix segfault in predexp unit tests on Node.js 11

* **Updates**
  * Update C client library to [v4.3.20](http://www.aerospike.com/download/client/c/notes.html#4.3.20).
  * Replace V8 conversion functions deprecated in Node.js 10.12/11
  * Suppress compiler deprecation warnings for Release builds
  * Add Node.js 10 back to Travis CI test matrix

## [3.7.1] - 2018-10-03

* **Bug Fixes**
  * Support using alternate-access-address. [#267](https://github.com/aerospike/aerospike-client-nodejs/issues/267) [#283](https://github.com/aerospike/aerospike-client-nodejs/pull/283)

* **Updates**
  * Fix some tests breaking when auth enabled. [#284](https://github.com/aerospike/aerospike-client-nodejs/pull/284)

## [3.7.0] - 2018-10-02

* **New Features**
  * Support "deserialize" policy setting. [#278](https://github.com/aerospike/aerospike-client-nodejs/pull/278)
  * Add getter for client instance to AerospikeError.

* **Bug Fixes**
  * Fix memory leaks detected by Valgrind. [#279](https://github.com/aerospike/aerospike-client-nodejs/pull/279)
  * Increase max. info request length from 50 to 256. [#280](https://github.com/aerospike/aerospike-client-nodejs/issues/280)
  * Fix parsing of sets/ns/set info response. [#282](https://github.com/aerospike/aerospike-client-nodejs/pull/282)

* **Updates**
  * Update C client library to [v4.3.18](http://www.aerospike.com/download/client/c/notes.html#4.3.18).
  * Update nan and chai to latest versions.

## [3.6.1] - 2018-09-04

* **Updates**
  * Change max. bin name length to 15 (was 14). Requires server version 4.2 or later.
  * Update C client library to [v4.3.17](http://www.aerospike.com/download/client/c/notes.html#4.3.17). [#273](https://github.com/aerospike/aerospike-client-nodejs/pull/273)

## [3.6.0] - 2018-08-28

* **New Features**
  * Support query filtering with predicate expressions. Requires server version v3.12 or later. [#269](https://github.com/aerospike/aerospike-client-nodejs/pull/269)
  * Add missing replica.sequence policy value [#270](https://github.com/aerospike/aerospike-client-nodejs/issue/270)

* **Updates**
  * Update C client library to [v4.3.16](http://www.aerospike.com/download/client/c/notes.html#4.3.16) [#271](https://github.com/aerospike/aerospike-client-nodejs/pull/271)
  * Remove modlua.systemPath config entry
  * Remove lua-core submodule; system lua code is now loaded directly from C strings instead of files

## [3.5.0] - 2018-07-19

* **New Features**
  * Support list/map nearest key/value get/remove operations (relative rank range). Requires server version v4.3.0 or later. [#264](https://github.com/aerospike/aerospike-client-nodejs/pull/264)
  * Support list write flags NO_FAIL and PARTIAL. Add new map write flags, including NO_FAIL and PARTIAL. Requires server version v4.3.0 or later. [#265](https://github.com/aerospike/aerospike-client-nodejs/pull/265)
  * Rewrote examples to use latest client APIs, ES2017 async functions, and reduce yargs boilerplate code [#266](https://github.com/aerospike/aerospike-client-nodejs/pull/266)

* **Updates**
  * Update C client library to [v4.3.14](http://www.aerospike.com/download/client/c/notes.html#4.3.14) [#263](https://github.com/aerospike/aerospike-client-nodejs/pull/263)

## [3.4.1] - 2018-06-25

* **Bug Fixes**
  * Fix Set Order/Sort List operations broken on some platforms [#261](https://github.com/aerospike/aerospike-client-nodejs/issues/261)

## [3.4.0] - 2018-06-20

* **New Features**
  * Add CDT List operations for Ordered Lists [#250](https://github.com/aerospike/aerospike-client-nodejs/pull/250)
  * Support scan/query consistency validation using cluster key. Set failOnClusterChange to true in ScanPolicy/QueryPolicy to enable this validation. (Requires Aerospike Server v4.2 or later.) [#260](https://github.com/aerospike/aerospike-client-nodejs/pull/260)

* **Updates**
  * Update C client library to [v4.3.13](http://www.aerospike.com/download/client/c/notes.html#4.3.13) [#260](https://github.com/aerospike/aerospike-client-nodejs/pull/260)
  * Change default log level from INFO to WARN; rename log level DETAIL to TRACE
  * Add support for Ubuntu 18.04
  * Remove support for Ubuntu 12.04

## [3.3.0] - 2018-04-30

* **Bug Fixes**
  * Command queue tests fail if cluster address is specified using host/port cli options [#247](https://github.com/aerospike/aerospike-client-nodejs/issues/247)
  * Query fails if one or more cluster nodes do not have records in the set [#253](https://github.com/aerospike/aerospike-client-nodejs/issues/253)
  * TypeError: domain.enter is not a function using Node.js 9.6 or later in interactive mode [#254](https://github.com/aerospike/aerospike-client-nodejs/issues/254)

* **New Features**
  * Support authentication mode (Config#authMode). When user authentication is enabled, the mode specifies internal server authentication or external (e.g. LDAP) authentication.
  * Support separate login timeout (Config#loginTimeoutMs) when authentication is enabled.
  * Support for Async Hooks in Node.js 9/10 [#255](https://github.com/aerospike/aerospike-client-nodejs/pull/255)

* **Updates**
  * Tests: Upgrade to Mocha v5, Choma v1.2 & replace expect.js with Chai
  * Update C client library to [v4.3.11](http://www.aerospike.com/download/client/c/notes.html#4.3.11).

## [3.2.0] - 2018-02-08

* **Bug Fixes**
  * Avoid buffer overflows when copying bin/set/ns names. [#241](https://github.com/aerospike/aerospike-client-nodejs/pull/241)
  * Fix possible race condition in `indexRemove` test cases. [#240](https://github.com/aerospike/aerospike-client-nodejs/pull/240)

* **New Features**
  * Support building package on Windows (64bit, Windows 7 or later) [#239](https://github.com/aerospike/aerospike-client-nodejs/pull/239)
  * Add new, optional command queue. If configurable limit of in-process commands is exceeded, additional commands are queued for later execution. [#245](https://github.com/aerospike/aerospike-client-nodejs/pull/245)
  * Added new `inDoubt` flag to `AerospikeError`. The `inDoubt` flag indicates if a write command may have completed even though an error was returned. This scenario can occur on a client timeout for a command that has been sent to the server. [#242](https://github.com/aerospike/aerospike-client-nodejs/pull/242)
  * Added a command reference to `AerospikeError` for the database command, during which the error occurred. The `Command` object may contain additional information such as the record key for single-record-key read/write commands. [#242](https://github.com/aerospike/aerospike-client-nodejs/pull/242)

* **Updates**
  * Update C client library to [v4.3.5](http://www.aerospike.com/download/client/c/notes.html#4.3.5).

## [3.1.1] - 2018-01-09

* **Bug Fixes**
  * Support all data types for write operation in Client#operate [#235](https://github.com/aerospike/aerospike-client-nodejs/issues/235)
  * Only setup cluster events callback on Client#connect [#237](https://github.com/aerospike/aerospike-client-nodejs/issues/237)

* **Updates**
  * Update C client library to [v4.3.2](http://www.aerospike.com/download/client/c/notes.html#4.3.2).

## [3.1.0] - 2017-12-18

* **New Features**
  * Logging improvements: C client logs enabled by default; log level can be controlled through new, global log settings. [PR #231](https://github.com/aerospike/aerospike-client-nodejs/pull/231)
  * Support "exists" policy for operate command. [PR #233](https://github.com/aerospike/aerospike-client-nodejs/pull/233)
  * Support "linearize read" policy for Strong Consistency mode. (Requires Aerospike server v4.0.)

* **Updates**
  * Add support for Node.js v9.x
  * Update C client library to [v4.3.1](http://www.aerospike.com/download/client/c/notes.html#4.3.1). [PR #232](https://github.com/aerospike/aerospike-client-nodejs/pull/232)
  * Update to C client's new package format.
  * Add support for Debian 9 ("Stretch")

## [3.0.2] - 2017-10-09

* **Bug Fixes**
  * Release event loop on #close even if client not connected [#225](https://github.com/aerospike/aerospike-client-nodejs/issues/225)

## [3.0.1] - 2017-10-06

* **Bug Fixes**
  * Fixed typo: Aerospike.ttl.DONT_UPDDATE [#222](https://github.com/aerospike/aerospike-client-nodejs/issues/222)
  * Return parameter error if ttl or gen meta-data values are invalid [#223](https://github.com/aerospike/aerospike-client-nodejs/issues/223)
  * Call Client#connect callback asynchronously [#224](https://github.com/aerospike/aerospike-client-nodejs/issues/224)

## [3.0.0] - 2017-10-03

* **New Features**
  * Support for Promises in addition to Callback functions [PR #210](https://github.com/aerospike/aerospike-client-nodejs/pull/210)
  * Support nobins flag on query operations
  * Support CDT List Increment operation. Requires Aerospike server version 3.15 or later.
  * Improved timeout handling and automatic transaction retries - see [detailed API changes](https://github.com/aerospike/aerospike-client-nodejs/blob/master/docs/api-changes.md#version-300) for more info.
  * Support gen policy for apply UDF operation.

* **Bug Fixes**
  * Fix memory leak in batchRead [#213](https://github.com/aerospike/aerospike-client-nodejs/issues/213)

* **Updates**
  * Requires Node.js v4.x (LTS) or later; Node.js v0.12.x and io.js are no longer supported [PR #179](https://github.com/aerospike/aerospike-client-nodejs/pull/179)
  * Update C client library to [v4.2.0](http://www.aerospike.com/download/client/c/notes.html#4.2.0).
  * Changes to callback function signatures for several client operations. [PR #210](https://github.com/aerospike/aerospike-client-nodejs/pull/210)
  * Removal of several client functions, that were marked as deprecated under v2.x. [PR #214](https://github.com/aerospike/aerospike-client-nodejs/pull/214)
  * Policy rewrite and changes to how default client policies are configured. [PR #221](https://github.com/aerospike/aerospike-client-nodejs/pull/221)
  * Changes to shared memory layout and default shared memory key.

Please refer to the full list of [backward incompatible API changes](https://github.com/aerospike/aerospike-client-nodejs/blob/master/docs/api-changes.md#version-300)
for further details.

## [2.7.2] - 2017-08-03

* **Bug Fixes**
  * Close cluster event callback handle when client is closed [#211](https://github.com/aerospike/aerospike-client-nodejs/issues/211)

## [2.7.1] - 2017-07-24

* **New Features**
  * Add socket timeout setting to query policy [#207](https://github.com/aerospike/aerospike-client-nodejs/issues/207)

## [2.7.0] - 2017-07-17

* **New Features**
  * Client emits cluster state changed events [#206](https://github.com/aerospike/aerospike-client-nodejs/issues/206)

* **Updates**
  * Update C client library to [v4.1.8](http://www.aerospike.com/download/client/c/notes.html#4.1.8).
  * Update packaging to include system Lua scripts in npm package [#202](https://github.com/aerospike/aerospike-client-nodejs/pull/202)

## [2.6.0] - 2017-05-25

* **New Features**
  * Expose new consistency level in batch policy [#197](https://github.com/aerospike/aerospike-client-nodejs/pull/197
  * Add interface to dynamically add/remove seed hosts [#194](https://github.com/aerospike/aerospike-client-nodejs/pull/194)
  * New UDF register/unregister job to async wait for job completion [#198](https://github.com/aerospike/aerospike-client-nodejs/pull/198)
  * Improved Info.parse() function, replacing Info.parseInfo()

* **Updates**
  * Update C client library to [v4.1.6](http://www.aerospike.com/download/client/c/notes.html#4.1.6).
  * The Client#udfRegisterWait and Info#parseInfo functions have been marked deprecated. See [API Changes](https://github.com/aerospike/aerospike-client-nodejs/blob/master/docs/api-changes.md) for details.

## [2.5.2] - 2017-04-20

v2.5.x is the last release to support Node.js v0.12 and io.js. The next major client release will require Node.js v4 or later.

* **New Features**
  * Capture more useful stacktraces for debugging [#189](https://github.com/aerospike/aerospike-client-nodejs/issues/189)

* **Bug Fixes**
  * Synchronous error callback in query command causes "unspecified" error in record stream [#146](https://github.com/aerospike/aerospike-client-nodejs/issues/146)
  * Query/scan record stream should emit AerospikeError instances [#187](https://github.com/aerospike/aerospike-client-nodejs/issues/187)

## [2.5.1] - 2017-04-11

* **Bug Fixes**
  * Support queries with keys with just namespace + digest [#184](https://github.com/aerospike/aerospike-client-nodejs/issues/184)

## [2.5.0] - 2017-04-05

* **New Features**
  * Support ns/set truncate command [#712](https://github.com/aerospike/aerospike-client-nodejs/issues/172)
  * Support configurable scan socket write timeout [#174](https://github.com/aerospike/aerospike-client-nodejs/issues/174)

* **Bug Fixes**
  * Possible memory leak during batchRead - fix included in Aerospike C client v4.1.5 [#167](https://github.com/aerospike/aerospike-client-nodejs/issues/167)
  * Query/scan policy not getting applied on some operations [#175](https://github.com/aerospike/aerospike-client-nodejs/issues/175)

* **Updates**
  * Update C client library to [v4.1.5](http://www.aerospike.com/download/client/c/notes.html#4.1.5).
  * Update npm install script to support additional Linux distros [#166](https://github.com/aerospike/aerospike-client-nodejs/issues/166), [#170](https://github.com/aerospike/aerospike-client-nodejs/issues/170)
  * Update to JavaScript Standard Style v9 [#178](https://github.com/aerospike/aerospike-client-nodejs/pull/178)
  * Add WebWorker based test case to scan stress test [#180](https://github.com/aerospike/aerospike-client-nodejs/pull/180)

## [2.4.4] - 2016-12-19

* **Bug Fixes**
  * Fix TTL value returned from server for records that never expire. [#156](https://github.com/aerospike/aerospike-client-nodejs/issues/156)
  * Add type checks for record keys and raise error when float keys are used. [#158](https://github.com/aerospike/aerospike-client-nodejs/issues/158)

* **Updates**
  * Remove non-functional TLS support for now. [#160](https://github.com/aerospike/aerospike-client-nodejs/issues/160)

* **Documentation**
  * Mark LargeList functionality as deprectated. [#159](https://github.com/aerospike/aerospike-client-nodejs/issues/159)

## [2.4.3] - 2016-11-11

* **Bug Fixes**
  * Fix installation on macOS. [#155](https://github.com/aerospike/aerospike-client-nodejs/issues/155) Thanks to [@arch1t3ct](https://github.com/arch1t3ct)!
  * Fix installation on platforms without `which` command.
  * Explicity link zlib to fix usage on Alpine Linux. [#117](https://github.com/aerospike/aerospike-client-nodejs/issues/117) Thanks to [@rma4ok](https://github.com/rma4ok)!

## [2.4.2] - 2016-11-10

* **New Features**
  * Added constant enums `Aerospike.ttl` for "special" TTL values, incl. `DONT_UPDATE` value supported by Aerospike Server v3.10.1 and later.

* **Bug Fixes**
  * Security Fix: Download C client using HTTPS and verify package checksum. [#153](https://github.com/aerospike/aerospike-client-nodejs/issues/153) Thanks to [Adam Baldwin](https://github.com/evilpacket) of [@liftsecurity](https://github.com/liftsecurity) for the report!
  * Support for Ubuntu 16.10/17.04 in the C client download script. [#154](https://github.com/aerospike/aerospike-client-nodejs/issues/154) Thanks to [@kitex](https://github.com/kitex)!

## [2.4.1] - 2016-10-10

* **Bug Fixes**
  * Fix write operator to support double values. [#148](https://github.com/aerospike/aerospike-client-nodejs/issues/148) Thanks to [@OlegPoberegets](https://github.com/OlegPoberegets)!

* **Changes**
  * Renamed Cluster ID to Cluster Name; Cluster Name verification requires Aerospike Server v3.10 or later.

* **Updates**
  * Update C client library to [v4.1.1](http://www.aerospike.com/download/client/c/notes.html#4.1.1).

## [2.4.0] - 2016-09-09

* **New Features**
  * Support for durable delete write policy [CLIENT-769]; requires Aerospike
    Server Enterprise Edition v3.10 or later.
  * Support IPv6 socket protocol; requires Aerospike Server v3.10 or later.
  * Support Cluster ID verification; requires Aerospike Server v3.10 or later.
  * Support new peers info protocol; requires Aerospike Server v3.10 or later.
  * ~~Support TLS 1.2 secure socket protocol; requires future Aerospike Server release.~~
  * New [Client#infoAny](http://www.aerospike.com/apidocs/nodejs/Client.html#infoAny)
    command to send info request to single cluster node.

* **Improvements**
  * Add support for two new server error codes (23 & 24) introduced in Aerospike Server v3.9.1.
  * Regression: Skip LDT and CDT Map tests if server does not support the feature [CLIENT-753]

* **Updates**
  * Update C client library to [v4.1.0](http://www.aerospike.com/download/client/c/notes.html#4.1.0).
  * Shared memory layout has changed in v4.1.0 of the C client library. See
    [backward incompatible API changes](https://github.com/aerospike/aerospike-client-nodejs/blob/master/docs/api-changes.md#version-240)
    for more details.
  * The <code>retry</code> policy value for read, write, remove and operate
    policies has been deprecated as it does not actually affect single key
    read/write commands, the batch read command or query/scan commands in
    client versions v2.x.

## [2.3.1] - 2016-08-11

* **Bug Fixes**
  * Fix installation on Amazon Linux. [#143](https://github.com/aerospike/aerospike-client-nodejs/issues/143)

## [2.3.0] - 2016-08-11

* **New Features**
  * Add Client#infoAll method to simplify processing info responses from multiple hosts. [#43](https://github.com/aerospike/aerospike-client-nodejs/issues/43)

* **Bug Fixes**
  * Add work-around for issues running client with Node's interactive debugger. [#140](https://github.com/aerospike/aerospike-client-nodejs/issues/140)
  * Support writing null values to delete bin using Client#operate. [#142](https://github.com/aerospike/aerospike-client-nodejs/issues/142)

* **Improvements**
  * Improved C-client resolution to avoid issues fetching C client artifact during npm package installation

* **Changes**
  * Update C client library to v4.0.7.
  * Drop support for Debian 6

## [2.2.0] - 2016-07-13

* **New Features**
  * Added back support for applying stream UDF to query results w/o aggregation.
  * Added `maxConnsPerNode` config setting to address [#130](https://github.com/aerospike/aerospike-client-nodejs/issues/130).

## [2.1.1] - 2016-06-29

* **Bug Fixes**
  * Prevent segfault processing query/scan record stream if client object goes out of scope. [CLIENT-735]
  * Update C client to v4.0.6 with fix to complete scan on empty sets. [#132](https://github.com/aerospike/aerospike-client-nodejs/issues/132)

## [2.1.0] - 2016-06-03

* **New Features**
  * Support for operations on Sorted Maps. Requires Aerospike server version 3.8.4 or later.

* **Improvements**
  * Key objects returned in callbacks now include the digest
  * Code cleanup to support standard@7.0.0 which adds several new rules

* **Fixes**
  * Fix compile time error with Node 0.12 using gcc 4.4. [#131](https://github.com/aerospike/aerospike-client-nodejs/issues/131)

* **Changes**
  * The `aerospike.operator` module has been split up into two seperate modules `aerospike.operations` and `aerospike.lists` for operations on scalar and
    list data types respectively. See detailed list of [API changes](https://github.com/aerospike/aerospike-client-nodejs/blob/master/docs/api-changes.md#version-210)
    for further details.

* **Documentation**
  * Pulled client configuration out into a separate class and expanded the documentation.
  * Documented `sharedMemory` configuration.
  * Added tutorial for using Aerospike client in Node.js cluster setup.

## [2.0.4] - 2016-05-09

* **Fixes**
  * Query and Scan operations do not return record keys.
    [#126](https://github.com/aerospike/aerospike-client-nodejs/issues/126),
    [PR #127](https://github.com/aerospike/aerospike-client-nodejs/pull/127).
    Thanks to [@sel-fish](https://github.com/sel-fish)!

## [2.0.3] - 2016-05-03

* **Fixes**
  * Event loop does not get released if module gets required but never used to open & close client connection.
    [#124](https://github.com/aerospike/aerospike-client-nodejs/issues/124)

## [2.0.2] - 2016-04-29

* **Improvements**
  * Add support for node v6 by bumping nan dependency. [#121](https://github.com/aerospike/aerospike-client-nodejs/issues/121),
    [PR #122](https://github.com/aerospike/aerospike-client-nodejs/pull/122).
    Thanks to [@djMax](https://github.com/djMax)!
  * Add support for Ubuntu 16.04. [#118](https://github.com/aerospike/aerospike-client-nodejs/issues/118),
    [PR #123](https://github.com/aerospike/aerospike-client-nodejs/pull/123).
    Thanks to [@NawarA](https://github.com/NawarA)!

## [2.0.1] - 2016-04-27

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

## [2.0.0] - 2016-04-19

* **Documentation**
  * Added overview page for API docs
  * Added "Getting Started" tutorial to API docs
  * Updated documentation for aerospike module

## [2.0.0-alpha.3] - 2016-04-18

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

## [2.0.0-alpha.2] - 2016-04-12

* **Improvements**
  * Added support for creating secondary indexes on list and map values;
    requires Aerospike server version >= 3.8. [CLIENT-684]
  * Added `Aerospike.info` module with `parseInfo` utility method to parse info
    string returned by Aerospike cluster nodes using `Client#info` method.
  * Added IndexTask class returned by `Client#createIndex` to replace
    `Client#createIndexWait`; `IndexTask#waitUntilDone` polls for task
    completion asynchronously.
  * Added new Scan API implementation via `Client#scan`.

## [2.0.0-alpha.1] - 2016-03-30

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

## [1.0.57] - 2016-03-18

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

## [1.0.56] - 2016-02-11

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

## [1.0.55] - 2016-01-15

* **Improvements**
  * Update to C Client v4.0.0.
  * Documentation updates. Thanks to [@mrbar42](https://github.com/mrbar42)!
  * Avoid polluting global namespace. Thanks to [@mrbar42](https://github.com/mrbar42)!
  * Use `standard` module to enforce coding style.
  * Add `connTimeoutMs` and `tenderInterval` client configs.

* **Fixes**
  * Fix connection issues when using V8 profiler (`node --prof`)
