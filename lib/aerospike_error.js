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
function AerospikeError (code, message, func, file, line) {
  if (typeof code === 'object') {
    Object.keys(code).forEach(function (key) {
      this[key] = code[key]
    }, this)
  } else {
    this.code = code
    this.message = message
    this.func = func
    this.file = file
    this.line = line
  }
  this.name = 'AerospikeError'
  this.message = this.message || 'Aerospike Error'
  Error.captureStackTrace(this, this.constructor)
}

util.inherits(AerospikeError, Error)

module.exports = AerospikeError
