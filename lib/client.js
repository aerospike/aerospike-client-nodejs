// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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

const as = require('../build/Release/aerospike.node')
const AerospikeError = require('./aerospike_error.js')
const LargeList = require('./llist.js')
const Query = require('./query.js')
const operator = require('./operator.js')
const utils = require('./utils.js')

// number of client instances currently connected to any Aerospike cluster
var _connectedClients = 0

/**
 * @class Client
 * @classdesc Aerospike client
 *
 * @summary Construct a new Aerospike client instance.
 *
 * @param {Client~Config} config - Configuration used to initialize the client.
 */
function Client (aerospike, config) {
  if (aerospike.eventLoopReleased()) {
    throw new Error('Event loop resources have already been released! Call Client#close() with releaseEventLoop set to false to avoid this error.')
  }
  config = config || {}
  config.hosts = config.hosts || process.env.AEROSPIKE_HOSTS || 'localhost'
  if (typeof config.hosts === 'string') {
    config.hosts = utils.parseHostsString(config.hosts)
  }

  /** @private */
  this.aerospike = aerospike

  /**
   * @name Client#config
   *
   * @summary A copy of the configuration with which the client was initialized.
   *
   * @type {Client~Config}
   */
  this.config = config

  /** @private */
  this.as_client = as.client(config)

  /** @private */
  this.callbackHandler = Client.callbackHandler

  /** @private */
  this.connected = false
}

Client.DefaultCallbackHandler = function (callback, err) {
  if (!callback) return
  if (err && err.code !== as.status.AEROSPIKE_OK) {
    var error = AerospikeError.fromASError(err)
    callback(error)
  } else {
    var args = Array.prototype.slice.call(arguments, 2)
    args.unshift(null)
    callback.apply(undefined, args)
  }
}

Client.LegacyCallbackHandler = function (callback, err) {
  if (!callback) return
  var args = Array.prototype.slice.call(arguments, 1)
  callback.apply(undefined, args)
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
 * @function Client#batchExists
 *
 * @summary Checks the existence of a batch of records from the database cluster.
 *
 * @param {Key[]} keys - An array of Keys used to locate the records in the cluster.
 * @param {Client~BatchPolicy} [policy] - The Batch Policy to use for this operation.
 * @param {Client~batchRecordsCallback} callback - The function to call when the operation completes, with the results of the batch operation.
 *
 * @deprecated in v2.0
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.batchExists(keys, policy, function batchExistsCb (err, results) {
    self.callbackHandler(callback, err, results)
  })
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
 * @deprecated in v2.0
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.batchGet(keys, policy, function batchGetCb (err, results) {
    self.callbackHandler(callback, err, results)
  })
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
 * @since v2.0.0
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
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.batchRead(records, policy, function batchReadCb (err, results) {
    self.callbackHandler(callback, err, results)
  })
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
 * @deprecated in v2.0
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.batchSelect(keys, bins, policy, function batchSelectCb (err, results) {
    self.callbackHandler(callback, err, results)
  })
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
    this.aerospike.releaseEventLoop()
  }
}

/**
 * @function Client#connect
 *
 * @summary Establishes the connection to the cluster.
 *
 * @description
 *
 * ###### Usage Notes:
 * It is recommended that you use the {@link module:aerospike.connect} method
 * to connect to the cluster. You will receive the client instance in the
 * {@link Client~connectCallback|connect callback} once the cluster connection has been established and the
 * client is ready to accept commands.
 *
 * @param {Client~connectCallback} - The function to call once the client connection has been established successfully.
 *
 * @return {Client} Client object which was used to connect to the cluster.
 *
 * @example
 *
 * client.connect(function (error, client) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // client is ready to accept commands
 *   }
 * })
 *
 */
