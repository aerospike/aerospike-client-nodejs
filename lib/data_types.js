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
 * @class Double
 *
 * @classdesc All the decimal values with valid fractions (e.g. 123.45) will be
 * stored as double data type in aerospike. To store decimal values with 0
 * fraction as double, the value needs to be wrapped in a `Double` class
 * instance
 *
 * @summary Creates a new Double instance.
 *
 * @description Note: The use of the `Double` function without the `new`
 * keyword is deprecated in version 2.0.
 *
 * @param {number} value - The value of the double.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Double = Aerospike.Double
 * const client = Aerospike.client().connect((error) => {
 *   if (error) throw error
 * })
 * const key = new Aerospike.Key('test', 'demo', 'myDouble')
 *
 * var record = { d: 3.1415 }
 * client.put(key, record, (error) => {
 *   if (error) throw error
 * })
 *
 * function incr (value) {
 *   // wrap value in Double since we can't be sure it would be converted to
 *   // double automatically, e.g. 1.0
 *   client.operate(key, [Aerospike.operator.incr('d', new Double(value))], (error) => {
 *     if (error) throw error
 *   })
 * }
 *
 * incr(6.283)
 * incr(1.0)
 *
 * client.get(key, (error, record) => {
 *   console.log(record)
 *   client.close()
 * })
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

/**
 * @function Double#value
 *
 * @return {number} value of the Double
 */
Double.prototype.value = function () {
  return this.Double
}

/**
 * @class GeoJSON
 * @classdesc Representation of a GeoJSON value. Since GeoJSON values are JSON
 * objects they need to be wrapped in the <code>GeoJSON</code> class so that
 * the client can distinguish them from ordinary maps.
 *
 * @summary Creates a new GeoJSON instance.
 *
 * @param {(Object|string)} value - GeoJSON value; the constructor accepts
 * either a string representation of the JSON object, or a JS object.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const GeoJSON = Aerospike.GeoJSON
 * const Key = Aerospike.Key
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   var key = new Key('test', 'demo', 'bob')
 *   var location = new GeoJSON({type: 'Point', coordinates: [103.913, 1.308]})
 *   client.put(key, {loc: location}, (error) => {
 *     if (error) throw error
 *     client.close()
 *   })
 * })
 *
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

/**
 * Returns the GeoJSON value as a JS object.
 *
 * @return {Object}
 */
GeoJSON.prototype.toJSON = function () {
  return JSON.parse(this.str)
}

/**
 * Returns the GeoJSON value as a string
 *
 * @return {string}
 */
GeoJSON.prototype.toString = function () {
  return this.str
}

/**
 * Alias for {@link GeoJSON#toJSON}. Returns the GeoJSON value as a JS object.
 *
 * @return {Object}
 */
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

module.exports = {
  Double: Double,
  GeoJSON: GeoJSON,
  Key: Key
}
