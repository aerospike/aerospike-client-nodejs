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

const as = require('bindings')('aerospike.node')
const GeoJSON = require('./geojson')

/**
 * @module aerospike/filter
 *
 * @description This module provides functions to create secondary index filter
 * predicates for use in query operations via the {@link Client#query} command.
 *
 * @see {@link Query}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect(async client => {
 *   // find any records that have a recent location within 1000m radius of the specified coordinates
 *   let geoFilter = Aerospike.filter.geoWithinRadius('recent', 103.8, 1.305, 1000, Aerospike.indexType.LIST)
 *   let query = client.query('test', 'demo')
 *   query.where(geoFilter)
 *
 *   let results = await query.results()
 *   for (let record in results) {
 *     console.log(record.bins.recent)
 *   }
 *   client.close()
 * })
 */

/**
 * @class module:aerospike/filter~SindexFilterPredicate
 * @classdesc Secondary index filter predicate to limit the scope of a {@link Query}.
 *
 * Filter predicates must be instantiated using the methods in the {@link
 * module:aerospike/filter} module.
 */
class SindexFilterPredicate {
  constructor (predicate, bin, dataType, indexType, props) {
    this.predicate = predicate
    this.bin = bin
    this.datatype = dataType
    this.type = indexType || as.indexType.DEFAULT
    if (props) {
      Object.assign(this, props)
    }
  }
}
exports.SindexFilterPredicate = SindexFilterPredicate

class EqualPredicate extends SindexFilterPredicate {
  constructor (bin, value, dataType, indexType) {
    super(as.predicates.EQUAL, bin, dataType, indexType, {
      val: value
    })
  }
}

class RangePredicate extends SindexFilterPredicate {
  constructor (bin, min, max, dataType, indexType) {
    super(as.predicates.RANGE, bin, dataType, indexType, {
      min: min,
      max: max
    })
  }
}

class GeoPredicate extends SindexFilterPredicate {
  constructor (bin, value, indexType) {
    super(as.predicates.RANGE, bin, as.indexDataType.GEO2DSPHERE, indexType, {
      val: value
    })
  }
}

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

/**
 * @summary Integer range filter.
 * @description The filter matches records with a bin value in the given
 * integer range. The filter can also be used to match for integer values
 * within the given range that are contained with a list or map by specifying
 * the appropriate index type.
 *
 * @param {string} bin - The name of the bin.
 * @param {number} min - Lower end of the range (inclusive).
 * @param {number} max - Upper end of the range (inclusive).
 * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
 * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
 * @returns {module:aerospike/filter~SindexFilterPredicate} Secondary index
 * filter predicate, that can be applied to queries using {@link Query#where}.
 */
exports.range = function (bin, min, max, indexType) {
  const dataType = as.indexDataType.NUMERIC
  return new RangePredicate(bin, min, max, dataType, indexType)
}

/**
 * @summary String/integer equality filter.
 * @description The filter matches records with a bin that matches a specified
 * string or integer value.
 *
 * @param {string} bin - The name of the bin.
 * @param {string} value - The filter value.
 * @returns {module:aerospike/filter~SindexFilterPredicate} Secondary index
 * filter predicate, that can be applied to queries using {@link Query#where}.
 */
exports.equal = function (bin, value) {
  const dataType = dataTypeOf(value)
  return new EqualPredicate(bin, value, dataType)
}

/**
 * @summary Filter for list/map membership.
 * @description The filter matches records with a bin that has a list or map
 * value that contain the given string or integer.
 *
 * @param {string} bin - The name of the bin.
 * @param {(string|integer)} value - The value that should be a member of the
 * list or map in the bin.
 * @param {number} indexType - One of {@link module:aerospike.indexType},
 * i.e. LIST, MAPVALUES or MAPKEYS.
 * @returns {module:aerospike/filter~SindexFilterPredicate} Secondary index
 * filter predicate, that can be applied to queries using {@link Query#where}.
 *
 * @since v2.0
 */
exports.contains = function (bin, value, indexType) {
  const dataType = dataTypeOf(value)
  return new EqualPredicate(bin, value, dataType, indexType)
}

/**
 * @summary Geospatial filter that matches points within a given GeoJSON
 * region.
 * @description Depending on the index type, the filter will match GeoJSON
 * values contained in list or map values as well (requires Aerospike server
 * version >= 3.8).
 *
 * @param {string} bin - The name of the bin.
 * @param {GeoJSON} value - GeoJSON region value.
 * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
 * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
 * @returns {module:aerospike/filter~SindexFilterPredicate} Secondary index
 * filter predicate, that can be applied to queries using {@link Query#where}.
 *
 * @since v2.0
 */
exports.geoWithinGeoJSONRegion = function (bin, value, indexType) {
  if (value instanceof GeoJSON) {
    value = value.toString()
  } else if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  return new GeoPredicate(bin, value, indexType)
}

/**
 * @summary Geospatial filter that matches regions that contain a given GeoJSON
 * point.
 * @description Depending on the index type, the filter will match GeoJSON
 * regions within list or map values as well (requires Aerospike server version
 * >= 3.8).
 *
 * @param {string} bin - The name of the bin.
 * @param {GeoJSON} value - GeoJSON point value.
 * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
 * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
 * @returns {module:aerospike/filter~SindexFilterPredicate} Secondary index
 * filter predicate, that can be applied to queries using {@link Query#where}.
 *
 * @since v2.0
 */
exports.geoContainsGeoJSONPoint = function (bin, value, indexType) {
  if (value instanceof GeoJSON) {
    value = value.toString()
  } else if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  return new GeoPredicate(bin, value, indexType)
}

/**
 * @summary Geospatial filter that matches points within a radius from a given
 * point.
 * @description Depending on the index type, the filter will match GeoJSON
 * values contained in list or map values as well (requires Aerospike server
 * version >= 3.8).
 *
 * @param {string} bin - The name of the bin.
 * @param {number} lng - Longitude of the center point.
 * @param {number} lat - Latitude of the center point.
 * @param {number} radius - Radius in meters.
 * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
 * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
 * @returns {module:aerospike/filter~SindexFilterPredicate} Secondary index
 * filter predicate, that can be applied to queries using {@link Query#where}.
 *
 * @since v2.0
 */
exports.geoWithinRadius = function (bin, lon, lat, radius, indexType) {
  const circle = GeoJSON.Circle(lon, lat, radius)
  return new GeoPredicate(bin, circle.toString(), indexType)
}

/**
 * @summary Geospatial filter that matches regions that contain a given lng/lat
 * coordinate.
 * @description Depending on the index type, the filter will match GeoJSON
 * regions within list or map values as well (requires Aerospike server version
 * >= 3.8).
 *
 * @param {string} bin - The name of the bin.
 * @param {number} lng - Longitude of the point.
 * @param {number} lat - Latitude of the point.
 * @param {number} [indexType=Aerospike.indexType.DEFAULT] - One of {@link
 * module:aerospike.indexType}, i.e. LIST or MAPVALUES.
 * @returns {module:aerospike/filter~SindexFilterPredicate} Secondary index
 * filter predicate, that can be applied to queries using {@link Query#where}.
 *
 * @since v2.0
 */
exports.geoContainsPoint = function (bin, lon, lat, indexType) {
  const point = GeoJSON.Point(lon, lat)
  return new GeoPredicate(bin, point.toString(), indexType)
}
