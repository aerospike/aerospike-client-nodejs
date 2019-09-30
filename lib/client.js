// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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

const path = require('path')
const util = require('util')
const EventEmitter = require('events')

const as = require('bindings')('aerospike.node')
const AerospikeError = require('./error')
const Commands = require('./commands')
const Config = require('./config')
const EventLoop = require('./event_loop')
const IndexJob = require('./index_job')
const Query = require('./query')
const Scan = require('./scan')
const UdfJob = require('./udf_job')
const operations = require('./operations')
const utils = require('./utils')

// number of client instances currently connected to any Aerospike cluster
var _connectedClients = 0

// callback function for cluster events (node added/removed, etc.)
function eventsCallback (event) {
  /**
   * @event Client#nodeAdded
   * @type {object}
   * @property {string} nodeName - Name of the cluster node that triggered this event.
   * @property {string} nodeAddress - IP address & port of the cluster node that triggered this event.
   * @since v2.7.0
   */

  /**
   * @event Client#nodeRemoved
   * @type {object}
   * @property {string} nodeName - Name of the cluster node that triggered this event.
   * @property {string} nodeAddress - IP address & port of the cluster node that triggered this event.
   * @since v2.7.0
   */

  /**
   * @event Client#disconnected
   * @since v2.7.0
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   *
   * Aerospike.connect((error, client) => {
   *   if (error) throw error
   *
   *   client.on('disconnected', () => {
   *     console.warn('Client got disconnected from cluster')
   *   })
   *
   *  // client is now ready to accept commands, e.g. get/put/...
   *
   * })
   */
  this.emit(event.name, event)

  /**
   * @event Client#event
   * @description Instead of adding listeners for the {@link
   * event:Client#nodeAdded|nodeAdded}, {@link
   * event:Client#nodeRemoved|nodeRemoved} and {@link
   * event:Client#disconnected|disconnected} events, applications can also
   * subscribe to the <code>event</code> event to receive callbacks for any
   * kind of cluster event.
   *
   * @type {object}
   * @property {string} name - Name of the event.
   * @property {string} [nodeName] - Name of the cluster node that triggered this event.
   * @property {string} [nodeAddress] - IP address & port of the cluster node that triggered this event.
   * @since v2.7.0
   *
   * @example
   *
   * const Aerospike = require('aerospike')
   *
   * Aerospike.connect((error, client) => {
   *   if (error) throw error
   *
   *   client.on('event', (event) => {
   *     var now = new Date().toUTCString()
   *     console.info(now, event.name, event.nodeName)  // Example output:
   *                  // Thu, 13 Jul 2017 06:47:35 GMT nodeAdded BB94DC07D270009
   *                  // Thu, 13 Jul 2017 06:47:35 GMT nodeAdded C1D4DC0AD270002
   *                  // Thu, 13 Jul 2017 06:48:52 GMT nodeRemoved C1D4DC0AD270002
   *                  // Thu, 13 Jul 2017 06:49:08 GMT nodeRemoved BB94DC07D270009
   *                  // Thu, 13 Jul 2017 06:49:08 GMT disconnected
   *   })
   *
   *  // client is now ready to accept commands, e.g. get/put/...
   *
   * })
   */
  this.emit('event', event)
}

/**
 * @class Client
 * @classdesc Aerospike client
 *
 * @summary Construct a new Aerospike client instance.
 *
 * @param {Config} config - Configuration used to initialize the client.
 */
function Client (config) {
  EventEmitter.call(this)

  /**
   * @name Client#config
   *
   * @summary A copy of the configuration with which the client was initialized.
   *
   * @type {Config}
   */
  this.config = new Config(config)

  /** @private */
  this.as_client = as.client(this.config)

  /** @private */
  this.connected = false

  /**
   * @name Client#captureStackTraces
   *
   * @summary Set to <code>true</code> to enable capturing of debug stacktraces for
   * every database command.
   *
   * @description The client will capture a stacktrace before each database
   * command is executed, instead of capturing the stacktrace only when an
   * error is raised. This generally results in much more useful stacktraces
   * that include stackframes from the calling application issuing the database
   * command.
   *
   * **Note:** Enabling this feature incurs a significant performance overhead for
   * every database command. It is recommended to leave this feature disabled
   * in production environments.
   *
   * By default, the client will set this flag to true, if the
   * <code>AEROSPIKE_DEBUG_STACKTRACES</code> environment variable is set (to
   * any value).
   *
   * @type {boolean}
   * @default <code>true</code>, if
   * <code>process.env.AEROSPIKE_DEBUG_STACKTRACES</code> is set;
   * <code>false</code> otherwise.
   */
  this.captureStackTraces = !!process.env.AEROSPIKE_DEBUG_STACKTRACES
}

util.inherits(Client, EventEmitter)

/**
 * @private
 */
Client.prototype.asExec = function (cmd, args) {
  return this.as_client[cmd].apply(this.as_client, args)
}

