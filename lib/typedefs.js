// *****************************************************************************
// Copyright 2013-2018 Aerospike, Inc.
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

/**
 * @typedef {Object} ClientStats
 *
 * @summary Runtime stats about a client instance.
 *
 * @property {Object} commands - Array of node stats
 * @property {number} commands.inFlight - Approximate number of commands
 * actively being proccessed.
 * @property {number} commands.queued - Approximate number of commands queued
 * on the global command queue, that have not yet been started.
 * @property {Object[]} nodes - Array of node stats
 * @property {string} nodes.name - Node ID
 * @property {Object} nodes.syncConnections - Synchronous connection stats
 * @property {number} nodes.syncConnections.inPool - Connections residing in
 * pool(s) for this node. There can be multiple pools per node. This value is a
 * summary of those pools for this node.
 * @property {number} nodes.syncConnections.inUse - Connections actively being
 * used in database transactions for this node.
 * @property {Object} nodes.asyncConnections - Asynchronous connection stats
 * @property {number} nodes.asyncConnections.inPool - Connections residing in
 * pool(s) for this node. There can be multiple pools per node. This value is a
 * summary of those pools for this node.
 * @property {number} nodes.asyncConnections.inUse - Connections actively being
 * used in database transactions for this node.
 *
 * @see Client#stats
 * @since v3.8.0
 */

/**
 * @callback doneCallback
 *
 * @summary Callback function called when an operation has completed.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 */

/**
 * @callback recordCallback
 *
 * @summary Callback function returning a single record from the cluster.
 *
 * @description
 *
 * If the operation was successful, <code>null</code> will be returned for the
 * error parameter. If there was an error, <code>record</code> will be
 * <code>undefined</code> and the <code>error</code> paramter will provide more
 * information about the error.
 *
 * @param {?AerospikeError} error - The error code and message or
 * <code>null</code> if the operation was successful.
 * @param {Record} [record] - Aerospike record incl. bins, key and meta data.
 * Depending on the operation, all, some or no bin values will be returned.
 */

/**
 * @callback valueCallback
 *
 * @summary Callback function returning a single, arbitrary return value.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {*} value - The return value of the operation.
 */

/**
 * @callback writeCallback
 *
 * @summary Callback function called when a write operation on a single record has completed.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Key} key - The key of the record.
 */

/**
 * @callback batchRecordsCallback
 *
 * @summary Callback function returning one or more records from the cluster.
 *
 * @description
 *
 * If the operation was successful, <code>null</code> will be returned for the
 * error parameter. If there was an error, <code>results</code> will be
 * <code>undefined</code> and the <code>error</code> paramter will provide more
 * information about the error.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Object[]} [results] - The results of the operation. Depending on the
 * specific operation, the full record, a selection of bins or just the meta
 * data for the record will be included in the results.
 * @param {number} results.status - The status for fetching an individual record.
 * @param {Record} [results.record] - A database record of <code>null</code> if status is not AEROSPIKE_OK.
 */

/**
 * @callback connectCallback
 *
 * @summary The function called when the client has successfully connected to the server.
 *
 * @description
 *
 * Once you receive the connect callback the client instance
 * returned in the callback is ready to accept commands for the Aerospike
 * cluster.
 *
 * If an error occurred while connecting to the cluster, the
 * <code>client</code> parameter will be <code>undefined</code> and the
 * <code>error</code> parameter will include more information about the error.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Client} [client] - Aerospike client instance.
 */

/**
 * @callback infoCallback
 *
 * @summary The function called when a cluster host responds to an info query.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {string} [response] - The response string with the requested info.
 */

/**
 * @callback infoAllCallback
 *
 * @summary The function called when all cluster nodes have responded to the
 * info request. Note that the error parameter in the callback will be
 * non-<code>null</code> if at least one of the cluster hosts responded with an
 * error to the info request.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Object[]} [responses] - The response string with the requested info.
 * @param {String} responses[].info - The response string with the requested info.
 * @param {Object} responses[].host - The node that send the info response.
 * @param {String} responses[].host.node_id - The name of the node.
 */

/**
 * @callback jobCallback
 *
 * @summary Function called when a potentially long-running job has been started.
 *
 * @param {?AerospikeError} error - The error code and message or <code>null</code> if the operation was successful.
 * @param {Job} [job] - Handle on a potentially long-running job which can be used to check for job completion.
 */
