// *****************************************************************************
// Copyright 2022 Aerospike, Inc.
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
 * @module aerospike/exp/operations
 *
 * @description This module provides functions to easily create read/write operations
 * using Aerospike expressions to be performed on a record via
 * the {@link Client#operate} command.
 *
 * @see {@link Client#operate}
 * @see {@link module:aerospike/exp/operations|aerospike/exp/operations }
 *
 * @example
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * const exp = Aerospike.exp
 * const key = new Aerospike.Key('test', 'demo', 'mykey1')
 * const tempBin = 'ExpVar' // this bin is to hold expression read operation output
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * const config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     operate : new Aerospike.OperatePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 *
 * var ops = [
 *   op.append('a', 'xyz'),
 *   op.incr('b', 10),
 *   exp.operations.read(tempBin,
 *           exp.add(exp.binInt('b'), exp.binInt('b')),
 *          0),
 *   op.read('a'),
 *   op.read('b')
 * ]
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *   client.put(key, { a: 'abc', b: 42 }, (error) => {
 *     if (error) throw error
 *     client.operate(key, ops, (error, record) => {
 *       if (error) throw error
 *       console.log(record.bins) // => { a: 'abcxyz', b: 52, ExpVar: 104 }
 *       client.close()
 *     })
 *   })
 * })
 */

const as = require('bindings')('aerospike.node')
const ops = as.expOperations

/**
 * @protected
 * @class aerospike/exp_operations~ExpOperation
 *
 * @classdesc class for all expression operations executed with the {@link
 * Client#operate} command.
 *
 * Operations can be created using the methods with the following modules:
 * * {@link module:aerospike/exp} - General expression on all types.
 */
class ExpOperation {
  constructor (op, bin, exp, flags, props) {
    this.op = op
    this.bin = bin
    this.exp = exp
    this.flags = flags
    if (props) {
      Object.assign(this, props)
    }
  }
}
exports.ExpOperation = ExpOperation

/**
 * @summary Read the value of the bin.
 *
 * @param {string} bin - The name of the bin.
 * @returns {Operation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.read = function (bin, exp, flags) {
  return new ExpOperation(ops.READ, bin, exp, flags)
}

/**
 * @summary Update the value of the bin.
 *
 * @param {string} bin - The name of the bin.
 * @param {any} value - The value to set the bin to.
 * @returns {Operation} Operation that can be passed to the {@link Client#operate} command.
 */
exports.write = function (bin, exp, flags) {
  return new ExpOperation(ops.WRITE, bin, exp, flags)
}
