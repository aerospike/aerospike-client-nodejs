# Changelog

All notable changes to this project will be documented in this file.

## [6.1.0]
* **New Features**
  * [CLIENT-2700] - Added support for client metrics.

## [6.0.2]
* **New Features**
  * [CLIENT-3243] - Added TXN_ALREADY_COMMITTED and TXN_ALREADY_ABORTED error codes.
  * [CLIENT-3267] - Added MRT_ALREADY_LOCKED and MRT_MONITOR_EXISTS error codes.

* **Bug Fixes**
  * [CLIENT-3306] - Added the following missing error codes:
    * ERR_MAX_RETRIES_EXCEEDED
    * MRT_TOO_MANY_WRITES
    * NOT_WHITELISTED
    * QUOTA_EXCEEDED

* **Improvements**
  * [CLIENT-3244] - Removed commitStatus.ALREADY_ABORTED and abortStatus.ALREADY_COMMITTED
  * [CLIENT-3277] - Exception is now thrown when aborting a committed transaction.
  * [CLIENT-3277] - Exception is now thrown when committing an aborted transaction.
  * [CLIENT-3291] - Default client MRT timeout to zero.

## [6.0.1]
* **Bug Fixes**
  * [CLIENT-3235] - Fixed version mismatch with the windows C++ add-on which caused the client to fail on windows.

## [6.0.0]
* **Description**
  * The new features in this release require server version 8.0.0 or above.

* **New Features**
  * [CLIENT-3181] - Added support for multi-record transactions (MRTs). Requires server version 8.0.0 or above.

## [5.13.2]
* **Bug Fixes**
  * [CLIENT-3155] - Fixed typescript compilation by removing the protected modifier from the ExpOperation class.

## [5.13.1]

* **New Features**
  * [CLIENT-3127] - Added client.ExistsWithMetadata.
  * [CLIENT-3153] - Added support for Node.js 23.

* **Bug Fixes**
  * [CLIENT-3107] - Map read and List read operations no longer throw a type error when using EXISTS, ORDERED_MAP, or UNORDERED_MAP return types.
  * [CLIENT-3145] - Fixed issue with BatchResult not returning inDoubt status to the user.
  
* **Improvements**
  * [CLIENT-3061] - Revamped typescript support by improving description file with tighter definitions and documentation.
    * [CLIENT-3149] - Fixed import conflicts with third party packages in typescript description file.
    * [CLIENT-3149] - Improved typescript description file compilation.
  * [CLIENT-3151] - Converted API documentation to TypeDoc documentation.

## [5.12.1]

* **Breaking Changes**
  * [CLIENT-2984] - Dropped support for Node.js 21.

* **New Features**
  * [CLIENT-2976] - Added support for Ubuntu 24.04.
  * [CLIENT-2977] - Added support for Node.js 22.
* **Bug Fixes**
  * [CLIENT-2975] - Fixed issue with TLS pending buffer calculation in as_uv_tls_try_send_pending().

## [5.12.0]

* **New Features**
  * [CLIENT-2822] - Added the queryDuration enumeration to the policy module. The following values are supported:
    * Aerospike.policy.queryDuration.LONG
    * Aerospike.policy.queryDuration.SHORT
    * Aerospike.policy.queryDuration.LONG_RELAX_AP
  * [CLIENT-2822] - Added expectedDuration member to QueryPolicy. Use the queryDuration enumeration when setting expectedDuration.
  * [CLIENT-2829] - Added support for readTouchTtlPercent for the following policies:
    * ReadPolicy
    * OperatePolicy
    * BatchPolicy
    * BatchReadPolicy

## [5.11.0]

* **New Features**
  * [CLIENT-2770] - Added support for persistent list indexes.
  * [CLIENT-2774] - Added 'ttl' property to 'batchWrite' policy.
  * [CLIENT-2793] - Added support for the batchParentWrite policy in the client config policy.
  * [CLIENT-2795] - Added the 'create' method for the 'aerospike/list' module.

* **Bug Fixes**
  * [CLIENT-2773] - Added missing error codes to status.js.
  * [CLIENT-2794] - Fixed typescript compiler errors.
  * [CLIENT-2781] - Batch repeat flag is no longer set on batch writes when the 'sendKey' policy is true.

