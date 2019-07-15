// *****************************************************************************
// Copyright 2013-2019 Aerospike, Inc.
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
const filter = require('./filter')
const predexp = require('./predexp')

const assert = require('assert')
const util = require('util')

/**
 * @class Query
 *
 * @classdesc Aerospike Query operations perform value-based searches using
 * secondary indexes. A Query object, created by calling {@link Client#query},
 * is used to execute queries on the specified namespace and set (optional).
 * Queries can return a set of records as a {@link RecordStream} or be
 * processed using Aeorspike User-Defined Functions (UDFs) before returning to
 * the client.
 *
 * For more information, please refer to the section on
 * <a href="http://www.aerospike.com/docs/guide/query.html" title="Aerospike Queries">&uArr;Queries</a>
 * in the Aerospike technical documentation.
 *
 * To scan _all_ records in a database namespace or set, it is more efficient
 * to use {@link Scan operations}, which provide more fine-grained control over
 * execution priority, concurrency, etc.
 *
 * #### Secondary Index Filters
 *
 * With a secondary index, the following queries can be made:
 *
 * - [Equal query]{@link module:aerospike/filter.equal} against string or
 *   numeric indexes
 * - [Range query]{@link module:aerospike/filter.range} against numeric
 *   indexes
 * - [Point-In-Region query]{@link module:aerospike/filter.geoWithinGeoJSONRegion}
 *   or [Region-Contain-Point query]{@link
 *   module:aerospike/filter.geoContainsGeoJSONPoint} against geo indexes
 *
 * See {@link module:aerospike/filter} for a list of all supported secondary
 * index filter predicates.
 *
 * Before a filter predicate can be applied, a secondary index needs to be
 * created on the bins which the predicate matches on. Using the Node.js
 * client, a secondary index can be created using {@link Client#createIndex}.
 *
 * Currently, only a single secondary index filter predicate is supported for
 * each query. To do more advanced filtering, a predicate expression can be
 * applied to the query (see below). Alternatively, User-Defined Functions
 * (UDFs) can be used to further process the query results on the server.
 *
 * #### Predicate Filter Expressions
 *
 * Using Aerospike Predicate Filtering (Aerospike server version 3.12 and
 * later), you can:
 *
 * - Filter out records based on record meta data, such as last-update-time or
 *   storage-size.
 * - Filter out records based on bin data, such as integer greater/less or
 *   regexp on string bins.
 *
 * Predicate filter expressions can be combined with a secondary index filter.
 *
 * See {@link module:aerospike/predexp} for a list of supported predicate
 * expressions.
 *
 * For more information about Predicate Filtering, please refer to the <a
 * href="https://www.aerospike.com/docs/guide/predicate.html">&uArr;Predicate
 * Filtering</a> documentation in the Aerospike Feature Guide.
 *
 * #### Selecting Bins
 *
 * Using {@link Query#select} it is possible to select a subset of bins which
 * should be returned by the query. If no bins are selected, then the whole
 * record will be returned. If the {@link Query#nobins} property is set to
 * <code>true</code> the only the record meta data (ttl, generation, etc.) will
 * be returned.
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
 * @param {boolean} [options.nobins=false] - Whether only meta data should be
 * returned. See {@link Query#nobins}.
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
   * @see Use {@link Query#where} to add filter predicates to the query.
   * @see Use {@link module:aerospike/filter} to create a secondary index
   * filter.
   */
  this.filters = options.filters || []

  /**
   * Sequence (array) of predicate expressions to apply to the query.
   *
   * @member {Predicate[]} Query#predexp
   *
   * @see Use {@link Query#where} to add a predicate expression to the query.
   * @see Use {@link module:aerospike/predexp} to create the sequence of
   * predicate expressions
   */
  this.predexp = options.predexp

  /**
   * List of bin names to be selected by the query. If a query specifies bins to
   * be selected, then only those bins will be returned. If no bins are
   * selected, then all bins will be returned (unless {@link Query#nobins} is
   * set to <code>true</code>).
   *
   * @member {string[]} Query#selected
   *
   * @see Use {@link Query#select} to specify the bins to select.
   */
  this.selected = options.select

  /**
   * If set to <code>true</code>, the query will return only meta data, and exclude bins.
   *
   * @member {boolean} Query#nobins
   */
  this.nobins = options.nobins

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
 * (Unless {@link Query#nobins} is set to <code>true</code>.)
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
 * @summary Applies a secondary index filter and/or a predicate expression to
 * the query.
 *
 * @description Use a secondary index filter, a predicate expression, or both,
 * to limit the results returned by the query. This method takes either a
 * secondary index filter created using the {@link
 * module:aerospike/filter|filter module}, or a sequence of predicate
 * expressions created using the {@link module:aerospike/predexp|predexp
 * module} as argument. It can also be called multiple times to add both kinds
 * of filters to the same query. (Max. one of each kind.)
 *
 * @param {module:aerospike/filter~SindexFilterPredicate |
 * module:aerospike/predexp~PredicateExpression[]} predicate - The filter to
 * apply to the function.
 *
 * @example <caption>Applying a secondary index filter to find all records
 * where the 'tags' list bin contains the value 'blue':</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect().then(client => {
 *   let query = client.query('test', 'demo')
 *
 *   let tagsFilter = Aerospike.filter.contains('tags', 'blue', Aerospike.indexType.LIST)
 *   query.where(tagsFilter)
 *
 *   let stream = query.foreach()
 *   stream.on('data', record => { console.info(record.bins.tags) })
 *   stream.on('error', error => { throw error })
 *   stream.on('end', () => client.close())
 * })
 *
 * @see {@link module:aerospike/filter} to create secondary index filters.
 * @see {@link module:aerospike/predexp} to create predicate expression filters.
 *
 * @example <caption>Applying a predicate expression in addition to a secondary
 * index filter to find only record where the 'tags' list bin contains the
 * value 'blue' but also contains at least one other value that is not
 * 'blue':</caption>
 *
 * const Aerospike = require('aerospike')
 * const predexp = Aerospike.predexp
 *
 * Aerospike.connect().then(client => {
 *   let query = client.query('test', 'demo')
 *
 *   let tagsFilter = Aerospike.filter.contains('tags', 'blue', Aerospike.indexType.LIST)
 *   query.where(tagsFilter)
 *
 *   let tagsPredexp = [
 *     predexp.stringVar('tag'),
 *     predexp.stringValue('blue'),
 *     predexp.stringEqual(),
 *     predexp.listBin('tags'),
 *     predexp.listIterateAnd('tag'),
 *     predexp.not()
 *   ]
 *   query.where(tagsPredexp)
 *
 *   let stream = query.foreach()
 *   stream.on('data', record => { console.info(record.bins.tags) })
 *   stream.on('error', error => { throw error })
 *   stream.on('end', () => client.close())
 * })
 */
Query.prototype.where = function (predicate) {
  if (Array.isArray(predicate) && predicate[0] instanceof predexp.PredicateExpression) {
    this.setPredexpFilter(predicate)
  } else if (predicate instanceof filter.SindexFilterPredicate) {
    this.setSindexFilter(predicate)
  }
}

Query.prototype.setSindexFilter = function (sindexFilter) {
  this.filters = this.filters || []
  this.filters.push(sindexFilter)
}

Query.prototype.setPredexpFilter = function (predexpFilter) {
  this.predexp = predexpFilter
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
  const stream = new RecordStream(this.client)
  if (dataCb) stream.on('data', dataCb)
  if (errorCb) stream.on('error', errorCb)
  if (endCb) stream.on('end', endCb)

  const args = [this.ns, this.set, this, policy]
  let cmd
  if (this.udf) {
    cmd = new Commands.QueryForeach(stream, args)
  } else {
    cmd = new Commands.Query(stream, args)
  }
  cmd.execute()

  return stream
}

/**
 * @function Query#results
 *
 * @summary Executes the query and collects the results into an array.
 *
 * @description This method returns a Promise that contains the query results
 * as an array of records, when fulfilled. It should only be used if the query
 * is expected to return only few records; otherwise it is recommended to use
 * {@link Query#foreach}, which returns the results as a {@link RecordStream}
 * instead.
 *
 * @param {Client~QueryPolicy} [policy] - The Query Policy to use for this operation.
 *
 * @returns {Promise<Record[]>}
 */
Query.prototype.results = function (policy) {
  return new Promise((resolve, reject) => {
    const stream = this.foreach(policy)
    const results = []
    stream.on('error', reject)
    stream.on('end', () => resolve(results))
    stream.on('data', record => results.push(record))
  })
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

  const cmd = new Commands.QueryApply(this.client, [this.ns, this.set, this, policy], callback)
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
 * @param {jobCallback} [callback] - The function to call when the operation completes.
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

  const cmd = new Commands.QueryBackground(this.client, [this.ns, this.set, this, policy, queryID], callback)
  cmd.convertResult = () => {
    const module = this.filters.length > 0 ? 'query' : 'scan'
    return new Job(this.client, queryID, module)
  }
  return cmd.execute()
}

// In the v1 client the query() method was used for both Query and Scan
// operations. Since v2, Scan operations should use the scan() method instead.
function assertValidQueryOptions (options) {
  var scanOptions = new Set(['UDF', 'concurrent', 'percentage', 'priority'])
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
