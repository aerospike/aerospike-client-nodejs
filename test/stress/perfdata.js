// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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

const { format } = require('util')

const helper = require('../test_helper')

const keygen = helper.keygen
const metagen = helper.metagen
const putgen = helper.putgen
const recgen = helper.recgen
const valgen = helper.valgen

// Creates a new timer interval and passes the elapsed time in milliseconds
// into each invocation of the interval callback.
function interval (duration, callback) {
  const obj = {}
  obj.startTime = process.hrtime()
  obj.elapsed = function () {
    const diff = process.hrtime(obj.startTime)
    return Math.round(diff[0] * 1000 + (diff[1] / 1e6))
  }
  obj.call = function () { callback(obj.elapsed()) }
  obj.timer = setInterval(obj.call, duration).unref()
  obj.clear = function () { clearInterval(obj.timer) }
  return obj
}

// Generates records with specific record size
function generate (ns, set, numberOfRecords, recordSize, done) {
  const numBinsPerRecord = recordSize[0]
  const sizePerBin = recordSize[1]
  const bins = { id: valgen.integer({ random: false, min: 0 }) }
  for (let i = 0; i < numBinsPerRecord; i++) {
    bins['b' + i] = valgen.bytes({ length: { min: sizePerBin, max: sizePerBin } })
  }
  const generators = {
    keygen: keygen.string(ns, set, { length: { min: 20, max: 20 } }),
    recgen: recgen.record(bins),
    metagen: metagen.constant({}),
    throttle: {
      limit: 5000,
      interval: 1000
    }
  }
  let keysCreated = 0
  const uniqueKeys = new Set()
  const timer = interval(10 * 1000, function (ms) {
    const throughput = Math.round(1000 * keysCreated / ms)
    console.info('%s ms: %d records created (%d records / second) - %s', ms, keysCreated, throughput, memoryUsage())
  })
  putgen.put(numberOfRecords, generators, function (key) {
    if (key) {
      keysCreated++
      uniqueKeys.add(key.key)
    } else {
      timer.call()
      timer.clear()
      done(uniqueKeys.size) // actual number of records might be slightly less due to duplicate keys
    }
  })
}

const MEGA = 1024 * 1024 // bytes in a MB
function memoryUsage () {
  const memUsage = process.memoryUsage()
  const rss = Math.round(memUsage.rss / MEGA)
  const heapUsed = Math.round(memUsage.heapUsed / MEGA)
  const heapTotal = Math.round(memUsage.heapTotal / MEGA)
  return format('mem: %d MB, heap: %d / %d MB', rss, heapUsed, heapTotal)
}

module.exports = {
  interval,
  generate,
  memoryUsage
}
