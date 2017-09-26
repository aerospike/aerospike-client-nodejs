// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

const as = require('bindings')('aerospike.node')
const asEventLoop = require('./event_loop')
const utils = require('./utils')

/**
 * @module aerospike
 *
 * @description The Aerospike module is the main entry point for the Aerospike
 * Node.js Client API. It provides methods for creating new client instances
 * that connect to a specific Aerospike server cluster.
 */

// ========================================================================
// Sub-Modules
// ========================================================================

/**
 * The {@link module:aerospike/filter|filter} module provides function to
 * specify filter predicates for use in query operations via the {@link
 * Client#query} command.
 *
 * @summary {@link module:aerospike/filter|aerospike/filter} module
 */
exports.filter = require('./filter')

/**
 * The info protocol provides access to configuration and statistics for the
 * Aerospike server. The {@link module:aerospike/info|info} module provides
 * utility functions for parsing the info data returned by the Aerospike
 * server.
 *
 * @summary {@link module:aerospike/info|aerospike/info} module
 */
exports.info = require('./info')

/**
 * The {@link module:aerospike/lists|lists} module defines operations on the Lists
 * complex data type.
 *
 * @summary {@link module:aerospike/lists|aerospike/lists} module
 */
exports.lists = require('./lists')

let maps = require('./maps')
// copy maps related enums into maps module
Object.keys(as.maps).forEach(key => {
  maps[key] = as.maps[key]
})

/**
 * The {@link module:aerospike/maps|maps} module defines operations on the Maps
 * complex data type.
 *
 * @summary {@link module:aerospike/maps|aerospike/maps} module
 */
exports.maps = maps

/**
 * The {@link module:aerospike/operations|operations} module provides functions
 * to create operations for the {@link Client#operate} command.
 *
 * @summary {@link module:aerospike/operations|aerospike/operations} module
 */
exports.operations = require('./operations')

/**
 * The {@link module:aerospike/policy|policy} module defines policies and
 * policy values that define the behavior of database operations.
 *
 * @summary {@link module:aerospike/policy|aerospike/policy} module
 */
exports.policy = require('./policy')

// ========================================================================
// Classes
// ========================================================================

/**
 * In case of any errors during the database operation the client will return an
 * {@link AerospikeError} instance (either through the provided callback or
 * when the returned Promise gets resolved).
 *
 * @summary {@link AerospikeError} class
 */
exports.AerospikeError = require('./aerospike_error')

/**
 * The main interface of the Aerospike client. Through the Client class,
 * commands such as put, get or query can be sent to an Aerospike database
 * cluster.
 *
 * @summary {@link Client} class
 */
exports.Client = require('./client')

/**
 * All the decimal values with valid fractions (e.g. 123.45) will be stored as
 * double data type in Aerospike. To store decimal values with 0 fraction as
 * double, the value needs to be wrapped in a {@link Double} class instance.
 *
 * @summary {@link Double} class
 */
exports.Double = require('./double')

/**
 * Representation of a GeoJSON value. Since GeoJSON values are JSON objects
 * they need to be wrapped in the {@link GeoJSON} class so that the client can
 * distinguish them from other types of objects.
 *
 * @summary {@link GeoJSON} class
 */
exports.GeoJSON = require('./geojson')

/**
 * A key uniquely identifies a record in the Aerospike database within a given
 * namespace.
 *
 * @summary {@link Key} class
 */
exports.Key = require('./key')

/**
 * A record with the Aerospike database consists of one or more record "bins"
 * (name-value pairs) and meta-data, incl. time-to-live and generation; a
 * record is uniquely identified by it's key within a given namespace.
 *
 * @summary {@link Record} class
 */
exports.Record = require('./record')

  /**
   * Enumeration of UDF types.
   *
   * @member {Object} language
   * @readonly
   * @static
   *
   * @property LUA - Lua (only supported UDF type at the moment)
   */
exports.language = as.language

  /**
   * Enumeration of log levels
   *
   * @member {Object} log
   * @readonly
   * @static
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   *
   * var config = {
   *   log: { level: Aerospike.log.INFO }
   * }
   * Aerospike.connect(config, (error, client) => {
   *   if (error) throw error
   *
   *   var key = new Aerospike.Key('test', 'demo', 'k1')
   *   client.get(key, (error, record) => {
   *     if (error) throw error
   *     console.info(record)
   *     client.close()
   *   })
   * })
   *
   * @property OFF
   * @property ERROR
   * @property WARN
   * @property DEBUG
   * @property DETAIL
   */
