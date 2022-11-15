// *****************************************************************************
// Copyright 2013-2022 Aerospike, Inc.
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
const AerospikeError = require('./error')
const EventLoop = require('./event_loop')

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
 * The {@link module:aerospike/filter|filter} module provides functions to
 * create secondary index (SI) filter predicates for use in query operations via the
 * {@link Client#query} command.
 *
 * @summary {@link module:aerospike/filter|aerospike/filter} module
 */
exports.filter = require('./filter')

/**
 * The {@link module:aerospike/exp|exp} module provides functions to
 * create expressions for use in key operations via the {@link
 * Client#operate} command.
 * @summary {@link module:aerospike/exp|aerospike/exp} module
 */
const exp = exports.exp = require('./exp')
exp.type = as.exp.type

/**
 * @summary POSIX regex compilation flags.
 *
 * @enum {number}
 *
 */
exports.regex = {
  /** Use basic regular expression syntax. */
  BASIC: 0,

  /** Use extended regular expression syntax. */
  EXTENDED: 1,

  /** Ignore case when matching. */
  ICASE: 2,

  /** Anchors do not match at newline characters in the string. */
  NEWLINE: 4
}

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

/**
 * The {@link module:aerospike/hll|hll} module defines operations on the
 * HyperLogLog data type.
 *
 * @summary {@link module:aerospike/hll|aerospike/hll} module
 *
 * @since v3.16.0
 */
exports.hll = require('./hll')

/**
 * The {@link module:aerospike/maps|maps} module defines operations on the Maps
 * complex data type.
 *
 * @summary {@link module:aerospike/maps|aerospike/maps} module
 * @static
 */
const maps = exports.maps = require('./maps')
// copy maps related enums into maps module
Object.keys(as.maps).forEach(key => {
  maps[key] = as.maps[key]
})

/**
 * The {@link module:aerospike/cdt|cdt} module provides the {@link CdtContext}
 * class for operations on nested lists and maps.
 *
 * @summary {@link module:aerospike/cdt|aerospike/cdt} module
 */
exports.cdt = {
  Context: require('./cdt_context')
}

/**
 * The {@link module:aerospike/bitwise|bitwise} module defines operations on
 * the bytes data type.
 *
 * @summary {@link module:aerospike/bitwise|aerospike/bitwise} module
 */
exports.bitwise = require('./bitwise')

/**
 * The {@link module:aerospike/operations|operations} module provides functions
 * to create operations for the {@link Client#operate} command.
 *
 * @summary {@link module:aerospike/operations|aerospike/operations} module
 */
exports.operations = require('./operations')

/**
 * The {@link module:aerospike/exp/operations|ExpOperation} module provides functions
 * to create operations using <a href="https://docs.aerospike.com/guide/expressions">&uArr;Aerospike Expressions</a>
 * for the {@link Client#operate} command.
 *
 *
 * @summary {@link module:aerospike/exp/operations|aerospike/exp/operations} module
 */
exp.operations = require('./exp_operations')

/**
 * The {@link module:aerospike/policy|policy} module defines policies and
 * policy values that define the behavior of database operations.
 *
 * @summary {@link module:aerospike/policy|aerospike/policy} module
 * @static
 */
exports.policy = require('./policy')

// short-cuts to the policy classes defined under the policy module
exports.BasePolicy = require('./policy').BasePolicy
exports.ApplyPolicy = require('./policy').ApplyPolicy
exports.BatchPolicy = require('./policy').BatchPolicy
exports.OperatePolicy = require('./policy').OperatePolicy
exports.QueryPolicy = require('./policy').QueryPolicy
exports.ReadPolicy = require('./policy').ReadPolicy
exports.RemovePolicy = require('./policy').RemovePolicy
exports.ScanPolicy = require('./policy').ScanPolicy
exports.WritePolicy = require('./policy').WritePolicy
exports.BatchApplyPolicy = require('./policy').BatchApplyPolicy
exports.BatchReadPolicy = require('./policy').BatchReadPolicy
exports.BatchRemovePolicy = require('./policy').BatchRemovePolicy
exports.BatchWritePolicy = require('./policy').BatchWritePolicy
exports.CommandQueuePolicy = require('./policy').CommandQueuePolicy
exports.InfoPolicy = require('./policy').InfoPolicy
exports.ListPolicy = require('./policy').ListPolicy
exports.MapPolicy = require('./policy').MapPolicy

/**
 * The {@link module:aerospike/status|status} module contains a list of the
 * status codes returned by the Aerospike server.
 *
 * @summary {@link module:aerospike/status|aerospike/status} module
 */
exports.status = require('./status')

/**
 * The {@link module:aerospike/features|features} module contains a list of the
 * feature strings used by the Aerospike server.
 *
 * @summary {@link module:aerospike/features|aerospike/features} module
 */
exports.features = require('./features')

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
exports.AerospikeError = AerospikeError

/**
 * The main interface of the Aerospike client. Commands such as put, get or query
 * can be sent to an Aerospike database cluster using the Client class.
 *
 * @summary {@link Client} class
 */
exports.Client = require('./client')

/**
 * The Config class contains the settings for an Aerospike client instance,
 * including the list of seed hosts, default policies, and other settings.
 *
 * @summary {@link Config} class
 */
exports.Config = require('./config')

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

// ========================================================================
// Enumerations
// ========================================================================

/**
 * @summary Enumeration of auth modes
 *
 * @description Authentication mode when user/password is defined.
 *
 * Note: The Node.js client's TLS support is currently limited to Linux, and
 * therefore secure, external authentication (e.g. LDAP) is only supported on
 * Linux as well. External authentication can be used on macOS or Windows but
 * it will _not_ be secure!
 *
 * @enum {number}
 *
 * @property {number} INTERNAL - Use internal authentication only. Hashed
 * password is stored on the server. Do not send clear password. This is the
 * default.
 * @property {number} EXTERNAL - Use external authentication (like LDAP).
 * Specific external authentication is configured on server. If TLS is enabled,
 * send clear password on node login via TLS. Throws exception, if TLS is not
 * enabled.
 * @property {number} EXTERNAL_INSECURE - Use external authentication (like
 * LDAP). Specific external authentication is configured on server. Send
 * clear password on node login whether or not TLS is enabled. This mode
 * should only be used for testing purposes because it is not secure
 * authentication.
 * @property {number} AUTH_PKI - Use PKI authentication.
 * Authentication and authorization is based on a certificate.  No user name or
 * password needs to be configured.  Requires mTLS and a client certificate.
 *
 * @example <caption>Using external authentication mode, e.g. to use LDAP authentication</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * const config = {
 *   user: process.env.ADMIN_USER,
 *   password: process.env.ADMIN_PASSWORD,
 *   authMode: Aerospike.auth.EXTERNAL
 * }
 *
 *
 * @example <caption>Using PKI authentication mode</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * const config = {
 *   hosts: [
 *       { addr: 'bob-cluster-a', port: process.env.PORT}
 *   ],
 *   tls: {
 *      cafile: process.env.CAFILE,
 *      keyfile: process.env.KEYFILE,
 *      certfile: process.env.CERT,
 *   }
 *   authMode: Aerospike.auth.AUTH_PKI,
 * }
 *
 *
 * Aerospike.connect(config).then(async (client) => {
 *   const info = await client.infoAny().then(Aerospike.info.parse)
 *   console.info(info)
 *   client.close()
 * })
 */
exports.auth = as.auth

/**
 * @summary Enumeration of UDF types.
 *
 * @enum {number}
 *
 * @property {number} LUA - Lua (only supported UDF type at the moment)
 */
exports.language = as.language

/**
 * @summary Enumeration of log levels
 *
 * @enum {number}
 *
 * @property {number} OFF - Turn off logging
 * @property {number} ERROR - Log messages at ERROR level
 * @property {number} WARN - Log messages at WARN level or below
 * @property {number} INFO - Log messages at INFO level or below
 * @property {number} DEBUG - Log messages at DEBUG level or below
 * @property {number} TRACE - Log messages at TRACE level or below
 *
 * @see {@link Config#log} to set the log level for a specific client instance
 * @see {@link module:aerospike.setDefaultLogging} to set the global default
 * log settings, incl. logging of the Aerospike C client library.
 *
 * @example <caption>Setting log level for new client</caption>
 *
 * const Aerospike = require('aerospike')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   log: { level: Aerospike.log.DEBUG },
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   var key = new Aerospike.Key('test', 'demo', 'k1')
 *   client.put(key, {example: 31}, (error) => {
 *     if (error) throw error
 *     client.get(key, (error, record) => {
 *       console.info(record)
 *       client.close()
 *     })
 *   })
 * })
 */
exports.log = as.log

/**
 * @summary Enumertion of special TTL (time-to-live) values.
 *
 * @description Instead of specifying a TTL in seconds, you can set the TTL
 * to one of these special values when creating or updating a record.
 *
 * @enum {number}
 *
 * @property {number} NAMESPACE_DEFAULT - Use the default TTL value for the
 * namespace of the record.
 * @property {number} NEVER_EXIRE - Never expire the record.
 * @property {number} DONT_UPDATE - Update the record without changing the
 * record's TTL value. Requires server 3.10.1 or later.
 *
 * @example <caption>Use ttl.DONT_UPDATE to change the value of a record
 * bin without changing the records expiry time</caption>
 *
 * const Aerospike = require('aerospike')
 * const Key = Aerospike.Key
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   let key = new Key('test', 'demo', 'key1')
 *   let bins = { 'int': 1 }
 *   let meta = { ttl: 86400 }
 *
 *   client.put(key, bins, meta, (error) => {
 *     if (error) throw error
 *
 *     bins = { 'int': 2 }
 *     meta = { ttl: Aerospike.ttl.DONT_UPDATE }
 *     client.put(key, bins, meta, (error) => {
 *       if (error) throw error
 *
 *       client.get(key, (error, record) => {
 *         if (error) throw error
 *
 *         console.log(record.bins.int) // => 2
 *         console.log(record.ttl)      // => 86400
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
exports.ttl = as.ttl

/**
 * @summary Enumeration of job status codes.
 *
 * @enum {number}
 *
 * @property {number} UNDEF - The job status is undefined. This is likely due to the
 * status not being properly checked.
 * @property {number} INPROGRESS - The job is currently running.
 * @property {number} COMPLETED - The job completed successfully.
 *
 * @see {@link Job#infoCallback} returns the job status.
 */
exports.jobStatus = as.jobStatus

/**
 * @summary Enumeration of SI data types.
 *
 * @enum {number}
 *
 * @property {number} STRING - Values contained in the SI are strings.
 * @property {number} NUMERIC - Values contained in the SI are integers.
 * @property {number} GEO2DSPHERE - Values contained in the SI are GeoJSON values (points or polygons).
 *
 * @see {@link Client#createIndex}
 */
exports.indexDataType = as.indexDataType

/**
 * @summary Enumeration of SI types.
 *
 * @enum {number}
 *
 * @property {number} DEFAULT - Default SI type for bins
 * containing scalar values (i.e. integer, string).
 * @property {number} LIST - SI for bins containing
 * <a href="http://www.aerospike.com/docs/guide/cdt-list.html" title="Aerospike List Data Type">&uArr;Lists</a>;
 * The index will be built over the individual entries of the list.
 * @property {number} MAPKEYS - SI for bins containing
 * <a href="http://www.aerospike.com/docs/guide/cdt-map.html" title="Aerospike Maps Data Type">&uArr;Maps</a>;
 * The index will be built over the individual keys of the map entries.
 * @property {number} MAPVALUES - SI for bins containing
 * <a href="http://www.aerospike.com/docs/guide/cdt-map.html" title="Aerospike Maps Data Type">&uArr;Maps</a>;
 * The index will be built over the individual values of the map entries.
 *
 * @see {@link Client#createIndex}
 */
exports.indexType = as.indexType

// ========================================================================
// Functions
// ========================================================================

exports.print = require('./utils').print
exports.releaseEventLoop = require('./event_loop').releaseEventLoop

const Client = exports.Client

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
 * @param {connectCallback} [callback] - The function to call, once the client is connected to the cluster successfully.
 *
 * @return {?Promise} If no callback function is passed, the function returns
 * a Promise resolving to the connected client.
 * @example <caption>Connection can be established using the {@link module:aerospike|aerospike} module.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.connect(config, (err, client) => {
 *   console.log("Connected. Closing now.")
 *   client.close()
 * })
 *
 * @example <caption>Connection can also be established using the {@link Client} module.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * const client = Aerospike.client(config)
 * client.connect((err) => {
 *   console.log("Connected. Closing now.")
 *   client.close()
 * })
 *
 * @example <caption>A connection established using callback function.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *     process.exit()
 *   } else {
 *     // client is ready to accept commands
 *     console.log("Connected. Now closing connection.")
 *     client.close()
 *   }
 * })
 *
 * @example <caption>A connection established by returning a Promise.</caption>
 *
 * const Aerospike = require('aerospike')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 * Aerospike.connect(config)
 *   .then(client => {
 *     // client is ready to accept commands
 *     console.log("Connected. Now Closing Connection.")
 *     client.close()
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
  const client = this.client(config)
  if (typeof callback === 'function') {
    client.connect(callback)
    return client
  } else {
    return client.connect()
  }
}

/**
 * Sets the global, default log level and destination. The default log settings
 * are used for all new client instances, unless different log settings are
 * supplied in the client's configuration.
 *
 * The global log settings are also used to control the logging of the Aerospike
 * C client SDK which is included in the <code>aerospike</code> native add-on.
 * The C client SDK log settings are global and cannot be set separately per
 * {@link Client} instance.
 *
 * @param {Object} log
 * @param {Number} [log.level] - Log level; see {@link module:aerospike.log}
 * for details.
 * @param {Number} [log.file] - File descriptor returned by
 * <code>fs.open()</code> or one of <code>process.stdout.fd</code> or
 * <code>process.stderr.fd</code>.
 *
 * @since v3.1.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 * }
 *
 * Aerospike.setDefaultLogging({
 *   level: Aerospike.log.TRACE
 * })
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *     process.exit()
 *   } else {
 *     // client is ready to accept commands
 *     console.log("Connected. Now closing connection.")
 *     client.close()
 *   }
 * })
 */
exports.setDefaultLogging = function (logInfo) {
  as.setDefaultLogging(logInfo)
}

/**
 * @summary Configures the global command queue. (Disabled by default.)
 *
 * @description Note that there is only one instance of the command queue that
 * is shared by all client instances, even client instances connected to
 * different Aerospike clusters. The <code>setupGlobalCommandQueue</code>
 * method must be called before any client instances are connected.
 *
 * @param {CommandQueuePolicy} policy - Set of policy values governing the
 * behaviour of the global command queue.
 *
 * @see {@link CommandQueuePolicy} for more information about the use of the
 * command queue.
 */
exports.setupGlobalCommandQueue = function (policy) {
  EventLoop.setCommandQueuePolicy(policy)
}

/**
 * The {@link module:aerospike/batchType|aerospike/batch_type}
 * module contains a list of batch record types.
 *
 * @summary {@link module:aerospike/batchType|aerospike/batch_type} module
 */
exports.batchType = require('./batch_type')

// Set default log level
as.setDefaultLogging({
  level: as.log.WARN,
  file: process.stderr.fd
})
