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
 *     let policy = {
 *       exists: Aerospike.policy.exists.CREATE,
 *       key: Aerospike.policy.key.SEND
 *     }
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
