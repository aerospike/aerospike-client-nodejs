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

// *****************************************************************************
// HELPERS
// ****************************************************************************
//
const Aerospike = require('../../lib/aerospike')
const Double = Aerospike.Double
const GeoJSON = Aerospike.GeoJSON

// Returns a random integer between min (included) and max (excluded)
function randomInt (min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

// Returns a random number between min (included) and max (excluded)
function randomDouble (min, max) {
  return Math.random() * (max - min) + min
}

// Returns a random point in a circle of radius r (in meters) around the
// geographical coordiates lat, lng
// Source: http://gis.stackexchange.com/a/25883/10736
function randomPoint (lat, lng, r) {
  r = r / 111300 // radius in degrees
  var w = r * Math.sqrt(Math.random())
  var t = 2 * Math.PI * Math.random()
  var x = w * Math.cos(t)
  var y = w * Math.sin(t)
  x = x / Math.cos(lng) // adjust for shrinking of east-west distances
  return [lat + x, lng + y]
}

function merge (o1, o2) {
  var o3 = {}
  var k
  if (o1) {
    for (k in o1) {
      o3[k] = o1[k]
    }
  }
  if (o2) {
    for (k in o2) {
      o3[k] = o2[k]
    }
  }
  return o3
}

// *****************************************************************************
// GENERATORS
// *****************************************************************************

function constant (value) {
  return function () {
    return value
  }
}

function string (options) {
  var opt = merge(string.defaults, options)
  var seq = 0
  return function () {
    if (opt.random === true) {
      var len = randomInt(opt.length.min, opt.length.max)
      var arr = new Array(len)
      for (var i = 0; i < len; i++) {
        arr[i] = opt.charset[randomInt(0, opt.charset.length)]
      }
      return opt.prefix + arr.join('') + opt.suffix
    } else {
      return opt.prefix + (seq++) + opt.suffix
    }
  }
}
string.defaults = {
  random: true,
  length: {
    min: 1,
    max: 128
  },
  prefix: '',
  suffix: '',
  charset: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'
}

function bytes (options) {
  var opt = merge(bytes.defaults, options)
  return function () {
    var len = randomInt(opt.length.min, opt.length.max)
    var buf = new Buffer(len)
    for (var i = 0; i < len; i++) {
      buf[i] = randomInt(opt.byte.min, opt.byte.max)
    }
    return buf
  }
}

bytes.defaults = {
  length: {
    min: 1,
    max: 1024
  },
  byte: {
    min: 0,
    max: 255
  }
}

function integer (options) {
  var opt = merge(integer.defaults, options)
  var seq = opt.min
  return function () {
    return opt.random === true ? randomInt(opt.min, opt.max) : seq++
  }
}

integer.defaults = {
  random: true,
  min: 0,
  max: 0xffffff
}

function double (options) {
  var opt = merge(double.defaults, options)
  var seq = opt.min
  var step = opt.step
  var r = Math.pow(10, step.toString().length - step.toString().indexOf('.') - 1)
  return function () {
    if (opt.random) {
      return new Double(randomDouble(opt.min, opt.max))
    } else {
      seq = Math.round(r * (seq + step)) / r
      return new Double(seq)
    }
  }
}

double.defaults = {
  random: true,
  min: 0,
  max: 0xffffff,
  step: 0.1
}

function geojsonPoint (options) {
  var opt = merge(geojsonPoint.defaults, options)
  return function () {
    var coords = (opt.random === true) ? randomPoint(opt.lat, opt.lng, opt.r) : [opt.lat, opt.lng]
    return new GeoJSON({type: 'Point', coordinates: coords.reverse()})
  }
}
geojsonPoint.defaults = {
  random: true,
  lat: 37.4214209,
  lng: -122.1008744,
  r: 1000
}

function array (options) {
  var opt = merge(array.defaults, options)
  return function () {
    return opt.values.map(function (gen) { return gen() })
  }
}
array.defaults = {
  values: [integer(), string(), bytes()]
}

function map () {
  return function () {
    var num = integer()
    var str = string()
    var uint = bytes()
    var map = {itype: num(), stype: str(), btyte: uint()}
    return map
  }
}

function array_of_array () {
  return function () {
    var arr = array()
    var obj = map()
    var list = [ arr(), obj() ]
    return list
  }
}

function map_of_map () {
  return function () {
    var arr = array()
    var obj = map()
    var map_of_list = {inner_list: arr(), inner_map: obj()}
    return map_of_list
  }
}

module.exports = {
  bytes: bytes,
  constant: constant,
  integer: integer,
  string: string,
  double: double,
  geojsonPoint: geojsonPoint,
  array: array,
  map: map,
  array_of_array: array_of_array,
  map_of_map: map_of_map
}
