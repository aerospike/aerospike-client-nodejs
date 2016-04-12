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
const ScanTask = require('./scan_task')
const RecordStream = require('./record_stream')

function safeRandomScanID () {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

/**
 * @class Scan
 * @classdesc Interface to perform scan operations on an Aerospike cluster.
 * Scan operations provide the ability to scan all records of a namespace and
 * set in an Aerospike database.
 *
 *
 * For more information, please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/scan.html" title="Aerospike Scan">&uArr;Scans</a>
 * in the Aerospike technical documentation.
 *
 * @param {Client} client - A client instance.
 * @param {string} ns - The namescape.
 * @param {string} set - The name of a set.
 * @param {object} [options] - Scan parameters.
 * @param {Array<string>} [options.select] - List of bin names to select. See
 * {@link Scan#select}.
 * @param {object} [options.udf] - UDF module and function name, and arguments
 * to the function (if any). See {@link Scan#udf}.
 * @param {number} [options.priority] - Priority level at which the scan will
 * be executed. See {@link Scan#priority}.
 * @param {number} [options.percent=100] - Percentage of records to scan. See
 * {@link Scan#percent}.
 * @param {boolean} [options.nobins=false] - Whether only meta data should be
 * returned. See {@link Scan#nobins}.
 * @param {boolean} [options.concurrent=false] - Whether all cluster nodes
 * should be scanned concurrently. See {@link Scan#concurrent}.
 *
 * @see {@link Client#scan}
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var scan = client.scan('test', 'demo')
 *   scan.priority = Aerospike.scanPriority.LOW
 *   scan.percent = 50 // scan only 50% of all records in the set
 *
 *   var recordsSeen = 0
 *   var stream = scan.execute()
 *   stream.on('error', (error) => { throw error })
 *   stream.on('end', () => client.close())
 *   stream.on('data', (record) => {
 *     console.log(record)
 *     recordsSeen++
 *     var abort = recordsSeen > 100 // We've seen enough!
 *     return abort
 *   })
 * })
 */
function Scan (client, ns, set, options) {
  if (typeof set === 'object') {
    options = set
    set = null
  }

  this.client = client

  /**
   * Namespace to scan.
   * @member {string} Scan#ns
   */
  this.ns = ns

  /**
   * Name of the set to scan.
   * @member {string} Scan#set
   */
  this.set = set

  /**
   * List of bin names to be selected by the scan. If a scan specifies bins to
   * be selected, then only those bins will be returned. If no bins are
   * selected, then all bins will be returned (unless {@link Scan#nobins} is
   * set to <code>true</code>).
   *
   * @member {string[]} Scan#select
   *
   * @see Use {@link Scan#selectBins} to specify the bins to select.
   */
  this.select = options.select

  /**
   * UDF module and function name, and arguments to the function (if any). This
   * property is only valid for background scans.
   *
   * @member {object} Scan#udf
   *
   * @see Use {@link Scan#applyEach} to set UDF property.
   */
  this.udf = options.udf

  /**
   * Priority level at which the scan will be executed.
   *
   * @member {number} Scan#priority
   *
   * @see {@link module:aerospike.scanPriority} for enumeration of allowed values.
   */
  this.priority = options.priority

  /**
   * Percentage of records in the cluster to scan.
   *
   * @member {number} Scan#percent
   */
  this.percent = options.percent

  /**
   * If set to <code>true</code>, the scan will return only meta data, and exclude bins.
   *
   * @member {boolean} Scan#nobins
   */
  this.nobins = options.nobins

  /**
   * If set to <code>true</code>, all cluster nodes will be scanned in parallel.
   *
   * @member {boolean} Scan#concurrent.
   */
  this.concurrent = options.concurrent
}

/**
 * @function Scan#applyEach
 *
 * @summary Specifies a UDF record function that should be applied to every record in a background scan.
 *
 * @param {string} udfModule - UDF module name.
 * @param {string} udfFunction - UDF function name.
 * @param {...*} udfArgs - Arguments for the function.
 *
 * @see {@link Scan#background}
 */
Scan.prototype.applyEach = function (udfModule, udfFunction, udfArgs) {
  if (arguments.length >= 3 && !Array.isArray(udfArgs)) {
    udfArgs = Array.prototype.slice.call(arguments, 2)
  }
  this.udf = {
    module: udfModule,
    funcname: udfFunction
  }
  if (udfArgs) {
    this.udf['args'] = udfArgs
  }
}

/**
 * @function Scan#background
 *
 * @summary Perform a read-write background scan and apply a Lua user-defined
 * function (UDF) to each record.
 *
 * @description When a background scan is initiated, the client will not wait
 * for results from the database. Instead a {@link ScanTask} instance will be
 * returned, which can be used to query the scan status on the database.
 *
 * @param {Client~ScanPolicy} [policy] - The Scan Policy to use for this operation.
 * @param {number} [scanID] - ID under which the scan task will operate; will
 * be assigned randomly if zero or undefined.
 * @param {Client~taskCallback} callback - The function to call when the operation completes.
 *
 * @returns {ScanTask} A scan task instance which can be used to query the scan status.
 */
Scan.prototype.background = function (policy, scanID, callback) {
  var self = this
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof scanID === 'function') {
    callback = scanID
    scanID = null
  } else if (typeof callback !== 'function') {
    throw new TypeError('"callback" argument must be a function')
  }
  scanID = scanID || safeRandomScanID()
  this.client.as_client.scanBackground(this.ns, this.set, this, policy, scanID, function backgroundCb (err) {
    var task = new ScanTask(self.client, scanID)
    self.client.callbackHandler(callback, err, task)
  })
}

/**
 * @function Scan#execute
 *
 * @summary Performs a read-only scan on each node in the cluster. As the scan
 * iterates through each partition, it returns the current version of each
 * record to the client.
 *
 * @param {Client~ScanPolicy} [policy] - The Scan Policy to use for this operation.
 *
 * @returns {RecordStream}
 */
Scan.prototype.execute = function (policy, dataCb, errorCb, endCb) {
  if (this.udf) throw new Error('Record UDF can only be applied using background scan.')
  var stream = new RecordStream()
  if (dataCb) stream.on('data', dataCb)
  if (errorCb) stream.on('error', errorCb)
  if (endCb) stream.on('end', endCb)
  var scanID = safeRandomScanID()
  this.client.as_client.scanAsync(this.ns, this.set, this, policy, scanID, function (error, record, meta) {
    if (error && error.code !== as.status.AEROSPIKE_OK) {
      stream.emit('error', error)
    } else if (record === null) {
      stream.aborted = true
      stream.emit('end')
    } else {
      stream.emit('data', record, meta)
    }
    return !stream.aborted
  })
  stream.task = new ScanTask(this.client, scanID)
  return stream
}

/**
 * @function Scan#selectBins
 *
 * @summary Specify the names of bins to be selected by the scan.
 *
 * If a scan specifies bins to be selected, then only those bins will be
 * returned. If no bins are selected, then all bins will be returned. (Unless
 * {@link Scan#nobins} is set to <code>true</code>.)
 *
 * @param {...string} bins - List of bin names to return.
 */
Scan.prototype.selectBins = function (bins) {
  if (Array.isArray(bins)) {
    this.select = bins
  } else {
    this.select = Array.prototype.slice.call(arguments)
  }
}

module.exports = Scan
