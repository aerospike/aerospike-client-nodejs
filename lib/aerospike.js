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

// short-cuts to the policy classes defined under the policy module
exports.WritePolicy = exports.policy.WritePolicy
exports.ReadPolicy = exports.policy.ReadPolicy
exports.BatchPolicy = exports.policy.BatchPolicy

/**
 * The {@link module:aerospike/status|status} module contains a list of the
 * status codes returned by the Aerospike server.
 *
 * @summary {@link module:aerospike/status|aerospike/status} module
 */
exports.status = require('./status')

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
exports.AerospikeError = require('./error')

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

// ========================================================================
// Enumerations
// ========================================================================

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
