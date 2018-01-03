// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the 'License')
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

const Info = require('./info')
const Job = require('./job')

const util = require('util')

/**
 * @class UdfJob
 * @classdesc Job class for waiting for UDF module registration/deregistration
 * to complete across an entire Aerospike cluster.
 * @extends Job
 *
 * @see {@link Client#udfRegister}
 * @see {@link Client#udfRemove}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * let path = './udf/my_module.lua'
 *
 * Aerospike.connect()
 *   .then(client => {
 *     client.udfRegister(path)
 *     .then(job => job.wait())
 *     .then(() => {
 *       console.info('UDF module %s was registered successfully', path)
 *       client.close()
 *     })
 *     .catch(error => {
 *       console.error('Error registering UDF module:', error)
 *       client.close()
 *     })
 *   })
 *   .catch(error => console.error('Error connecting to cluster:',  error))
 */
function UdfJob (client, udfModule, command) {
  this.client = client
  this.udfModule = udfModule
  this.command = command
}
util.inherits(UdfJob, Job)

UdfJob.REGISTER = 'register'
UdfJob.UNREGISTER = 'unregister'

/**
 * @private
 */
UdfJob.prototype.hasCompleted = function (info) {
  let filename = this.udfModule
  let existsOnNode = Object.keys(info).map(
    node => info[node]['udf-list'].some(
      module => module.filename === filename))
  let expected = this.command === UdfJob.REGISTER
  return existsOnNode.every(exists => exists === expected)
}

/**
 * @private
 */
UdfJob.prototype.info = function () {
  return this.client.infoAll('udf-list')
    .then(info => info.reduce((map, resp) => {
      map[resp.host.node_id] = Info.parse(resp.info)
      return map
    }, {}))
}

/**
 * @function UdfJob#wait
 *
 * @summary Wait until the Lua module has been registered/unregistered with the entire cluster.
 *
 * @param {number} [pollInterval=1000] - Interval in milliseconds to use when polling the cluster nodes.
 * @param {Client~doneCallback} [callback] - The function to call when the operation completes.
 *
 * @return {?Promise} If no callback function is passed, the function returns a
 * Promise that resolves once the job is completed.
 */

module.exports = UdfJob
