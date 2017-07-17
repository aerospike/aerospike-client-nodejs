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

const path = require('path')
const util = require('util')
const EventEmitter = require('events')

const as = require('../build/Release/aerospike.node')
const AerospikeError = require('./aerospike_error')
const Config = require('./config')
const IndexJob = require('./index_job')
const UdfJob = require('./udf_job')
const LargeList = require('./llist')
const Query = require('./query')
const Scan = require('./scan')
const asEventLoop = require('./event_loop')
const operations = require('./operations')
const utils = require('./utils')

// number of client instances currently connected to any Aerospike cluster
var _connectedClients = 0

/**
 * @class Client
 * @classdesc Aerospike client
 *
 * @summary Construct a new Aerospike client instance.
 *
 * @param {Config} config - Configuration used to initialize the client.
 */
function Client (config) {
  if (asEventLoop.eventLoopReleased()) {
    throw new Error('Event loop resources have already been released! Call Client#close() with releaseEventLoop set to false to avoid this error.')
  }

  EventEmitter.call(this)

  // callback function for cluster events (node added/removed, etc.)
  var eventsCb = function (event) {
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
  }.bind(this)

  /**
   * @name Client#config
   *
   * @summary A copy of the configuration with which the client was initialized.
   *
   * @type {Config}
   */
  this.config = new Config(config)

  /** @private */
  this.as_client = as.client(this.config, eventsCb)

  /** @private */
  this.callbackHandler = Client.callbackHandler

  /** @private */
  this.connected = false

  /** @private */
  this.captureStackTraces = !!process.env.AEROSPIKE_DEBUG_STACKTRACES
}

util.inherits(Client, EventEmitter)

// The callback functions for the client commands take a variable number of
// arguments. Since use of the arguments variable can prevent V8 from
// optimizing the function we declare the max. number of arguments statically.
// See // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
// for more information.
Client.DefaultCallbackHandler = function (callback, err, arg1, arg2, arg3) {
  if (!callback) return
  if (err && err.code !== as.status.AEROSPIKE_OK) {
    var error = (err instanceof AerospikeError) ? err : AerospikeError.fromASError(err)
    return callback(error)
  } else {
    return callback(null, arg1, arg2, arg3)
  }
}

Client.LegacyCallbackHandler = function (callback, err, arg1, arg2, arg3) {
  if (!callback) return
  callback(err, arg1, arg2, arg3)
}

Client.callbackHandler = Client.DefaultCallbackHandler

Client.setCallbackHandler = function (callbackHandler) {
  this.callbackHandler = callbackHandler
}

/**
 * @function Client#LargeList
 *
 * @summary Creates a new LargeList instance, which is used to perform all LDT operations in the database.
 *
 * @param {Key} key - A key, used to locate the record in the cluster.
 * @param {string} binName - Name of the Large Data Type Bin.
 * @param {Client~WritePolicy} [writePolicy] - The Write Policy to use for this operation.
 * @param {string} [createModule] - Lua function name that initialized the list configuration parameters, pass null for default list.
 *
 * @deprecated since v2.4.4
 *
 * @see {@link LargeList}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Key = Aerospike.Key
 *
 * const key = new Key('test', 'demo', 'ldt_key')
 * const policy = { timeout: 1000 }
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   var llist = client.LargeList(key, 'ldtBinName', policy);
 *   llist.add('abc', (error) => {
 *     client.close()
 *   })
 * })
 */
