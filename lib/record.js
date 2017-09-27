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
 * A record with the Aerospike database consists of one or more record "bins"
 * (name-value pairs) and meta-data, incl. time-to-live and generation; a
 * record is uniquely identified by it's key within a given namespace.
 *
 * @example <caption>Writing a new record with 5 bins while setting a record TTL.</caption>
 *
 * const Aerospike = require('aerospike')
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
 * Aerospike.connect()
 *   .then(client => {
 *     return client.put(key, bins, meta)
 *       .then(() => client.close())
 *       .catch(error => {
 *         client.close()
 *         return Promise.reject(error)
 *       })
 *   })
 *   .catch(error => console.error('Error:', error))
 *
 * @example <caption>Fetching a single database record by it's key.</caption>
 *
 * const Aerospike = require('aerospike')
 *
 * let key = new Aerospike.Key('test', 'demo', 'myKey')
 *
 * Aerospike.connect()
 *   .then(client => {
 *     client.get(key)
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
 *   })
 *   .catch(error => console.error('Error:', error))
 */
class Record {
  /** @private */
  constructor (key, bins, metadata) {
    metadata = metadata || {}

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
  }
}

module.exports = Record
