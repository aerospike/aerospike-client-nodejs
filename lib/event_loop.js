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

const as = require('bindings')('aerospike.node')

/**
 * Whether event loop resources have been released
 *
 * @type {boolean}
 * @private
 */
let _eventLoopReleased = false

/**
 * Whether event loop resources have been created
 *
 * @type {boolean}
 * @private
 */
let _eventLoopInitialized = false

/**
 * @memberof! module:aerospike
 *
 * @summary Release event loop resources.
 *
 * @description This method releases the event loop resources held by the
 * Aerospike C client library. It is normally called automatically when the
 * Aerospike Node.js client instance is closed. However, when the application
 * needs to create multiple client instances, then `releaseEventLoop = false`
 * needs to be passed in the {@link Client#close} method and the event loop
 * resources need to be released explicitly by calling this method.
 *
 * @example <caption>Working with multiple client instances.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // called one or more times to handle a new work request
 * function handleRequest (request) {
 *   Aerospike.connect(function (err, client) {
 *     if (err) {
 *       // handle error
 *     }
 *     // handle request
 *     client.close(false) // do not release event loop
 *   })
 * }
 *
 * // called when application shuts down
 * function shutdown () {
 *   Aerospike.releaseEventLoop()
 * }
 */
function releaseEventLoop () {
  if (_eventLoopReleased) return
  if (as.get_cluster_count() > 0) {
    setTimeout(releaseEventLoop, 5)
  } else {
    as.release_as_event_loop()
    _eventLoopReleased = true
  }
}

/**
 * @private
 */
function registerASEventLoop () {
  if (_eventLoopReleased) {
    throw new Error('Event loop resources have already been released! Call Client#close() with releaseEventLoop set to false to avoid this error.')
  }

  if (!_eventLoopInitialized) {
    as.register_as_event_loop()
    _eventLoopInitialized = true
  }
}

module.exports = {
  releaseEventLoop: releaseEventLoop,
  registerASEventLoop: registerASEventLoop
}
