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

function equalFilter (bin, value) {
  var filter = {
    predicate: predicates.EQUAL,
    bin: bin,
    val: value
  }
  switch (typeof value) {
    case 'string':
      filter.type = as.indexDataType.STRING
      break
    case 'number':
      filter.type = as.indexDataType.NUMERIC
      break
    default:
      throw new Error('Unknown type of filter value - should be string or number.')
  }
  return filter
}

function rangeFilter (bin, min, max) {
  return {
    predicate: predicates.RANGE,
    type: as.indexDataType.NUMERIC,
    bin: bin,
    min: min,
    max: max
  }
}

function geoWithinFilter (bin, value) {
  if (value instanceof GeoJSON) {
    value = value.toString()
  } else if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  return {
    predicate: predicates.RANGE,
    type: as.indexDataType.GEO2DSPHERE,
    bin: bin,
    val: value
  }
}

function geoContainsFilter (bin, value) {
  return {
    predicate: predicates.RANGE,
    type: as.indexDataType.GEO2DSPHERE,
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
