// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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
const Commands = require('./commands')

const DEFAULT_POLL_INTERVALL = 1000

/**
 * @class Job
 * @classdesc Potentially long-running background job.
 *
 * @see {@link Scan#background}
 * @see {@link Query#background}
 */
function Job (client, jobID, module) {
  this.client = client
  this.jobID = jobID
  this.module = module
}

Job.safeRandomJobID = function () {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

/**
 * Repeatedly execute the given status function until it either indicates that
 * the job has completed or returns an error.
 *
 * @returns {Promise}
 *
 * @private
 */
Job.pollUntilDone = function (statusFunction, pollInterval) {
  pollInterval = pollInterval || DEFAULT_POLL_INTERVALL

  return new Promise((resolve, reject) => {
    let timer = null
    const poll = function () {
      statusFunction()
        .then(done => {
          if (done) {
            if (timer) clearInterval(timer)
            resolve()
          } else if (!timer) {
            timer = setInterval(poll, pollInterval)
          }
        })
        .catch(error => {
          if (timer) clearInterval(timer)
          reject(error)
        })
    }
    poll()
  })
}

/**
 * @private
 */
Job.prototype.hasCompleted = function (info) {
  return (info.status === as.jobStatus.COMPLETED)
}

/**
 * Fetch job info once to check if the job has completed.
 *
 * @returns {Promise}
 *
 * @private
 */
Job.prototype.checkStatus = function () {
  return this.info().then(info => this.hasCompleted(info))
}

/**
 * @function Job#info
 *
 * @summary Check the progress of a background job running on the database.
 *
 * @param {Client~InfoPolicy} [policy] - The Info Policy to use for this operation.
 * @param {JobinfoCallback} [callback] - The function to call with the job info response.
 *
 * @return {?Promise} If no callback function is passed, the function returns a
 * Promise that resolves to the job info.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     scan : new Aerospike.ScanPolicy({socketTimeout : 0, totalTimeout : 0}),
 *   }
 * }
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   var scan = client.scan('test', 'demo')
 *   scan.background('myUdfModule', 'myUdfFunction', (error, job) => {
 *     if (error) throw error
 *     var timer = setInterval(() => {
 *       job.info((error, info) => {
 *         if (error) throw error
 *         console.info('scan status: %d (%d%% complete, %d records scanned)', info.status, info.progressPct, info.recordsRead)
 *         if (info.status === Aerospike.jobStatus.COMPLETED) {
 *           console.info('scan completed!')
 *           clearInterval(timer)
 *           client.close()
 *         }
 *       })
 *     }, 1000)
 *   })
 * })
 */
Job.prototype.info = function (policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  }

  const cmd = new Commands.JobInfo(this.client, [this.jobID, this.module, policy], callback)
  return cmd.execute()
}

/**
 * @function Job#wait
 *
 * @summary Wait until the task has been completed.
 *
 * @param {number} [pollInterval=1000] - Interval in milliseconds to use when polling the cluster nodes.
 * @param {JobdoneCallback} [callback] - The function to call when the task has completed.
 *
 * @return {?Promise} If no callback function is passed, the function returns a
 * Promise that resolves once the job is completed.
 */
Job.prototype.wait = function (pollInterval, callback) {
  if (typeof pollInterval === 'function') {
    callback = pollInterval
    pollInterval = null
  }
  const checkStatus = this.checkStatus.bind(this)

  if (typeof callback === 'function') {
    Job.pollUntilDone(checkStatus, pollInterval)
      .then(result => callback(null, result))
      .catch(error => callback(error))
  } else {
    return Job.pollUntilDone(checkStatus, pollInterval)
  }
}

Job.prototype.waitUntilDone = Job.prototype.wait

module.exports = Job
