// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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
 *
 * @deprecated since server 6.0
 *
 * @classdesc The scan object created by calling {@link Client#scan} is used
 * for executing record scans on the specified namespace and set (optional).
 * Scans can return a set of records as a {@link RecordStream} or apply an
 * Aerospike UDF (user-defined function) on each of the records on the server.
 *
 * #### Scan is obsolete in server 6.0
 * Use query methods implemented by {@link Client#query}.
 * For more information, please refer to the section on
 * <a href="https://docs.aerospike.com/server/guide/scan#historical-evolution-of-scan-features">&uArr;Historical evolution of scan features</a>
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
 * #### Scan pagination
 *
 * Scan pagination allows for queries return records in pages rather than all at once.
 * To enable scan pagination, the scan property {@link Scan#paginate} must be true
 * and the previously stated scan policy {@link ScanPolicy#maxRecords} must be set to a
 * nonzero positive integer in order to specify a maximum page size.
 *
 * When a page is complete, {@link RecordStream} event {@link RecordStream#event:error} will
 * emit a {@link Scan#scanState} object containing a serialized version of the scan.
 * This serialized scan, if be assigned back to {@link Scan#scanState}, allows the scan
 * to retrieve the next page of records in the scan upon calling {@link Scan#foreach}.
 * If {@link RecordStream#event:error} emits an <code>undefined</code> object, either {@link Scan#paginate}
 * is not <code>true</code>, or the scan has successfully returned all the specified records.
 *
 * For additional information and examples, please refer to the {@link Scan#paginate} section
 * below.
 *
 * @param {Client} client - A client instance.
 * @param {string} ns - The namescape.
 * @param {string} set - The name of a set.
 * @param {object} [options] - Scan parameters.
 * @param {Array<string>} [options.select] - List of bin names to select. See
 * {@link Scan#select}.
 * @param {boolean} [options.nobins=false] - Whether only meta data should be
 * returned. See {@link Scan#nobins}.
 * @param {boolean} [options.concurrent=false] - Whether all cluster nodes
 * should be scanned concurrently. See {@link Scan#concurrent}.
 * @param {boolean} [options.ttl=0] - The time-to-live (expiration) of the record in seconds.
 * See {@link Scan#ttl}.
 *
 *
 * @see {@link Client#scan} to create new instances of this class.
 *
 * @since v2.0
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
 *    }
 * }
 *
 * Aerospike.connect(config, (error, client) => {
 *   if (error) throw error
 *
 *   const scan = client.scan('test', 'demo')
 *   let recordsSeen = 0
 *   const stream = scan.foreach()
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

  /**
   * If set to <code>true</code>, the scan will return only those belongs to partitions.
   *
   * @member {boolean} Scan#pfEnabled
   * @private
   */
  this.pfEnabled = false
  /**
   * If set to <code>true</code>, paginated queries are enabled. In order to receive paginated
   * results, the {@link ScanPolicy#maxRecords} property must assign a nonzero integer value.
   *
   * @member {boolean} Scan#paginate
   *
   * @example <caption>Asynchronous pagination over a set of thirty records with {@link Scan#foreach}.</caption>
   *
   * const Aerospike = require('./lib/aerospike');
   * // Define host configuration
   * let config = {
   *   hosts: '34.213.88.142:3000',
   *   policies: {
   *     batchWrite : new Aerospike.BatchWritePolicy({socketTimeout : 0, totalTimeout : 0}),
   *   }
   * };
   *
   * var batchRecords = []
   * for(let i = 0; i < 30; i++){
   *   batchRecords.push({
   *     type: Aerospike.batchType.BATCH_WRITE,
   *     key: new Aerospike.Key('test', 'demo', 'key' + i),
   *     ops:[Aerospike.operations.write('exampleBin', i)]
   *   })
   * }
   *
   * ;(async function() {
   *   try {
   *     client = await Aerospike.connect(config)
   *     await client.truncate('test', 'demo', 0)
   *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
   *
   *     const scan = client.scan('test', 'demo', {paginate: true})
   *     do {
   *       const stream = scan.foreach({maxRecords: 11})
   *       stream.on('error', (error) => { throw error })
   *       stream.on('data', (record) => {
   *         console.log(record.bins)
   *       })
   *       await new Promise(resolve => {
   *         stream.on('end', (scanState) => {
   *           scan.nextPage(scanState)
   *           console.log(scan.scanState)
   *           resolve()
   *         })
   *       })
   *     } while (scan.hasNextPage())
   *
   *   } catch (error) {
   *     console.error('An error occurred at some point.', error)
   *     process.exit(1)
   *   } finally {
   *     if (client) client.close()
   *   }
   * })()
   *
   * @example <caption>Asynchronous pagination over a set of thirty records with {@link Scan#foreach}.</caption>
   *
   * const Aerospike = require('./lib/aerospike');
   * // Define host configuration
   * let config = {
   *   hosts: '34.213.88.142:3000',
   *   policies: {
   *     batchWrite : new Aerospike.BatchWritePolicy({socketTimeout : 0, totalTimeout : 0}),
   *   }
   * };
   *
   * var batchRecords = []
   * for(let i = 0; i < 30; i++){
   *   batchRecords.push({
   *     type: Aerospike.batchType.BATCH_WRITE,
   *     key: new Aerospike.Key('test', 'demo', 'key' + i),
   *     ops:[Aerospike.operations.write('exampleBin', i)]
   *   })
   * }
   *
   * ;(async function() {
   *   try {
   *     client = await Aerospike.connect(config)
   *     await client.truncate('test', 'demo', 0)
   *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
   *
   *     const scan = client.scan('test', 'demo', {paginate: true})
   *     let allResults = []
   *     let results = await scan.results({maxRecords: 11})
   *     allResults = [...allResults, ...results]
   *
   *
   *     results = await scan.results({maxRecords: 11})
   *     allResults = [...allResults, ...results]
   *
   *     results = await scan.results({maxRecords: 11})
   *     allResults = [...allResults, ...results]
   *
   *     console.log("Records returned in total: " + allResults.length)  // Should be 30 records
   *
   *   } catch (error) {
   *     console.error('An error occurred at some point.', error)
   *     process.exit(1)
   *   } finally {
   *     if (client) client.close()
   *   }
   * })()
   *
   */
  this.paginate = options.paginate

  /**
   * If set to a valid serialized scan, calling {@link scan#foreach} will allow the next page of records to be queried while preserving the progress
   * of the previous scan. If set to <code>null</code>, calling {@link scan#foreach} will begin a new scan.
   * @member {number} Scan#scanState
   */
  this.scanState = undefined

  /**
   * The time-to-live (expiration) of the record in seconds.
   * There are also special values that can be set in the record TTL:
   *
   * 0 (defined Aerospike.ttl.NAMESPACE_DEFAULT), which means that the
   * record will adopt the default TTL value from the namespace.
   *
   * -1 (defined Aerospike.ttl.NEVER_EXIRE), which means that the record
   * will get an internal "void_time" of zero, and thus will never expire.
   *
   * -2 (defined Aerospike.ttl.DONT_UPDATE), which means that the record
   * ttl will not change when the record is updated.
   *
   * Note that the TTL value will be employed ONLY on background scan writes.
   * @member {number} Scan#ttl
   */
  this.ttl = options.ttl
}

/**
 * @function Scan#nextPage
 *
 * @summary Sets {@link scan#scanState} to the value specified by the <code>state</code> argument.
 *
 * @description setter function for the {@link Scan#scanState} member variable.
 *
 * @param {...object} state - serialized scan emitted from the {@link RecordStream#event:error} event.
 */
Scan.prototype.nextPage = function (state) {
  this.scanState = state
}

/**
 * @function Scan#hasNextPage
 *
 * @summary Checks compiliation status of a paginated scan.
 *
 * @description If <code>false</code> is returned, there are no more records left in the scan, and the scan is complete.
 * If <code>true</code> is returned, calling {@link Scan#foreach} will continue from the state specified by {@link Scan#scanState}.
 *
 * @returns {boolean}
 */
Scan.prototype.hasNextPage = function () {
  return (!!this.scanState)
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
 * @function Scan#partitions
 *
 * @summary Specify the begin and count of the partitions
 * to be scanned by the scan foreach op.
 *
 * @description If a scan specifies partitions begin and count,
 * then only those partitons will be scanned and returned.
 * If no partitions are specified,
 * then all partitions will be scanned and returned.
 *
 * @param {number} begin - Start partition number to scan.
 * @param {number} count - Number of partitions from the start to scan.
 * @param {string} digest - Start from this digest if it is specified.
 */
Scan.prototype.partitions = function (begin, count, digest) {
  this.partFilter = { begin, count, digest }
  this.pfEnabled = true
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
 * This method requires server >= 3.7.0.
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
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     scan : new Aerospike.ScanPolicy({socketTimeout : 0, totalTimeout : 0})
 *    }
 * }
 *
 * Aerospike.connect(config).then(async (client) => {
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
 * @param {recordCallback} [dataCb] - The function to call when the
 * operation completes with the results of the operation; if no callback
 * function is provided, the method returns a <code>Promise<code> instead.
 * @param {errorCallback} [errorCb] - Callback function called when there is an error.
 * @param {doneCallback} [endCb] -  Callback function called when an operation has completed.
 *
 * @returns {RecordStream}
 */
Scan.prototype.foreach = function (policy, dataCb, errorCb, endCb) {
  if (this.udf) throw new Error('Record UDF can only be applied using background scan.')
  const stream = new RecordStream(this.client)
  if (dataCb) stream.on('data', dataCb)
  if (errorCb) stream.on('error', errorCb)
  if (endCb) stream.on('end', endCb)
  const scanID = Job.safeRandomJobID()
  const args = [this.ns, this.set, this, policy, scanID]
  if (this.paginate) {
    args.push(this.scanState)
    const cmd = new Commands.ScanPages(stream, args)
    cmd.execute()
  } else {
    const cmd = new Commands.Scan(stream, args)
    cmd.execute()
  }

  stream.job = new Job(this.client, scanID, 'scan')
  return stream
}

/**
 * @function Scan#results
 *
 * @summary Executes the Scan and collects the results into an array. On paginated queries,
 * preparing the next page is also handled automatically.
 *
 * @description This method returns a Promise that contains the scan results
 * as an array of records, when fulfilled. It should only be used if the scan
 * is expected to return only few records; otherwise it is recommended to use
 * {@link Scan#foreach}, which returns the results as a {@link RecordStream}
 * instead.
 *
 * If pagination is enabled, the data emitted from the {@link RecordStream#event:error}
 * event will automatically be assigned to {@link Scan#scanState}, allowing the next page
 * of records to be queried if {@link Scan#foreach} or {@link Scan#results} is called.
 *
 * @param {ScanPolicy} [policy] - The Scan Policy to use for this operation.
 *
 * @returns {Promise<RecordObject[]>}
 */
Scan.prototype.results = function (policy) {
  return new Promise((resolve, reject) => {
    const stream = this.foreach(policy)
    const results = []
    stream.on('error', reject)
    stream.on('data', record => results.push(record))
    stream.on('end', (scanState) => {
      this.scanState = scanState
      resolve(results)
    })
  })
}

module.exports = Scan