Client.prototype.connect = function (callback) {
  var self = this
  this.as_client.connect(function connectCb (err) {
    self.connected = (!err || err.code === as.status.AEROSPIKE_OK)
    if (self.connected) {
      _connectedClients += 1
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
 * the {@link Cluster#indexCreateWait} command.
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
 * @param {string} [options.type] - Type of index to be created based on the
 * type of values stored in the bin. This option needs to be specified if the
 * bin to be indexed contains list or map values and the individual entries of
 * the list or keys/values of the map should be indexed.
 * @param {string} options.datatype - The data type of the index to be created, e.g. Numeric, String or Geo.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the operation completes.
 *
 * @see {@link Client#indexCreateWait}
 *
 * @example
 *
 * var options = { ns: 'test',
 *                 set: 'demo',
 *                 bin: 'value',
 *                 index: 'value_index' }
 * client.createIntegerIndex(options, function (error) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.createIndex = function (options, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  policy = policy || options.policy
  options.type = options.type || as.indexType.DEFAULT
  this.as_client.indexCreate(
    options.ns,
    options.set,
    options.bin,
    options.index,
    options.type,
    options.datatype,
    policy,
    function createIndexCb (err) {
      self.callbackHandler(callback, err)
    }
  )
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
 * @param {string} [options.type] - Type of index to be created based on the
 * type of values stored in the bin. This option needs to be specified if the
 * bin to be indexed contains list or map values and the individual entries of
 * the list or keys/values of the map should be indexed.
 * @param {Client~InfoPolicy} [options.policy] - Deprecated - set policy using
 * <code>policy</code> parameter instead.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the operation completes.
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
 * @param {string} [options.type] - Type of index to be created based on the
 * type of values stored in the bin. This option needs to be specified if the
 * bin to be indexed contains list or map values and the individual entries of
 * the list or keys/values of the map should be indexed.
 * @param {Client~InfoPolicy} [options.policy] - Deprecated - set policy using
 * <code>policy</code> parameter instead.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the operation completes.
 *
 * @see {@link Client#indexCreateWait}
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
 * @param {string} [options.type] - Type of index to be created based on the
 * type of values stored in the bin. This option needs to be specified if the
 * bin to be indexed contains list or map values and the individual entries of
 * the list or keys/values of the map should be indexed.
 * @param {Client~InfoPolicy} [options.policy] - Deprecated - set policy using
 * <code>policy</code> parameter instead.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the operation completes.
 *
 * @see {@link Client#indexCreateWait}
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
 * @since v2.0.0
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.apply_async(key, udfArgs, policy, function applyCb (err, result) {
    self.callbackHandler(callback, err, result, key)
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
 * @deprecated in v2.0
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.exists_async(key, policy, function existsCb (err, metadata) {
    self.callbackHandler(callback, err, metadata, key)
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.get_async(key, policy, function (err, record, metadata) {
    self.callbackHandler(callback, err, record, metadata, key)
  })
}

/**
 * @function Client#indexCreateWait
 *
 * @summary Wait until an index create command succeeds in aerospike cluster.
 *
 * This function actively polls the Aerospike cluster until the specified index is ready to be queried.
 *
 * @param {string} namespace - The namespace on which the index is created.
 * @param {string} index - The name of the index.
 * @param {number} pollInterval - The poll interval in milliseconds.
 * @param {Client~doneCallback} callback - The function to call when the operation completes which the result of the operation.
 *
 * @example
 *
 * var args = {ns: 'test', set: 'demo', bin: 'bin1', index: 'index_name'}
 * client.createIntegerIndex(args, function (error) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     client.indexCreateWait('test', 'index_name', 1000, function (error) {
 *       if (error) {
 *         // handle failure
 *       } else {
 *         // handle success
 *       }
 *     })
 *   }
 * })
 */
Client.prototype.indexCreateWait = function (namespace, index, pollInterval, callback) {
  var self = this
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  this.as_client.indexCreateWait(namespace, index, pollInterval, function indexCreateWaitCb (err) {
    self.callbackHandler(callback, err)
  })
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.indexRemove(namespace, index, policy, function indexRemoveCb (err) {
    self.callbackHandler(callback, err)
  })
}

/**
 * @function Client#info
 *
 * @summary Performs an info request against the database cluster or specified host.
 *
 * @description The <code>request</code> parameter is a string representing an
 * info request. If it is not specified, the cluster host(s) will send all
 * available info.
 *
 * If the optional <code>host</code> parameter is specified, only that specific
 * host will be queried. Otherwise, the entire cluster will be queried and the
 * info callback will be called once for every cluster host that responds. If
 * the <code>host</code> parameter is specified, the client does not need to be
 * connected to a cluster. It will open a connection to the specified host just
 * to send the info command.
 *
 * @param {string} [request] - The info request to send.
 * @param {(Object|string)} [host] - The address of the cluster host to send the request to.
 * @param {string} host.addr - The IP address or host name of the host.
 * @param {number} [host.port=3000] - The port of the host.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~infoCallback} info_cb - The function to call when an info response from a cluster host is received.
 * @param {Client~doneCallback} [done_cb] - The function to call once all info responses have been received and the operation completes.
 *
 * @example <caption>Sending info command to whole clsuter</caption>
 *
 * client.info('statistics', function (error, response, host) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 *
 * @example <caption>Sending info command to individual host</caption>
 *
 * client.info('statistics', {addr: '127.0.0.1', port: 3000}, function (error, response, host) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.info = function (request, host, policy, info_cb, done_cb) {
  var argv = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))
  var argc = arguments.length
  if (typeof argv[argc - 2] === 'function' && typeof argv[argc - 1] === 'function') {
    done_cb = argv.pop()
    info_cb = argv.pop()
  } else if (typeof argv[argc - 1] === 'function') {
    info_cb = argv.pop()
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
    host = utils.parseHostsString(host).shift()
  }

  if (typeof policy === 'function') {
    policy = null
  }

  if (!this.isConnected(false)) {
    this.sendError(info_cb, 'Not connected.')
    if (done_cb) process.nextTick(done_cb)
    return
  }

  var self = this
  this.as_client.info(request, host, policy, function infoCb (err, response, host) {
    self.callbackHandler(info_cb, err, response, host)
  }, done_cb)
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
 * @since v2.0.0
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
 * const op = Aerospike.operator
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.operate_async(key, operations, metadata, policy, function operateCb (err, record, metadata) {
    self.callbackHandler(callback, err, record, metadata, key)
  })
}

/**
 * @function Client#append
 *
 * @summary Shortcut for applying the {@link module:aerospike/operator.append} operation to one or more record bins.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to append to the bin value.
 * @param {Object} [metadata] - Meta data.
 * @param {Client~OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operator.append}
 */

/**
 * @function Client#prepend
 *
 * @summary Shortcut for applying the {@link module:aerospike/operator.prepend} operation to one or more record bins.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to prepend to the bin value.
 * @param {Object} [metadata] - Meta data.
 * @param {Client~OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operator.prepend}
 */

/**
 * @function Client#incr
 *
 * @summary Shortcut for applying the {@link module:aerospike/operator.incr} operation to one or more record bins.
 *
 * @param {Key} key - The key of the record.
 * @param {Object[]} bins - The key-value mapping of bin names and the corresponding values to use to increment the bin values with.
 * @param {Object} [metadata] - Meta data.
 * @param {Client~OperatePolicy} [policy] - The Operate Policy to use for this operation.
 * @param {Client~recordCallback} callback - The function to call when the operation completes with the results of the operation.
 *
 * @since v2.0.0
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/operator.incr}
 */

// Shortcuts for some operators
;['append', 'prepend', 'incr'].forEach(function (op) {
  Client.prototype[op] = function (key, bins, metadata, policy, callback) {
    var ops = Object.keys(bins).map(function (bin) {
      return operator[op](bin, bins[bin])
    })
    if (!this.isConnected(false)) {
      this.sendError(callback, 'Not connected.')
      return
    }
    var self = this
    this.operate(key, ops, metadata, policy, function (err, record, metadata, key) {
      self.callbackHandler(callback, err, record, metadata, key)
    })
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
 * @deprecated in v2.0
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.put_async(key, record, metadata, policy, function putCb (err) {
    self.callbackHandler(callback, err, key)
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
 * @param {object} statement - Query parameters.
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
Client.prototype.query = function (ns, set, statement) {
  if (typeof set !== 'string') {
    set = ''
  }

  if (!statement) {
    statement = null
  }

  var query = this.as_client.query(ns, set, statement)
  return new Query(query)
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.remove_async(key, policy, function removeCb (err) {
    self.callbackHandler(callback, err, key)
  })
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.select_async(key, bins, policy, function selectCb (err, record, metadata) {
    self.callbackHandler(callback, err, record, metadata, key)
  })
}

/** @private */
Client.prototype.sendError = function (callback, error) {
  if (typeof error === 'string') {
    error = { message: error }
  }
  error.code = error.code || as.status.AEROSPIKE_ERR_CLIENT
  error.message = error.message || 'Client Error'
  var self = this
  process.nextTick(function nextTickCb () {
    self.callbackHandler(callback, error)
  })
}

/**
 * @function Client#udfRegister
 *
 * @summary Registers an UDF to the database cluster.
 *
 * @description
 * To verify that UDF is present in all the nodes
 * refer {@link Client#udfRegisterWait}.
 *
 * @param {string} udfModule - The filename of the UDF module.
 * @param {number} [udfType] - UDF type - only Lua is supported at the moment.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @example
 *
 * client.udfRegister('./udf/my_module.lua', function (error) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // handle success
 *   }
 * })
 */
Client.prototype.udfRegister = function (udfModule, udfType, policy, callback) {
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
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.udfRegister(udfModule, udfType, policy, function udfRegisterCb (err) {
    self.callbackHandler(callback, err)
  })
}

/**
 * @function Client#udfRegisterWait
 *
 * @summary Wait until the UDF registration succeeds in aerospike cluster. This
 * function returns only when the UDF registered is available with all the nodes in aerospike cluster.
 *
 * @param {string} udfModule - The filename of the UDF module.
 * @param {number} pollInterval - Poll interval used to check the status of the UDF module registration in milliseconds.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the operation completes with the result of the operation.
 *
 * @example
 *
 * var module = './udf/my_module.lua'
 * client.udfRegister(module, function (error) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     client.udfRegisterWait(module, 1000, function (error) {
 *       if (error) {
 *         // handle failure
 *       } else {
 *         // UDF module was successfully registered on all cluster nodes
 *       }
 *     })
 *   }
 * })
 */
Client.prototype.udfRegisterWait = function (udfModule, pollInterval, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.udfRegisterWait(udfModule, pollInterval, policy, function udfRegisterWaitCb (err) {
    self.callbackHandler(callback, err)
  })
}

/**
 * @function Client#udfRemove
 *
 * @summary Removes a UDF module from the cluster.
 *
 * @param {string} udfModule - The filename of the UDF module.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {Client~doneCallback} callback - The function to call when the operation completes which the result of the operation.
 *
 * @example
 *
 * client.udfRemove('my_module', function (error) {
 *   if (error) {
 *     // handle failure
 *   } else {
 *     // UDF module was successfully removed from the cluster
 *   }
 * })
 */
Client.prototype.udfRemove = function (udfModule, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }
  if (!this.isConnected(false)) {
    this.sendError(callback, 'Not connected.')
    return
  }
  var self = this
  this.as_client.udfRemove(udfModule, policy, function udfRemoveCb (err) {
    self.callbackHandler(callback, err)
  })
}

Client.prototype.updateLogging = function (logConfig) {
  this.as_client.updateLogging(logConfig)
}

/**
 * @typedef {Object} Client~Config
 *
 * @summary Configuration for an Aerospike client instance.
 *
 * @property {string} [user] - The user name to use when authenticating to the
 * cluster. Leave empty for clusters running without access management.
 * (Security features are available in the Aerospike DAtabase Enterprise
 * Edition.)
 *
 * @property {string} [password] - The password to use when authenticating to the cluster.
 *
 * @property {(Object[]|string)} [hosts=process.env.AEROSPIKE_HOSTS] - List of
 * hosts with which the client should attempt to connect.
 *
 * @property {number} [connTimeoutMs=1000] - Initial host connection timeout in
 * milliseconds. The client observes this timeout when opening a connection to
 * the cluster for the first time.
 *
 * @property {number} [tenderInterval=1000] - Polling interval in milliseconds
 * for cluster tender.
 *
 * @property {Object} [policies] - Global policies for the client. A policy is
 * a set of values which modify the behavior of an operation, like timeouts or
 * how an operation handles data. The policies defined in the configuration are
 * used as global defaults, which can be overridden by individual operations as
 * needed.
 *
 * @property {Object} [log] - Configuration for logging done by the client.
 *
 * @property {Object} [modlua] - Configuration values for the mod-lua system and user paths.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * var config = {
 *   // username and password must be passed only to cluster with security feature enabled.
 *   // security feature is available only in Enterprise edition of Aerospike.
 *   user: 'username',
 *   password: 'password',
 *   hosts: [
 *     // add three nodes in the cluster.
 *     { addr: '192.168.0.1', port: 3000 },
 *     { addr: '192.168.0.2', port: 3000 },
 *     { addr: '192.168.0.3', port: 3000 }
 *   ],
 *   policies = {
 *     // default timeout for all operations is 100ms
 *     timeout: 100
 *   },
 *   connTimeoutMs: 1000, // initial connection timeout
 *   tenderInterval: 1000, // tender interval
 *   log : {
 *      level: Aerospike.log.INFO,
 *      file: fd  // fd opened by the application using fs.open()
 *   },
 *   modlua: {
 *     systemPath: 'path to system UDF files',
 *     userPath: 'path to user UDF files'
 *   }
 * }
 *
 * Aerospike.connect(config, function (error, client) {
 *    if (error) {
 *      // handler error
 *    } else {
 *      // client is ready to accept commands
 *    }
 * })
 *
 * @example <caption>Setting <code>hosts</code> using a String</caption>
 *
 * var config = {
 *   hosts: '192.168.0.1:3000,192.168.0.2:3000'
 * }
 */

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
 */

/**
 * @typedef {Object} Client~ReadPolicy
 *
 * A policy affecting the behavior of read operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} retry - Maximum number of retries when a transaction fails due to a network error.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} replica - Specifies the replica to be consulted for the read.
 * @property {number} concistencyLevel - Specifies the number of replicas consulted when reading for the desired consistency guarantee.
 */

/**
 * @typedef {Object} Client~WritePolicy
 *
 * A policy affecting the behavior of write operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} retry - Maximum number of retries when a transaction fails due to a network error.
 * @property {number} compressionThreshold - Minimum record size beyond which it is compressed and sent to the server.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} gen - Specifies the behavior for the generation value.
 * @property {number} exists - Specifies the behavior for the existence of the record.
 * @property {number} commitLevel - Specifies the number of replicas required
 * to be committed successfully when writing before returning transaction succeeded.
 */

/**
 * @typedef {Object} Client~RemovePolicy
 *
 * A policy affecting the behavior of remove operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} generation - The generation of the record.
 * @property {number} retry - Maximum number of retries when a transaction fails due to a network error.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} gen - Specifies the behavior for the generation value.
 * @property {number} commitLevel - Specifies the number of replicas required
 * to be committed successfully when writing before returning transaction succeeded.
 */

/**
 * @typedef {Object} Client~BatchPolicy
 *
 * A policy affecting the behavior of batch operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 */

/**
 * @typedef {Object} Client~OperatePolicy
 *
 * A policy affecting the behavior of operate operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {number} retry - Maximum number of retries when a transaction fails due to a network error.
 * @property {number} key - Specifies the behavior for the key.
 * @property {number} gen - Specifies the behavior for the generation value.
 * @property {number} replica - Specifies the replica to be consulted for the read.
 * @property {number} concistencyLevel - Specifies the number of replicas consulted when reading for the desired consistency guarantee.
 * @property {number} commitLevel - Specifies the number of replicas required
 * to be committed successfully when writing before returning transaction succeeded.
 */

/**
 * @typedef {Object} Client~InfoPolicy
 *
 * A policy affecting the behavior of info operations.
 *
 * @property {number} timeout - Maximum time in milliseconds to wait for the operation to complete.
 * @property {boolean} send_as_is - Send request without any further processing.
 * @property {boolean} check_bounds - Ensure the request is within allowable size limits.
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

module.exports = Client
