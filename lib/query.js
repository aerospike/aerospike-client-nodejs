// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
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

const Command = require('./commands/command')
const Job = require('./job')
const RecordStream = require('./record_stream')
const StreamCommand = require('./commands/stream_command')

const assert = require('assert')
const util = require('util')

/**
 * @class Query
 * @classdesc The query object created by calling {@link Client#query} is used
 * for executing queries on the specified namespace and set (optional). Queries
 * perform value-based searches on secondary indexes. Queries can return a set
 * of records as a {@link RecordStream} or be processed using Aeorspike UDFs
 * (user-defined functions) before returning to the client.
 *
 * For more information, please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/query.html" title="Aerospike Queries">&uArr;Queries</a>
 * in the Aerospike technical documentation.
 *
 * #### Filter Predicates
 *
 * Filter predicates can be applied to queries using {@link Query#where} and
 * can further limit the number of records returned. Supported filter predicates include
 *   - [equal()]{@link module:aerospike/filter.eqal}, to match on integer or string equality,
 *   - [range()]{@link module:aerospike/filter.range}, to match on an integer range,
 *   - [contains()]{@link module:aerospike/filter.contains}, to match on list/map membership,
 *   - various geospatial filters, e.g. [geoWithinRadius()]{@link module:aerospike/filter.geoWithinRadius}
 *
 * See {@link module:aerospike/filter} for a list of all supported filter predicates.
 *
 * Before a filter predicate can be applied, a secondary index needs to be
 * created on the bins which the predicate matches on. Using the Node.js
 * client, a secondary index can be created using {@link Client#createIndex}.
 *
 * Currently, a single filter predicate is supported. To do more advanced
 * filtering, you need to use a user-defined function (UDF) to process the
 * result set on the server.
 *
 * To scan _all_ the records in a given namespace and set without applying a
 * filter predicate, you can use {@link Scan} operations instead, which provide
 * more fine-grained control over execution priority, concurrency, etc.
 *
 * #### Selecting Bins
 *
 * Using {@link Query#select} it is possible to select a subset of bins which
 * should be returned by the query. If no bins are selected, then the whole
 * record will be returned.
 *
 * #### Executing a Query
 *
 * A query is executed using {@link Query#foreach}. The method returns a {@link
 * RecordStream} which emits a <code>data</code> event for each record returned
 * by the query. The query can be aborted at any time by calling
 * {@link RecordStream#abort}.
 *
 * #### Applying User-Defined Functions
 *
 * User-defined functions (UDFs) can be used to filter, transform, and
 * aggregate query results. Stream UDFs can process a stream of data by
 * defining a sequence of operations to perform. Stream UDFs perform read-only
 * operations on a collection of records. Use {@link Query#setUdf} to set the
 * UDF parameters (module name, function name and optional list of arguments)
 * before executing the query using {@link Query#foreach}.
 *
 * The feature guides on
 * <a href="http://www.aerospike.com/docs/guide/udf.html">&uArr;User-Defined Functions</a> and
 * <a href="http://www.aerospike.com/docs/guide/stream_udf.html">&uArr;Stream UDFs</a>
 * contain more detailed information and examples.
 *
 * #### Query Aggregation using Stream UDFs
 *
 * Use Aerospike Stream UDFs to aggregate query results using {@link
 * Query#apply}. Aggregation queries work similar to a MapReduce system and
 * return a single result value instead of stream of records. Aggregation
 * results can be basic data types (string, number, byte array) or collection
 * types (list, map).
 *
 * Please refer to the technical documentation on
 * <a href="http://www.aerospike.com/docs/guide/aggregation.html">&uArr;Aggregation</a>
 * for more information.
 *
 * #### Executing Record UDFs using Background Queries
 *
 * Record UDFs perform operations on a single record such as updating records
 * based on a set of parameters. Using {@link Query#background} you can run a
 * Record UDF on the result set of a query. Queries using Records UDFs are run
 * in the background on the server and do not return the records to the client.
 *
 * For additional information please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/record_udf.html">&uArr;Record UDFs</a>
 * in the Aerospike technical documentation.
 *
 * @param {Client} client - A client instance.
 * @param {string} ns - The namescape.
 * @param {string} set - The name of a set.
 * @param {object} [options] - Query parameters.
 * @param {FilterPredicate[]} [options.filters] - List of filter predicates to
 * apply to the query. See {@link Query#where}.
 * @param {string[]} [options.select] - List of bin names to select. See
 * {@link Query#select}.
 *
 * @see {@link Client#query} to create new instances of this class.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * const namespace = 'test'
 * const set = 'demo'
 *
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   var index = {
 *     ns: namespace,
 *     set: set,
 *     bin: 'tags',
 *     index: 'tags_idx',
 *     type: Aerospike.indexType.LIST,
 *     datatype: Aerospike.indexDataType.STRING
 *   }
 *   client.createIndex(index, (error, job) => {
 *     if (error) throw error
 *     job.waitUntilDone((error) => {
 *       if (error) throw error
 *
 *       var query = client.query('test', 'demo')
 *       query.select('id', 'tags')
 *       query.where(Aerospike.filter.contains('tags', 'green', Aerospike.indexType.LIST))
 *       var stream = query.foreach()
 *       stream.on('error', (error) => {
 *         console.error(error)
 *         throw error
 *       })
 *       stream.on('data', (record) => {
 *         console.info(record)
 *       })
 *       stream.on('end', () => {
 *         client.close()
 *       })
 *     })
 *   })
 * })
 */
