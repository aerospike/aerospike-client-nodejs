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
const dataTypes = require('./data_types.js')
const GeoJSON = dataTypes.GeoJSON
const predicates = as.predicates
const indexType = as.indexType

const equalFilter = function equalFilter (bin, value) {
  var filter = {
    predicate: predicates.EQUAL,
    bin: bin,
    val: value
  }
  switch (typeof value) {
    case 'string':
      filter.type = indexType.STRING
      break
    case 'number':
      filter.type = indexType.NUMERIC
      break
    default:
      throw new Error('Unknown type of filter value - should be string or number.')
  }
  return filter
}

const rangeFilter = function rangeFilter (bin, min, max) {
  return {
    predicate: predicates.RANGE,
    type: indexType.NUMERIC,
    bin: bin,
    min: min,
    max: max
  }
}

const geoWithinFilter = function geoWithinFilter (bin, value) {
  if (value instanceof GeoJSON) {
    value = value.toString()
  } else if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  return {
    predicate: predicates.RANGE,
    type: indexType.GEO2DSPHERE,
    bin: bin,
    val: value
  }
}

const geoContainsFilter = function geoContainsFilter (bin, value) {
  return {
    predicate: predicates.RANGE,
    type: indexType.GEO2DSPHERE,
    bin: bin,
    val: value
  }
}

module.exports = {
  equal: equalFilter,
  range: rangeFilter,
  geoWithin: geoWithinFilter,
  geoContains: geoContainsFilter
}
