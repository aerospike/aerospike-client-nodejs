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

const as = require('./native')
const Commands = require('./commands')
const RecordStream = require('./record_stream')
const filter = require('./filter')

const assert = require('assert')
const util = require('util')

/**
 * @class Query
 *
 * @classdesc Aerospike Query operations perform value-based searches using
 * secondary indexes (SI). A Query object, created by calling {@link Client#query},
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
 * #### SI Filters
 *
 * With a SI, the following queries can be made:
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
 * index filter.
 *
 * Before a secondary index filter can be applied, a SI needs to be
 * created on the bins which the index filter matches on. Using the Node.js
 * client, a SI can be created using {@link Client#createIndex}.
 *
 * Currently, only a single SI index filter is supported for
 * each query. To do more advanced filtering, a expressions can be
 * applied to the query using policy (see below). Alternatively, User-Defined Functions
 * (UDFs) can be used to further process the query results on the server.
 *
 * Previously, predicate filtering was used to perform secondary index queries.
 * SI filter predicates have been deprecated since server 5.2, and obsolete since
 * server 6.0.
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
 * #### Query pagination
 *
 * Query pagination allows for queries return records in pages rather than all at once.
 * To enable query pagination, the query property {@link Query#paginate} must be true
 * and the previously stated query property {@link Query#maxRecords} must be set to a
 * nonzero positive integer in order to specify a maximum page size.
 *
 * When a page is complete, {@link RecordStream} event {@link RecordStream#event:error} will
 * emit a {@link Query#queryState} object containing a serialized version of the query.
 * This serialized query, if be assigned back to {@link Query#queryState}, allows the query
 * to retrieve the next page of records in the query upon calling {@link Query#foreach}.
 * If {@link Query#queryState}  is undefined, pagination is not enabled or the query has completed.
 * If {@link RecordStream#event:error} emits an <code>undefined</code> object, either {@link Query#paginate}
 * is not <code>true</code>, or the query has successfully returned all the specified records.
 *
 * For additional information and examples, please refer to the {@link Query#paginate} section
 * below.
 *
 * @param {Client} client - A client instance.
 * @param {string} ns - The namescape.
 * @param {string} set - The name of a set.
 * @param {object} [options] - Query parameters.
 * @param {object[]} [options.filters] - List of index filters to
 * apply to the query. See {@link Query#where}.
 * @param {string[]} [options.select] - List of bin names to select. See
 * {@link Query#select}.
 * @param {boolean} [options.nobins=false] - Whether only meta data should be
 * returned. See {@link Query#nobins}.
 * @param {boolean} [options.ttl=0] - The time-to-live (expiration) of the record in seconds.
 * See {@link Query#ttl}.
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
 *       const queryPolicy = { filterExpression: exp.keyExist('uniqueExpKey') }
 *       query.select('id', 'tags')
 *       query.where(Aerospike.filter.contains('tags', 'green', Aerospike.indexType.LIST))
 *       var stream = query.foreach(queryPolicy)
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
   * *Note:* Currently, a single index filter is supported. To do more
   * advanced filtering, you need to use a user-defined function (UDF) to
   * process the result set on the server.
   *
   * @member {object[]} Query#filters
   *
   * @see Use {@link Query#where} to add index filters to the query.
   * @see Use {@link module:aerospike/filter} to create a SI
   * filter.
   */
  this.filters = options.filters || []

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

  this.ops = options.ops

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

  /**
   * If set to <code>true</code>, the query will return records belonging to the partitions specified
   * in {@link Query#partFilter}.
   *
   * @member {boolean} Query#pfEnabled
   * @private
   */
  this.pfEnabled = false

  /**
   * If set to <code>true</code>, paginated queries are enabled. In order to receive paginated
   * results, the {@link query#maxRecords} property must assign a nonzero integer value.
   *
   * @member {boolean} Query#paginate
   *
   * @example <caption>Asynchronous pagination over a set of thirty records with {@link Query#foreach}.</caption>
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
   *     type: Aerospike.batchType;.BATCH_WRITE,
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
   *     const query = client.query('test', 'demo', { paginate: true, maxRecords: 10})
   *     do {
   *       const stream = query.foreach()
   *       stream.on('error', (error) => { throw error })
   *       stream.on('data', (record) => {
   *         console.log(record.bins)
   *       })
   *       await new Promise(resolve => {
   *         stream.on('end', (queryState) => {
   *           query.queryState = queryState
   *           resolve()
   *         })
   *       })
   *     } while (query.queryState !== undefined)
   *
   *   } catch (error) {
   *     console.error('An error occurred at some point.', error)
   *     process.exit(1)
   *   } finally {
   *     if (client) client.close()
   *   }
   * })()
   *
   * @example <caption>Asynchronous pagination over a set of thirty records with {@link Query#results}</caption>
   *
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
   *
   * ;(async function() {
   *   try {
   *     client = await Aerospike.connect(config)
   *     await client.truncate('test', 'demo', 0)
   *     await client.batchWrite(batchRecords, {socketTimeout : 0, totalTimeout : 0})
   *
   *     const query = client.query('test', 'demo', { paginate: true, maxRecords: 11})
   *
   *     let allResults = []
   *     let results = await query.results()
   *     allResults = [...allResults, ...results]
   *
   *
   *     results = await query.results()
   *     allResults = [...allResults, ...results]
   *
   *     results = await query.results()
   *     allResults = [...allResults, ...results]
   *
   *     console.log("Records returned in total: " + allResults.length)  // Should be 30 records
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
   * Approximate number of records to return to client.
   *
   * When {@link query#paginate} is <code>true</code>,
   * then maxRecords will be the page size if there are enough records remaining in the query to fill the page size.
   *
   * When {@link query#paginate} is <code>false</code>, this number is divided by the number of nodes involved in the scan,
   * and actual number of records returned may be less than maxRecords if node record counts are small and unbalanced across nodes.
   * @member {number} Query#maxRecords
   */
  this.maxRecords = options.maxRecords

  /**
   * If set to a valid serialized query, calling {@link query#foreach} will allow the next page of records to be queried while preserving the progress
   * of the previous query. If set to <code>null</code>, calling {@link query#foreach} will begin a new query.
   * @member {Object} Query#queryState
   */
  this.queryState = undefined

  /**
   * The time-to-live (expiration) of the record in seconds.
   * There are also special values that can be set in the record TTL:
   *
   * 0 (defined Aerospike.ttl.NAMESPACE_DEFAULT), which means that the
   * record will adopt the default TTL value from the namespace.
   *
   * -1 (defined Aerospike.ttl.NEVER_EXPIRE), which means that the record
   * will get an internal "void_time" of zero, and thus will never expire.
   *
   * -2 (defined Aerospike.ttl.DONT_UPDATE), which means that the record
   * ttl will not change when the record is updated.
   *
   * Note that the TTL value will be employed ONLY on background query writes.
   * @member {number} Query#ttl
   */
  this.ttl = options.ttl

  /**
   * Order keys of a Top-K query, in order of precedence. Each entry has the
   * properties <code>bin</code>, <code>type</code>, <code>direction</code>
   * and <code>flags</code>.
   *
   * @member {Object[]} Query#orderByKeys
   *
   * @see Use {@link Query#orderBy} and {@link Query#thenOrderBy} to set the
   * order keys.
   */
  this.orderByKeys = []

  /**
   * Number of records a Top-K query returns.
   *
   * @member {number} Query#topKLimit
   *
   * @see Use {@link Query#topK} to set the limit.
   */
  this.topKLimit = undefined
}

