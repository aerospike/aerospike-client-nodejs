// *****************************************************************************
// Copyright 2013-2022 Aerospike, Inc.
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

const BasePolicy = require('./policies/base_policy')
const ApplyPolicy = require('./policies/apply_policy')
const OperatePolicy = require('./policies/operate_policy')
const QueryPolicy = require('./policies/query_policy')
const ReadPolicy = require('./policies/read_policy')
const RemovePolicy = require('./policies/remove_policy')
const ScanPolicy = require('./policies/scan_policy')
const WritePolicy = require('./policies/write_policy')
const BatchPolicy = require('./policies/batch_policy')
const BatchApplyPolicy = require('./policies/batch_apply_policy')
const BatchReadPolicy = require('./policies/batch_read_policy')
const BatchRemovePolicy = require('./policies/batch_remove_policy')
const BatchWritePolicy = require('./policies/batch_write_policy')

const CommandQueuePolicy = require('./policies/command_queue_policy')
const HLLPolicy = require('./policies/hll_policy')
const InfoPolicy = require('./policies/info_policy')
const ListPolicy = require('./policies/list_policy')
const MapPolicy = require('./policies/map_policy')
/**
 * @module aerospike/policy
 *
 * @description The policy module defines policies and policy values that
 * define the behavior of database operations. Most {@link Client} methods,
 * including scans and queries, accept a policy object, that affects how the
 * database operation is executed, by specifying timeouts, transactional
 * behavior, etc. Global defaults for specific types of database operations can
 * also be set through the client config, when a new {@link Client} instance is
 * created.
 *
 * Different policies apply to different types of database operations:
 *
 * * {@link ApplyPolicy} - Applies to {@link Client#apply}.
 * * {@link OperatePolicy} - Applies to {@link Client#operate} as well as {@link Client#append}, {@link Client#prepend} and {@link Client#add}.
 * * {@link QueryPolicy} - Applies to {@link Query#apply}, {@link Query#background} and {@link Query#foreach}.
 * * {@link ReadPolicy} - Applies to {@link Client#exists}, {@link Client#get} and {@link Client#select}.
 * * {@link RemovePolicy} - Applies to {@link Client#remove}.
 * * {@link ScanPolicy} - Applies to {@link Scan#background} and {@link Scan#foreach}.
 * * {@link WritePolicy} - Applies to {@link Client#put}.
 * * {@link BatchPolicy} - Applies to {@link Client#batchRead} as well as the
 *   deprecated {@link Client#batchExists}, {@link Client#batchGet}, and {@link
 *   Client#batchSelect} operations.
 * * {@link BatchApplyPolicy} - Applies to {@link Client#batchApply}.
 * * {@link BatchReadPolicy} - Applies to {@link Client#batchRead}.
 * * {@link BatchRemovePolicy} - Applies to {@link Client#batchRemove}.
 * * {@link BatchWritePolicy} - Applies to {@link Client#batchWrite}.
 * * {@link CommandQueuePolicy} - Applies to global command queue {@link module:aerospike.setupGlobalCommandQueue
 * Aerospike.setupGlobalCommandQueue}
 * * {@link HLLPolicy} - Applies to {@link module:aerospike/hll|HLL} operations
 * * {@link InfoPolicy} - Applies to {@link Client#info}, {@link
 *   Client#infoAny}, {@link Client#infoAll} as well as {@link
 *   Client#createIndex}, {@link Client#indexRemove}, {@link Client#truncate},
 *   {@link Client#udfRegister} and {@link Client#udfRemove}.
 * * {@link ListPolicy} - Applies to List operations defined in {@link module:aerospike/lists}.
 * * {@link MapPolicy} - Applies to Map operations defined in {@link module:aerospike/maps}.
 *
 * Base policy {@link BasePolicy} class which defines common policy
 * values that apply to all database operations
 * (except `InfoPolicy`, `MapPolicy` and `ListPolicy`).
 *
 * This module also defines global values for the following policy settings:
 *
 * * {@link module:aerospike/policy.commitLevel|commitLevel} - Specifies the
 * number of replicas required to be successfully committed before returning
 * success in a write operation to provide the desired consistency guarantee.
 * * {@link module:aerospike/policy.exists|exists} - Specifies the behavior for
 * writing the record depending whether or not it exists.
 * * {@link module:aerospike/policy.gen|gen} - Specifies the behavior of record
 * modifications with regard to the generation value.
 * * {@link module:aerospike/policy.key|key} - Specifies the behavior for
 * whether keys or digests should be sent to the cluster.
 * * {@link module:aerospike/policy.readModeAP|readModeAP} - How duplicates
 * should be consulted in a read operation.
 * * {@link module:aerospike/policy.readModeSC|readModeSC} - Determines SC read
 * consistency options.
 * * {@link module:aerospike/policy.replica|replica} - Specifies which
 * partition replica to read from.
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 *
 * const config = {
 *   hosts: '192.168.33.10:3000'
 * }
 *
 * const key = new Aerospike.Key('test', 'demo', 'k1')
 *
 * Aerospike.connect(config)
 *   .then(client => {
 *     let record = {i: 1234}
 *
 *     // Override policy for put command
 *     let policy = new Aerospike.policy.WritePolicy({
 *       exists: Aerospike.policy.exists.CREATE,
 *       key: Aerospike.policy.key.SEND,
 *       socketTimeout: 0,
 *       totalTimeout: 0
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
 * @summary The generation policy specifies how to handle record writes based
 * on record generation.
 *
 * @description To use the <code>EQ</code> or <code>GT</code> generation policy
 * (see below), the generation value to use for the comparison needs to be
 * specified in the metadata parameter (<code>meta</code>) of the {@link
 * Client#put} operation.
 *
 * @type Object
 * @property IGNORE - Do not use record generation to restrict writes.
 * @property EQ - Update/delete record if expected generation is equal to
 * server generation. Otherwise, fail.
 * @property GT - Update/delete record if expected generation greater than the
 * server generation. Otherwise, fail. This is useful for restore after backup.
 *
 * @example <caption>Update record, only if generation matches</caption>
 *
 * const Aerospike = require('aerospike')
 * const key = new Aerospike.Key('test', 'test', 'myKey')
 * // INSERT HOSTNAME AND PORT NUMBER OF AEROSPIKE SERVER NODE HERE!
 * var config = {
 *   hosts: '192.168.33.10:3000',
 *   // Timeouts disabled, latency dependent on server location. Configure as needed.
 *   policies: {
 *     write : new Aerospike.WritePolicy({socketTimeout : 0, totalTimeout : 0})
 *   }
 * }
 * Aerospike.connect(config).then(async (client) => {
 *   await client.put(key, { foo: 'bar' })
 *
 *   const record = await client.get(key)
 *   const gen = record.gen // Current generation of the record. (1 for new record.)
 *   // Perform some operation using record. Some other process might update the
 *   // record in the meantime, which would change the generation value.
 *   if (Math.random() < 0.1) await client.put(key, { foo: 'fox' })
 *
 *   try {
 *     // Update record only if generation is still the same.
 *     const meta = { gen }
 *     const policy = { gen: Aerospike.policy.gen.EQ }
 *     await client.put(key, { status: 'updated' }, meta, policy)
 *     console.log('Record updated successfully.')
 *   } catch (error) {
 *     if (error.code == Aerospike.status.ERR_RECORD_GENERATION) {
 *       console.error('Failed to update record, because generation did not match.')
 *     }
 *   }
 *
 *   client.close()
 * })
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
 * @property SEQUENCE - Always try node containing master partition first. If
 * the command times out and the policy settings allow for an automatic retry,
 * try the node containing the prole partition. Currently restricted to master
 * and one prole.
 * @property PREFER_RACK - Try node on the same rack as the client first. If
 * there are no nodes on the same rack, use <code>SEQUENCE</code> instead.
 * {@link Config#rackAware rackAware} config, {@link Config#rackId rackId}
 * config, and server rack configuration must also be set to enable this
 * functionality.
 */