## [5.10.0]

* **New Features**
  * [CLIENT-2672] - Added support for MacOS 14.
  * [CLIENT-2751] - Added support for Node.js 21.

* **Bug Fixes**
  * [CLIENT-2599] - Added documentation to avoid build issues on Windows with Python 3.12.
  * [CLIENT-2709] - The C Client submodule now marks node’s partitions for retry on the next scan/query page when a node returns records that are discarded due to exceeding maxRecords.
  * [CLIENT-2749] - Added missing BOOL enumeration to Aerospike.exp.type. In scan/query with maxRecords set, mark node's partitions for retry on next scan/query page when that node returns records that are discarded due to exceeding maxRecords.
  * [CLIENT-2750] - Changed npm-run-all from a dev-dependency to a dependency.


## [5.9.0]

* **Breaking Changes**
  * [CLIENT-2659] - Dropped support for Debian 10.
  * [CLIENT-2660] - Dropped support for CentOS 7.
  * [CLIENT-2661] - Dropped support for Red Hat Enterprise Linux 7.
  * [CLIENT-2662] - Dropped support for Oracle Linux 7.
  * [CLIENT-2663] - Dropped support for Amazon Linux 2.
  * [CLIENT-2668] - Dropped support for macOS 11.

* **New Features**
  * [CLIENT-2095] - The Aerospike client can now be installed using “npm install aerospike” on windows.
  * [CLIENT-2572] - Added exp.recordSize expression.
  * [CLIENT-2587] - Added Client.createBlobIndex.
  * [CLIENT-2587] - Added indexDatatype.BLOB.
  * [CLIENT-2615] - Added exp.expWriteFlags and exp.expReadFlags.
  * [CLIENT-2617] - Added map.create method with parameter to create a persistent map index.
  * [CLIENT-2669] - Added config.errorRateWindow and config.maxErrorRate.
    * [CLIENT-1421] - maxErrorRate and errorRateWindow can be adjusted to modify the circuit breaker pattern implemented by the C client.

* **Improvements**
  * [CLIENT-2671] - Updated batch examples on the Node.js Client API docs page.

* **Bug Fixes**
  * [CLIENT-2629] - Fixed bug in which some batch methods returned an AEROSPIKE_BATCH_FAILED error rather than records with detailed status codes.
  * [CLIENT-2670] - Fixed bug in which config.tenderInterval was not being applied.

* **New Features**
## [5.8.0]

* **Breaking Changes**
  * [CLIENT-2517] - Dropped support for Node.js 19.
  * [CLIENT-2581] - Dropped support for Node.js 16.

* **New Features**
  * [CLIENT-1983] - Added support for the javascript “Map” class as a bin value in client.put method and maps.putItems method.
  * [CLIENT-1983] - Added the Bin class for use in the client.put method.
  * [CLIENT-2378] - Added exp.inf and exp.wildcard expressions.
  * [CLIENT-2488] - Added a “returnType” parameter to map expression remove methods. Acceptable “returnType” values are maps.returnType.INVERTED and maps.returnType.NONE.

* **Improvements**
  * [CLIENT-1601] - Switched API docs theme to docdash.
  * [CLIENT-2374] - Restored typescript support.

* **Bug Fixes**
  * [CLIENT-2538] - Fixed bug in which list expression remove methods and map expression remove methods resulted in a segmentation fault.

## [5.7.0]

* **New Features**
  * [CLIENT-630] - Added the following role-based access control (RBAC) security features:
    * Modules
      * Aerospike.Client.admin
      * Aerospike.Client.privilegeCode
    * classes
      * Aerospike.Client.admin.User
      * Aerospike.Client.admin.Role
      * Aerospike.Client.admin.Privilege
      * Aerospike.Client.adminPolicy
    * Methods
      * Aerospike.Client.changePassword
      * Aerospike.Client.createUser
      * Aerospike.Client.createRole
      * Aerospike.Client.dropRole
      * Aerospike.Client.dropUser
      * Aerospike.Client.grantPrivileges
      * Aerospike.Client.grantRoles
      * Aerospike.Client.queryRole
      * Aerospike.Client.queryRoles
      * Aerospike.Client.queryUser
      * Aerospike.Client.queryUsers
      * Aerospike.Client.revokePrivileges
      * Aerospike.Client.revokeRoles
      * Aerospike.Client.setQuotas
      * Aerospike.Client.setWhitelist
  * [CLIENT-1303] - Added the ‘TTL' property to the query and scan classes. Note: records will only have their ‘TTL’ value set if query.operate or scan.operate is called when the ‘TTL’ property is set.
  * [CLIENT-2393] - Added support for Debian 12.

