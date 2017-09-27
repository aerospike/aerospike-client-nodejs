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

const AerospikeError = require('../error')
const status = require('../status')

class Command {
  constructor (client, name, args, callback) {
    this.client = client
    this.name = name
    this.args = args
    if (callback) this.callback = callback
    this.captureStackTraces = client.captureStackTraces
  }

  captureStackTrace () {
    if (this.captureStackTraces) {
      this.stackTrace = AerospikeError.captureStackTrace()
    }
  }

  connected () {
    return this.client.isConnected(false)
  }

  convertError (error) {
    return AerospikeError.fromASError(error, this.stackTrace)
  }

  convertResult (arg1, arg2, arg3) {
    return arg1
  }

  convertResponse (err, arg1, arg2, arg3) {
    let error = this.convertError(err)
    let result = this.convertResult(arg1, arg2, arg3)
    return [error, result]
  }

  execute () {
    if (!this.connected()) {
      return this.sendError('Not connected.')
    }

    this.captureStackTrace()

    if (this.expectsPromise()) {
      return this.executeAndReturnPromise()
    } else {
      return this.executeWithCallback(this.callback.bind(this))
    }
  }

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

  expectsPromise () {
    return !this.callback
  }

  process (cb) {
    let asCallback = (err, arg1, arg2, arg3) => {
      let tmp = this.convertResponse(err, arg1, arg2, arg3)
      let error = tmp[0]
      let result = tmp[1]
      return cb(error, result)
    }
    let asArgs = this.args.concat([asCallback])
    this.client.asExec(this.name, asArgs)
  }

  sendError (message) {
    let error = new AerospikeError(status.ERR_CLIENT, message)
    if (this.expectsPromise()) {
      return Promise.reject(error)
    } else {
      process.nextTick(this.callback, error)
    }
  }
}

module.exports = Command
