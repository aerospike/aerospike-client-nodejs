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

let ApplyPolicy = require('./policies/apply_policy')
let BatchPolicy = require('./policies/batch_policy')
let InfoPolicy = require('./policies/info_policy')
let OperatePolicy = require('./policies/operate_policy')
let QueryPolicy = require('./policies/query_policy')
let ReadPolicy = require('./policies/read_policy')
let RemovePolicy = require('./policies/remove_policy')
let ScanPolicy = require('./policies/scan_policy')
let WritePolicy = require('./policies/write_policy')

/**
 * @module aerospike/policy
 *
 * @description The policy module defines policies and policy values that
 * define the behavior of database operations.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * // global policy, applied to all commands that do not override it
 * let config = {
 *   policies: {
 *     socketTimeout: 50,
 *     totalTimeout: 100
 *   }
 * }
 *
 * let key = new Aerospike.Key('test', 'demo', 'k1')
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     let record = {i: 1234}
 *
 *     // override policy for put command
 *     let policy = new Aerospike.policy.WritePolicy({
 *       exists: Aerospike.policy.exists.CREATE,
 *       key: Aerospike.policy.key.SEND
 *     })
 *
 *     return client.put(key, record, {}, policy)
 *       .then(() => client.close())
 *       .catch(error => {
 *         client.close()
 *         if (error.code === Aerospike.status.ERR_RECORD_EXISTS) {
 *           console.info('record already exists')
 *         } else {
 *           return Promise.reject(error)
 *         }
 *       })
 *   })
 *   .catch(error => console.error('Error:', error))
 */

/**
 * Specifies the behavior of record modifications with regard to the generation
 * value.
 *
 * @type Object
 * @property IGNORE - Write a record, regardless of generation.
 * @property EQ - Write a record, ONLY if generations are equal.
 * @property GT - Write a record, ONLY if local generation is greater than
 * remote generation.
 */
exports.gen = as.policy.gen

/**
 * Specifies the behavior for whether keys or digests should be sent to the
 * cluster.
 *
 * @type Object
 *
 * @property DIGEST - Send the digest value of the key. This is the recommended
 * mode of operation. This calculates the digest and sends the digest to the
 * server. The digest is only calculated on the client, and not the server.
 *
 * @property SEND - Send the key, in addition to the digest value. If you want
 * keys to be returned when scanning or querying, the keys must be stored on
 * the server. This policy causes a write operation to store the key. Once the
 * key is stored, the server will keep it - there is no need to use this policy
 * on subsequent updates of the record. If this policy is used on read or
 * delete operations, or on subsequent updates of a record with a stored key,
 * the key sent will be compared with the key stored on the server. A mismatch
 * will cause <code>ERR_RECORD_KEY_MISMATCH</code> to be returned.
 */
exports.key = as.policy.key

/**
 * Specifies the behavior for writing the record depending whether or not it
 * exists.
 *
 * @type Object
 *
 * @property IGNORE - Write the record, regardless of existence.  (I.e. create
 * or update.)
 * @property CREATE - Create a record, ONLY if it doesn't exist.
 * @property UPDATE - Update a record, ONLY if it exists.
 * @property REPLACE - Completely replace a record, ONLY if it exists.
 * @property CREATE_OR_REPLACE - Completely replace a record if it exists,
 * otherwise create it.
 */
exports.exists = as.policy.exists

/**
 * Specifies which partition replica to read from.
 *
 * @property MASTER - Read from the partition master replica node.
 * @property ANY - Distribute reads across nodes containing key's master and
 * replicated partition in round-robin fashion. Currently restricted to master
 * and one prole.
 */
exports.replica = as.policy.replica

/**
 * Specifies the number of replicas to be consulted in a read operation to
 * provide the desired consistency guarantee.
 *
 * @type Object
 *
 * @property ONE - Involve a single replica in the operation.
 * @property ALL - Involve all replicas in the operation.
 */
exports.consistencyLevel = as.policy.consistencyLevel

/**
 * Specifies the number of replicas required to be successfully committed
 * before returning success in a write operation to provide the desired
 * consistency guarantee.
 *
 * @type Object
 *
 * @property ALL - Return success only after successfully committing all
 * replicas.
 * @property MASTER - Return success after successfully committing the master
 * replica.
 */
exports.commitLevel = as.policy.commitLevel

/**
 * A policy affecting the behavior of apply operations.
 *
 * @summary {@link ApplyPolicy} class
 */
exports.ApplyPolicy = ApplyPolicy

/**
 * A policy affecting the behavior of batch operations.
 *
 * @summary {@link BatchPolicy} class
 */
exports.BatchPolicy = BatchPolicy

/**
 * A policy affecting the behavior of info operations.
 *
 * @summary {@link InfoPolicy} class
 */
exports.InfoPolicy = InfoPolicy

/**
 * A policy affecting the behavior of operate operations.
 *
 * @summary {@link OperatePolicy} class
 */
exports.OperatePolicy = OperatePolicy

/**
 * A policy affecting the behavior of query operations.
 *
 * @summary {@link QueryPolicy} class
 */
exports.QueryPolicy = QueryPolicy

/**
 * A policy affecting the behavior of read operations.
 *
 * @summary {@link ReadPolicy} class
 */
exports.ReadPolicy = ReadPolicy

/**
 * A policy affecting the behavior of remove operations.
 *
 * @summary {@link RemovePolicy} class
 */
exports.RemovePolicy = RemovePolicy

/**
 * A policy affecting the behavior of scan operations.
 *
 * @summary {@link ScanPolicy} class
 */
exports.ScanPolicy = ScanPolicy

/**
 * A policy affecting the behavior of write operations.
 *
 * @summary {@link WritePolicy} class
 */
exports.WritePolicy = WritePolicy

function policyClass (type) {
  switch (type) {
    case 'apply': return ApplyPolicy
    case 'batch': return BatchPolicy
    case 'info': return InfoPolicy
    case 'operate': return OperatePolicy
    case 'query': return QueryPolicy
    case 'read': return ReadPolicy
    case 'remove': return RemovePolicy
    case 'scan': return ScanPolicy
    case 'write': return WritePolicy
    default:
      throw new TypeError(`Unknown policy type: "${type}"`)
  }
}

/**
 * @private
 * @throws {TypeError} if the type is not a valid policy type
 */
exports.createPolicy = function (type, values) {
  if (values === null || typeof values === 'undefined') {
    return undefined
  }
  let Klass = policyClass(type)
  if (values instanceof Klass) {
    return values
  }
  return new Klass(values)
}