* **Improvements**
  * [CLIENT-2350] - Initialized values depended on by conditional jumps.
  * [CLIENT-2466] - Added additional input validation.

* **Bug Fixes**
  * [CLIENT-2463] - Paginated queries without a filter specified will no longer throw a TypeError for reading an undefined value

* **updates**
  * The typescript description file 'index.d.ts' has not been updated. The next release will update 'index.d.ts' and restore typescript support.

## [5.6.0]

* **New Features**
  * [CLIENT-1803] - Added support for creation of a secondary index on elements within a Collection Data Type.
  * [CLIENT-1990] - Added support for Collection Data Type (CDT) Context Base64 serialization.
  * [CLIENT-2085] - Added support for rack aware queries and scans.
  * [CLIENT-2347] - Added the 'replica' property to the QueryPolicy and ScanPolicy Classes.
  * [CLIENT-2348] - Added filter support for secondary indices on elements within a Collection Data Type.

* **Improvements**
  * [CLIENT-1823] - Changed the example and parameters in the API Documentation for Client.batchApply.
  * [CLIENT-2345] - Improved Client.indexRemove unit test by verifying deletion with a query.
  * [CLIENT-2373] - Modified Query.where() to replace the current filter rather than add a filter to Query.filters.
  * [CLIENT-2376] - Removed dynamic linking to OpenSSL.

* **Updates**
  * The typescript description file 'index.d.ts' has not been updated. The next release will update 'index.d.ts' and restore typescript support.

## [5.5.0]

* **Breaking Changes**
  * [CLIENT-2343] - Dropped support for Node.js 14

* **New Features**
  * [CLIENT-2108] - Added pagination support for queries and scans. Requires Aerospike Server version 6.0 or above.
  * [CLIENT-2224] - Added support for rack aware reads when the replication factor is three.
  * [CLIENT-2303] - Added support for Amazon Linux 2023.
  * [CLIENT-2342] - Added support for Node.js 20

* **Improvements**
  * [CLIENT-1819] - Fixed issue which caused the configuration class property "rackId" to be ignored.

* **Bug Fixes**
  * [CLIENT-2231] - Fixed expression API documentation to show parameters for functions.

## [5.4.0]
* The new features require Aerospike Server version 6.3 or newer.

* **Breaking Changes**
  * Dropped support for:
    * Ubuntu 18.04
    * Debian 10 (ARM64 only).

* **New Features**
  * [CLIENT-2178] - Added ORDERED_MAP and UNORDERED_MAP map operation return types.
  * [CLIENT-2187] - Added comparison of map values using expressions.

## [5.3.0]

* **New Features**
  * [CLIENT-1750] - Added 'returnType.EXISTS' for 'aerospike/maps' and 'aerospike/list' module read operations. This feature requires server version 6.1+.
  * [CLIENT-1818] - Added the 'getByKeyList' method 'aerospike/maps' module.
  * [CLIENT-2210] - Added the 'getByValueList' method 'aerospike/maps' module.

* **Improvements**
  * [CLIENT-1819] - Corrected 'Client.batchApply' to have a keys parameter rather than a records parameter.

* **Bug Fixes**
  * [CLIENT-2231] - Fixed segmentation fault caused by using context with map and list expressions. Added unit tests for map and list expressions using context. Fixed parameter order for map and list expression methods.

## [5.2.2]
* **Improvements**
  * [CLIENT-2202] - Corrected default values for MaxConnsPerNode, maxSocketIdle, and totalTimeout policies within the API documentation.

* **Bug Fixes**
  * [CLIENT-2195] - Reworked batch write to accommodate promises and callbacks. Batch write will no longer return "AEROSPIKE_BATCH_FAILED" as an error, and will instead return results with status codes detailing the status of each batch operation.

