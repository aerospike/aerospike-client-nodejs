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

// Defining this before the @module so that it's not included in the module.
/**
 * @class FilterPredicate
 * @classdesc Filter predicate to limit the scope of a {@link Query}.
 *
 * Filter predicates must be instantiated using the methods in the {@link
 * module:aerospike/filter} module.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   // find any records that have a recent location within 1000m radius of the specified coordinates
 *   var statement = {
 *     filters: [ Aerospike.filter.geoWithinRadius('recent', 103.8, 1.305, 1000, Aerospike.indexType.LIST) ]
 *   }
 *   var query = client.query('test', 'demo', statement)
 *
 *   var stream = query.execute()
 *   stream.on('error', (error) => { throw error })
 *   stream.on('data', (record) => console.log(record.bins.recent))
 *   stream.on('end', () => client.close())
 * })
 *
 */
function FilterPredicate (predicate, bin, dataType, indexType) {
  this.predicate = predicate
  this.bin = bin
  this.datatype = dataType
  this.type = indexType || as.indexType.DEFAULT
}

/**
 * @module aerospike/filter
 *
 * @description This module provides function to specify filter predicates for
 * use in query operations via the {@link Client#query} command.
 *
 * **Note:** Currently, queries only support a single filter predicate. To do
 * more advanced filtering, you can use a UDF to process the result set on the
 * server.
 *
 * @see {@link Query}
 */

const as = require('bindings')('aerospike.node')
const GeoJSON = require('./geojson')

const util = require('util')

// Helper function to determine the type of a primitive or Object
function typeOf (value) {
  if (value === null) return 'null'
  var valueType = typeof value
  if (valueType === 'object') {
    valueType = value.constructor.name.toLowerCase()
  }
  return valueType
}

function dataTypeOf (value) {
  switch (typeOf(value)) {
    case 'string':
      return as.indexDataType.STRING
    case 'number':
    case 'double':
      return as.indexDataType.NUMERIC
    default:
      throw new TypeError('Unknown data type for filter value.')
  }
}

function EqualPredicate (bin, value, dataType, indexType) {
  FilterPredicate.call(this, as.predicates.EQUAL, bin, dataType, indexType)
  this.val = value
}
util.inherits(EqualPredicate, FilterPredicate)

function RangePredicate (bin, min, max, dataType, indexType) {
  FilterPredicate.call(this, as.predicates.RANGE, bin, dataType, indexType)
  this.min = min
  this.max = max
}
util.inherits(RangePredicate, FilterPredicate)

function GeoPredicate (bin, value, indexType) {
  FilterPredicate.call(this, as.predicates.RANGE, bin, as.indexDataType.GEO2DSPHERE, indexType)
  this.val = value
}
util.inherits(GeoPredicate, FilterPredicate)

function equalFilter (bin, value) {
  var dataType = dataTypeOf(value)
  return new EqualPredicate(bin, value, dataType)
}

function rangeFilter (bin, min, max, indexType) {
  var dataType = as.indexDataType.NUMERIC
  return new RangePredicate(bin, min, max, dataType, indexType)
}

function containsFilter (bin, value, indexType) {
  var dataType = dataTypeOf(value)
  return new EqualPredicate(bin, value, dataType, indexType)
}

function geoJSONFilter (bin, value, indexType) {
  if (value instanceof GeoJSON) {
    value = value.toString()
  } else if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  return new GeoPredicate(bin, value, indexType)
}

function geoWithinRadiusFilter (bin, lon, lat, radius, indexType) {
  var value = new GeoJSON({type: 'AeroCircle', coordinates: [[lon, lat], radius]})
  return new GeoPredicate(bin, value.toString(), indexType)
}

function geoContainsPointFilter (bin, lon, lat, indexType) {
  var value = new GeoJSON({type: 'Point', coordinates: [lon, lat]})
  return new GeoPredicate(bin, value.toString(), indexType)
}