/**
 * @function Client#getNodes
 *
 * @summary Returns a list of all cluster nodes known to the client.
 *
 * @return {Array.<{name: string, address: string}>} List of node objects
 *
 * @since v2.6.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (err) throw err
 *   console.log(client.getNodes()) // [ { name: 'BB9EB63B2005452', address: '127.0.0.1:3000' },
 *                                  //   { name: 'C1DEB63B2005452', address: '127.0.0.1:3100' } ]
 *   client.close()
 * })
 *
 */
Client.prototype.getNodes = function () {
  return this.as_client.getNodes()
}

/**
 * @function Client#addSeedHost
 *
 * @summary Adds a seed host to the cluster.
 *
 * @param {String} hostname - Hostname/IP address of the new seed host
 * @param {Number} [port=3000] - Port number; defaults to {@link Config#port} or 3000.
 *
 * @since v2.6.0
 */
Client.prototype.addSeedHost = function (hostname, port) {
  port = port || this.config.port
  this.as_client.addSeedHost(hostname, port)
}

/**
 * @function Client#removeSeedHost
 *
 * @summary Removes a seed host from the cluster.
 *
 * @param {String} hostname - Hostname/IP address of the seed host
 * @param {Number} [port=3000] - Port number; defaults to {@link Config#port} or 3000.
 *
 * @since v2.6.0
 */
Client.prototype.removeSeedHost = function (hostname, port) {
  port = port || this.config.port
  this.as_client.removeSeedHost(hostname, port)
}

/**
 * @function Client#batchExists
 *
 * @summary Checks the existence of a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of Keys used to locate the records in the cluster.
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @deprecated since v2.0 - use {@link Client#batchRead} instead.
 *
 * @example
 *
 * var keys = [
 *   new Key('test', 'demo', 'key1'),
 *   new Key('test', 'demo', 'key2'),
 *   new Key('test', 'demo', 'key3')
 * ]
 *
 * client.batchExists(keys, function (error, results) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     results.forEach(function (result) {
 *       switch (result.status) {
 *         case status.OK:
 *           // record found
 *           break
 *         case status.ERR_RECORD_NOT_FOUND:
 *           // record not found
 *           break
 *         default:
 *           // error while reading record
 *           break
 *       }
 *     })
 *   }
 * })
 */