exports.log = as.log

  /**
   * @summary Enumertion of special TTL (time-to-live) values.
   *
   * @description Instead of specifying a TTL in seconds, you can set the TTL
   * to one of these special values when creating or updating a record.
   *
   * @member {Object} ttl
   * @readonly
   * @static
   *
   * @property NAMESPACE_DEFAULT - Use the default TTL value for the namespace of the record.
   * @property NEVER_EXIRE - Never expire the record.
   * @property DONT_UPDATE - Update the record without changing the record's
   *                         TTL value. Requires Aerospike Server version 3.10.1 or later.
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   * const Key = Aerospike.Key
   *
   * Aerospike.connect((error, client) => {
   *   if (error) throw error
   *   var key = new Key('test', 'demo', 'key1')
   *   var record = { 'a': 1, 'b': 2 }
   *   var meta = { ttl: 12345 }
   *   var policy = { exists: Aerospike.policy.exists.CREATE_OR_REPLACE }
   *   client.put(key, record, meta, policy, (error) => {
   *     if (error) throw error
   *     client.put(key, { c: 3 }, { ttl: Aerospike.ttl.DONT_UPDATE }, (error) => {
   *       if (error) throw error
   *       client.get(key, (error, record, meta) => {
   *         if (error) throw error
   *         console.log(record, meta) // => { a: 1, b: 2, c: 3 } { ttl: 12345, gen: 2 }
   *         client.close()
   *       })
   *     })
   *   })
   * })
   */
exports.ttl = as.ttl

  /**
   * Enumeration of predicate types.
   * @private
   */
exports.predicates = as.predicates

  /**
   * Enumeration of job status codes.
   *
   * @member {Object} jobStatus
   * @readonly
   * @static
   *
   * @see {@link Job#infoCallback} returns the job status.
   *
   * @property UNDEF - The job status is undefined. This is likely due to the
   * status not being properly checked.
   * @property INPROGRESS - The job is currently running.
   * @property COMPLETED - The job completed successfully.
   */
exports.jobStatus = as.jobStatus

  /**
   * Enumeration of priority levels for a scan operation.
   *
   * @member {Object} scanPriority
   * @readonly
   * @static
   *
   *
   * @see {@link Scan#priority}
   *
   * @property AUTO - The cluster will auto adjust the scan priority.
   * @property LOW - Low scan priority.
   * @property MEDIUM - Medium scan priority.
   * @property HIGH - High scan priority.
   */
exports.scanPriority = as.scanPriority

  /**
   * Enumeration of secondary index data types.
   *
   * @member {Object} indexDataType
   * @readonly
   * @static
   *
   * @property STRING - Values contained in the secondary index are strings.
   * @property NUMERIC - Values contained in the secondary index are integers.
   * @property GEO2DSPHERE - Values contained in the secondary index are GeoJSON values (points or polygons).
   *
   * @see {@link Client#createIndex}
   */
exports.indexDataType = as.indexDataType

  /**
   * Enumeration of secondary index types.
   *
   * @member {Object} indexType
   * @readonly
   * @static
   *
   * @property DEFAULT - Default secondary index type for bins containing scalar values (i.e. integer, string).
   *
   * @property LIST - Secondary index for bins containing
   * <a href="http://www.aerospike.com/docs/guide/cdt-list.html" title="Aerospike List Data Type">&uArr;Lists</a>;
   * the index will be build over the individual entries of the list.
   *
   * @property MAPKEYS - Secondary index for bins containing
   * <a href="http://www.aerospike.com/docs/guide/cdt-map.html" title="Aerospike Maps Data Type">&uArr;Maps</a>;
   * the index will be build over the individual keys of the map entries.
   *
   * @property MAPVALUES - Secondary index for bins containing
   * <a href="http://www.aerospike.com/docs/guide/cdt-map.html" title="Aerospike Maps Data Type">&uArr;Maps</a>;
   * the index will be build over the individual values of the map entries.
   *
   * @see {@link Client#createIndex}
   */