function Query (client, ns, set, options) {
  if (typeof set === 'object') {
    options = set
    set = null
  }
  options = options || {}
  assertValidQueryOptions(options)

  this.client = client

  /**
   * Namespace to query.
   * @member {string} Query#ns
   */
  this.ns = ns

  /**
   * Name of the set to query.
   * @member {string} Query#set
   */
  this.set = set

  /**
   * Filters to apply to the query.
   *
   * *Note:* Currently, a single filter predicate is supported. To do more
   * advanced filtering, you need to use a user-defined function (UDF) to
   * process the result set on the server.
   *
   * @member {FilterPredicate[]} Query#filters
   *
   * @see Use {@link Query#where} to add filter predicates to a query.
   */
  this.filters = options.filters || []

  /**
   * List of bin names to be selected by the query. If a query specifies bins to
   * be selected, then only those bins will be returned. If no bins are
   * selected, then all bins will be returned.
   *
   * @member {string[]} Query#selected
   *
   * @see Use {@link Query#select} to specify the bins to select.
   */
  this.selected = options.select

  /**
   * User-defined function parameters to be applied to the query executed using
   * {@link Query#foreach}.
   *
   * @member {Object} Query#udf
   */
  this.udf = options.udf
}

/**
 * @function Query#select
 *
 * @summary Specify the names of bins to be selected by the query.
 *
 * @description If a query specifies bins to be selected, then only those bins
 * will be returned. If no bins are selected, then all bins will be returned.
 *
 * @param {...string} bins - List of bin names to return.
 */
Query.prototype.select = function (bins) {
  if (Array.isArray(bins)) {
    this.selected = bins
  } else {
    this.selected = Array.prototype.slice.call(arguments)
  }
}

/**
 * @function Query#where
 *
 * @summary Adds a filter predicate to the query.
 *
 * @description *Note:* Currently, a single filter predicate is supported. To
 * do more advanced filtering, you can apply a User-Defined Function (UDF) to
 * filter, transform and aggregate the query results. See {@link Query#foreach}
 * for further information.
 *
 * @param {FilterPredicate} predicate - The filter predicate to apply to the function.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *   var query = client.query('test', 'demo')
 *   // start a background job to add a new tag 'green' to all records that have the tag 'blue'
 *   query.where(Aerospike.filter.contains('tags', 'blue', Aerospike.indexType.LIST))
 *   query.background('myUdfModule', 'addTag', ['green'], (error, job) => {
 *     if (error) throw error
 *     client.close()
 *   })
 * })
 */
Query.prototype.where = function (predicate) {
  this.filters = this.filters || []
  this.filters.push(predicate)
}

/**
 * @function Query#setUdf
 *
 * @summary Set user-defined function parameters to be applied to the query.
 *
 * @param {string} udfModule - UDF module name.
 * @param {string} udfFunction - UDF function name.
 * @param {Array<*>} [udfArgs] - Arguments for the function.
 */
Query.prototype.setUdf = function (udfModule, udfFunction, udfArgs) {
  this.udf = {
    module: udfModule,
    funcname: udfFunction,
    args: udfArgs
  }
}

