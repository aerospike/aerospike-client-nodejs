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

/**
 * @class Record
 * @classdesc Aerospike Record
 *
 *
 *
 * A record with the Aerospike database consists of one or more record "bins"
 * (name-value pairs) and meta-data, including time-to-live and generation; a
 * record is uniquely identified by it's key within a given namespace.
 *
 * @summary Construct a new Aerospike Record instance.
 *
 * @example <caption>Writing a new record with 5 bins while setting a record TTL.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * let bins = {
 *   int: 123,
 *   double: 3.1415,
 *   string: 'xyz',
 *   bytes: Buffer.from('hello world!'),
 *   list: [1, 2, 3],
 *   map: {num: 123, str: 'abc', list: ['a', 'b', 'c']}
 * }
 * let meta = {
 *   ttl: 386400 // 1 day
 * }
 * let key = new Aerospike.Key('test', 'demo', 'myKey')
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     return client.put(key, bins, meta)
 *     .then(() => {
 *       client.get(key)
 *       .then((record) => {
 *         console.log(record)
 *         client.close()
 *       })
 *       .catch(error => {
 *         console.log(record)
 *         client.close()
 *         return Promise.reject(error)
 *       })
 *     })
 *     .catch(error => {
 *       client.close()
 *       return Promise.reject(error)
 *     })
 *   })
 *   .catch(error => console.error('Error:', error))
 *
 * @example <caption>Fetching a single database record by it's key.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *    }
 * }
 *
 * let key = new Aerospike.Key('test', 'demo', 'myKey')
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     client.put(key, {tags : ['blue', 'pink']})
 *     .then(() => {
 *       client.get(key)
 *       .then(record => {
 *         console.info('Key:', record.key)
 *         console.info('Bins:', record.bins)
 *         console.info('TTL:', record.ttl)
 *         console.info('Gen:', record.gen)
 *       })
 *       .then(() => client.close())
 *       .catch(error => {
 *         client.close()
 *         return Promise.reject(error)
 *       })
 *     })
 *     .catch(error => {
 *       client.close()
 *       return Promise.reject(error)
 *     })
 *   })
 *   .catch(error => console.error('Error:', error))
 *
 * @since v5.0.0
 *
 * @example <caption>Fetching a batch of records.</caption>
 *
 * const Aerospike = require('aerospike')
 * const op = Aerospike.operations
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *     batch : new Aerospike.BatchPolicy({socketTimeout : 0, totalTimeout : 0})
 *
 *    }
 * }
 *
 * var batchRecords = [
 *   { type: Aerospike.batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key1'), bins: ['i', 's'] },
 *   { type: Aerospike.batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key2'), readAllBins: true },
 *   { type: Aerospike.batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key3'),
 *     ops:[
 *          op.read('blob-bin')
 *         ]}
 * ]
 * Aerospike.connect(config, function (error, client) {
 *   if (error) throw error
 *   client.batchRead(batchRecords, function (error, results) {
 *     if (error) throw error
 *     results.forEach(function (result) {
 *       console.log(result)
 *
 *     })
 *     client.close()
 *   })
 *
 * })
 *
 * @since v5.0.0
 *
 * @example <caption>Applying  functions on batch of records.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     read : new Aerospike.ReadPolicy({socketTimeout : 0, totalTimeout : 0}),
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0}),
 *
 *    }
 * }
 *
 * const batchType = Aerospike.batchType
 * var batchRecords = [
 *   { type: batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key1'),
 *     bins: ['i', 's'] },
 *   { type: batchType.BATCH_READ,
 *     key: new Aerospike.Key('test', 'demo', 'key2'),
 *     readAllBins: true },
 *   { type: batchType.BATCH_APPLY,
 *     key: new Aerospike.Key('test', 'demo', 'key4'),
 *     policy: new Aerospike.BatchApplyPolicy({
 *         filterExpression: exp.eq(exp.binInt('i'), exp.int(37)),
 *         key: Aerospike.policy.key.SEND,
 *         commitLevel: Aerospike.policy.commitLevel.ALL,
 *         durableDelete: true
 *       }),
 *     udf: {
 *          module: 'udf',
 *          funcname: 'function1',
 *          args: [[1, 2, 3]]
 *          }
 *   },
 *   { type: batchType.BATCH_APPLY,
 *     key: new Aerospike.Key('test', 'demo', 'key5'),
 *     policy: new Aerospike.BatchApplyPolicy({
 *         filterExpression: exp.eq(exp.binInt('i'), exp.int(37)),
 *         key: Aerospike.policy.key.SEND,
 *         commitLevel: Aerospike.policy.commitLevel.ALL,
 *         durableDelete: true
 *       }),
 *     udf: {
 *          module: 'udf',
 *          funcname: 'function2',
 *          args: [[1, 2, 3]]
 *          }
 *    }
 * ]
 * Aerospike.connect(config, function (error, client) {
 *   if (error) throw error
 *   client.batchApply(batchRecords, udf, function (error, results) {
 *     if (error) throw error
 *     results.forEach(function (result) {
 *       console.log(result)
 *     })
 *   })
 * })
 */
class Record {
  /** @private */
  constructor (key, bins, metadata, type, props) {
    metadata = metadata || {}
    props = props || {}

    /**
     * Unique record identifier.
     *
     * @member {Key} Record#key
     */
    this.key = key

    /**
     * Map of bin name to bin value.
     *
     * @member {Object} Record#bins
     */
    this.bins = bins

    /**
     * The record's remaining time-to-live in seconds, before the record will
     * expire and be removed by the server.
     *
     * @member {number} Record#ttl
     */
    this.ttl = metadata.ttl

    /**
     * Record modification count.
     *
     * @member {number} Record#gen
     */
    this.gen = metadata.gen

    /**
     * Batch record type. Values: BATCH_READ, BATCH_WRITE, BATCH_APPLY or BATCH_REMOVE
     *
     * @member {number} Record#type
     */
    this.type = type

    /**
     * Optional batch read/write/apply/remove policy
     *
     * @member {object} Record#policy
     */
    this.policy = props.policy

    /**
     * batch read option
     * If true, ignore bin_names and read all bins.
     * If false and bin_names are set, read specified bin_names.
     * If false and bin_names are not set, read record header (generation, expiration) only.
     * @member {bool} Record#readAllBins
     */
    this.readAllBins = props.readAllBins

    /**
     * Read or write operations for this key.
     * For BATCH_READ, ops are mutually exclusive with bin_names.
     *
     * @member {object} Record#ops
     */
    this.ops = props.ops

    /**
     * lua module, function and optional arg list udf object
     *
     * @member {object} Record#udf
     */
    this.udf = props.udf
  }
}

module.exports = Record
