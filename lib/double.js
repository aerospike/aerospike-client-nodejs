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
 * @class Double
 *
 * @classdesc All the decimal values with valid fractions (e.g. 123.45) will be
 * stored as double data type in Aerospike. To store decimal values with 0
 * fraction as double, the value needs to be wrapped in a `Double` class
 * instance
 *
 * @summary Creates a new Double instance.
 *
 * @param {number} value - The value of the double.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const Double = Aerospike.Double
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * // (1.0) must be wrapped with "Double" in order to be added to another double.
 * // (6.283) does not need to be wrapped, but it may be wrapped if convenient.
 * ops = [Aerospike.operations.incr('d', 6.283),
 *        Aerospike.operations.incr('d', new Double(1.0))]
 * const key = new Aerospike.Key('test', 'demo', 'myDouble')
 * var record = { d: 3.1415 }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, record, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error) => {
 *       if (error) throw error
 *       client.get(key, (error, record) => {
 *         console.log(record.bins.d) // => 10.4245
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
function Double (value) {
  if (this instanceof Double) {
    this.Double = parseFloat(value)
    if (isNaN(this.Double)) {
      throw new TypeError('Not a valid Double value')
    }
  } else {
    throw new Error('Invalid use of Double constructor - use `new Double(...)` instead.')
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

module.exports = Double