## [5.2.1]

* **New Features**
  * [CLIENT-1248] - AddListIndexCreate and AddMapKeyCreate added to cdt_context.js.

* **Improvements**
  * [CLIENT-2011] - Batch writes now returns the results of transactions ending in the AEROSPIKE_BATCH_FAILED status as well as the status of each record.
  * [CLIENT-2150] - Reduced install size from 500MB to 166MB.

* **Bug Fixes**
  * [CLIENT-2167] - Fixed broken API documentation links.
  * [CLIENT-2168] - Added missing methods from operations classes.

## [5.2.0]

* **Updates**
  * BREAKING: Client does not support Node.js LTS version 14 on macOS using ARM architecture - see Incompatible API Changes for details.
  * Added support for
    * Node.js 19
    * Ubuntu 22.04
    * RHEL 9
  * Dropped support for:
    * Node.js 10, 12, 17
    * RHEL 7
    * Debian 8, 9

* **New Features**
  * [CLIENT-2000] - Added ARM architecture support for all currently supported OS systems.

## [5.1.1]

* **Bug Fixes**
  * [CLIENT-1944] - Node.js: Revamped existing API documentation.
  * [CLIENT-1943] - Node.js: Added documentation for list, map, hll, and bit expressions
  * [CLIENT-1942] - Node.js: Improved examples within the API documentation.

## [5.0.3]

* **Updates**
  * Debian 9 Stretch LTS has reached its End of Life on June 30 2022. We will drop support for Debian 9 in an upcoming client release.

* **Bug Fixes**
  * [CLIENT-1778] Node.js: document client support for PKI auth.
  * [CLIENT-1762] Add Node.js client TypeScript support.

## [5.0.2]

* **Bug Fixes**
  * [CLIENT-1745] Running node.js client on Alpine 3.15 + node 17.9 results with an error.
  * [CLIENT-1746] Node.js batch type js object and documentation incomplete.

## [5.0.1]

* **Bug Fixes**
  * [CLIENT-1743] - Node.js mac client exits on first database operation. (4.00+)
  * [CLIENT-1734] - Node.js client: Typescript file missing in npm package version 4.0.2.

## [5.0.0]

* **New Features**
  * [CLIENT-1713] - Node.js: Support batch apply command.
  * [CLIENT-1712] - Node.js: Support batch remove operations.
  * [CLIENT-1711] - Node.js: Support batch write operations.
  * [CLIENT-1715] - Node.js: Support query partition.
  * [CLIENT-1714] - Node.js: Support scan partition.

* **Updates**
  * BREAKING: Remove deprecated PredicateExpression filtering which has been replaced by new Filter Expressions
  * npm registry includes images for nodejs v17.8.0 and v18.0.0

## [4.0.4]

* **Bug Fixes**
  * [CLIENT-1745] Running node.js client on Alpine 3.15 + node 17.9 results with an error.

## [4.0.3]

* **Bug Fixes**
  * [CLIENT-1743] - Node.js mac client exits on first database operation. (4.00+)
  * [CLIENT-1734] - Node.js client: Typescript file missing in npm package version 4.0.2.

## [4.0.2]

* **New Features**
  * [CLIENT-1629] - Node.js: Support for Debian 11.

* **Updates**
  * [CLIENT-1404] - Node.js: Use the new C client ability to sort maps client-side ahead of operations.
  
* **Bug Fixes**
  * [CLIENT-1718] - Support failOnClusterChange for query policy.

## [4.0.1]

* **Updates**
  * Update deprecated Aerospike PredExp usage
  * Update Aerospike Expressions usage

## [4.0.0]

