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
 * @class AerospikeError
 * @classdesc Error status returned by the server.
 *
 * @summary Construct a new AerospikeError instance.
 *
 * @param {number} code - The status code of the error.
 * @param {string} [message] - A message describing the status code.
 * @param {string} [func] - The name of the function in which the error occurred.
 * @param {string} [file] - The file name in which the error occurred.
 * @param {string} [line] - The line number on which the error occurred.
 *
 * @see <code>Aerospike.status</code> contains the full list of possible status codes.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * var key = new Aerospike.Key('test', 'key', 'does_not_exist')
 * Aerospike.connect(function (error, client) {
 *   if (error) throw error
 *   client.get(key, function (error, record) {
 *     console.log(error) // => { [AerospikeError: AEROSPIKE_ERR_RECORD_NOT_FOUND]
 *                        //      code: 2,
 *                        //      message: 'AEROSPIKE_ERR_RECORD_NOT_FOUND',
 *                        //      func: 'as_command_parse_result',
 *                        //      file: 'src/main/aerospike/as_command.c',
 *                        //      line: 1071,
 *                        //      name: 'AerospikeError',
 *                        //      stack: ... }
 *   })
 *   client.close()
 * })
 */
function AerospikeError (code, message, func, file, line) {
  if (typeof code === 'object') {
    var err = code
    this.code = err.code
    this.message = err.message || 'Aerospike Error'
    this.func = err.func
    this.file = err.file
    this.line = err.line
  } else {
    this.code = code
    this.message = message || 'Aerospike Error'
    this.func = func
    this.file = file
    this.line = line
  }
  var temp = Error.call(this, this.message)
  temp.name = this.name = 'AerospikeError'
  this.stack = temp.stack
}

AerospikeError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: AerospikeError,
    writable: true,
    configurable: true
  }
})

/**
 * @class Double
 */
function Double (value) {
  if (this instanceof Double) {
    this.Double = parseFloat(value)
    if (isNaN(this.Double)) {
      throw new TypeError('Not a valid Double value')
    }
  } else {
    return new Double(value)
  }
}

Double.prototype.value = function () {
  return this.Double
}

/**
 * @class GeoJSON
 */
function GeoJSON (json) {
  if (this instanceof GeoJSON) {
    switch (typeof json) {
      case 'string':
        this.str = json
        break
      case 'object':
        this.str = JSON.stringify(json)
        break
      default:
        throw new TypeError('Not a valid GeoJSON value')
    }
  } else {
    return new GeoJSON(json)
  }
}

GeoJSON.prototype.toJSON = function () {
  return JSON.parse(this.str)
}

GeoJSON.prototype.toString = function () {
  return this.str
}

GeoJSON.prototype.value = function () {
  return this.toJSON()
}

/**
 * @class Key
 *
 * @summary A key uniquely identifies a record in the Aerospike database within a given namespace.
 *
 * @description
 *
 * ###### Key Digests
 * In your application, you must specify the namespace, set and the key itself
 * to read and write records. When a key is sent to the database, the key value
 * and its set are hashed into a 160-bit digest. When a database operation
 * returns a key (e.g. Query or Scan operations) it might contain either the
 * set and key value, or just the digest.
 *
 * @param {string} ns - The Namespace to which the key belongs.
 * @param {string} set - The Set to which the key belongs.
 * @param {(string|number|Buffer)} value - The unique key value. Keys can be
 * strings, integers or an instance of the Buffer class.
 *
 * @example <caption>Creating a new {@link Key} instance</caption>
 *
 * const Key = Aerospike.Key
 *
 * var key = new Key('test', 'demo', 123)
 */
function Key (ns, set, key) {
  /** @member {string} Key#ns */
  this.ns = ns

  /** @member {string} [Key#set] */
  this.set = set

  /** @member {(string|number|Buffer)} [Key#key] */
  this.key = key

  /**
   * @member {Buffer} [Key#digest]
   *
   * @summary The 160-bit digest used by the Aerospike server to uniquely
   * identify a record within a namespace.
   */
  this.digest = null
}

/**
 * @typedef {Object} module:Aerospike.Config
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

module.exports = {
  AerospikeError: AerospikeError,
  Double: Double,
  GeoJSON: GeoJSON,
  Key: Key
}
