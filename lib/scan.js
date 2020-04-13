// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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

const Commands = require('./commands')
const Job = require('./job')
const RecordStream = require('./record_stream')

/**
 * @class Scan
 * @classdesc The scan object created by calling {@link Client#scan} is used
 * for executing record scans on the specified namespace and set (optional).
 * Scans can return a set of records as a {@link RecordStream} or apply an
 * Aerospike UDF (user-defined function) on each of the records on the server.
 *
 * For more information, please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/scan.html">&uArr;Scans</a>
 * in the Aerospike technical documentation.
 *
 * #### Selecting Bins
 *
 * Using {@link Scan#select} it is possible to select a subset of bins which
 * should be returned by the query. If no bins are selected, then the whole
 * record will be returned. If the {@link Scan#nobins} property is set to
 * <code>true</code> the only the record meta data (ttl, generation, etc.) will
 * be returned.
 *
 * #### Executing a Scan
 *
 * A scan is executed using {@link Scan#foreach}. The method returns a {@link
 * RecordStream} which emits a <code>data</code> event for each record returned
 * by the scan. The scan can be aborted at any time by calling
 * {@link RecordStream#abort}.
 *
 * #### Executing Record UDFs using Background Scans
 *
 * Record UDFs perform operations on a single record such as updating records
 * based on a set of parameters. Using {@link Scan#background} you can run a
 * Record UDF on the result set of a scan. Scans using Records UDFs are run
 * in the background on the server and do not return the records to the client.
 *
 * For additional information please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/record_udf.html">&uArr;Record UDFs</a>
 * in the Aerospike technical documentation.
 *
 * @param {Client} client - A client instance.
 * @param {string} ns - The namescape.
 * @param {string} set - The name of a set.
 * @param {object} [options] - Scan parameters.
 * @param {Array<string>} [options.select] - List of bin names to select. See
 * {@link Scan#select}.
 * @param {number} [options.priority] - Priority level at which the scan will
 * be executed. See {@link Scan#priority}.
 * @param {number} [options.percent=100] - Percentage of records to scan. See
 * {@link Scan#percent}.
 * @param {boolean} [options.nobins=false] - Whether only meta data should be
 * returned. See {@link Scan#nobins}.
 * @param {boolean} [options.concurrent=false] - Whether all cluster nodes
 * should be scanned concurrently. See {@link Scan#concurrent}.
 *
 * @see {@link Client#scan} to create new instances of this class.
 *
 * @since v2.0
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
 *   var stream = scan.foreach()
 *   stream.on('error', (error) => { throw error })
 *   stream.on('end', () => client.close())
 *   stream.on('data', (record) => {
 *     console.log(record)
 *     recordsSeen++
 *     if (recordsSeen > 100) stream.abort() // We've seen enough!
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
   * @member {string[]} Scan#selected
   *
   * @see Use {@link Scan#select} to specify the bins to select.
   */
  this.selected = options.select

  /**
   * Priority level at which the scan will be executed.
   *
   * @member {number} Scan#priority
   *
   * @see {@link module:aerospike.scanPriority} for enumeration of allowed values.
   */
  this.priority = options.priority

  /**
   * Percentage of records in the cluster to scan. Valid integer range is 1 to
   * 100.
   *
   * This field is supported on server versions < 4.9. For server versions >=
   * 4.9, use {@link ScanPolicy#maxRecords}.
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
   * @member {boolean} Scan#concurrent
   */
  this.concurrent = options.concurrent
}

/**
 * @function Scan#select
 *
 * @summary Specify the names of bins to be selected by the scan.
 *
 * @description If a scan specifies bins to be selected, then only those bins
 * will be returned. If no bins are selected, then all bins will be returned.
 * (Unless {@link Scan#nobins} is set to <code>true</code>.)
 *
 * @param {...string} bins - List of bin names to return.
 */
Scan.prototype.select = function (bins) {
  if (Array.isArray(bins)) {
    this.selected = bins
  } else {
    this.selected = Array.prototype.slice.call(arguments)
  }
}

/**
 * @function Scan#background
 *
 * @summary Perform a read-write background scan and apply a Lua user-defined
 * function (UDF) to each record.
 *
 * @description When a background scan is initiated, the client will not wait
 * for results from the database. Instead a {@link Job} instance will be
 * returned, which can be used to query the scan status on the database.
 *
 * @param {string} udfModule - UDF module name.
 * @param {string} udfFunction - UDF function name.
 * @param {Array<*>} [udfArgs] - Arguments for the function.
 * @param {ScanPolicy} [policy] - The Scan Policy to use for this operation.
 * @param {number} [scanID] - Job ID to use for the scan; will be assigned
 * randomly if zero or undefined.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to a Job instance.
 */
Scan.prototype.background = function (udfModule, udfFunction, udfArgs, policy, scanID, callback) {
  if (typeof udfArgs === 'function') {
    callback = udfArgs
    udfArgs = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof scanID === 'function') {
    callback = scanID
    scanID = null
  }

  this.udf = {
    module: udfModule,
    funcname: udfFunction,
    args: udfArgs
  }

  const cmd = new Commands.ScanBackground(this.client, this.ns, this.set, this, policy, scanID, callback)
  return cmd.execute()
}

/**
 * @function Scan#operate
 *
 * @summary Applies write operations to all matching records.
 *
 * @description Performs a background scan and applies one or more write
 * operations to all records. Neither the records nor the results of the
 * operations are returned to the client. Instead a {@link Job} instance will
 * be returned, which can be used to query the scan status.
 *
 * This method requires Aerospike Server version >= 3.7.0.
 *
 * @param {module:aerospike/operations~Operation[]} operations - List of write
 * operations to perform on the matching records.
 * @param {ScanPolicy} [policy] - The Scan Policy to use for this operation.
 * @param {number} [scanID] - Job ID to use for the scan; will be assigned
 * randomly if zero or undefined.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to a Job instance.
 *
 * @since v3.14.0
 *
 * @example <caption>Increment count bin on all records in set using a background scan</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect().then(async (client) => {
 *   const scan = client.scan('namespace', 'set')
 *   const ops = [Aerospike.operations.incr('count', 1)]
 *   const job = await scan.operate(ops)
 *   await job.waitUntilDone()
 *   client.close()
 * })
 */
Scan.prototype.operate = function (operations, policy = null, scanID = null, callback = null) {
  this.ops = operations
  const cmd = new Commands.ScanOperate(this.client, this.ns, this.set, this, policy, scanID, callback)
  return cmd.execute()
}

/**
 * @function Scan#foreach
 *
 * @summary Performs a read-only scan on each node in the cluster. As the scan
 * iterates through each partition, it returns the current version of each
 * record to the client.
 *
 * @param {ScanPolicy} [policy] - The Scan Policy to use for this operation.
 *
 * @returns {RecordStream}
 */
Scan.prototype.foreach = function (policy, dataCb, errorCb, endCb) {
  if (this.udf) throw new Error('Record UDF can only be applied using background scan.')
  var stream = new RecordStream(this.client)
  if (dataCb) stream.on('data', dataCb)
  if (errorCb) stream.on('error', errorCb)
  if (endCb) stream.on('end', endCb)

  var scanID = Job.safeRandomJobID()
  const args = [this.ns, this.set, this, policy, scanID]
  const cmd = new Commands.Scan(stream, args)
  cmd.execute()

  stream.job = new Job(this.client, scanID, 'scan')
  return stream
}

module.exports = Scan
