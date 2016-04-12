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

const as = require('../build/Release/aerospike.node')
const task = require('./task')

/**
 * @class ScanTask
 * @classdesc Potentially long-running background scan task.
 *
 * @see {@link Scan#background}
 */
function ScanTask (client, scanID) {
  this.client = client
  this.id = scanID
}

/**
 * @function ScanTask#info
 *
 * @summary Check the progress of a background scan running on the database.
 *
 * @param {number} [pollInterval=1000] - Interval in milliseconds to use when polling the cluster nodes.
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {ScanTask~infoCallback} callback - The function to call with the scan info response.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var scan = client.scan('test', 'demo')
 *   scan.applyEach('myUdfModule', 'myUdfFunction')
 *   scan.background((error, scanTask) => {
 *     if (error) throw error
 *     var timer = setInterval(() => {
 *       scanTask.info((error, info) => {
 *         if (error) throw error
 *         console.info('scan status: %d (%d%% complete, %d records scanned)', info.status, info.progressPct, info.recordsScanned)
 *         if (info.status === Aerospike.scanStatus.COMPLETED) {
 *           console.info('scan completed!')
 *           clearInterval(timer)
 *           client.close()
 *         }
 *       })
 *     }, 1000)
 *   })
 * })
 */
ScanTask.prototype.info = function (policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }
  var self = this
  this.client.as_client.scanInfo(this.id, policy, function scanInfoCb (err, info) {
    self.client.callbackHandler(callback, err, info)
  })
}

/**
 * @function ScanTask#waitUntilDone
 *
 * @summary Wait until the background scan has been completed.
 *
 * @param {number} [pollInterval=1000] - Interval in milliseconds to use when polling the cluster nodes.
 * @param {Client~doneCallback} callback - The function to call when the scan completes.
 */
ScanTask.prototype.waitUntilDone = function (pollInterval, callback) {
  if (typeof pollInterval === 'function') {
    callback = pollInterval
    pollInterval = null
  }
  var self = this
  var checkStatus = this.checkStatus.bind(this)
  task.pollUntilDone(checkStatus, pollInterval, function (err) {
    self.client.callbackHandler(callback, err)
  })
}

/**
 * @private
 *
 * @function ScanTask#checkStatus
 *
 * @summary Check to see if the background scan has completed.
 */
ScanTask.prototype.checkStatus = function (callback) {
  this.info(function (err, info) {
    if (err) {
      callback(err)
    } else {
      var completed = (info.status === as.scanStatus.COMPLETED)
      callback(null, completed)
    }
  })
}

/**
 * @callback ScanTask~infoCallback
 *
 * @summary The function called with the scan info response.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {object} [info] - The scan info.
 * @param {number} [info.status] - Status of the scan. See {@link module:aerospike.scanStatus}.
 * @param {number} [info.progressPct] - Progress estimate for the scan, as percentage.
 * @param {number} [info.recordsScanned] - How many records have been scanned.
 *
 */

module.exports = ScanTask
