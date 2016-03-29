// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
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

/**
 * @module aerospike
 *
 * @description The Aerospike module is the main entry point for the Aerospike Node.js Client API.
 */

const as = require('../build/Release/aerospike.node')

const Client = require('./client.js')
const dataTypes = require('./data_types.js')
const filter = require('./filter.js')
const operator = require('./operator.js')

/**
 * Whether event loop resources have been released
 *
 * @type {boolean}
 * @private
 */
var _eventLoopReleased = false

/**
 * @function module:aerospike.client
 *
 * @summary Creates a new {@link Client} instance.
 *
 * @param {Client~Config} config - The configuration for the client.
 */
function client (config) {
  config = config || {}
  return new Client(this, config)
}

/**
 * @function module:aerospike.connect
 *
 * @summary Creates a new {@link Client} instance and connects to the Aerospike cluster.
 *
 * @param {Client~Config} config - The configuration for the client.
 * @param {Client~connectCallback} callback - The funcation to call, once the client is connected to the cluster successfully.
 */
function connect (config, callback) {
  if (typeof config === 'function') {
    callback = config
    config = null
  }
  var client = this.client(config)
  client.connect(callback)
  return client
}

/**
 * @function module:aerospike.key
 *
 * @summary Creates a new {@link Key} instance.
 *
 * @description Provided for backward compatibility. Use the {@link Key} class
 * constructor instead.
 *
 * @param {string} ns - The Namespace to which the key belongs.
 * @param {string} set - The Set to which the key belongs.
 * @param {(string|number|Buffer)} value - The unique key value. Keys can be
 * strings, integers or an instance of the Buffer class.
 *
 * @deprecated in v2.0
 */
function key (ns, set, key) {
  return new dataTypes.Key(ns, set, key)
}

/**
 * @function module:aerospike.releaseEventLoop
 *
 * @summary Release event loop resources.
 *
 * @description This method releases the event loop resources held by the
 * Aerospike C client library. It is normally called automatically when the
 * Aerospike Node.js client instance is closed. However, when the application
 * needs to create multiple client instances, then the event loop resources
 * need to be released explicitly by calling this method and `releaseEventLoop
 * = false` needs to be passed in the {@link Client#close} method.
 *
 * @example <caption>Working with multiple client instances.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // called one or more times to handle a new work request
 * function handleRequest (request) {
 *   Aerospike.connect(function (err, client) {
 *     if (err) {
 *       // handle error
 *     }
 *     // handle request
 *     client.close(false) // do not release event loop
 *   })
 * }
 *
 * // called when application shuts down
 * function shutdown () {
 *   Aerospike.releaseEventLoop()
 * }
 */
function releaseEventLoop () {
  _eventLoopReleased = true
  if (as.get_cluster_count() > 0) {
    setTimeout(releaseEventLoop, 5)
  } else {
    as.release_as_event_loop()
  }
}

function eventLoopReleased () {
  return _eventLoopReleased
}

function Aerospike () {
  // classes && data types
  this.Client = Client
  this.AerospikeError = dataTypes.AerospikeError
  this.Double = dataTypes.Double
  this.GeoJSON = dataTypes.GeoJSON
  this.Key = dataTypes.Key

  // top-level methods exposed through Aerospike module
  this.client = client
  this.connect = connect
  this.eventLoopReleased = eventLoopReleased
  this.key = key
  this.releaseEventLoop = releaseEventLoop

  // filter && operator commands
  this.filter = filter
  this.operator = operator

  // enums imported from C client library
  this.indexType = as.indexType
  this.language = as.language
  this.log = as.log

  this.policy = as.policy
  this.predicates = as.predicates
  this.scanPriority = as.scanPriority
  this.scanStatus = as.scanStatus
  this.status = as.status
}
module.exports = new Aerospike()

as.register_as_event_loop()
