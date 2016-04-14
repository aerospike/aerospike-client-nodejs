// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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

const as = require('../build/Release/aerospike.node')
const Info = require('./info')
const task = require('./task')

/**
 * @class IndexTask
 * @classdesc Potentially long-running index creation task.
 *
 * @see {@link Client#createIndex}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   // create index for vehicle's current location
 *   var binName = 'location'
 *   var indexName = 'locationIndex'
 *   var options = { ns: 'test'
 *                   set: 'demo'
 *                   bin: binName,
 *                   index: indexName,
 *                   datatype: Aerospike.indexDataType.GEO2DSPHERE }
 *   client.createIndex(options, (error, indexTask) => {
 *     if (error) throw error
 *
 *     // wait for index creation to complete
 *     var pollInterval = 100
 *     indexTask.waitUntilDone(pollInterval, (error) => {
 *       if (error) throw error
 *       console.info('secondary index %s on %s was created successfully', indexName, binName)
 *       client.close()
 *     })
 *   })
 * })
 */
function IndexTask (client, namespace, indexName) {
  this.client = client
  this.namespace = namespace
  this.indexName = indexName
}

/**
 * @function IndexTask#waitUntilDone
 *
 * @summary Wait until the task of creating a secondary index has completed.
 *
 * @param {number} [pollInterval=1000] - Interval in milliseconds to use when polling the cluster nodes.
 * @param {Client~doneCallback} callback - The function to call when the operation completes.
 */
IndexTask.prototype.waitUntilDone = function (pollInterval, callback) {
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
 * @function IndexTask#checkStatus
 *
 * @summary Check to see if the task of creating a secondary index has completed.
 *
 * @param {IndexTask~statusCallback} callback - The function to call with the status of the task.
 */
IndexTask.prototype.checkStatus = function (callback) {
  var client = this.client
  this.fetchLoadPercentages(function (err, results) {
    if (err && err.code === as.status.AEROSPIKE_ERR_INDEX_NOT_FOUND) {
      client.callbackHandler(callback, null, false)
    } else if (err) {
      client.callbackHandler(callback, err)
    } else if (results.length === 0) {
      client.callbackHandler(callback, null, false)
    } else {
      var inProgress = results.some(function (pct) {
        return pct >= 0 && pct < 100
      })
      client.callbackHandler(callback, err, !inProgress)
    }
  })
}

/**
 * @private
 *
 * @function IndexTask#fetchLoadPercentages
 *
 * @summary Fetches the "percent loaded" stat for the secondary index from each cluster node.
 */
IndexTask.prototype.fetchLoadPercentages = function (callback) {
  var client = this.client
  var sindex = 'sindex/' + this.namespace + '/' + this.indexName
  var loadPcts = []
  var error = null
  var infoCb = function (err, info) {
    if (err) {
      error = err
    } else {
      var sindexStats = Info.parseInfo(info)[sindex]
      var pct = sindexStats['load_pct'] || 0
      loadPcts.push(pct)
    }
  }
  var doneCb = function () {
    client.callbackHandler(callback, error, loadPcts)
  }
  this.client.info(sindex, infoCb, doneCb)
}

/**
 * @callback IndexTask~statusCallback
 *
 * @summary Callback function called when an operation has completed.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {boolean} [status] - Status of the task: <code>true</code> if it has been completed or <code>false</code> otherwise.
 */

module.exports = IndexTask