exports.indexType = as.indexType

  /**
   * Enumeration of error status codes.
   *
   * @member {Object} status
   * @readonly
   * @static
   *
   * @property AEROSPIKE_ERR_INVALID_NODE - Node invalid or could not be found.
   * @property AEROSPIKE_ERR_NO_MORE_CONNECTIONS - Asynchronous connection error.
   * @property AEROSPIKE_ERR_ASYNC_CONNECTION - Asynchronous connection error.
   * @property AEROSPIKE_ERR_CLIENT_ABORT - Query or scan was aborted in user's callback.
   * @property AEROSPIKE_ERR_INVALID_HOST - Host name could not be found in DNS lookup.
   * @property AEROSPIKE_NO_MORE_RECORDS - No more records available when parsing batch, scan or query records.
   * @property AEROSPIKE_ERR_PARAM - Invalid client API parameter.
   * @property AEROSPIKE_ERR_CLIENT - Generic client API usage error.
   * @property AEROSPIKE_ERR - Generic client error (deprecated).
   * @property AEROSPIKE_OK - Generic success.
   * @property AEROSPIKE_ERR_SERVER - Generic error returned by the server.
   * @property AEROSPIKE_ERR_RECORD_NOT_FOUND - Record does not exist in database. May be returned by read, or write with policy <code>exists: Aerospike.policy.exists.UPDATE</code>
   * @property AEROSPIKE_ERR_RECORD_GENERATION - Generation of record in database does not satisfy write policy.
   * @property AEROSPIKE_ERR_REQUEST_INVALID - Request protocol invalid, or invalid protocol field.
   * @property AEROSPIKE_ERR_RECORD_EXISTS - Record already exists. May be returned by write with policy <code>exists: Aerospike.policy.exists.CREATE</code>.
   * @property AEROSPIKE_ERR_BIN_EXISTS - Bin already exists.
   * @property AEROSPIKE_ERR_CLUSTER_CHANGE - A cluster state change occurred during the request.
   * @property AEROSPIKE_ERR_SERVER_FULL - The server node is running out of memory and/or storage device space reserved for the specified namespace.
   * @property AEROSPIKE_ERR_TIMEOUT - Request timed out. Can be triggered by client or server.
   * @property AEROSPIKE_ERR_NO_XDR - XDR not available for the cluster.
   * @property AEROSPIKE_ERR_CLUSTER - Generic cluster discovery & connection error.
   * @property AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE - Bin modification operation cannot be done on an existing bin due to its value type.
   * @property AEROSPIKE_ERR_RECORD_TOO_BIG - Record being (re-)written cannot fit in a storage write block.
   * @property AEROSPIKE_ERR_RECORD_BUSY - Too many concurrent requests for one record - a "hot key" situation.
   * @property AEROSPIKE_ERR_SCAN_ABORTED - Scan aborted by user.
   * @property AEROSPIKE_ERR_UNSUPPORTED_FEATURE - Sometimes our doc, or our customers' wishes, get ahead of us. We may have processed something that the server is not ready for (unsupported feature).
   * @property AEROSPIKE_ERR_BIN_NOT_FOUND - Bin-level replace-only supported on server but not on client.
   * @property AEROSPIKE_ERR_DEVICE_OVERLOAD - The server node's storage device(s) can't keep up with the write load.
   * @property AEROSPIKE_ERR_RECORD_KEY_MISMATCH - Record key sent with transaction did not match key stored on server.
   * @property AEROSPIKE_ERR_NAMESPACE_NOT_FOUND - Namespace in request not found on server.
   * @property AEROSPIKE_ERR_BIN_NAME - Sent too-long bin name or exceeded namespace's bin name quota.
   * @property AEROSPIKE_ERR_FAIL_FORBIDDEN - Operation not allowed at this time.
   * @property AEROSPIKE_QUERY_END - There are no more records left for query.
   * @property AEROSPIKE_SECURITY_NOT_SUPPORTED - Security functionality not supported by connected server.
   * @property AEROSPIKE_SECURITY_NOT_ENABLED - Security functionality not enabled by connected server.
   * @property AEROSPIKE_SECURITY_SCHEME_NOT_SUPPORTED - Security type not supported by connected server.
   * @property AEROSPIKE_INVALID_COMMAND - Administration command is invalid.
   * @property AEROSPIKE_INVALID_FIELD - Administration field is invalid.
   * @property AEROSPIKE_ILLEGAL_STATE - Security protocol not followed.
   * @property AEROSPIKE_INVALID_USER - User name is invalid.
   * @property AEROSPIKE_USER_ALREADY_EXISTS - User was previously created.
   * @property AEROSPIKE_INVALID_PASSWORD - Password is invalid.
   * @property AEROSPIKE_EXPIRED_PASSWORD - Password has expired.
   * @property AEROSPIKE_FORBIDDEN_PASSWORD - Forbidden password (e.g. recently used).
   * @property AEROSPIKE_INVALID_CREDENTIAL - Security credential is invalid.
   * @property AEROSPIKE_INVALID_ROLE - Role name is invalid.
   * @property AEROSPIKE_ROLE_ALREADY_EXISTS - Role name already exists.
   * @property AEROSPIKE_INVALID_PRIVILEGE - Privilege is invalid.
   * @property AEROSPIKE_NOT_AUTHENTICATED - User must be authenticated before performing database operations.
   * @property AEROSPIKE_ROLE_VIOLATION - User does not possess the required role to perform the database operation.
   * @property AEROSPIKE_ERR_UDF - Generic UDF error.
   * @property AEROSPIKE_ERR_LARGE_ITEM_NOT_FOUND - The requested item in a large collection was not found.
   * @property AEROSPIKE_ERR_BATCH_DISABLED - Batch functionality has been disabled.
   * @property AEROSPIKE_ERR_BATCH_MAX_REQUESTS_EXCEEDED - Batch max. requests have been exceeded.
   * @property AEROSPIKE_ERR_BATCH_QUEUES_FULL - All batch queues are full.
   * @property AEROSPIKE_ERR_GEO_INVALID_GEOJSON - Invalid/unsupported GeoJSON.
   * @property AEROSPIKE_ERR_INDEX_FOUND - Index found.
   * @property AEROSPIKE_ERR_INDEX_NOT_FOUND - Index not found.
   * @property AEROSPIKE_ERR_INDEX_OOM - Index is out of memory.
   * @property AEROSPIKE_ERR_INDEX_NOT_READABLE - Unable to read the index.
   * @property AEROSPIKE_ERR_INDEX - Generic secondary index error.
   * @property AEROSPIKE_ERR_INDEX_NAME_MAXLEN - Index name is too long.
   * @property AEROSPIKE_ERR_INDEX_MAXCOUNT - System alrady has maximum allowed indeces.
   * @property AEROSPIKE_ERR_QUERY_ABORTED - Query was aborted.
   * @property AEROSPIKE_ERR_QUERY_QUEUE_FULL - Query processing queue is full.
   * @property AEROSPIKE_ERR_QUERY_TIMEOUT - Secondary index query timed out on server.
   * @property AEROSPIKE_ERR_QUERY - Generic query error.
   * @property AEROSPIKE_ERR_UDF_NOT_FOUND - UDF does not exist.
   * @property AEROSPIKE_ERR_LUA_FILE_NOT_FOUND - LUA file does not exist.
   *
   * @see {@link AerospikeError#code}
   */
