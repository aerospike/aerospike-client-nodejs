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

const status = require('./status')

/**
 * Error raised by the client when execution of a database command fails. This
 * may be either due to an error status code returned by the server, or caused
 * by an error condition that occured on the client side.
 *
 * @extends Error
 *
 * @example <caption>Expected output: "Error: 127.0.0.1:3000 Record does not exist in database. May be returned by read, or write with policy Aerospike.policy.exists.UPDATE [2]"</caption>
 *
 * const Aerospike = require('aerospike')
 * let key = new Aerospike.Key('test', 'key', 'does_not_exist')
 * Aerospike.connect()
 *   .then(client => {
 *     client.get(key)
 *       .then(record => console.info(record))
 *       .catch(error => console.error(`Error: ${error.message} [${error.code}]`))
 *       .then(() => client.close())
 *   })
 */
class AerospikeError extends Error {
  /** @private */
  constructor (message, command) {
    super(message)
    this.name = this.constructor.name

    /**
     * Numeric status code returned by the server or the client.
     *
     * @type {number}
     * @readonly
     *
     * @see {@link module:aerospike.status} contains the full list of possible status codes.
     */
    this.code = status.ERR_CLIENT

    /**
     * Command during which the error occurred.
     *
     * @type {?Command}
     * @readonly
     */
    this.command = command || null

    /**
     * C/C++ function name in which the error occurred.
     *
     * @type {?string}
     * @readonly
     */
    this.func = null

    /**
     * File name of the C/C++ source file in which the error occurred.
     *
     * @type {?string}
     * @readonly
     */
    this.file = null

    /**
     * Line number in the C/C++ source file in which the error occurred.
     *
     * @type {?number}
     * @readonly
     */
    this.line = null

    /**
     * It is possible that a write transaction completed even though the client
     * returned this error. This may be the case when a client error occurs
     * (like timeout) after the command was sent to the server.
     *
     * @type {boolean}
     * @readonly
     */
    this.inDoubt = false

    if (command && command.stack) {
      this.setStackTrace(command.stack)
    }
  }

  /** @private */
  static fromASError (asError, command) {
    if (!asError) {
      return null
    } else if (asError.code === status.OK) {
      return null
    } else if (asError instanceof AerospikeError) {
      return asError
    } else {
      const message = this.formatMessage(asError.message, asError.code)
      const error = new AerospikeError(message, command)
      this.copyASErrorProperties(error, asError)
      return error
    }
  }

  /** @private */
  static copyASErrorProperties (target, source) {
    target.code = source.code
    target.inDoubt = source.inDoubt
    target.func = source.func
    target.file = source.file
    target.line = Number.parseInt(source.line)
  }

  /** @private */
  static formatMessage (message, code) {
    if (message) {
      message = message.replace(/AEROSPIKE_[A-Z_]+/, () => status.getMessage(code))
    }
    return message
  }

  /** @private */
  setStackTrace (stack) {
    const firstLine = `${this.name}: ${this.message}`
    stack = stack.replace(/^.*$/m, firstLine)
    Object.defineProperty(this, 'stack', { value: stack })
  }

  /**
   * Indicates whether the error originated on the database server.
   *
   * @returns {boolean} - <code>true</code> if the server raised the error, <code>false</code> otherwise.
   */
  isServerError () {
    return this.code > status.OK
  }

  /**
   * The {@link Client} instance associated with this error, if any.
   *
   * @type {?Client}
   * @readonly
   * @since v3.7.0
   *
   * @example <caption>Closing the client connection, when an error occurs:</caption>
   *
   * const Aerospike = require('aerospike')
   *
   * Aerospike.connect().then(async client => {
   *   await client.put(new Aerospike.Key('demo', 'test', 'foo'), { 'foo': 'bar' })
   *   client.close()
   * }).catch(error => {
   *   console.error('Error: %s [%i]', error.message, error.code)
   *   if (error.client) error.client.close()
   * })
   */
  get client () {
    if (this.command) return this.command.client
  }
}

module.exports = AerospikeError
