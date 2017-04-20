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

const util = require('util')

/**
 * @class AerospikeError
 * @extends Error
 * @classdesc Error status returned by the server.
 *
 * @summary Construct a new AerospikeError instance.
 *
 * @param {number} code - The status code of the error.
 * @param {string} [message] - A message describing the status code.
 * @param {string} [func] - The name of the function in which the error occurred.
 * @param {string} [file] - The file name in which the error occurred.
 * @param {string} [line] - The line number on which the error occurred.
 *
 * @see <code>Aerospike.status</code> contains the full list of possible status codes.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * var key = new Aerospike.Key('test', 'key', 'does_not_exist')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   client.get(key, (error, record) => {
 *     console.log(error) // => { [AerospikeError: AEROSPIKE_ERR_RECORD_NOT_FOUND]
 *                        //      code: 2,
 *                        //      message: 'AEROSPIKE_ERR_RECORD_NOT_FOUND',
 *                        //      func: 'as_event_command_parse_result',
 *                        //      file: 'src/main/aerospike/as_event.c',
 *                        //      line: 614,
 *                        //      name: 'AerospikeError' }
 *   })
 *   client.close()
 * })
 */
function AerospikeError (code, message, func, file, line, stack) {
  /**
   * Error name
   *
   * @name AerospikeError#name
   * @type {string}
   * @readonly
   */
  Object.defineProperty(this, 'name', {value: 'AerospikeError'})

  /**
   * Error message
   *
   * @name AerospikeError#message
   * @type {string}
   * @readonly
   */
  this.message = message || 'Aerospike Error'

  /**
   * Status code.
   *
   * @name AerospikeError#code
   * @type {number}
   * @readonly
   *
   * @see List of status codes defined at {@link module:aerospike.status}
   */
  this.code = code

  /**
   * C/C++ function name where the error occurred.
   *
   * @name AerospikeError#func
   * @type {?string}
   * @readonly
   */
  this.func = func

  /**
   * File name of the C/C++ source file in which the error occurred.
   *
   * @name AerospikeError#file
   * @type {?string}
   * @readonly
   */
  this.file = file

  /**
   * Line number in the C/C++ source file in which the error occurred.
   *
   * @name AerospikeError#file
   * @type {?string}
   * @readonly
   */
  this.line = line

  if (stack) {
    stack = stack.replace(/^.*$/m, util.format('%s: %s', this.name, this.message))
    Object.defineProperty(this, 'stack', {value: stack})
  } else {
    Error.captureStackTrace(this, this.constructor)
  }
}

AerospikeError.fromASError = function (err) {
  return new AerospikeError(err.code, err.message, err.func, err.file, err.line, err.stack)
}

util.inherits(AerospikeError, Error)

module.exports = AerospikeError
