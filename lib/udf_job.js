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

const Info = require('./info')
const Job = require('./job')

const util = require('util')

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
  var filename = this.udfModule
  var existsOnNode = Object.keys(info).map(function (node) {
    return info[node]['udf-list'].some(function (module) {
      return module.filename === filename
    })
  })
  var expected = this.command === UdfJob.REGISTER
  return existsOnNode.every(function (exists) {
    return exists === expected
  })
}

/**
 * @private
 */
UdfJob.prototype.info = function (callback) {
  var client = this.client
  client.infoAll('udf-list', function (err, info) {
    if (err) {
      client.callbackHandler(callback, err)
    } else {
      info = info.reduce(function (map, resp) {
        map[resp.host.node_id] = Info.parse(resp.info)
        return map
      }, {})
      client.callbackHandler(callback, err, info)
    }
  })
}

/**
 * @function UdfJob#waitUntilDone
 *
 * @summary Wait until the Lua module has been registered/unregistered with the entire cluster.
 *
 * @param {number} [pollInterval=1000] - Interval in milliseconds to use when polling the cluster nodes.
 * @param {Client~doneCallback} callback - The function to call when the operation completes.
 */

module.exports = UdfJob