Client.prototype.batchExists = function (keys, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchExists(this, [keys, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchGet
 *
 * @summary Reads a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of keys, used to locate the records in the cluster.
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @deprecated since v2.0 - use {@link Client#batchRead} instead.
 *
 * @example
 *
 * var keys = [
 *   new Key('test', 'demo', 'key1'),
 *   new Key('test', 'demo', 'key2'),
 *   new Key('test', 'demo', 'key3')
 * ]
 *
 * client.batchGet(keys, function (error, results) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     results.forEach(function (result) {
 *       switch (result.status) {
 *         case status.OK:
 *           // record found - bin values are available in result.record
 *           break
 *         case status.ERR_RECORD_NOT_FOUND:
 *           // record not found
 *           break
 *         default:
 *           // error while reading record
 *           break
 *       }
 *     })
 *   }
 * })
 */
Client.prototype.batchGet = function (keys, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchGet(this, [keys, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchRead
 *
 * @summary Read multiple records for specified batch keys in one batch call.
 *
 * @description
 *
 * This method allows different namespaces/bins to be requested for each key in
 * the batch. This method requires Aerospike Server version >= 3.6.0.
 *
 * @param {object[]} records - List of keys and bins to retrieve.
 * @param {Key} records[].key - Key to retrieve.
 * @param {string[]} [records[].bins] - List of bins to retrieve.
 * @param {boolean} [records[].read_all_bins] - Whether to retrieve all bins or
 * just the meta data of the record. If true, ignore <code>bins</code> and read
 * all bins; if false and <code>bins</code> is specified, read specified bins;
 * if false and <code>bins</code> is not specified, read only record meta data
 * (generation, expiration, etc.)
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @since v2.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * var batchRecords = [
 *   { key: new Aerospike.Key('test', 'demo', 'key1'), bins: ['i', 's'] },
 *   { key: new Aerospike.Key('test', 'demo', 'key2'), read_all_bins: true },
 *   { key: new Aerospike.Key('test', 'demo', 'key3') }
 * ]
 * Aerospike.connect(function (error, client) {
 *   if (error) throw error
 *   client.batchRead(batchRecords, function (error, results) {
 *     if (error) throw error
 *     results.forEach(function (result) {
 *       console.log(result)
 *     })
 *   })
 * })
 */
Client.prototype.batchRead = function (records, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchRead(this, [records, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#batchSelect
 *
 * @summary Reads a subset of bins for a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of keys, used to locate the records in the cluster.
 * @param {string[]} bins - An array of bin names for the bins to be returned for the given keys.
 * @param {BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {batchRecordsCallback} [callback] - The function to call when
 * the operation completes, with the results of the batch operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the batch operation.
 *
 * @deprecated since v2.0 - use {@link Client#batchRead} instead.
 *
 * @example
 *
 * var keys = [
 *   new Key('test', 'demo', 'key1'),
 *   new Key('test', 'demo', 'key2'),
 *   new Key('test', 'demo', 'key3')
 * ]
 * var bins = ['s', 'i']
 *
 * client.batchSelect(keys, bins, function (error, results) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     results.forEach(function (result) {
 *       switch (result.status) {
 *         case status.OK:
 *           // record found - selected bins are available in result.record.
 *           break
 *         case status.ERR_RECORD_NOT_FOUND:
 *           // record not found
 *           break
 *         default:
 *           // error while reading record
 *           break
 *       }
 *     })
 *   }
 * })
 */
Client.prototype.batchSelect = function (keys, bins, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.BatchSelect(this, [keys, bins, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#close
 *
 * @summary Closes the client connection to the cluster.
 *
 * @param {boolean} [releaseEventLoop=true] - Whether to release the event loop handle after the client is closed.
 *
 * @see module:aerospike.releaseEventLoop
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect(function (error, client) {
 *   if (error) throw error
 *   // client ready to receive commands
 *   client.close()
 * })
 */
Client.prototype.close = function (releaseEventLoop) {
  if (typeof releaseEventLoop === 'undefined') {
    releaseEventLoop = true
  }
  if (this.isConnected(false)) {
    this.connected = false
    this.as_client.close()
    _connectedClients -= 1
  }
  if (releaseEventLoop && _connectedClients === 0) {
    EventLoop.releaseEventLoop()
  }
}

/**
 * @function Client#connect
 *
 * @summary Establishes the connection to the cluster.
 *
 * @description
 *
 * Once the client is connected to at least one server node, it will start
 * polling each cluster node regularly to discover the current cluster status.
 * As new nodes are added to the cluster, or existing nodes are removed, the
 * client will establish or close down connections to these nodes. If the
 * client gets disconnected from the cluster, it will keep polling the last
 * known server endpoints, and will reconnect automatically if the connection
 * is reestablished.
 *
 * @param {connectCallback} [callback] - The function to call once the
 * client connection has been established successfully and the client is ready
 * to accept commands.
 *
 * @return {?Promise} If no callback function is passed, the function returns
 * a Promise resolving to the connected client.
 *
 * @throws {AerospikeError} if event loop resources have already been released.
 *
 * @see {@link Config#connTimeoutMs} - Initial host connection timeout in milliseconds.
 * @see {@link module:aerospike.connect} - Initial host connection timeout in milliseconds.
 * @see module:aerospike.releaseEventLoop
 *
 * @example <caption>Using callback function</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * var config = { ... }
 * var client = Aerospike.client(config)
 * client.connect((error) => {
 *   if (error) {
 *     console.error('Failed to connect to cluster: %s', error.message)
 *     process.exit()
 *   } else {
 *     // client is ready to accept commands
 *   }
 * })
 */
Client.prototype.connect = function (callback) {
  EventLoop.registerASEventLoop()

  const eventsCb = eventsCallback.bind(this)
  this.as_client.setupEventCb(eventsCb)

  const cmd = new Commands.Connect(this)
  return cmd.execute()
    .then(() => {
      this.connected = true
      _connectedClients += 1
      if (callback) callback(null, this)
      else return this
    })
    .catch(error => {
      this.as_client.close()
      if (callback) callback(error)
      else throw error
    })
}

/**
 * @function Client#createIndex
 *
 * @summary Creates a secondary index.
 *
 * @description
 *
 * Calling the <code>createIndex</code> method issues an
 * index create command to the Aerospike cluster and returns immediately. To
 * verify that the index has been created and populated with all the data use
 * the {@link IndexJob} instance returned by the callback.
 *
 * Aerospike currently supports indexing of strings, integers and geospatial
 * information in GeoJSON format.
 *
 * ##### String Indexes
 *
 * A string index allows for equality lookups. An equality lookup means that if
 * you query for an indexed bin with value "abc", then only records containing
 * bins with "abc" will be returned.
 *
 * ##### Integer Indexes
 *
 * An integer index allows for either equality or range lookups. An equality
 * lookup means that if you query for an indexed bin with value 123, then only
 * records containing bins with the value 123 will be returned. A range lookup
 * means that if you can query bins within a range. So, if your range is
 * (1...100), then all records containing a value in that range will be
 * returned.
 *
 * ##### Geo 2D Sphere Indexes
 *
 * A geo 2d sphere index allows either "contains" or "within" lookups. A
 * "contains" lookup means that if you query for an indexed bin with GeoJSON
 * point element, then only records containing bins with a GeoJSON element
 * containing that point will be returned. A "within" lookup means that if you
 * query for an indexed bin with a GeoJSON polygon element, then all records
 * containing bins with a GeoJSON element wholly contained within that polygon
 * will be returned.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {module:aerospike.indexDataType} options.datatype - The data type of
 * the index to be created, e.g. Numeric, String or Geo.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link module:aerospike.indexType} for enumeration of supported index types.
 * @see {@link module:aerospike.indexDataType} for enumeration of supported data types.
 * @see {@link IndexJob}
 *
 * @since v2.0
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   // create index over user's recent locations
 *   let namespace = 'test'
 *   let set = 'demo'
 *   let binName = 'rloc' // recent locations
 *   let indexName = 'recentLocationsIdx'
 *   let indexType = Aerospike.indexType.LIST
 *   let dataType = Aerospike.indexDataType.GEO2DSPHERE
 *   let options = { ns: namespace,
 *                   set: set,
 *                   bin: binName,
 *                   index: indexName,
 *                   type: indexType,
 *                   datatype: dataType }
 *   let policy = new Aerospike.InfoPolicy({ totalTimeout: 100 })
 *
 *   client.createIndex(options, policy, (error, job) => {
 *     if (error) throw error
 *
 *     // wait for index creation to complete
 *     var pollInterval = 100
 *     job.waitUntilDone(pollInterval, (error) => {
 *       if (error) throw error
 *       console.info('secondary index %s on %s was created successfully', indexName, binName)
 *       client.close()
 *     })
 *   })
 * })
 */
Client.prototype.createIndex = function (options, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const args = [
    options.ns,
    options.set,
    options.bin,
    options.index,
    options.type || as.indexType.DEFAULT,
    options.datatype,
    policy
  ]

  const cmd = new Commands.IndexCreate(this, args, callback)
  cmd.convertResult = () => new IndexJob(this, options.ns, options.index)
  return cmd.execute()
}

/**
 * @function Client#createIntegerIndex
 *
 * @summary Creates a secondary index of type Integer.
 *
 * @description This is a short-hand for calling {@link Client#createIndex}
 * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.NUMERIC</code>.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link Client#indexCreate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var binName = 'age'
 *   var indexName = 'ageIndex'
 *   var options = { ns: 'test',
 *                   set: 'demo',
 *                   bin: binName,
 *                   index: indexName }
 *
 *   client.createIntegerIndex(options, function (error) {
 *     if (error) throw error
 *     console.info('secondary index %s on %s was created successfully', indexName, binName)
 *     client.close()
 *   })
 * })
 */
Client.prototype.createIntegerIndex = function (options, policy, callback) {
  options.datatype = as.indexDataType.NUMERIC
  return this.createIndex(options, policy, callback)
}

/**
 * @function Client#createStringIndex
 *
 * @summary Creates a secondary index of type String.
 *
 * @description This is a short-hand for calling {@link Client#createIndex}
 * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.STRING</code>.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link Client#indexCreate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var binName = 'name'
 *   var indexName = 'nameIndex'
 *   var options = { ns: 'test',
 *                   set: 'demo',
 *                   bin: binName,
 *                   index: indexName }
 *
 *   client.createStringIndex(options, function (error) {
 *     if (error) throw error
 *     console.info('secondary index %s on %s was created successfully', indexName, binName)
 *     client.close()
 *   })
 * })
 */
Client.prototype.createStringIndex = function (options, policy, callback) {
  options.datatype = as.indexDataType.STRING
  return this.createIndex(options, policy, callback)
}

/**
 * @function Client#createGeo2DSphereIndex
 *
 * @summary Creates a secondary, geospatial index.
 *
 * @description This is a short-hand for calling {@link Client#createIndex}
 * with the <code>datatype</code> option set to <code>Aerospike.indexDataType.GEO2DSPHERE</code>.
 *
 * @param {Object} options - Options for creating the index.
 * @param {string} options.ns - The namespace on which the index is to be created.
 * @param {string} options.set - The set on which the index is to be created.
 * @param {string} options.bin - The name of the bin which values are to be indexed.
 * @param {string} options.index - The name of the index to be created.
 * @param {module:aerospike.indexType} [options.type] - Type of index to be
 * created based on the type of values stored in the bin. This option needs to
 * be specified if the bin to be indexed contains list or map values and the
 * individual entries of the list or keys/values of the map should be indexed.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that will resolve to an {@link IndexJob} instance.
 *
 * @see {@link Client#indexCreate}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var binName = 'location'
 *   var indexName = 'locationIndex'
 *   var options = { ns: 'test',
 *                   set: 'demo',
 *                   bin: binName,
 *                   index: indexName }
 *
 *   client.createGeo2DSphereIndex(options, function (error) {
 *     if (error) throw error
 *     console.info('secondary index %s on %s was created successfully', indexName, binName)
 *     client.close()
 *   })
 * })
 */
Client.prototype.createGeo2DSphereIndex = function (options, policy, callback) {
  options.datatype = as.indexDataType.GEO2DSPHERE
  return this.createIndex(options, policy, callback)
}

/**
 * @function Client#apply
 *
 * @summary Applies a User Defined Function (UDF) on a record in the database.
 * @description Use this function to apply a
 * <a href="http://www.aerospike.com/docs/guide/record_udf.html">&uArr;Record UDF</a>
 * on a single record and return the result of the UDF function call. Record
 * UDFs can be used to augment both read and write behavior.
 *
 * For additional information please refer to the section on
 * <a href="https://www.aerospike.com/docs/udf/developing_record_udfs.html">&uArr;Developing Record UDFs</a>
 * in the Aerospike technical documentation.
 *
 * @param {Key} key - The key, used to locate the record in the cluster.
 * @param {Object} udfArgs - Parameters used to specify which UDF function to execute.
 * @param {string} udfArgs.module - The name of the UDF module that was registered with the cluster.
 * @param {string} udfArgs.funcname - The name of the UDF function within the module.
 * @param {Array.<(number|string)>} udfArgs.args - List of arguments to pass to the UDF function.
 * @param {ApplyPolicy} [policy] - The Apply Policy to use for this operation.
 * @param {valueCallback} [callback] - This function will be called with the
 * result returned by the Record UDF function call.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to the value returned by the UDF.
 *
 * @since v2.0
 *
 * @see {@link Client#udfRegister} to register a UDF module to use with <code>apply()</code>.
 * @see {@link Query#background} and {@link Scan#background} to apply a Record UDF function to multiple records instead.
 *
 * @example
 *
 * var key = new Key('test', 'demo', value')
 * var udfArgs = {
 *   module: 'my_udf_module',
 *   funcname: 'my_udf_function',
 *   args: ['abc', 123, 4.5]
 * }
 *
 * client.apply(key, udfArgs, (error, result) => {
 *   if (error) throw error
 *
 *   console.log('Result of calling my_udf_function:', result)
 * })
 *
 */
Client.prototype.apply = function (key, udfArgs, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Apply(this, [key, udfArgs, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#exists
 *
 * @summary Checks the existance of a record in the database cluster.
 *
 * @param {Key} key - The key of the record to check for existance.
 * @param {ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {valueCallback} [callback] - The function to call when the
 * operation completes; the passed value is <code>true</code> if the record
 * exists or <code>false</code> otherwise.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to <code>true</code> if the record exists or
 * <code>false</code> otherwise.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * let key = new Aerospike.Key('test', 'demo', 'key1')
 * Aerospike.connect()
 *   .then(client => {
 *     return client.exists(key)
 *       .then(exists => console.info('Key "%s" exists: %s', key.key, exists))
 *       .then(() => client.close())
 *       .catch(error => {
 *         console.error('Error checking existance of key:', error)
 *         client.close()
 *       })
 *   })
 *   .catch(error => {
 *     console.error('Error connecting to cluster:', error)
 *   })
 */
Client.prototype.exists = function exists (key, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Exists(this, [key, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#get
 *
 * @summary Using the key provided, reads a record from the database cluster.
 *
 * @param {Key} key - The key used to locate the record in the cluster.
 * @param {ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation; if no callback
 * function is provided, the method returns a <code>Promise<code> instead.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a <code>Promise</code> that resolves to a {@link Record}.
 *
 * @example
 *
 * var key = new Key('test', 'demo', 'key1')
 *
 * client.get(key, (error, record) => {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.get = function (key, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Get(this, key, [policy], callback)
  return cmd.execute()
}

/**
 * @function Client#indexRemove
 *
 * @summary Removes the specified index.
 *
 * @param {string} namespace - The namespace on which the index was created.
 * @param {string} index - The name of the index.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {doneCallback} [callback] - The function to call when the
 * operation completes with the result of the operation.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a <code>Promise</code> that resolves once the operation completes.
 *
 * @example
 *
 * client.indexRemove('test', 'index', function (error) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * });
 */
Client.prototype.indexRemove = function (namespace, index, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.IndexRemove(this, [namespace, index, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#info
 *
 * @summary Sends an info query to a specific cluster node.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If <code>null</code>, the cluster host will send all available
 * info.
 *
 * Please refer to the
 * <a href="http://www.aerospike.com/docs/reference/info">Info Command Reference</a>
 * for a list of all available info commands.
 *
 * @param {?String} request - The info request to send.
 * @param {Object} host - The address of the cluster host to send the request to.
 * @param {string} host.addr - The IP address or host name of the host.
 * @param {number} [host.port=3000] - The port of the host.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {infoCallback} [callback] - The function to call when an info response from a cluster host is received.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @deprecated since v3.11.0 - use {@link Client#infoNode} or {@link Client#infoAny} instead.
 *
 * @example <caption>Sending a 'statistics' info query to a single host</caption>
 *
 * client.info('statistics', {addr: '127.0.0.1', port: 3000}, function (error, response) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.info = function (request, host, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  if (typeof host === 'string') {
    host = utils.parseHostString(host)
  }

  const cmd = new Commands.InfoHost(this, [request, host, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#infoAny
 *
 * @summary Sends an info query to a single, randomly selected cluster node.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, the cluster host(s) will send all
 * available info.
 *
 * @param {string} [request] - The info request to send.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {infoCallback} [callback] - The function to call once the node
 * returns the response to the info command; if no callback function is
 * provided, the method returns a <code>Promise<code> instead.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @since v2.4.0
 *
 * @example <caption>Sending 'statistics' info command to random cluster node</caption>
 *
 * client.infoAny('statistics', function (error, response) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.infoAny = function (request, policy, callback) {
  if (typeof request === 'function') {
    callback = request
    request = null
    policy = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.InfoAny(this, [request, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#infoAll
 *
 * @summary Sends an info query to all nodes in the cluster and collects the
 * results.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, the cluster hosts will send all
 * available info.
 *
 * @param {string} [request] - The info request to send.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {infoCallback} [callback] - The function to call once all nodes have
 * returned a response to the info command; if no callback function is
 * provided, the method returns a <code>Promise<code> instead.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @since v2.3.0
 *
 * @example <caption>Sending info command to whole cluster</caption>
 *
 * client.infoAll('statistics', function (error, responses) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     responses.forEach((function (info) {
 *       // handle response
 *     })
 *   }
 * })
 */
Client.prototype.infoAll = function (request, policy, callback) {
  if (typeof request === 'function') {
    callback = request
    request = null
    policy = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.InfoForeach(this, [request, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#infoNode
 *
 * @summary Sends an info query to a single node in the cluster.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, the cluster host(s) will send all
 * available info.
 *
 * @param {?string} request - The info request to send.
 * @param {object} node - The node to send the request to.
 * @param {string} node.name - The node name.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {infoCallback} [callback] - The function to call once the node
 * returns the response to the info command; if no callback function is
 * provided, the method returns a <code>Promise<code> instead.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @since v3.11.0
 *
 * @example <caption>Sending 'statistics' info command to specific cluster node</caption>
 *
 * const node = client.getNodes().pop()
 * client.infoNode('statistics', node).then(info => {
 *   // process info
 * })
 */
Client.prototype.infoNode = function (request, node, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.InfoNode(this, [request, node.name, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#isConnected
 *
 * @summary Is client connected to any server nodes.
 *
 * @param {boolean} [checkTenderErrors=true] - Whether to consider a server
 * node connection that has had 5 consecutive info request failures during
 * cluster tender.
 *
 * @returns {boolean} <code>true</code> if the client is currently connected to any server nodes.
 *
 * @since v2.0
 */
Client.prototype.isConnected = function (checkTenderErrors) {
  if (typeof checkTenderErrors === 'undefined') {
    checkTenderErrors = true
  }
  var connected = this.connected
  if (connected && checkTenderErrors) {
    connected = this.as_client.isConnected()
  }
  return connected
}

/**
 * @function Client#operate
 *
 * @summary Performs multiple operations on a single record.
 *
 * @description Operations can be created using the methods in one of the
 * following modules:
 * * {@link module:aerospike/operations} - General operations on all types.
 * * {@link module:aerospike/lists} - Operations on CDT List values.
 * * {@link module:aerospike/maps} - Operations on CDT Map values.
 * * {@link module:aerospike/bitwise} - Operations on Bytes values.
 *
 * @param {Key} key - The key of the record.
 * @param {module:aerospike/operations~Operation[]} operations - List of operations to perform on the record.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation; if no callback
 * function is provided, the method returns a <code>Promise<code> instead.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 *
 * var key = new Aerospike.Key('test', 'demo', 'mykey1')
 * var ops = [
 *   op.append('a', 'xyz'),
 *   op.incr('b', 10),
 *   op.read('b')
 * ]
 *
 * Aerospike.connect(function (error, client) {
 *   client.operate(key, ops, function (error, record) {
 *     if (error) {
 *       // handle failure
 *     } else {
 *       console.log('b', record.bins['b']) // value of 'b' returned by the `read` operation
 *     }
 *   })
 *   client.close()
 * })
 */
Client.prototype.operate = function (key, operations, metadata, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof metadata === 'function') {
    callback = metadata
    metadata = null
  }

  const cmd = new Commands.Operate(this, key, [operations, metadata, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#append
 *
 * @summary Shortcut for applying the {@link
 * module:aerospike/operations.append} operation to one or more record bins.
 *
 * @description This function works on bins of type string or bytes; to append
 * a new value (of any type) to a bin containing a list of existing values, use
 * the {@link module:aerospike/lists.append} operation instead.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the
 * corresponding values to append to the bin value. The bins must contain
 * either string or byte array values and the values to append must be of the
 * same type.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the opertion.
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operations.append}
 */

/**
 * @function Client#prepend
 *
 * @summary Shortcut for applying the {@link module:aerospike/operations.prepend} operation to one or more record bins.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to prepend to the bin value.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the opertion.
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operations.prepend}
 */

/**
 * @function Client#add
 *
 * @summary Shortcut for applying the {@link module:aerospike/operations.add} operation to one or more record bins.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the opertion.
 *
 * @since v2.0
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operations.incr}
 */

// Shortcuts for some operations
;['append', 'prepend', 'add'].forEach(op => {
  Client.prototype[op] = function (key, bins, metadata, policy, callback) {
    const ops = Object.keys(bins).map(bin => operations[op](bin, bins[bin]))
    return this.operate(key, ops, metadata, policy, callback)
  }
})

/**
 * @function Client#incr
 *
 * @summary Alias for {@link Client#add}.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
 * @param {Object} [metadata] - Meta data.
 * @param {OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation.
 *
 * @returns {?Promise} - If no callback function is passed, the function
 * returns a Promise that resolves to the results of the opertion.
 */
Client.prototype.incr = Client.prototype.add

/**
 * @function Client#put
 *
 * @summary Writes a record to the database cluster.
 *
 * @description
 * If the record exists, it modifies the record with bins provided.
 * To remove a bin, set its value to <code>null</code>.
 *
 * __Note:__ The client does not perform any automatic data type conversions.
 * Attempting to write an unsupported data type (e.g. boolean) into a record
 * bin will cause an error to be returned. Setting an <code>undefined</code>
 * value will also cause an error.
 *
 * @param {Key} key - The key of the record.
 * @param {object} bins - A record object used for specifying the fields to store.
 * @param {object} [meta] - Meta data.
 * @param {WritePolicy} [policy] - The Write Policy to use for this operation.
 * @param {writeCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @example
 *
 * const Key = Aerospike.Key
 *
 * var key = new Key('test', 'demo', 'key1')
 * var rec = {
 *   a: 'xyz',
 *   b: 123
 * }
 *
 * client.put(key, rec, function (error, key) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.put = function (key, bins, meta, policy, callback) {
  if (typeof meta === 'function') {
    callback = meta
    meta = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Put(this, key, [bins, meta, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#query
 *
 * @summary Creates a new {@link Query} instance, which is used to define query
 * in the database.
 *
 * @param {string} ns - The namespace to be queried.
 * @param {string} set - The set on which the query is to be executed.
 * @param {object} [options] - Query parameters. See {@link Query} constructor for details.
 *
 * @see {@link Query}
 *
 * @example
 *
 * const filter = Aerospike.filter
 *
 * var statement = {}
 * statment.filters: [filter.equal('color', 'blue')]
 *
 * var query = client.query(ns, set, statment)
 * var stream = query.execute()
 */
Client.prototype.query = function (ns, set, options) {
  options = options || {}
  if (!this.isConnected()) {
    throw new AerospikeError('Not connected.')
  }
  return new Query(this, ns, set, options)
}

/**
 * @function Client#remove
 *
 * @summary Removes a record with the specified key from the database cluster.
 *
 * @param {Key} key - The key of the record.
 * @param {RemovePolicy} [policy] - The Remove Policy to use for this operation.
 * @param {writeCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @example
 *
 * const Key = Aerospike.Key

 * client.remove(new Key('test', 'demo', 'key1'), function (error, key) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.remove = function (key, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Remove(this, key, [policy], callback)
  return cmd.execute()
}

/**
 * @function Client#scan
 *
 * @summary Creates a new {@link Scan} instance in order to execute a database
 * scan using the Scan API.
 *
 * @see {@link Scan} constructor for options that can be used to initialize a
 * new instance.
 *
 * @param {string} ns - The namescape.
 * @param {string} set - The name of a set.
 * @param {object} [options] - Scan parameters. See {@link Scan} constructor for details.
 *
 * @since v2.0
 */
Client.prototype.scan = function (ns, set, options) {
  options = options || {}
  if (!this.isConnected()) {
    throw new AerospikeError('Not connected.')
  }
  return new Scan(this, ns, set, options)
}

/**
 * @function Client#select
 *
 * @summary Retrieves selected bins for a record of given key from the database cluster.
 *
 * @param {Key} key - The key of the record.
 * @param {string[]} bins - A list of bin names for the bins to be returned.
 * @param {ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {recordCallback} [callback] - The function to call when the
 * operation completes with the results of the operation; if no callback
 * function is provided, the method returns a <code>Promise<code> instead.
 *
 * @example
 *
 * var key = new Key('test', 'demo', 'key1')
 *
 * client.select(key, ['name', 'age'], (error, record) => {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.select = function (key, bins, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Select(this, key, [bins, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#truncate
 *
 * @summary Removes records in specified namespace/set efficiently.
 *
 * @description This method is many orders of magnitude faster than deleting
 * records one at a time. It requires Aerospike Server version 3.12 or later.
 *
 * @param {string} ns - Required namespace.
 * @param {string} set - Optional set name. Set to <code>null</code> to delete
 * all sets in namespace.
 * @param {number} before_nanos - Optionally delete records before given last
 * update time. Units are in nanoseconds since unix epoch (1970-01-01). If
 * specified, the value must be before the current time. Pass in 0 to delete
 * all records in namespace/set regardless of last udpate time.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {doneCallback} callback - The function to call when the
 * operation completes with the result of the operation.
 *
 * @see https://www.aerospike.com/docs/reference/info#truncate
 */
Client.prototype.truncate = function (ns, set, beforeNanos, policy, callback) {
  if (typeof set === 'function') {
    callback = set
    set = null
    beforeNanos = 0
    policy = null
  } else if (typeof beforeNanos === 'function') {
    callback = beforeNanos
    beforeNanos = 0
    policy = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.Truncate(this, [ns, set, beforeNanos, policy], callback)
  return cmd.execute()
}

/**
 * @function Client#udfRegister
 *
 * @summary Registers a UDF module with the database cluster.
 *
 * @description This method loads a Lua script from the local filesystem into
 * the Aerospike database cluster and registers it for use as a UDF module. The
 * client uploads the module to a single cluster node. It then gets distributed
 * within the whole cluster automatically. The callback function is called once
 * the initial upload into the cluster has completed (or if an error occurred
 * during the upload). One of the callback parameters is a {@link UdfJob}
 * instance that can be used to verify that the module has been registered
 * successfully on the entire cluster.
 *
 * @param {string} path - The file path to the Lua script to load into the server.
 * @param {number} [udfType] - Language of the UDF script. Lua is the default
 * and only supported scripting language for UDF modules at the moment; ref.
 * {@link module:aerospike.language}.
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} callback - The function to call when the
 * operation completes with the result of the operation.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var path = './udf/my_module.lua'
 *   client.udfRegister(path, (error, job) => {
 *     if (error) throw error
 *
 *     job.waitUntilDone(100, (error) => {
 *       if (error) throw error
 *
 *       // UDF module was successfully registered on all cluster nodes
 *
 *       client.close()
 *     })
 *   })
 * })
 */
Client.prototype.udfRegister = function (udfPath, udfType, policy, callback) {
  if (typeof udfType === 'function') {
    callback = udfType
    udfType = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  }
  if (typeof udfType === 'object') {
    policy = udfType
    udfType = null
  }

  const cmd = new Commands.UdfRegister(this, [udfPath, udfType, policy], callback)
  cmd.convertResult = () => {
    const module = path.basename(udfPath)
    return new UdfJob(this, module, UdfJob.REGISTER)
  }
  return cmd.execute()
}

/**
 * @function Client#stats
 *
 * @summary Returns runtime stats about the client instance.
 *
 * @returns {ClientStats} client stats
 *
 * @since v3.8.0
 *
 * @example
 * require('aerospike').connect().then(client => {
 *   const stats = client.stats()
 *   console.info(stats) // => { commands: { inFlight: 0, queued: 0 },
 *                       //      nodes:
 *                       //       [ { name: 'BB94DC08D270008',
 *                       //           syncConnections: { inPool: 1, inUse: 0 },
 *                       //           asyncConnections: { inPool: 0, inUse: 0 } },
 *                       //         { name: 'C1D4DC08D270008',
 *                       //           syncConnections: { inPool: 0, inUse: 0 },
 *                       //           asyncConnections: { inPool: 0, inUse: 0 } } ] }
 *   client.close()
 * })
 */
Client.prototype.stats = function () {
  return this.as_client.getStats()
}

/**
 * @function Client#udfRemove
 *
 * @summary Removes a UDF module from the cluster.
 *
 * @description The info command to deregister the UDF module is sent to a
 * single cluster node by the client. It then gets distributed within the whole
 * cluster automatically. The callback function is called once the initial info
 * command has succeeded (or if an error occurred). One of the callback
 * parameters is a {@link UdfJob} instance that can be used to verify that the
 * module has been removed successfully from the entire cluster.
 *
 * For server versions 4.5.0 and before, trying to delete an UDF module that
 * does not exist on the server, will return an error. Starting with server
 * version 4.5.1, the server no longer returns an error and the command will
 * succeed.
 *
 * @param {string} udfModule - The basename of the UDF module, without the
 * local pathname but including the file extension (".lua").
 * @param {InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {jobCallback} callback - The function to call when the
 * operation completes which the result of the operation.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var module = 'my_module.lua'
 *   client.udfRemove(module, (error, job) => {
 *     if (error) throw error
 *
 *     job.waitUntilDone(100, (error) => {
 *       if (error) throw error
 *
 *       // UDF module was successfully removed from all cluster nodes
 *
 *       client.close()
 *     })
 *   })
 * })
 */
Client.prototype.udfRemove = function (udfModule, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.UdfRemove(this, [udfModule, policy], callback)
  cmd.convertResult = () => new UdfJob(this, udfModule, UdfJob.UNREGISTER)
  return cmd.execute()
}

Client.prototype.updateLogging = function (logConfig) {
  this.as_client.updateLogging(logConfig)
}

module.exports = Client