exports.status = as.status

// ========================================================================
// Functions
// ========================================================================

exports.print = utils.print
exports.releaseEventLoop = asEventLoop.releaseEventLoop

let Client = exports.Client

/**
 * Creates a new {@link Client} instance.
 *
 * @param {Config} [config] - The configuration for the client.
 */
exports.client = function (config) {
  return new Client(config)
}

/**
 * Creates a new {@link Client} instance and connects to the Aerospike cluster.
 *
 * @param {Config} [config] - The configuration for the client.
 * @param {Client~connectCallback} [callback] - The function to call, once the client is connected to the cluster successfully.
 *
 * @return {?Promise} If no callback function is passed, the function returns
 * a Promoise resolving to the connected client.
 *
 * @example <caption>Using callback function</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * let config = { ... }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *     process.exit()
 *   } else {
 *     // client is ready to accept commands
 *     client.close()
 *   }
 * })
 *
 * @example <caption>Returning a Promise</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * let config = { ... }
 * Aerospike.connect(config)
 *   .then(client => {
 *     // client is ready to accept commands
 *     return client.get(key)
 *       .then(record => console.info(record))
 *       .then(() => client.close())
 *       .catch(error => {
 *         console.error('Failed to get record: %s', error.message)
 *         client.close()
 *       })
 *   })
 *   .catch(error => {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *   })
 */
exports.connect = function (config, callback) {
  if (typeof config === 'function') {
    callback = config
    config = null
  }
  var client = this.client(config)
  if (typeof callback === 'function') {
    client.connect(callback)
    return client
  } else {
    return client.connect()
  }
}