/**
 * @function Query#nextPage
 *
 * @summary Sets {@link query#queryState} to the value specified by the <code>state</code> argument.
 *
 * @description setter function for the {@link Query#queryState} member variable.
 *
 * @param {...object} state - serialized query emitted from the {@link RecordStream#event:error} event.
 */
Query.prototype.nextPage = function (state) {
  this.queryState = state
}

/**
 * @function Query#hasNextPage
 *
 * @summary Checks compiliation status of a paginated query.
 *
 * @description If <code>false</code> is returned, there are no more records left in the query, and the query is complete.
 * If <code>true</code> is returned, calling {@link Query#foreach} will continue from the state specified by {@link Query#queryState}.
 *
 * @returns {boolean}
 */
Query.prototype.hasNextPage = function () {
  return (!!this.queryState)
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
 * @summary Applies a SI to the query.
 *
 * @description Use a SI to limit the results returned by the query.
 * This method takes SI created using the {@link
 * module:aerospike/filter|filter module} as argument.
 *
 * @param {module:aerospike/filter~SindexFilterPredicate} index filter - The index filter to
 * apply to the function.
 *
 * @example <caption>Applying a SI filter to find all records
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
 * @see {@link module:aerospike/filter} to create SI filters.
 */
Query.prototype.where = function (indexFilter) {
  if (indexFilter instanceof filter.SindexFilterPredicate) {
    this.setSindexFilter(indexFilter)
  } else {
    throw new TypeError('indexFilter should be a SindexFilterPredicate')
  }
}

Query.prototype.whereWithExp = function (indexFilter, expression) {
  if (indexFilter instanceof filter.SindexFilterPredicate) {
    this.setSindexFilter(indexFilter)
    this.filters[0].exp = expression
  } else {
    throw new TypeError('indexFilter should be a SindexFilterPredicate')
  }
}

Query.prototype.whereWithIndexName = function (indexFilter, indexName) {
  if (indexFilter instanceof filter.SindexFilterPredicate) {
    this.setSindexFilter(indexFilter)
    this.filters[0].indexName = indexName
  } else {
    throw new TypeError('indexFilter should be a SindexFilterPredicate')
  }
}

Query.prototype.setSindexFilter = function (sindexFilter) {
  this.filters = []
  this.filters.push(sindexFilter)
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
 * @function Query#partitions
 *
 * @summary Specify the begin and count of the partitions
 * to be queried by the Query foreach op.
 *
 * @description If a Query specifies partitions begin and count,
 * then only those partitons will be queried and returned.
 * If no partitions are specified,
 * then all partitions will be queried and returned.
 *
 * @param {number} begin - Start partition number to query.
 * @param {number} count - Number of partitions from the start to query.
 * @param {string} digest - Start from this digest if it is specified.
 */
Query.prototype.partitions = function (begin, count, digest) {
  this.partFilter = { begin, count, digest }
  this.pfEnabled = true
}

/**
 * @function Query#orderBy
 *
 * @summary Sets the first order key of a Top-K query.
 *
 * @description A Top-K query returns only the {@link Query#topK|k} best
 * records, ranked by up to two order keys. Each server node ranks its own
 * records and returns its best k; the client then merges the nodes' results
 * and returns the global top k in rank order.
 *
 * Calling <code>orderBy</code> again replaces both order keys and keeps k.
 *
 * Top-K requires server version 8.2.1 or later on every node in the cluster.
 * It applies only to foreground queries ({@link Query#foreach} and
 * {@link Query#results}): background queries, aggregation queries,
 * paginated queries, queries that set {@link Query#maxRecords} or
 * {@link Query#nobins}, and order keys that aren't among the projected bins
 * fail with a parameter error.
 *
 * No record is returned until every node has finished its scan and the merge
 * is done, so a Top-K query doesn't stream. Over a large set, a node can take
 * longer than the socket timeout to reply; raise the query policy's
 * <code>socketTimeout</code>, or set it to 0, and let
 * <code>totalTimeout</code> bound the query.
 *
 * Records whose order key is missing, or holds a value of a different type
 * than declared, rank last in either direction, and still count towards k.
 *
 * @param {string} bin - Name of the bin to order by, as it appears in the
 * returned record. If the query projects bins, it must be one of the
 * projected names. At most 15 characters.
 * @param {number} type - Type of the bin's value; one of
 * {@link module:aerospike.orderByType}.
 * @param {number} direction - Sort direction; one of
 * {@link module:aerospike.order}.
 * @param {number} [flags=Aerospike.orderByFlags.DEFAULT] - Comparison flags;
 * see {@link module:aerospike.orderByFlags}.
 *
 * @throws {TypeError} If an argument has the wrong type, or the bin name is
 * longer than 15 characters.
 *
 * @see {@link Query#thenOrderBy} to add a second order key.
 * @see {@link Query#topK} to set k.
 *
 * @example <caption>Return the 10 records with the highest score</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect().then(async client => {
 *   const query = client.query('test', 'demo')
 *   query.orderBy('score', Aerospike.orderByType.INTEGER, Aerospike.order.DESC)
 *   query.topK(10)
 *   const records = await query.results()
 *   records.forEach(record => console.info(record.bins.score))
 *   client.close()
 * })
 */
Query.prototype.orderBy = function (bin, type, direction, flags) {
  this.orderByKeys = [orderByKey(bin, type, direction, flags)]
}

/**
 * @function Query#thenOrderBy
 *
 * @summary Adds an order key to a Top-K query, after the keys already set.
 *
 * @description The second order key ranks records that tie on the first.
 * A query can have at most two order keys; a third fails with a parameter
 * error when the query executes. Called before {@link Query#orderBy}, it sets
 * the first order key.
 *
 * @param {string} bin - Name of the bin to order by, as it appears in the
 * returned record. At most 15 characters.
 * @param {number} type - Type of the bin's value; one of
 * {@link module:aerospike.orderByType}.
 * @param {number} direction - Sort direction; one of
 * {@link module:aerospike.order}.
 * @param {number} [flags=Aerospike.orderByFlags.DEFAULT] - Comparison flags;
 * see {@link module:aerospike.orderByFlags}.
 *
 * @throws {TypeError} If an argument has the wrong type, or the bin name is
 * longer than 15 characters.
 *
 * @see {@link Query#orderBy}
 *
 * @example <caption>Rank by score, then by the most recent timestamp</caption>
 *
 * query.orderBy('score', Aerospike.orderByType.INTEGER, Aerospike.order.DESC)
 * query.thenOrderBy('ts', Aerospike.orderByType.INTEGER, Aerospike.order.DESC)
 * query.topK(10)
 */
Query.prototype.thenOrderBy = function (bin, type, direction, flags) {
  this.orderByKeys.push(orderByKey(bin, type, direction, flags))
}

/**
 * @function Query#topK
 *
 * @summary Sets the number of records a Top-K query returns.
 *
 * @description k must be from 1 to 1,000, and requires an order key set with
 * {@link Query#orderBy}. An out-of-range k fails with a parameter error when
 * the query executes. Calling <code>topK</code> again replaces k.
 *
 * @param {number} k - Number of records to return, from 1 to 1,000.
 *
 * @throws {TypeError} If k isn't an integer.
 *
 * @see {@link Query#orderBy}
 */
Query.prototype.topK = function (k) {
  if (!Number.isInteger(k)) {
    throw new TypeError('k must be an integer')
  }
  this.topKLimit = k
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
 * @param {QueryPolicy} [policy] - The Query Policy to use for this operation.
 * @param {recordCallback} [dataCb] - The function to call when the
 * operation completes with the results of the operation; if no callback
 * function is provided, the method returns a <code>Promise<code> instead.
 * @param {errorCallback} [errorCb] - Callback function called when there is an error.
 * @param {doneCallback} [endCb] -  Callback function called when an operation has completed.
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
    if (this.paginate) {
      throw new Error('Stream UDF cannot be applied using a paginated stream. Please disable pagination or UDF.')
    } else {
      cmd = new Commands.QueryForeach(stream, args)
    }
  } else {
    if (this.paginate) {
      args.push(this.queryState)
      args.push(this.maxRecords)
      if ((this.filters == null) && (this.filters[0].context)) {
        args.push({ context: this.filters[0].context })
      } else {
        args.push(null)
      }
      cmd = new Commands.QueryPages(stream, args)
    } else {
      cmd = new Commands.Query(stream, args)
    }
  }
  cmd.queryState = this.queryState
  cmd.execute()
  return stream
}

/**
 * @function Query#results
 *
 * @summary Executes the query and collects the results into an array. On paginated queries,
 * preparing the next page is also handled automatically.
 *
 *  *
 * @description This method returns a Promise that contains the query results
 * as an array of records, when fulfilled. It should only be used if the query
 * is expected to return only few records; otherwise it is recommended to use
 * {@link Query#foreach}, which returns the results as a {@link RecordStream}
 * instead.
 *
 * If pagination is enabled, the data emitted from the {@link RecordStream#event:error}
 * event will automatically be assigned to {@link Query#queryState}, allowing the next page
 * of records to be queried if {@link Query#foreach} or {@link Query#results} is called.
 *
 *
 * @param {QueryPolicy} [policy] - The Query Policy to use for this operation.
 *
 * @returns {Promise<RecordObject[]>}
 */
Query.prototype.results = function (policy) {
  return new Promise((resolve, reject) => {
    const stream = this.foreach(policy)
    const results = []
    stream.on('error', reject)
    stream.on('data', record => results.push(record))
    stream.on('end', (queryState) => {
      this.queryState = queryState
      resolve(results)
    })
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
 * @param {QueryPolicy} [policy] - The Query Policy to use for this operation.
 * @param {QueryaggregationResultCallback} [callback] - The function to call when the operation completes.
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
 * @param {WritePolicy} [policy] - The Write Policy to use for this operation.
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

  const cmd = new Commands.QueryBackground(this.client, this.ns, this.set, this, policy, queryID, callback)
  return cmd.execute()
}

/**
 * @function Query#operate
 *
 * @summary Applies write operations to all matching records.
 *
 * @description Performs a background query and applies one or more write
 * operations to all records that match the query filter(s). Neither the
 * records nor the results of the operations are returned to the client.
 * Instead a {@link Job} instance will be returned, which can be used to query
 * the query status.
 *
 * This method requires server >= 3.7.0.
 *
 * @param {module:aerospike/operations~Operation[]} operations - List of write
 * operations to perform on the matching records.
 * @param {QueryPolicy} [policy] - The Query Policy to use for this operation.
 * @param {number} [queryID] - Job ID to use for the query; will be assigned
 * randomly if zero or undefined.
 * @param {jobCallback} [callback] - The function to call when the operation completes.
 *
 * @returns {?Promise} If no callback function is passed, the function returns
 * a Promise that resolves to a Job instance.
 *
 * @since v3.14.0
 *
 * @example <caption>Increment count bin on all matching records using a background query</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * Aerospike.connect().then(async (client) => {
 *   const query = client.query('namespace', 'set')
 *   query.where(Aerospike.filter.range('age', 18, 42))
 *   const ops = [Aerospike.operations.incr('count', 1)]
 *   const job = await query.operate(ops)
 *   await job.waitUntilDone()
 *   client.close()
 * })
 */
Query.prototype.operate = function (operations, policy = null, queryID = null, callback = null) {
  this.ops = operations
  const cmd = new Commands.QueryOperate(this.client, this.ns, this.set, this, policy, queryID, callback)
  return cmd.execute()
}

// In the v1 client the query() method was used for both Query and Scan
// operations. Since v2, Scan operations should use the scan() method instead.
function assertValidQueryOptions (options) {
  const scanOptions = new Set(['UDF', 'concurrent', 'percentage', 'priority'])
  const invalid = Object.keys(options).filter(function (key) {
    return scanOptions.has(key)
  })
  assert(invalid.length === 0, util.format('Invalid query arguments: %s. Use Client#scan instead.', invalid.toString()))
  assert(!options.aggregationUDF, 'Invalid query arguments: Pass UDF params to Query#apply instead.')
  if (options.select && options.ops) {
    process.emitWarning('Operations and bin names are mutually exclusive.')
  }
}

// The C client ignores bin names that don't fit, so check here.
const MAX_BIN_NAME_LENGTH = 15

function orderByKey (bin, type, direction, flags = as.orderByFlags.DEFAULT) {
  if (typeof bin !== 'string') {
    throw new TypeError('bin must be a string')
  }
  if (Buffer.byteLength(bin) > MAX_BIN_NAME_LENGTH) {
    throw new TypeError(`bin name must be at most ${MAX_BIN_NAME_LENGTH} characters`)
  }
  if (!Number.isInteger(type)) {
    throw new TypeError('type must be one of Aerospike.orderByType')
  }
  if (!Number.isInteger(direction)) {
    throw new TypeError('direction must be one of Aerospike.order')
  }
  if (!Number.isInteger(flags)) {
    throw new TypeError('flags must be a combination of Aerospike.orderByFlags')
  }
  return { bin, type, direction, flags }
}

module.exports = Query
