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
 * stored as double data type in aerospike. To store decimal values with 0
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
 * const client = Aerospike.client().connect((error) => {
 *   if (error) throw error
 * })
 * const key = new Aerospike.Key('test', 'demo', 'myDouble')
 *
 * var record = { d: 3.1415 }
 * client.put(key, record, (error) => {
 *   if (error) throw error
 * })
 *
 * function incr (value) {
 *   // wrap value in Double since we can't be sure it would be converted to
 *   // double automatically, e.g. 1.0
 *   client.operate(key, [Aerospike.operations.incr('d', new Double(value))], (error) => {
 *     if (error) throw error
 *   })
 * }
 *
 * incr(6.283)
 * incr(1.0)
 *
 * client.get(key, (error, record) => {
 *   console.log(record)
 *   client.close()
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