/**
 * @function Query#foreach
 *
 * @summary Asynchronously executes the query and returns each result item
 * through the stream.
 *
 * @description
 *
 * *Applying a Stream UDF to the query results*
 *
 * A stream UDF can be applied to the query to filter, transform and aggregate
 * the query results. The UDF parameters need to be set on the query object
 * using {@link Query#setUdf} before the query is executed.
 *
 * If a UDF is applied to the query, the resulting stream will return
 * the results of the UDF stream function. Record meta data and the record keys
 * will not be returned.
 *
 * For aggregation queries that return a single result value instead of a
 * stream of values, you should use the {@link Query#apply} method instead.
 *
 * @param {Client~QueryPolicy} [policy] - The Query Policy to use for this operation.
 *
 * @returns {RecordStream}
 */
Query.prototype.foreach = function (policy, dataCb, errorCb, endCb) {
  let stream = new RecordStream(this.client)
  if (dataCb) stream.on('data', dataCb)
  if (errorCb) stream.on('error', errorCb)
  if (endCb) stream.on('end', endCb)

  let cmdName = this.udf ? 'queryForeach' : 'queryAsync'
  let args = [this.ns, this.set, this, policy]
  let cmd = new StreamCommand(stream, cmdName, args)
  cmd.execute()

  return stream
}

/**
 * @function Query#apply
 *
 * @summary Applies a user-defined function (UDF) to aggregate the query results.
 *
 * @description The aggregation function is called on both server and client (final reduce). Therefore, the Lua script files must also reside on both server and client.
 *
 * @param {string} udfModule - UDF module name.
 * @param {string} udfFunction - UDF function name.
 * @param {Array<*>} [udfArgs] - Arguments for the function.
 * @param {Client~QueryPolicy} [policy] - The Query Policy to use for this operation.
 * @param {Query~aggregationResultCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to the aggregation results.
 */
Query.prototype.apply = function (udfModule, udfFunction, udfArgs, policy, callback) {
  if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof udfArgs === 'function') {
    callback = udfArgs
    udfArgs = null
  }

  this.udf = {
    module: udfModule,
    funcname: udfFunction,
    args: udfArgs
  }

  let cmd = new Command(this.client, 'queryApply', [this.ns, this.set, this, policy], callback)
  return cmd.execute()
}

/**
 * @function Query#background
 *
 * @summary Applies a user-defined function (UDF) on records that match the query filter.
 * Records are not returned to the client.
 *
 * @description When a background query is initiated, the client will not wait
 * for results from the database. Instead a {@link Job} instance will be
 * returned, which can be used to query the query status on the database.
 *
 * @param {string} udfModule - UDF module name.
 * @param {string} udfFunction - UDF function name.
 * @param {Array<*>} [udfArgs] - Arguments for the function.
 * @param {Client~QueryPolicy} [policy] - The Query Policy to use for this operation.
 * @param {number} [queryID] - Job ID to use for the query; will be assigned
 * randomly if zero or undefined.
 * @param {Client~jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to a Job instance.
 */
Query.prototype.background = function (udfModule, udfFunction, udfArgs, policy, queryID, callback) {
  if (typeof udfArgs === 'function') {
    callback = udfArgs
    udfArgs = null
  } else if (typeof policy === 'function') {
    callback = policy
    policy = null
  } else if (typeof queryID === 'function') {
    callback = queryID
    queryID = null
  }

  this.udf = {
    module: udfModule,
    funcname: udfFunction,
    args: udfArgs
  }
  queryID = queryID || Job.safeRandomJobID()

  let cmd = new Command(this.client, 'queryBackground', [this.ns, this.set, this, policy, queryID], callback)
  cmd.convertResult = () => {
    let module = this.filters.length > 0 ? 'query' : 'scan'
    return new Job(this.client, queryID, module)
  }
  return cmd.execute()
}

// In the v1 client the query() method was used for both Query and Scan
// operations. Since v2, Scan operations should use the scan() method instead.
function assertValidQueryOptions (options) {
  var scanOptions = new Set(['UDF', 'concurrent', 'percentage', 'nobins', 'priority'])
  var invalid = Object.keys(options).filter(function (key) {
    return scanOptions.has(key)
  })
  assert(invalid.length === 0, util.format('Invalid query arguments: %s. Use Client#scan instead.', invalid.toString()))
  assert(!options.aggregationUDF, 'Invalid query arguments: Pass UDF params to Query#apply instead.')
}

/**
 * @callback Query~aggregationResultCallback
 *
 * @summary Callback function returning the aggregation result for a query.
 *
 * @description
 *
 * If the operation was successful, <code>null</code> will be returned for the
 * error parameter. If there was an error, <code>result</code> will be
 * <code>undefined</code> and the <code>error</code> paramter will provide more
 * information about the error.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {(number|string|Array<*>|Object)} [result] - The aggregation result.
 */

module.exports = Query
