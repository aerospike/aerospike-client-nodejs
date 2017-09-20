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

const as = require('bindings')('aerospike.node')
const Info = require('./info')
const Job = require('./job')

const util = require('util')

/**
 * @class IndexJob
 * @classdesc Potentially long-running index creation job.
 * @extends Job
 *
 * @see {@link Client#createIndex}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * let binName = 'location'
 * let indexName = 'locationIndex'
 * let options = {
 *   ns: 'test'
 *   set: 'demo'
 *   bin: binName,
 *   index: indexName,
 *   datatype: Aerospike.indexDataType.GEO2DSPHERE
 * }
 *
 * Aerospike.connect()
 *   .then(client => {
 *     client.createIndex(options)
 *     .then(job => job.wait())
 *     .then(() => {
 *       console.info('Secondary index %s on %s was created successfully', indexName, binName)
 *       client.close()
 *     })
 *     .catch(error => {
 *       console.error('Error creating index:', error)
 *       client.close()
 *     })
 *   })
 *   .catch(error => console.error('Error connecting to cluster:',  error))
 */
function IndexJob (client, namespace, indexName) {
  this.client = client
  this.namespace = namespace
  this.indexName = indexName
}
util.inherits(IndexJob, Job)

/**
 * @private
 */
IndexJob.prototype.hasCompleted = function (sindexInfo) {
  if (sindexInfo.length === 0) {
    return false
  }

  return sindexInfo.every(info => info['load_pct'] === 100)
}

/**
 * Fetches info for the secondary index from each cluster node.
 *
 * @private
 */
IndexJob.prototype.info = function () {
  return new Promise((resolve, reject) => {
    let sindex = 'sindex/' + this.namespace + '/' + this.indexName
    this.client.infoAll(sindex, (error, responses) => {
      if (responses) {
        error = responses
          .map(response => response.error)
          .filter(error => !!error)
          .find(error => error.code !== as.status.AEROSPIKE_ERR_INDEX_NOT_FOUND)
      }
      if (error) {
        return reject(error)
      }
      let info = responses
        .map(response => Info.parse(response.info))
        .map(info => info[sindex] || { load_pct: 0 })
      resolve(info)
    })
  })
}

/**
 * @function IndexJob#wait
 *
 * @summary Wait until the job of creating a secondary index has completed.
 *
 * @param {number} [pollInterval=1000] - Interval in milliseconds to use when polling the cluster nodes.
 * @param {Client~doneCallback} [callback] - The function to call when the operation completes.
 *
 * @return {?Promise} If no callback function is passed, the function returns a
 * Promise that resolves once the job is completed.
 */

module.exports = IndexJob
