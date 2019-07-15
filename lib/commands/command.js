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

const AerospikeError = require('../error')

// Command is an abstract template (aka "mix-in") for concrete command
// subclasses, that execute a specific database command method on the native
// Aerospike add-on. A concrete command subclass should be defined like this,
// where "getAsync" is the native command method to call:
//
//   class GetCommand extends Command("getAsync") {
//       // ...
//   }

/**
 * @class Command
 * @classdesc Database command.
 */
module.exports = asCommand => class Command {
  /** @private */
  constructor (client, args, callback) {
    /**
     * Client instance used to execute this command.
     *
     * @name Command#client
     * @type {Client}
     * @readonly
     */
    this.client = client

    /** @private */
    this.args = args

    if (callback) {
      /** @private */
      this.callback = callback
    }

    /**
     * Whether debug stacktraces are enabled.
     *
     * @name Command#captureStackTraces
     * @type {boolean}
     * @readonly
     * @see {@link Client#captureStackTraces}
     */
    this.captureStackTraces = client.captureStackTraces

    /**
     * The record key for which the command was issued. (Single-key commands only.)
     *
     * @name Command#key
     * @type {?Key}
     * @readonly
     */
    this.key = undefined

    this.ensureConnected = true
  }

  /** @private */
  captureStackTrace () {
    if (this.captureStackTraces) {
      AerospikeError.captureStackTrace(this, this.captureStackTrace)
      // this.startTime = process.hrtime()
    }
  }

  /** @private */
  connected () {
    return this.client.isConnected(false)
  }

  /** @private */
  convertError (error) {
    return AerospikeError.fromASError(error, this)
  }

  /** @private */
  convertResult (arg1, arg2, arg3) {
    return arg1
  }

  /** @private */
  convertResponse (err, arg1, arg2, arg3) {
    const error = this.convertError(err)
    const result = this.convertResult(arg1, arg2, arg3)
    return [error, result]
  }

  /** @private */
  execute () {
    if (this.ensureConnected && !this.connected()) {
      return this.sendError('Not connected.')
    }

    this.captureStackTrace()

    if (this.expectsPromise()) {
      return this.executeAndReturnPromise()
    } else {
      return this.executeWithCallback(this.callback.bind(this))
    }
  }

  /** @private */
  executeWithCallback (callback) {
    // C client will call the callback function synchronously under certain error
    // conditions; if we detect a synchronous callback we need to schedule the JS
    // callback to be called asynchronously anyway.
    let sync = true
    this.process((error, result) => {
      if (sync) {
        process.nextTick(callback, error, result)
      } else {
        return callback(error, result)
      }
    })
    sync = false // if we get here before the cb was called the cb is async
  }

  /** @private */
  executeAndReturnPromise () {
    return new Promise((resolve, reject) => {
      this.process((error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }

  /** @private */
  expectsPromise () {
    return !this.callback
  }

  /** @private */
  asCommand () {
    return asCommand
  }

  /** @private */
  process (cb) {
    const asCallback = (err, arg1, arg2, arg3) => {
      const tmp = this.convertResponse(err, arg1, arg2, arg3)
      const error = tmp[0]
      const result = tmp[1]
      return cb(error, result)
    }
    const asArgs = this.args.concat([asCallback])
    this.client.asExec(this.asCommand(), asArgs)
  }

  /** @private */
  sendError (message) {
    const error = new AerospikeError(message, this)
    if (this.expectsPromise()) {
      return Promise.reject(error)
    } else {
      process.nextTick(this.callback, error)
    }
  }
}
