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

/**
 * @class GeoJSON
 *
 * @classdesc Representation of a GeoJSON value. Since GeoJSON values are JSON
 * objects they need to be wrapped in the <code>GeoJSON</code> class so that
 * the client can distinguish them from other types of objects.
 *
 * For more information, please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/geospatial.html" title="Aerospike Geospatial Data Type">&uArr;Geospatial Data Type</a>
 * in the Aerospike technical documentation.
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
 * @function GeoJSON.Point
 *
 * @summary Helper function to create a new GeoJSON object representing the
 * point with the given coordinates.
 *
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {GeoJSON} a GeoJSON representation of the point
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const GeoJSON = Aerospike.GeoJSON
 *
 * var point = GeoJSON.Point(103.913, 1.308)
 */
GeoJSON.Point = function (lng, lat) {
  return new GeoJSON({type: 'Point', coordinates: [lng, lat]})
}

/**
 * @function GeoJSON.Polygon
 *
 * @summary Helper function to create a new GeoJSON object representing the
 * polygon with the given coordinates.
 *
 * @param {...number[]} coordinates - one or more coordinate pairs (lng, lat)
 * describing the polygon.
 * @returns {GeoJSON} a GeoJSON representation of the polygon.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const GeoJSON = Aerospike.GeoJSON
 *
 * var polygon = GeoJSON.Polygon([102.913, 0.308], [102.913, 2.308], [104.913, 2.308], [104.913, 0.308], [102.913, 0.308])
 */
GeoJSON.Polygon = function (coordinates) {
  coordinates = Array.prototype.slice.call(arguments)
  return new GeoJSON({type: 'Polygon', coordinates: [coordinates]})
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

module.exports = GeoJSON