Client.prototype.LargeList = function (key, binName, policy, createModule) {
  return new LargeList(this, key, binName, policy, createModule)
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
 * @param {Client~BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {Client~batchRecordsCallback} callback - The function to call when the operation completes, with the results of the batch operation.
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
 *         case status.AEROSPIKE_OK:
 *           // record found
 *           break
 *         case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
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
  this.sendCommand('batchExists', [keys, policy], callback)
}

/**
 * @function Client#batchGet
 *
 * @summary Reads a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of keys, used to locate the records in the cluster.
 * @param {Client~BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {Client~batchRecordsCallback} callback - The function to call when the operation completes, with the results of the batch operation.
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
 *         case status.AEROSPIKE_OK:
 *           // record found - bin values are available in result.record
 *           break
 *         case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
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
  this.sendCommand('batchGet', [keys, policy], callback)
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
 * @param {Client~BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {Client~batchRecordsCallback} callback - The function to call when the operation completes, with the results of the batch operation.
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
  this.sendCommand('batchRead', [records, policy], callback)
}

/**
 * @function Client#batchSelect
 *
 * @summary Reads a subset of bins for a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of keys, used to locate the records in the cluster.
 * @param {string[]} bins - An array of bin names for the bins to be returned for the given keys.
 * @param {Client~BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {Client~batchRecordCallback} callback - The function to call when the operation completes, with the results of the batch operation.
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
 *         case status.AEROSPIKE_OK:
 *           // record found - selected bins are available in result.record.
 *           break
 *         case status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
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
  this.sendCommand('batchSelect', [keys, bins, policy], callback)
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
  if (!this.isConnected(false)) return
  this.connected = false
  this.as_client.close()
  _connectedClients -= 1
  if (releaseEventLoop && _connectedClients === 0) {
    asEventLoop.releaseEventLoop()
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
 * It is recommended that you use the {@link module:aerospike.connect} method
 * to connect to the cluster. You will receive the client instance in the
 * {@link Client~connectCallback|connect callback} once the cluster connection
 * has been established and the client is ready to accept commands.
 *
 * @param {Client~connectCallback} callback - The function to call once the
 * client connection has been established successfully.
 *
 * @return {Client} Client object which was used to connect to the cluster.
 *
 * @see {@link Config#connTimeoutMs} - Initial host connection timeout in milliseconds.
 *
 * @example
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
  var self = this
  asEventLoop.registerASEventLoop()
  this.as_client.connect(function connectCb (err) {
    self.connected = (!err || err.code === as.status.AEROSPIKE_OK)
    if (self.connected) {
      _connectedClients += 1
    } else {
      self.as_client.close()
    }
    self.callbackHandler(callback, err, self)
  })
  return this
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
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~jobCallback} callback - The function to call when the operation completes.
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
 *   var namespace = 'test'
 *   var set = 'demo'
 *   var binName = 'rloc' // recent locations
 *   var indexName = 'recentLocationsIdx'
 *   var indexType = Aerospike.indexType.LIST
 *   var dataType = Aerospike.indexDataType.GEO2DSPHERE
 *   var options = { ns: namespace,
 *                   set: set,
 *                   bin: binName,
 *                   index: indexName,
 *                   type: indexType,
 *                   datatype: dataType }
 *   var policy = { timeout: 100 }
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
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  var args = [
    options.ns,
    options.set,
    options.bin,
    options.index,
    options.type || as.indexType.DEFAULT,
    options.datatype,
    policy || options.policy
  ]
  var self = this
  this.sendCommand('indexCreate', args, function (err) {
    var job = new IndexJob(self, options.ns, options.index)
    callback(err, job)
  })
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
 * @param {Client~InfoPolicy} [options.policy] - Deprecated - set policy using
 * <code>policy</code> parameter instead.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~jobCallback} callback - The function to call when the operation completes.
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
  options.datatype = as.indexType.NUMERIC
  this.createIndex(options, policy, callback)
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
 * @param {Client~InfoPolicy} [options.policy] - Deprecated - set policy using
 * <code>policy</code> parameter instead.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~jobCallback} callback - The function to call when the operation completes.
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
  options.datatype = as.indexType.STRING
  this.createIndex(options, policy, callback)
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
 * @param {Client~InfoPolicy} [options.policy] - Deprecated - set policy using
 * <code>policy</code> parameter instead.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~jobCallback} callback - The function to call when the operation completes.
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
  options.datatype = as.indexType.GEO2DSPHERE
  this.createIndex(options, policy, callback)
}

/**
 * @function Client#apply
 *
 * @summary Applies a User Defined Function (UDF) on a record in the database.
 *
 * @param {Key} key - The key, used to locate the record in the cluster.
 * @param {Object} udfArgs - Parameters used to specify which UDF function to execute.
 * @param {string} udfArgs.module - The name of the UDF module that was registered with the cluster.
 * @param {string} udfArgs.funcname - The name of the UDF function within the module.
 * @param {Array.<(number|string)>} udfArgs.args - List of arguments to pass to the UDF function.
 * @param {Client~ApplyPolicy} [policy] - The Apply Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation has completed with the results of the operation.
 *
 * @since v2.0
 *
 * @see {@link Client#udfRegister}
 *
 * @example
 *
 * var key = new Key('test', 'demo', value')
 * var udfArgs = {module: 'my_udf_module', funcname: 'my_udf_function', args: ['abc', 123, 4.5]}
 *
 * client.apply(key, udfArgs, function (error, res, key) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 *
 */
Client.prototype.apply = function (key, udfArgs, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  this.sendCommand('applyAsync', [key, udfArgs, policy], function (err, result) {
    callback(err, result, key)
  })
}

/**
 * @function Client#execute
 *
 * @summary Alias for {@link Client#apply} for backwards compatibility.
 *
 * @param {Key} key - The key, used to locate the record in the cluster.
 * @param {Object} udfArgs - Parameters used to specify which UDF function to execute.
 * @param {string} udfArgs.module - The name of the UDF module that was registered with the cluster.
 * @param {string} udfArgs.funcname - The name of the UDF function within the module.
 * @param {Array.<(number|string)>} udfArgs.args - List of arguments to pass to the UDF function.
 * @param {Client~ApplyPolicy} [policy] - The Apply Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation has completed with the results of the operation.
 *
 * @deprecated since v2.0 - renamed to {@link Client#apply}.
 */
Client.prototype.execute = Client.prototype.apply

/**
 * @function Client#exists
 *
 * @summary Checks the existance of a record in the database cluster.
 *
 * @param {Key} key - The key of the record to check for existance.
 * @param {Client~ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {Client~existsCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @example
 *
 * var key = new Key('test', 'demo', 'key1')
 * client.exists(key, function (error, metadata, key) {
 *   if (error && error.code === Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND) {
 *     // record does not exist
 *   } else if (error) {
 *     // handle error
 *   } else {
 *     // record exists
 *   }
 * })
 */
Client.prototype.exists = function exists (key, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  this.sendCommand('existsAsync', [key, policy], function (err, metadata) {
    callback(err, metadata, key)
  })
}

/**
 * @function Client#get
 *
 * @summary Using the key provided, reads a record from the database cluster.
 *
 * @param {Key} key - The key used to locate the record in the cluster.
 * @param {Client~ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @example
 *
 * var key = new Key('test', 'demo', 'key1')
 *
 * client.get(key, function (error, record, metadata) {
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
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  this.sendCommand('getAsync', [key, policy], function (err, record, metadata) {
    callback(err, record, metadata, key)
  })
}

/**
 * @function Client#indexCreateWait
 *
 * @summary Wait until an index create command succeeds in aerospike cluster.
 *
 * @description This function actively polls the Aerospike cluster until the
 * specified index is ready to be queried.
 *
 * This method has been deprecated in v2.0. Use the {@link
 * IndexJob#waitUntilDone} method on the {@link IndexJob} instance returned
 * by the {@link Client#createIndex} callback instead.
 *
 * @param {string} namespace - The namespace on which the index is created.
 * @param {string} index - The name of the index.
 * @param {number} pollInterval - The poll interval in milliseconds.
 * @param {Client~doneCallback} callback - The function to call when the operation completes which the result of the operation.
 *
 * @deprecated since v2.0 - use {@link IndexJob#waitUntilDone} instead.
 */
Client.prototype.indexCreateWait = function (namespace, index, pollInterval, callback) {
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var job = new IndexJob(this, namespace, index)
  job.waitUntilDone(pollInterval, callback)
}

/**
 * @function Client#indexRemove
 *
 * @summary Removes the specified index.
 *
 * @param {string} namespace - The namespace on which the index was created.
 * @param {string} index - The name of the index.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the operation completes with the result of the operation.
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
  this.sendCommand('indexRemove', [namespace, index, policy], callback)
}

/**
 * @function Client#info
 *
 * @summary Sends an info query to all nodes in the cluster.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, the cluster host(s) will send all
 * available info.
 *
 * The command queries each node in the cluster separately. The info callback
 * is called once for every cluster host that responds. The optional done callback
 * is called once all responses have been received.
 *
 * @param {string} [request] - The info request to send.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~infoCallback} infoCb - The function to call when an info response from a cluster host is received.
 * @param {Client~doneCallback} [doneCb] - The function to call once all info responses have been received and the operation completes.
 *
 * @deprecated since v2.4 - use {@link Client#infoAll} instead.
 *
 * @example <caption>Sending info command to whole cluster</caption>
 *
 * client.info('statistics', function (error, response, host) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // process info response from host
 *   }
 * }, function () {
 *   // all response have been processed
 * })
 */

/**
 * @function Client#info
 *
 * @summary Sends an info query to a specific cluster node.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, the cluster host will send all
 * available info.
 *
 * Please refer to the
 * <a href="http://www.aerospike.com/docs/reference/info">Info Command Reference</a>
 * for a list of all available info commands.
 *
 * @param {string} [request] - The info request to send.
 * @param {Object} host - The address of the cluster host to send the request to.
 * @param {string} host.addr - The IP address or host name of the host.
 * @param {number} [host.port=3000] - The port of the host.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~infoCallback} infoCb - The function to call when an info response from a cluster host is received.
 *
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @example <caption>Sending a 'statistics' info query to a specific host</caption>
 *
 * client.info('statistics', {addr: '127.0.0.1', port: 3000}, function (error, response) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.info = function (request, host, policy, infoCb, doneCb) {
  var argv = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))
  var argc = arguments.length
  if (typeof argv[argc - 2] === 'function' && typeof argv[argc - 1] === 'function') {
    doneCb = argv.pop()
    infoCb = argv.pop()
  } else if (typeof argv[argc - 1] === 'function') {
    infoCb = argv.pop()
  }

  if (typeof request === 'function') {
    request = null
  }

  if (typeof host === 'function') {
    host = null
  } else if (typeof host === 'object' && !(host.addr && host.port)) {
    policy = host
    host = null
  } else if (typeof host === 'string') {
    host = utils.parseHostString(host)
  }

  if (typeof policy === 'function') {
    policy = null
  }

  if (!this.isConnected(false)) {
    this.sendError(infoCb, 'Not connected.')
    if (doneCb) process.nextTick(doneCb)
    return
  }

  var self = this
  if (host) {
    this.as_client.info(request, host, policy, function asInfoCb (err, response) {
      self.callbackHandler(infoCb, err, response, host)
      doneCb()
    })
  } else {
    this.as_client.infoForeach(request, policy, function asInfoCb (err, response, host) {
      self.callbackHandler(infoCb, err, response, host)
    }, doneCb)
  }
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
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~infoCallback} callback - The function to call when an info
 * response from a cluster host is received.
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
  this.sendCommand('info', [request, null, policy], callback)
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
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~infoAllCallback} callback - The function to call when an info
 * response from all cluster hosts is received.
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }

  var error = null
  var info = []
  var self = this
  this.as_client.infoForeach(request, policy, function infoAllCb (err, response, host) {
    error = error || err
    info.push({host: host, info: response, error: err})
  }, function () {
    self.callbackHandler(callback, error, info)
  })
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
 * @param {Key} key - The key of the record.
 * @param {Object[]} operations - List of operations to perform on the record.
 * @param {Object} [metadata] - Meta data.
 * @param {Client~OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
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
 *       console.log('b', record['b']) // value of 'b' returned by the `read` operation
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
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  this.sendCommand('operateAsync', [key, operations, metadata, policy], function (err, record, metadata) {
    callback(err, record, metadata, key)
  })
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
 * @param {Client~OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
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
 * @param {Client~OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operations.prepend}
 */

/**
 * @function Client#incr
 *
 * @summary Shortcut for applying the {@link module:aerospike/operations.incr} operation to one or more record bins.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
 * @param {Object} [metadata] - Meta data.
 * @param {Client~OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @since v2.0
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operations.incr}
 */

// Shortcuts for some operations
;['append', 'prepend', 'incr'].forEach(function (op) {
  Client.prototype[op] = function (key, bins, metadata, policy, callback) {
    var ops = Object.keys(bins).map(function (bin) {
      return operations[op](bin, bins[bin])
    })
    this.operate(key, ops, metadata, policy, callback)
  }
})

/**
 * @function Client#add
 *
 * @summary Alias for {@link Client#incr} for backwards compatibility.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
 * @param {Object} [metadata] - Meta data.
 * @param {Client~OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @deprecated since v2.0 - renamed to {@link Client#incr}.
 */
Client.prototype.add = Client.prototype.incr

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
 * @param {object} record - A record object used for specifying the fields to store.
 * @param {object} [metadata] - Meta data.
 * @param {Client~WritePolicy} [policy] - The Write Policy to use for this operation.
 * @param {Client~writeCallback} callback - The function to call when the operation completes with the result of the operation.
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
Client.prototype.put = function (key, record, metadata, policy, callback) {
  if (typeof metadata === 'function') {
    callback = metadata
    metadata = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  this.sendCommand('putAsync', [key, record, metadata, policy], function (err) {
    callback(err, key)
  })
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
 * @param {Client~RemovePolicy} [policy] - The Remove Policy to use for this operation.
 * @param {Client~writeCallback} callback - The function to call when the operation completes with the results of the operation.
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
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  this.sendCommand('removeAsync', [key, policy], function (err) {
    callback(err, key)
  })
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
 * @param {Client~ReadPolicy} [policy] - The Read Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @example
 *
 * const Key = Aerospike.Key
 *
 * client.select(new Key('test', 'demo', 'key1'), ['name', 'age'], function (error, record, metadata, key) {
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
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  this.sendCommand('selectAsync', [key, bins, policy], function (err, record, metadata) {
    callback(err, record, metadata, key)
  })
}

/** @private */
Client.prototype.sendCommand = function (cmd, args, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }

  // C client will call the callback function synchronously under certain error
  // conditions; if we detect a synchronous callback we need to schedule the JS
  // callback to be called asynchronously anyway.
  var sync = true

  var cmdStackTrace = null
  if (this.captureStackTraces) {
    cmdStackTrace = new AerospikeError().stack
  }

  var self = this
  args.push(function (err, arg1, arg2, arg3) {
    if (err && cmdStackTrace) {
      err.stack = cmdStackTrace
    }
    if (sync) {
      // TODO: replace with process.nextTick once we drop support for Node.js v0.12
      setImmediate(self.callbackHandler, callback, err, arg1, arg2, arg3)
    } else {
      return self.callbackHandler(callback, err, arg1, arg2, arg3)
    }
  })

  this.as_client[cmd].apply(this.as_client, args)
  sync = false // if we get here before the cb was called the cb is async
}

/** @private */
Client.prototype.sendError = function (callback, error) {
  if (typeof error === 'string') {
    error = { message: error }
  }
  error.code = error.code || as.status.AEROSPIKE_ERR_CLIENT
  error.message = error.message || 'Client Error'
  Error.captureStackTrace(error)
  var self = this
  process.nextTick(function () {
    self.callbackHandler(callback, error)
  })
}

/**
 * @function Client#truncate
 *
 * @summary Removes records in specified namespace/set efficiently.
 *
 * @description This method is many orders of magnitude faster than deleting
 * records one at a time. Works with Aerospike Server version >= 3.12.
 *
 * @param {string} ns - Required namespace.
 * @param {string} set - Optional set name. Set to <code>null</code> to delete
 * all sets in namespace.
 * @param {number} before_nanos - Optionally delete records before given last
 * update time. Units are in nanoseconds since unix epoch (1970-01-01). If
 * specified, the value must be before the current time. Pass in 0 to delete
 * all records in namespace/set regardless of last udpate time.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the
 * operation completes with the result of the operation.
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
  this.sendCommand('truncate', [ns, set, beforeNanos, policy], callback)
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
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~jobCallback} callback - The function to call when the
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
  var client = this
  this.sendCommand('udfRegister', [udfPath, udfType, policy], function (err) {
    var module = path.basename(udfPath)
    var job = new UdfJob(client, module, UdfJob.REGISTER)
    callback(err, job)
  })
}

/**
 * @function Client#udfRegisterWait
 *
 * @summary Waits until a UDF module has been successfully registered on all
 * cluster nodes.
 *
 * @description This function periodically polls the cluster nodes to check for
 * the presence of a previously registered UDF module. It calls the provided
 * callback function once all nodes have successfully registered the module.
 *
 * This method has been deprecated. The {@link Client#udfRegister} method's
 * callback now returns a {@link UdfJob} instance. To wait for the job to
 * complete, use the {@link UdfJob#waitUntilDone} method.
 *
 * @param {string} udfModule - The name of the UDF module; this is the basename
 * of the UDF file registered with {@link Client#udfRegister}, i.e. the
 * filename, optionally including the file extension, but without the directory
 * name.
 * @param {number} pollInterval - Poll interval in milliseconds used to check
 * the presence of the on the cluster nodes.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the
 * operation completes with the result of the operation.
 *
 * @deprecated Since v2.6 - use {@link UdfJob#waitUntilDone} instead
 */
Client.prototype.udfRegisterWait = function (udfModule, pollInterval, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }
  var job = new UdfJob(this, udfModule, UdfJob.REGISTER)
  job.waitUntilDone(pollInterval, callback)
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
 * @param {string} udfModule - The basename of the UDF module, without the
 * local pathname but including the file extension (".lua").
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~jobCallback} callback - The function to call when the
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
  var client = this
  this.sendCommand('udfRemove', [udfModule, policy], function (err) {
    var job = new UdfJob(client, udfModule, UdfJob.UNREGISTER)
    callback(err, job)
  })
}

Client.prototype.updateLogging = function (logConfig) {
  this.as_client.updateLogging(logConfig)
}

/**
 * @typedef {Object} Client~ApplyPolicy
 *
 * A policy affecting the behavior of apply operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} commitLevel - Specifies the number of replicas required
 * to be committed successfully when writing before returning transaction succeeded.
 * @property {number} ttl - The time-to-live (expiration) of the record in seconds.
 * @property {boolean} [durableDelete=false] - Specifies whether a {@link
 * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone} should
 * be written in place of a record that gets deleted as a result of this
 * operation.
 *
 * @see {@link module:aerospike.policy} for supported policy values.
 */

/**
 * @typedef {Object} Client~ReadPolicy
 *
 * A policy affecting the behavior of read operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} replica - Specifies the replica to be consulted for the read.
 * @property {number} [consistencyLevel=Aerospike.policy.consistencyLevel.ONE] - Specifies
 * the number of replicas consulted when reading for the desired consistency guarantee.
 *
 * @see {@link module:aerospike.policy} for supported policy values.
 */

/**
 * @typedef {Object} Client~WritePolicy
 *
 * A policy affecting the behavior of write operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} compressionThreshold - Minimum record size beyond which it is compressed and sent to the server.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} gen - Specifies the behavior for the generation value.
 * @property {number} exists - Specifies the behavior for the existence of the record.
 * @property {number} commitLevel - Specifies the number of replicas required
 * to be committed successfully when writing before returning transaction succeeded.
 * @property {boolean} [durableDelete=false] - Specifies whether a {@link
 * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone} should
 * be written in place of a record that gets deleted as a result of this
 * operation.
 *
 * @see {@link module:aerospike.policy} for supported policy values.
 */

/**
 * @typedef {Object} Client~RemovePolicy
 *
 * A policy affecting the behavior of remove operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} generation - The generation of the record.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} gen - Specifies the behavior for the generation value.
 * @property {number} commitLevel - Specifies the number of replicas required
 * to be committed successfully when writing before returning transaction succeeded.
 * @property {boolean} [durableDelete=false] - Specifies whether a {@link
 * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone} should
 * be written in place of a record that gets deleted as a result of this
 * operation.
 *
 * @see {@link module:aerospike.policy} for supported policy values.
 */

/**
 * @typedef {Object} Client~BatchPolicy
 *
 * A policy affecting the behavior of batch operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} [consistencyLevel=Aerospike.policy.consistencyLevel.ONE] - Specifies
 * the number of replicas consulted when reading for the desired consistency guarantee.
 * @property {boolean} [allowInline=true] - Allow batch to be processed immediately in
 * the server's receiving thread when the server deems it to be appropriate. If
 * false, the batch will always be processed in separate transaction threads.
 * @property {boolean} [sendSetName=false] - Send set name field to server for
 * every key in the batch. This is only necessary when authentication is
 * enabled and security roles are defined on a per-set basis.
 */

/**
 * @typedef {Object} Client~OperatePolicy
 *
 * A policy affecting the behavior of operate operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} gen - Specifies the behavior for the generation value.
 * @property {number} replica - Specifies the replica to be consulted for the read.
 * @property {number} [consistencyLevel=Aerospike.policy.consistencyLevel.ONE] - Specifies
 * the number of replicas consulted when reading for the desired consistency guarantee.
 * @property {number} commitLevel - Specifies the number of replicas required
 * to be committed successfully when writing before returning transaction succeeded.
 * @property {boolean} [durableDelete=false] - Specifies whether a {@link
 * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone} should
 * be written in place of a record that gets deleted as a result of this
 * operation.
 *
 * @see {@link module:aerospike.policy} for supported policy values.
 */

/**
 * @typedef {Object} Client~InfoPolicy
 *
 * A policy affecting the behavior of info operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {boolean} sendAsIs - Send request without any further processing.
 * @property {boolean} checkBounds - Ensure the request is within allowable size limits.
 */

/**
 * @typedef {Object} Client~AdminPolicy
 *
 * A policy affecting the behavior of admin operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 */

/**
 * @typedef {Object} Client~ScanPolicy
 *
 * A policy affecting the behavior of scan operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {boolean} failOnClusterChange - Abort the scan if the cluster is not in a stable state.
 * @property {boolean} [durableDelete=false] - Specifies whether a {@link
 * http://www.aerospike.com/docs/guide/durable_deletes.html|tombstone} should
 * be written in place of a record that gets deleted as a result of this
 * operation.
 */

/**
 * @typedef {Object} Client~QueryPolicy
 *
 * A policy affecting the behavior of query operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 */

/**
 * @callback Client~doneCallback
 *
 * @summary Callback function called when an operation has completed.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 */

/**
 * @callback Client~recordCallback
 *
 * @summary Callback function returning a single record from the cluster.
 *
 * @description
 *
 * If the operation was successful, <code>null</code> will be returned for the
 * error parameter. If there was an error, <code>record</code> will be
 * <code>undefined</code> and the <code>error</code> paramter will provide more
 * information about the error.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Object} [record] - The record bins. Depending on the operation, the full record or a selection of bins will be returned.
 * @param {Object} [metadata] - The metadata of the record.
 * @param {Key} [key] - The key of the record.
 */

/**
 * @callback Client~writeCallback
 *
 * @summary Callback function called when a write operation on a single record has completed.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Key} key - The key of the record.
 */

/**
 * @callback Client~batchRecordsCallback
 *
 * @summary Callback function returning one or more records from the cluster.
 *
 * @description
 *
 * If the operation was successful, <code>null</code> will be returned for the
 * error parameter. If there was an error, <code>results</code> will be
 * <code>undefined</code> and the <code>error</code> paramter will provide more
 * information about the error.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Object[]} [results] - The results of the operation. Depending on the
 * specific operation, the full record, a selection of bins or just the meta
 * data for the record will be included in the results.
 * @param {number} results.status - The status of the record.
 * @param {Key} [results.key] - The key of the record.
 * @param {Object} [results.record] - The record bins read from the cluster.
 * @param {Object} results.metadata - The metadata of the record.
 */

/**
 * @callback Client~connectCallback
 *
 * @summary The function called when the client has successfully connected to the server.
 *
 * @description
 *
 * Once you receive the connect callback the client instance
 * returned in the callback is ready to accept commands for the Aerospike
 * cluster.
 *
 * If an error occurred while connecting to the cluster, the
 * <code>client</code> parameter will be <code>undefined</code> and the
 * <code>error</code> parameter will include more information about the error.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Client} [client] - Aerospike client instance.
 */

/**
 * @callback Client~infoCallback
 *
 * @summary The function called when a cluster host responds to an info query.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {string} [response] - The response string with the requested info.
 * @param {Object} [host] - The address of the host which send the response.
 * @param {string} host.addr - The ip address or host name of the host.
 * @param {number} host.port - The port number of the host.
 */

/**
 * @callback Client~infoAllCallback
 *
 * @summary The function called when all cluster nodes have responded to the
 * info request. Note that the error parameter in the callback will be
 * non-<code>null</code> if at least one of the cluster hosts responded with an
 * error to the info request. To check the status of the info requeset for each
 * individual cluster node, you need to check the list of responses returned in
 * the second parameter..
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Object[]} [responses] - The response string with the requested info.
 * @param {string} responses[].info - The response string with the requested info.
 * @param {?AerospikeError} responses[].error - The error code and message or <code>null</code> if the info request to this cluster host was successful.
 * @param {Object} responses[].host - The address of the host which send the response.
 * @param {string} responses[].host.addr - The ip address or host name of the host.
 * @param {number} responses[].host.port - The port number of the host.
 */

/**
 * @callback Client~jobCallback
 *
 * @summary Function called when a potentially long-running job has been started.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Job} [job] - Handle on a potentially long-running job which can be used to check for job completion.
 */

module.exports = Client
