// *****************************************************************************
// Copyright 2013-2021 Aerospike, Inc.
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
const AerospikeError = require('./error')
const CommandQueuePolicy = require('./policies/command_queue_policy')

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

let _commandQueuePolicy = new CommandQueuePolicy()

/**
 * @memberof! module:aerospike
 *
 * @summary Release event loop resources held by the module, which could keep
 * the Node.js event loop from shutting down properly.
 *
 * @description This method releases some event loop resources held by the
 * Aerospike module and the Aerospike C client library, such as libuv handles
 * and timers. If not released, these handles will prevent the Node.js event
 * loop from shutting down, i.e. it will keep your application from
 * terminating.
 *
 * The Aerospike module keeps an internal counter of active {@link Client}
 * instances, i.e. instances which have not been <code>close()</code>'d yet. If
 * a client is closed and the counter reaches zero, this method will be called
 * automatically, unless {@link Client#close} is called with
 * <code>releaseEventLoop</code> set to <code>false</code>. (The default is
 * <code>true</code>.)
 *
 * If an application needs to create multiple client instance, i.e. to connect
 * to multiple, different clusters, the event loop resources will be managed
 * automatically, as long as at least once client instance is active at any
 * given time, until the application terminates.
 *
 * If, however, there could be one or more intermittent time periods, during
 * which no client is active (i.e. the internal client counter reaches zero),
 * then the clients need to be closed with <code>releaseEventLoop</code> set
 * to <code>false</code> and the event loop needs to be released explicitly by
 * calling <code>releaseEventLoop()</code>.
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
    throw new AerospikeError('Event loop resources have already been released! Call Client#close() with releaseEventLoop set to false to avoid this error.')
  }

  if (_eventLoopInitialized) {
    referenceEventLoop()
  } else {
    as.register_as_event_loop(_commandQueuePolicy)
    _eventLoopInitialized = true
  }
}

/**
 * @private
 */
function referenceEventLoop () {
  if (!_eventLoopInitialized || _eventLoopReleased) {
    throw new AerospikeError('Event loop is not initialized right now')
  }

  as.ref_as_event_loop()
}

/**
 * @private
 */
function unreferenceEventLoop () {
  if (!_eventLoopInitialized || _eventLoopReleased) {
    throw new AerospikeError('Event loop is not initialized right now')
  }

  as.unref_as_event_loop()
}

/**
 * @private
 */
function setCommandQueuePolicy (policy) {
  if (_eventLoopInitialized) {
    throw new AerospikeError('Command queue has already been initialized! Call Aerospike#setGlobalCommandQueuePolicy() before connecting any client instances.')
  }
  _commandQueuePolicy = policy
}

module.exports = {
  releaseEventLoop,
  registerASEventLoop,
  referenceEventLoop,
  unreferenceEventLoop,
  setCommandQueuePolicy
}
