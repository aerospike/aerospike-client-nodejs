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

const as = require('bindings')('aerospike.node')
const batchType = as.batchTypes

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

class BatchRecord extends Record {
  /** @private */
  constructor (key, bins, metadata, haswrite, indoubt, type) {
    super(key, bins, metadata)
    this.key = key
    this.result = 0
    this.haswrite = haswrite
    this.indoubt = indoubt
    this.type = type
  }
}

class BatchReadRecord extends BatchRecord {
  /** @private */
  constructor (key, ops, binnames, readallbins, policy) {
    super(key, null, null, false, false, batchType.BATCH_READ)
    this.ops = ops
    this.binnames = binnames
    this.readallbins = readallbins
    this.policy = policy
  }
}

class BatchWriteRecord extends BatchRecord {
  /** @private */
  constructor (key, ops, policy = null) {
    super(key, null, null, true, false, batchType.BATCH_WRITE)
    this.ops = ops
    this.policy = policy
  }
}

class BatchApplyRecord extends BatchRecord {
  /** @private */
  constructor (key, module, func, args, policy) {
    super(key, null, null, false, false, batchType.BATCH_APPLY)
    this.module = module
    this.func = func
    this.args = args
    this.policy = policy
  }
}

class BatchRemoveRecord extends BatchRecord {
  /** @private */
  constructor (key, policy = null) {
    super(key, null, null, false, false, batchType.BATCH_REMOVE)
    this.policy = policy
  }
}

class BatchCommands {
  /** @private */
  constructor (batchRecords) {
  }
}

module.exports = {
  Record: Record,
  BatchReadRecord: BatchReadRecord,
  BatchWriteRecord: BatchWriteRecord,
  BatchApplyRecord: BatchApplyRecord,
  BatchRemoveRecord: BatchRemoveRecord,
  BatchCommands: BatchCommands
}
