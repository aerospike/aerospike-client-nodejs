// *****************************************************************************
// Copyright 2013-2018 Aerospike, Inc.
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
 * Policy governing the use of the global command queue.
 *
 * **Which commands are affected by the command queue?**
 *
 * Not all client commands use the command queue. Only single-key commands
 * (e.g. Put, Get, etc.), the BatchRead command, and {@link Query#foreach},
 * {@link Scan#foreach} commands use the command queue (if enabled).
 *
 * Commands that are based on the Aerospike info protocol (Index
 * Create/Remove, UDF Register/Remove, Truncate, Info), the legacy Batch
 * Get/Select/Exists commands as well as all other Query and Scan commands do
 * not use the command queue and will always be executed immediately.
 *
 * @see {@link module:aerospike.setupGlobalCommandQueue
 * Aerospike.setupGlobalCommandQueue} - function used to initialize the global
 * command queue.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * const policy = {
 *   maxCommandsInProcess: 50,
 *   maxCommandsInQueue: 150
 * }
 * Aerospike.setupGlobalCommandQueue(policy)
 *
 * Aerospike.connect()
 *   .then(client => {
 *     let commands = []
 *     for (var i = 0; i < 100; i++) {
 *       let cmd = client.put(new Aerospike.Key('test', 'test', i), {i: i})
 *       commands.push(cmd)
 *     }
 *
 *     // First 50 commands will be executed immediately,
 *     // remaining commands will be queued and executed once the client frees up.
 *     Promise.all(commands)
 *       .then(() => console.info('All commands executed successfully'))
 *       .catch(error => console.error('Error:', error))
 *       .then(() => client.close())
 *   })
 */
class CommandQueuePolicy {
  /**
   * Initializes a new CommandQueuePolicy from the provided policy values.
   *
   * @param {Object} [props] - Policy values
   * @param {number} [props.maxCommandsInProcess] - Maximum number of async
   * commands that can be processed at any point in time.
   * @param {number} [props.maxCommandsInQueue] - Maximum number of commands that can be queued for later execution.
   * @param {number} [props.queueInitialCapacty] - Initial capacity of the command queue.
   */
  constructor (props) {
    props = props || {}

    /**
     * Maximum number of commands that can be processed at any point in time.
     * Each executing command requires a socket connection. Consuming too many
     * sockets can negatively affect application reliability and performance.
     * If you do not limit command count in your application, this setting
     * should be used to enforce a limit internally in the client.
     *
     * If this limit is reached, the next command will be placed on the
     * client's command queue for later execution. If this limit is zero, all
     * commands will be executed immediately and the command queue will not be
     * used. (Note: {@link Config#maxConnsPerNode} may still limit number of
     * connections per cluster node.)
     *
     * If defined, a reasonable value is 40. The optimal value will depend on
     * the CPU speed and network bandwidth.
     *
     * @type Number
     * @default 0 (execute all commands immediately)
     */
    this.maxCommandsInProcess = props.maxCommandsInProcess

    /**
     * Maximum number of commands that can be stored in the global command
     * queue for later execution. Queued commands consume memory, but they do
     * not consume sockets. This limit should be defined when it's possible
     * that the application executes so many commands that memory could be
     * exhausted.
     *
     * If this limit is reached, the next command will be rejected with error
     * code <code>ERR_ASYNC_QUEUE_FULL</code>. If this limit is zero, all
     * commands will be accepted into the delay queue.
     *
     * The optimal value will depend on the application's magnitude of command
     * bursts and the amount of memory available to store commands.
     *
     * @type Number
     * @default 0 (no command queue limit)
     */
    this.maxCommandsInQueue = props.maxCommandsInQueue

    /**
     * Initial capacity of the command queue. The command queue can resize
     * beyond this initial capacity.
     *
     * @type Number
     * @default 256 (if command queue is used)
     */
    this.queueInitialCapacity = props.queueInitialCapacity
  }
}

module.exports = CommandQueuePolicy