exports.replica = as.policy.replica

/**
 * @summary Read policy for AP (availability) namespaces.
 *
 * @description How duplicates should be consulted in a read operation.
 * Only makes a difference during migrations and only applicable in AP mode.
 *
 * @type Object
 *
 * @property ONE - Involve a single node in the read operation.
 * @property ALL - Involve all duplicates in the read operation.
 */
exports.readModeAP = as.policy.readModeAP

/**
 * @summary Read policy for SC (strong consistency) namespaces.
 *
 * @description Determines SC read consistency options.
 *
 * @type Object
 *
 * @property SESSION - Ensures this client will only see an increasing sequence
 * of record versions. Server only reads from master. This is the default.
 * @property LINEARIZE - Ensures ALL clients will only see an increasing
 * sequence of record versions. Server only reads from master.
 * @property ALLOW_REPLICA - Server may read from master or any full
 * (non-migrating) replica. Increasing sequence of record versions is not
 * guaranteed.
 * @property ALLOW_UNAVAILABLE - Server may read from master or any full
 * (non-migrating) replica or from unavailable partitions. Increasing sequence
 * of record versions is not guaranteed.
 */
exports.readModeSC = as.policy.readModeSC

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
 * A base class extended to client policies.
 *
 * @summary {@link BasePolicy} class
 */
