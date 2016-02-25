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

function Key (ns, set, key) {
  this.ns = ns
  this.set = set
  this.key = key
  this.digest = null
}

module.exports = {
  AerospikeError: AerospikeError,
  Double: Double,
  GeoJSON: GeoJSON,
  Key: Key
}