* **New Features**
  * [CLIENT-1678] - Support boolean particle type. This feature requires server 5.6+. [#428](https://github.com/aerospike/aerospike-client-nodejs/pull/428)
  * [CLIENT-1679] - Add support for Aerospike Expressions.
  * [CLIENT-1680] - Added TypeScript typings. [#446](https://github.com/aerospike/aerospike-client-nodejs/pull/446) Thanks to [@bit0r1n](https://github.com/bit0r1n)!

* **Updates**
  * BREAKING: This client requires server version 4.9 or later.
  * BREAKING: Drop support for Node.js 8.
  * BREAKING: Remove support for CentOS 6 as well as Ubuntu 16.04.
  * BREAKING: Remove Scan#priority, Scan#percent, and ScanPolicy#failOnClusterChange, as the server no longer supports these fields.
  * Add support for building c-client as a sub-module.

## [3.16.7] - 2022-01-10

* **Bug Fixes**
  * CLIENT-1641: Unprocessed results sent to a different transaction on "Partition unavailable"

* **Updates**
  * Update C client library to [v4.6.24](http://www.aerospike.com/download/client/c/notes.html#4.6.24).

## [3.16.6] - 2021-07-13

* **Bug Fixes**
  * Client doesn't start with "minConnsPerNode" option [#419](https://github.com/aerospike/aerospike-client-nodejs/issues/419)

* **Updates**
  * Update C client library to [v4.6.23](http://www.aerospike.com/download/client/c/notes.html#4.6.23).
  * Drop support for Ubuntu 16.04.

## [3.16.5] - 2021-04-14

* **Bug Fixes**
  * CLIENT-1498: Support infoTimeout on QueryPolicy. The timeout is used when failOnClusterChange is true and an info validation command is sent before/after the query. [#412](https://github.com/aerospike/aerospike-client-nodejs/pull/412)

* **Updates**
  * Update C client library to [v4.6.21](http://www.aerospike.com/download/client/c/notes.html#4.6.21).

## [3.16.4] - 2021-02-21

* **Bug Fixes**
  * CLIENT-1453: Client release v3.16.3 fails to install on Amazon Linux [#403](https://github.com/aerospike/aerospike-client-nodejs/issues/403)

## [3.16.3] - 2021-02-09

* **Bug Fixes**
  * CLIENT-1441: Support boolean values in Map/List bins. [#401](https://github.com/aerospike/aerospike-client-nodejs/pull/401)

* **Updates**
  * Update C client library to [v4.6.20](http://www.aerospike.com/download/client/c/notes.html#4.6.20). [#400](https://github.com/aerospike/aerospike-client-nodejs/pull/400)

## [3.16.2] - 2020-12-04

* **New Features**
  * Support setting tlsname using Host obj. [#382](https://github.com/aerospike/aerospike-client-nodejs/issues/382)

* **Bug Fixes**
  * Reverses the breaking change introduced in v3.16.0 of not supporting percent-based scan sampling for server versions 4.9 or later. However, note that scan percent and max_records are mutually exclusive; the client will return an error if both values are set on a scan policy.
  * Query with "failOnClusterChange" causes timeout when using command queue. [#389](https://github.com/aerospike/aerospike-client-nodejs/issues/389)

* **Updates**
  * Remove support for ApplyPolicy#gen, which is not supported by the server. [#390](https://github.com/aerospike/aerospike-client-nodejs/pull/390)
  * Update C client library to [v4.6.19](http://www.aerospike.com/download/client/c/notes.html#4.6.19)
  * Clarify docs for HLL ALLOW_FOLD policy [#386](https://github.com/aerospike/aerospike-client-nodejs/pull/386)
  * Fix minhash bits range in docs (4-51, not 4-58). [#385](https://github.com/aerospike/aerospike-client-nodejs/pull/385)
  * Fix spelling of capacity in Command Queue docs. [#376](https://github.com/aerospike/aerospike-client-nodejs/pull/376) Thanks to [@icflournoy](https://github.com/icflournoy)!
  * Refactor: Set TTL as part of the touch operation [#391](https://github.com/aerospike/aerospike-client-nodejs/pull/391)
  * Add support for Ubuntu 20.04.
  * Drop support for Ubuntu 14.04.

## [3.16.1] - 2020-06-30

* **Bug Fixes**
  * Fix memory leaks when running secondary index (SI) queries with string filter predicates. [#370](https://github.com/aerospike/aerospike-client-nodejs/issues/370)

## [3.16.0] - 2020-05-18

* **New Features**
  * Add max records option for sampling with basic scans. Requires server version 4.9 or later. [#359](https://github.com/aerospike/aerospike-client-nodejs/pull/359)
  * Add support for HyperLogLog data type and operations. Requires server version 4.9 or later. [#361](https://github.com/aerospike/aerospike-client-nodejs/pull/361)
  * Add minConnsPerNode and maxSocketIdle client config. [#366](https://github.com/aerospike/aerospike-client-nodejs/pull/366)

* **Updates**
  * *BREAKING*: The client no longer supports the percent-based scan sampling for server versions 4.9 or later. Use the new max records scan policy option instead. See [API Changes](https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html#version-3-16-0) for details.
  * Update C client library to [v4.6.16](http://www.aerospike.com/download/client/c/notes.html#4.6.16).
  * Update dependencies with potential vulnerabilities by running npm audit fix. [#367](https://github.com/aerospike/aerospike-client-nodejs/pull/367)

## [3.15.0] - 2020-03-24

* **New Features**
  * Support for BigInt as record key and bin value. [#348](https://github.com/aerospike/aerospike-client-nodejs/pull/348)

* **Updates**
  * Update C client library to [v4.6.13](http://www.aerospike.com/download/client/c/notes.html#4.6.13).

## [3.14.1] - 2020-01-15

* **Bug Fixes**
  * Regression: Protocol error on authenticated connections. [CLIENT-1169]

* **Updates**
  * Update C client library to [v4.6.12](http://www.aerospike.com/download/client/c/notes.html#4.6.12).

## [3.14.0] - 2020-01-08

* **New Features**
  * Add new delete record operation. Requires server version 4.7 or later (4.7.0.8+ or 4.8.0.3+ recommended). [#322](https://github.com/aerospike/aerospike-client-nodejs/pull/322)
  * Support compressed commands and responses. Requires Aerospike Enterprise Server version 4.8 or later. [#335](https://github.com/aerospike/aerospike-client-nodejs/pull/335)
  * Add per-node opened/closed connection stats. [#336](https://github.com/aerospike/aerospike-client-nodejs/pull/336)
  * Support write operations on background scans & queries. Requires server version 4.7 or later. [#338](https://github.com/aerospike/aerospike-client-nodejs/pull/338)
  * Support new records-per-second limit for scans, replacing scan priority. Requires server version 4.7 or later. [#339](https://github.com/aerospike/aerospike-client-nodejs/pull/339)
  * Add predicate filter support for batch, read, write, delete, and record UDF transactions. Requires server version 4.7 or later. [#340](https://github.com/aerospike/aerospike-client-nodejs/pull/340)

* **Updates**
  * Add support for RHEL/CentOS 8.
  * Update C client library to [v4.6.10](http://www.aerospike.com/download/client/c/notes.html#4.6.10).
  * Minor API document updates. [#342](https://github.com/aerospike/aerospike-client-nodejs/pull/342)
  * Update several dev dependencies to latest version.

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
  * Support CDT List Increment operation. Requires server 3.15 or later.
  * Improved timeout handling and automatic transaction retries - see [detailed API changes](https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html#version-3-0-0) for more info.
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

Please refer to the full list of [backward incompatible API changes](https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html#version-3-0-0)
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
  * The Client#udfRegisterWait and Info#parseInfo functions have been marked deprecated. See [API Changes](https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html#version-2-6-0) for details.

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
    [backward incompatible API changes](https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html#version-2-4-0)
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
  * Support for operations on Sorted Maps. Requires server 3.8.4 or later.

* **Improvements**
  * Key objects returned in callbacks now include the digest
  * Code cleanup to support standard@7.0.0 which adds several new rules

* **Fixes**
  * Fix compile time error with Node 0.12 using gcc 4.4. [#131](https://github.com/aerospike/aerospike-client-nodejs/issues/131)

* **Changes**
  * The `aerospike.operator` module has been split up into two seperate modules `aerospike.operations` and `aerospike.lists` for operations on scalar and
    list data types respectively. See detailed list of [API changes](https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html#version-2-1-0)
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
    requires server >= 3.8. [CLIENT-684]
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
    [backward incompatible API changes](https://www.aerospike.com/docs/client/nodejs/usage/incompatible.html#version-2-0-0-alpha-1)
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
