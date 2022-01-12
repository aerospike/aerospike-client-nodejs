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

// *****************************************************************************
// HELPERS
// ****************************************************************************
//
const Aerospike = require('../../lib/aerospike')
const Double = Aerospike.Double

// Returns a random integer between min (included) and max (excluded)
function randomInt (min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

// Returns a random number between min (included) and max (excluded)
function randomDouble (min, max) {
  return Math.random() * (max - min) + min
}

function merge (o1, o2) {
  const o3 = {}
  let k
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
  const opt = merge(string.defaults, options)
  let seq = 0
  return function () {
    if (opt.random === true) {
      const lengthMin = opt.length.min || 1
      const lengthMax = opt.length.max || lengthMin
      const len = randomInt(lengthMin, lengthMax)
      const arr = new Array(len)
      for (let i = 0; i < len; i++) {
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
  const opt = merge(bytes.defaults, options)
  return function () {
    const len = randomInt(opt.length.min, opt.length.max)
    const buf = Buffer.alloc(len)
    for (let i = 0; i < len; i++) {
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
  const opt = merge(integer.defaults, options)
  let seq = opt.min
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
  const opt = merge(double.defaults, options)
  let seq = opt.min
  const step = opt.step
  const r = Math.pow(10, step.toString().length - step.toString().indexOf('.') - 1)
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

function array (options) {
  const opt = merge(array.defaults, options)
  return function () {
    return opt.values.map(function (gen) { return gen() })
  }
}
array.defaults = {
  values: [integer(), string(), bytes()]
}

function map () {
  return function () {
    const num = integer()
    const str = string()
    const uint = bytes()
    const map = { itype: num(), stype: str(), btyte: uint() }
    return map
  }
}

module.exports = {
  bytes,
  constant,
  integer,
  string,
  double,
  array,
  map
}