module.exports = {
  /**
   * @function equal
   * @static
   *
   * String/integer equality filter. The filter matches records with a bin that
   * matches a specified string or integer value.
   *
   * @param {string} bin - The name of the bin.
   * @param {string} value - The filter value.
   * @returns {FilterPredicate} Filter predicate that can be passed to the {@link Client#query} command.
   */
  equal: equalFilter,

  /**
   * @function contains
   * @static
   *
   * Filter for list/map membership. The filter matches records with a bin that
   * has a list or map value that contain the given string or integer.
   *
   * @param {string} bin - The name of the bin.
   * @param {(string|integer)} value - The value that should be a member of the
   * list or map in the bin.
   * @param {number} indexType - One of {@link module:aerospike.indexType},
   * i.e. LIST, MAPVALUES or MAPKEYS.
   * @returns {FilterPredicate} Filter predicate that can be passed to the {@link Client#query} command.
   *
   * @since v2.0
   */
  contains: containsFilter,

  /**
   * @function range
   * @static
   *
   * Integer range filter. The filter matches records with a bin value in the
   * given integer range. The filter can also be used to match for integer
   * values within the given range that are contained with a list or map by
   * specifying the appropriate index type.
   *
   * @param {string} bin - The name of the bin.
   * @param {number} min - Lower end of the range (inclusive).
   * @param {number} max - Upper end of the range (inclusive).
   * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
   * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
   * @returns {FilterPredicate} Filter predicate that can be passed to the {@link Client#query} command.
   */
  range: rangeFilter,

  /**
   * @function geoWithinGeoJSONRegion
   * @static
   *
   * Geospatial filter that matches points within a given GeoJSON region.
   * Depending on the index type, the filter will match GeoJSON values
   * contained in list or map values as well (requires Aerospike server
   * version >= 3.8).
   *
   * @param {string} bin - The name of the bin.
   * @param {GeoJSON} value - GeoJSON region value.
   * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
   * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
   * @returns {FilterPredicate} Filter predicate that can be passed to the {@link Client#query} command.
   *
   * @since v2.0
   */
  geoWithinGeoJSONRegion: geoJSONFilter,

  /**
   * @function geoWithinRadius
   * @static
   *
   * Geospatial filter that matches points within a radius from a given point.
   * Depending on the index type, the filter will match GeoJSON values
   * contained in list or map values as well (requires Aerospike server
   * version >= 3.8).
   *
   * @param {string} bin - The name of the bin.
   * @param {number} lng - Longitude of the center point.
   * @param {number} lat - Latitude of the center point.
   * @param {number} radius - Radius in meters.
   * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
   * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
   * @returns {FilterPredicate} Filter predicate that can be passed to the {@link Client#query} command.
   *
   * @since v2.0
   */
  geoWithinRadius: geoWithinRadiusFilter,

  /**
   * @function geoContainsGeoJSONPoint
   * @static
   *
   * Geospatial filter that matches regions that contain a given GeoJSON point.
   * Depending on the index type, the filter will match GeoJSON regions within
   * list or map values as well (requires Aerospike server version >= 3.8).
   *
   * @param {string} bin - The name of the bin.
   * @param {GeoJSON} value - GeoJSON point value.
   * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
   * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
   * @returns {FilterPredicate} Filter predicate that can be passed to the {@link Client#query} command.
   *
   * @since v2.0
   */
  geoContainsGeoJSONPoint: geoJSONFilter,

  /**
   * @function geoContainsPoint
   * @static
   *
   * Geospatial filter that matches regions that contain a given lng/lat
   * coordinate. Depending on the index type, the filter will match GeoJSON
   * regions within list or map values as well (requires Aerospike server
   * version >= 3.8).
   *
   * @param {string} bin - The name of the bin.
   * @param {number} lng - Longitude of the point.
   * @param {number} lat - Latitude of the point.
   * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
   * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
   * @returns {FilterPredicate} Filter predicate that can be passed to the {@link Client#query} command.
   *
   * @since v2.0
   */
  geoContainsPoint: geoContainsPointFilter
}