exports.BasePolicy = BasePolicy

/**
 * A policy affecting the behavior of apply operations.
 *
 * @summary {@link ApplyPolicy} class
 */
exports.ApplyPolicy = ApplyPolicy

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

/**
 * A policy affecting the behavior of batch operations.
 *
 * @summary {@link BatchPolicy} class
 */
exports.BatchPolicy = BatchPolicy

/**
 * A policy affecting the behavior of batchApply operations.
 *
 * @summary {@link BatchApplyPolicy} class
 */
exports.BatchApplyPolicy = BatchApplyPolicy

/**
 * A policy affecting the behavior of batchRead operations.
 *
 * @summary {@link BatchReadPolicy} class
 */
exports.BatchReadPolicy = BatchReadPolicy

/**
 * A policy affecting the behavior of batchRemove operations.
 *
 * @summary {@link BatchRemovePolicy} class
 */
exports.BatchRemovePolicy = BatchRemovePolicy

/**
 * A policy affecting the behavior of batchWrite operations.
 *
 * @summary {@link BatchWritePolicy} class
 */
exports.BatchWritePolicy = BatchWritePolicy

/**
 * A policy affecting the use of the global command queue.
 *
 * @summary {@link CommandQueuePolicy} class
 */
exports.CommandQueuePolicy = CommandQueuePolicy

/**
 * A policy affecting the behavior of HLL operations.
 *
 * @summary {@link HLLPolicy} class
 */
exports.HLLPolicy = HLLPolicy

/**
 * A policy affecting the behavior of info operations.
 *
 * @summary {@link InfoPolicy} class
 */
exports.InfoPolicy = InfoPolicy

/**
 * A policy affecting the behavior of list operations.
 *
 * @summary {@link ListPolicy} class
 */
exports.ListPolicy = ListPolicy

/**
 * A policy affecting the behavior of map operations.
 *
 * @summary {@link MapPolicy} class
 */
exports.MapPolicy = MapPolicy

function policyClass (type) {
  switch (type) {
    case 'base': return BasePolicy
    case 'apply': return ApplyPolicy
    case 'batch': return BatchPolicy
    case 'operate': return OperatePolicy
    case 'query': return QueryPolicy
    case 'read': return ReadPolicy
    case 'remove': return RemovePolicy
    case 'scan': return ScanPolicy
    case 'write': return WritePolicy
    case 'batchRead': return BatchReadPolicy
    case 'batchRemove': return BatchRemovePolicy
    case 'batchWrite': return BatchWritePolicy
    case 'batchApply': return BatchApplyPolicy
    case 'commandQueue': return CommandQueuePolicy
    case 'hll': return HLLPolicy
    case 'info': return InfoPolicy
    case 'list': return ListPolicy
    case 'map': return MapPolicy
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
  const Klass = policyClass(type)
  if (values instanceof Klass) {
    return values
  }
  return new Klass(values)
}
