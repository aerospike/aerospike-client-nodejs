// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the 'License')
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

const as = require('bindings')('aerospike.node')

/**
 * @module aerospike/status
 *
 * @description Database operation error codes.
 */

// ========================================================================
// Constants
// ========================================================================

/**
 * Node invalid or could not be found.
 * @const {number}
 */
exports.ERR_INVALID_NODE = exports.AEROSPIKE_ERR_INVALID_NODE = as.status.AEROSPIKE_ERR_INVALID_NODE

/**
 * Asynchronous connection error.
 * @const {number}
 */
exports.ERR_NO_MORE_CONNECTIONS = exports.AEROSPIKE_ERR_NO_MORE_CONNECTIONS = as.status.AEROSPIKE_ERR_NO_MORE_CONNECTIONS

/**
 * Asynchronous connection error.
 * @const {number}
 */
exports.ERR_ASYNC_CONNECTION = exports.AEROSPIKE_ERR_ASYNC_CONNECTION = as.status.AEROSPIKE_ERR_ASYNC_CONNECTION

/**
 * Query or scan was aborted in user's callback.
 * @const {number}
 */
exports.ERR_CLIENT_ABORT = exports.AEROSPIKE_ERR_CLIENT_ABORT = as.status.AEROSPIKE_ERR_CLIENT_ABORT

/**
 * Host name could not be found in DNS lookup.
 * @const {number}
 */
exports.ERR_INVALID_HOST = exports.AEROSPIKE_ERR_INVALID_HOST = as.status.AEROSPIKE_ERR_INVALID_HOST

/**
 * No more records available when parsing batch, scan or query records.
 * @const {number}
 */
exports.NO_MORE_RECORDS = exports.AEROSPIKE_NO_MORE_RECORDS = as.status.AEROSPIKE_NO_MORE_RECORDS

/**
 * Invalid client API parameter.
 * @const {number}
 */
exports.ERR_PARAM = exports.AEROSPIKE_ERR_PARAM = as.status.AEROSPIKE_ERR_PARAM

/**
 * Generic client API usage error.
 * @const {number}
 */
exports.ERR_CLIENT = exports.AEROSPIKE_ERR_CLIENT = as.status.AEROSPIKE_ERR_CLIENT

/**
 * Generic success.
 * @const {number}
 */
exports.OK = exports.AEROSPIKE_OK = as.status.AEROSPIKE_OK

/**
 * Generic error returned by the server.
 * @const {number}
 */
exports.ERR_SERVER = exports.AEROSPIKE_ERR_SERVER = as.status.AEROSPIKE_ERR_SERVER

/**
 * Record does not exist in database. May be returned by read, or write with
 * policy <code>Aerospike.policy.exists.UPDATE</code>
 * @const {number}
 */
exports.ERR_RECORD_NOT_FOUND = exports.AEROSPIKE_ERR_RECORD_NOT_FOUND = as.status.AEROSPIKE_ERR_RECORD_NOT_FOUND

/**
 * Generation of record in database does not satisfy write policy.
 * @const {number}
 */
exports.ERR_RECORD_GENERATION = exports.AEROSPIKE_ERR_RECORD_GENERATION = as.status.AEROSPIKE_ERR_RECORD_GENERATION

/**
 * Request protocol invalid, or invalid protocol field.
 * @const {number}
 */
exports.ERR_REQUEST_INVALID = exports.AEROSPIKE_ERR_REQUEST_INVALID = as.status.AEROSPIKE_ERR_REQUEST_INVALID

/**
 * Record already exists. May be returned by write with policy
 * <code>Aerospike.policy.exists.CREATE</code>.
 * @const {number}
 */
exports.ERR_RECORD_EXISTS = exports.AEROSPIKE_ERR_RECORD_EXISTS = as.status.AEROSPIKE_ERR_RECORD_EXISTS

/**
 * Bin already exists.
 * @const {number}
 */
exports.ERR_BIN_EXISTS = exports.AEROSPIKE_ERR_BIN_EXISTS = as.status.AEROSPIKE_ERR_BIN_EXISTS

/**
 * A cluster state change occurred during the request.
 * @const {number}
 */
exports.ERR_CLUSTER_CHANGE = exports.AEROSPIKE_ERR_CLUSTER_CHANGE = as.status.AEROSPIKE_ERR_CLUSTER_CHANGE

/**
 * The server node is running out of memory and/or storage device space
 * reserved for the specified namespace.
 * @const {number}
 */
exports.ERR_SERVER_FULL = exports.AEROSPIKE_ERR_SERVER_FULL = as.status.AEROSPIKE_ERR_SERVER_FULL

/**
 * Request timed out. Can be triggered by client or server.
 * @const {number}
 */
exports.ERR_TIMEOUT = exports.AEROSPIKE_ERR_TIMEOUT = as.status.AEROSPIKE_ERR_TIMEOUT

/**
 * Client is attempting an operation which is not allowed under current configuration.
 * @const {number}
 */
exports.ERR_ALWAYS_FORBIDDEN = exports.AEROSPIKE_ERR_ALWAYS_FORBIDDEN = as.status.AEROSPIKE_ERR_ALWAYS_FORBIDDEN

/**
 * Generic cluster discovery & connection error.
 * @const {number}
 */
exports.ERR_CLUSTER = exports.AEROSPIKE_ERR_CLUSTER = as.status.AEROSPIKE_ERR_CLUSTER

/**
 * Bin modification operation cannot be done on an existing bin due to its
 * value type.
 * @const {number}
 */
exports.ERR_BIN_INCOMPATIBLE_TYPE = exports.AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE = as.status.AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE

/**
 * Record being (re-)written cannot fit in a storage write block.
 * @const {number}
 */
exports.ERR_RECORD_TOO_BIG = exports.AEROSPIKE_ERR_RECORD_TOO_BIG = as.status.AEROSPIKE_ERR_RECORD_TOO_BIG

/**
 * Too many concurrent requests for one record - a 'hot key' situation.
 * @const {number}
 */
exports.ERR_RECORD_BUSY = exports.AEROSPIKE_ERR_RECORD_BUSY = as.status.AEROSPIKE_ERR_RECORD_BUSY

/**
 * Scan aborted by user.
 * @const {number}
 */
exports.ERR_SCAN_ABORTED = exports.AEROSPIKE_ERR_SCAN_ABORTED = as.status.AEROSPIKE_ERR_SCAN_ABORTED

/**
 * Sometimes our doc, or our customers' wishes, get ahead of us. We may have
 * processed something that the server is not ready for (unsupported feature).
 * @const {number}
 */
exports.ERR_UNSUPPORTED_FEATURE = exports.AEROSPIKE_ERR_UNSUPPORTED_FEATURE = as.status.AEROSPIKE_ERR_UNSUPPORTED_FEATURE

/**
 * Bin-level replace-only supported on server but not on client.
 * @const {number}
 */
exports.ERR_BIN_NOT_FOUND = exports.AEROSPIKE_ERR_BIN_NOT_FOUND = as.status.AEROSPIKE_ERR_BIN_NOT_FOUND

/**
 * The server node's storage device(s) can't keep up with the write load.
 * @const {number}
 */
exports.ERR_DEVICE_OVERLOAD = exports.AEROSPIKE_ERR_DEVICE_OVERLOAD = as.status.AEROSPIKE_ERR_DEVICE_OVERLOAD

/**
 * Record key sent with transaction did not match key stored on server.
 * @const {number}
 */
exports.ERR_RECORD_KEY_MISMATCH = exports.AEROSPIKE_ERR_RECORD_KEY_MISMATCH = as.status.AEROSPIKE_ERR_RECORD_KEY_MISMATCH

/**
 * Namespace in request not found on server.
 * @const {number}
 */
exports.ERR_NAMESPACE_NOT_FOUND = exports.AEROSPIKE_ERR_NAMESPACE_NOT_FOUND = as.status.AEROSPIKE_ERR_NAMESPACE_NOT_FOUND

/**
 * Sent too-long bin name or exceeded namespace's bin name quota.
 * @const {number}
 */
exports.ERR_BIN_NAME = exports.AEROSPIKE_ERR_BIN_NAME = as.status.AEROSPIKE_ERR_BIN_NAME

/**
 * Operation not allowed at this time.
 * @const {number}
 */
exports.ERR_FAIL_FORBIDDEN = exports.AEROSPIKE_ERR_FAIL_FORBIDDEN = as.status.AEROSPIKE_ERR_FAIL_FORBIDDEN

/**
 * Map element not found in UPDATE_ONLY write mode.
 * @const {number}
 */
exports.ERR_FAIL_ELEMENT_NOT_FOUND = exports.AEROSPIKE_ERR_FAIL_ELEMENT_NOT_FOUND = as.status.AEROSPIKE_ERR_FAIL_ELEMENT_NOT_FOUND

/**
 * Map element exists in CREATE_ONLY write mode.
 * @const {number}
 */
exports.ERR_FAIL_ELEMENT_EXISTS = exports.AEROSPIKE_ERR_FAIL_ELEMENT_EXISTS = as.status.AEROSPIKE_ERR_FAIL_ELEMENT_EXISTS

/**
 * Feature is only supported in the Aerospike Enterprise edition.
 * @const {number}
 */
exports.ERR_FAIL_ENTERPRISE_ONLY = exports.AEROSPIKE_ERR_FAIL_ENTERPRISE_ONLY = as.status.AEROSPIKE_ERR_FAIL_ENTERPRISE_ONLY

/**
 * There are no more records left for query.
 * @const {number}
 */
exports.QUERY_END = exports.AEROSPIKE_QUERY_END = as.status.AEROSPIKE_QUERY_END

/**
 * Security functionality not supported by connected server.
 * @const {number}
 */
exports.SECURITY_NOT_SUPPORTED = exports.AEROSPIKE_SECURITY_NOT_SUPPORTED = as.status.AEROSPIKE_SECURITY_NOT_SUPPORTED

/**
 * Security functionality not enabled by connected server.
 * @const {number}
 */
exports.SECURITY_NOT_ENABLED = exports.AEROSPIKE_SECURITY_NOT_ENABLED = as.status.AEROSPIKE_SECURITY_NOT_ENABLED

/**
 * Security type not supported by connected server.
 * @const {number}
 */
exports.SECURITY_SCHEME_NOT_SUPPORTED = exports.AEROSPIKE_SECURITY_SCHEME_NOT_SUPPORTED = as.status.AEROSPIKE_SECURITY_SCHEME_NOT_SUPPORTED

/**
 * Administration command is invalid.
 * @const {number}
 */
exports.INVALID_COMMAND = exports.AEROSPIKE_INVALID_COMMAND = as.status.AEROSPIKE_INVALID_COMMAND

/**
 * Administration field is invalid.
 * @const {number}
 */
exports.INVALID_FIELD = exports.AEROSPIKE_INVALID_FIELD = as.status.AEROSPIKE_INVALID_FIELD

/**
 * Security protocol not followed.
 * @const {number}
 */
exports.ILLEGAL_STATE = exports.AEROSPIKE_ILLEGAL_STATE = as.status.AEROSPIKE_ILLEGAL_STATE

/**
 * User name is invalid.
 * @const {number}
 */
exports.INVALID_USER = exports.AEROSPIKE_INVALID_USER = as.status.AEROSPIKE_INVALID_USER

/**
 * User was previously created.
 * @const {number}
 */
exports.USER_ALREADY_EXISTS = exports.AEROSPIKE_USER_ALREADY_EXISTS = as.status.AEROSPIKE_USER_ALREADY_EXISTS

/**
 * Password is invalid.
 * @const {number}
 */
exports.INVALID_PASSWORD = exports.AEROSPIKE_INVALID_PASSWORD = as.status.AEROSPIKE_INVALID_PASSWORD

/**
 * Password has expired.
 * @const {number}
 */
exports.EXPIRED_PASSWORD = exports.AEROSPIKE_EXPIRED_PASSWORD = as.status.AEROSPIKE_EXPIRED_PASSWORD

/**
 * Forbidden password (e.g. recently used).
 * @const {number}
 */
exports.FORBIDDEN_PASSWORD = exports.AEROSPIKE_FORBIDDEN_PASSWORD = as.status.AEROSPIKE_FORBIDDEN_PASSWORD

/**
 * Security credential is invalid.
 * @const {number}
 */
exports.INVALID_CREDENTIAL = exports.AEROSPIKE_INVALID_CREDENTIAL = as.status.AEROSPIKE_INVALID_CREDENTIAL

/**
 * Role name is invalid.
 * @const {number}
 */
exports.INVALID_ROLE = exports.AEROSPIKE_INVALID_ROLE = as.status.AEROSPIKE_INVALID_ROLE

/**
 * Role name already exists.
 * @const {number}
 */
exports.ROLE_ALREADY_EXISTS = exports.AEROSPIKE_ROLE_ALREADY_EXISTS = as.status.AEROSPIKE_ROLE_ALREADY_EXISTS

/**
 * Privilege is invalid.
 * @const {number}
 */
exports.INVALID_PRIVILEGE = exports.AEROSPIKE_INVALID_PRIVILEGE = as.status.AEROSPIKE_INVALID_PRIVILEGE

/**
 * User must be authenticated before performing database operations.
 * @const {number}
 */
exports.NOT_AUTHENTICATED = exports.AEROSPIKE_NOT_AUTHENTICATED = as.status.AEROSPIKE_NOT_AUTHENTICATED

/**
 * User does not possess the required role to perform the database operation.
 * @const {number}
 */
exports.ROLE_VIOLATION = exports.AEROSPIKE_ROLE_VIOLATION = as.status.AEROSPIKE_ROLE_VIOLATION

/**
 * Generic UDF error.
 * @const {number}
 */
exports.ERR_UDF = exports.AEROSPIKE_ERR_UDF = as.status.AEROSPIKE_ERR_UDF

/**
 * Batch functionality has been disabled.
 * @const {number}
 */
exports.ERR_BATCH_DISABLED = exports.AEROSPIKE_ERR_BATCH_DISABLED = as.status.AEROSPIKE_ERR_BATCH_DISABLED

/**
 * Batch max. requests have been exceeded.
 * @const {number}
 */
exports.ERR_BATCH_MAX_REQUESTS_EXCEEDED = exports.AEROSPIKE_ERR_BATCH_MAX_REQUESTS_EXCEEDED = as.status.AEROSPIKE_ERR_BATCH_MAX_REQUESTS_EXCEEDED

/**
 * All batch queues are full.
 * @const {number}
 */
exports.ERR_BATCH_QUEUES_FULL = exports.AEROSPIKE_ERR_BATCH_QUEUES_FULL = as.status.AEROSPIKE_ERR_BATCH_QUEUES_FULL

/**
 * Invalid/unsupported GeoJSON.
 * @const {number}
 */
exports.ERR_GEO_INVALID_GEOJSON = exports.AEROSPIKE_ERR_GEO_INVALID_GEOJSON = as.status.AEROSPIKE_ERR_GEO_INVALID_GEOJSON

/**
 * Index found.
 * @const {number}
 */
exports.ERR_INDEX_FOUND = exports.AEROSPIKE_ERR_INDEX_FOUND = as.status.AEROSPIKE_ERR_INDEX_FOUND

/**
 * Index not found.
 * @const {number}
 */
exports.ERR_INDEX_NOT_FOUND = exports.AEROSPIKE_ERR_INDEX_NOT_FOUND = as.status.AEROSPIKE_ERR_INDEX_NOT_FOUND

/**
 * Index is out of memory.
 * @const {number}
 */
exports.ERR_INDEX_OOM = exports.AEROSPIKE_ERR_INDEX_OOM = as.status.AEROSPIKE_ERR_INDEX_OOM

/**
 * Unable to read the index.
 * @const {number}
 */
exports.ERR_INDEX_NOT_READABLE = exports.AEROSPIKE_ERR_INDEX_NOT_READABLE = as.status.AEROSPIKE_ERR_INDEX_NOT_READABLE

/**
 * Generic secondary index error.
 * @const {number}
 */
exports.ERR_INDEX = exports.AEROSPIKE_ERR_INDEX = as.status.AEROSPIKE_ERR_INDEX

/**
 * Index name is too long.
 * @const {number}
 */
exports.ERR_INDEX_NAME_MAXLEN = exports.AEROSPIKE_ERR_INDEX_NAME_MAXLEN = as.status.AEROSPIKE_ERR_INDEX_NAME_MAXLEN

/**
 * System alrady has maximum allowed indeces.
 * @const {number}
 */
exports.ERR_INDEX_MAXCOUNT = exports.AEROSPIKE_ERR_INDEX_MAXCOUNT = as.status.AEROSPIKE_ERR_INDEX_MAXCOUNT

/**
 * Query was aborted.
 * @const {number}
 */
exports.ERR_QUERY_ABORTED = exports.AEROSPIKE_ERR_QUERY_ABORTED = as.status.AEROSPIKE_ERR_QUERY_ABORTED

/**
 * Query processing queue is full.
 * @const {number}
 */
exports.ERR_QUERY_QUEUE_FULL = exports.AEROSPIKE_ERR_QUERY_QUEUE_FULL = as.status.AEROSPIKE_ERR_QUERY_QUEUE_FULL

/**
 * Secondary index query timed out on server.
 * @const {number}
 */
exports.ERR_QUERY_TIMEOUT = exports.AEROSPIKE_ERR_QUERY_TIMEOUT = as.status.AEROSPIKE_ERR_QUERY_TIMEOUT

/**
 * Generic query error.
 * @const {number}
 */
exports.ERR_QUERY = exports.AEROSPIKE_ERR_QUERY = as.status.AEROSPIKE_ERR_QUERY

/**
 * UDF does not exist.
 * @const {number}
 */
exports.ERR_UDF_NOT_FOUND = exports.AEROSPIKE_ERR_UDF_NOT_FOUND = as.status.AEROSPIKE_ERR_UDF_NOT_FOUND

/**
 * LUA file does not exist.
 * @const {number}
 */
exports.ERR_LUA_FILE_NOT_FOUND = exports.AEROSPIKE_ERR_LUA_FILE_NOT_FOUND = as.status.AEROSPIKE_ERR_LUA_FILE_NOT_FOUND

// ========================================================================
// Functions
// ========================================================================

/**
 * Prodeces a human-readable error message for the given status code.
 */
exports.getMessage = function (code) {
  switch (code) {
    case exports.ERR_INVALID_NODE:
      return 'Node invalid or could not be found.'

    case exports.ERR_NO_MORE_CONNECTIONS:
      return 'Asynchronous connection error.'

    case exports.ERR_ASYNC_CONNECTION:
      return 'Asynchronous connection error.'

    case exports.ERR_CLIENT_ABORT:
      return 'Query or scan was aborted in user\'s callback.'

    case exports.ERR_INVALID_HOST:
      return 'Host name could not be found in DNS lookup.'

    case exports.NO_MORE_RECORDS:
      return 'No more records available when parsing batch, scan or query records.'

    case exports.ERR_PARAM:
      return 'Invalid client API parameter.'

    case exports.ERR_CLIENT:
      return 'Generic client API usage error.'

    case exports.OK:
      return 'Generic success.'

    case exports.ERR_SERVER:
      return 'Generic error returned by the server.'

    case exports.ERR_RECORD_NOT_FOUND:
      return 'Record does not exist in database. May be returned by read, or write with policy Aerospike.policy.exists.UPDATE'

    case exports.ERR_RECORD_GENERATION:
      return 'Generation of record in database does not satisfy write policy.'

    case exports.ERR_REQUEST_INVALID:
      return 'Request protocol invalid, or invalid protocol field.'

    case exports.ERR_RECORD_EXISTS:
      return 'Record already exists. May be returned by write with policy Aerospike.policy.exists.CREATE.'

    case exports.ERR_BIN_EXISTS:
      return 'Bin already exists.'

    case exports.ERR_CLUSTER_CHANGE:
      return 'A cluster state change occurred during the request.'

    case exports.ERR_SERVER_FULL:
      return 'The server node is running out of memory and/or storage device space reserved for the specified namespace.'

    case exports.ERR_TIMEOUT:
      return 'Request timed out. Can be triggered by client or server.'

    case exports.ERR_ALWAYS_FORBIDDEN:
      return 'Client is attempting an operation which is not allowed under current configuration.'

    case exports.ERR_CLUSTER:
      return 'Generic cluster discovery & connection error.'

    case exports.ERR_BIN_INCOMPATIBLE_TYPE:
      return 'Bin modification operation cannot be done on an existing bin due to its value type.'

    case exports.ERR_RECORD_TOO_BIG:
      return 'Record being (re-)written cannot fit in a storage write block.'

    case exports.ERR_RECORD_BUSY:
      return 'Too many concurrent requests for one record - a "hot key" situation.'

    case exports.ERR_SCAN_ABORTED:
      return 'Scan aborted by user.'

    case exports.ERR_UNSUPPORTED_FEATURE:
      return 'Sometimes our doc, or our customers\' wishes, get ahead of us. We may have processed something that the server is not ready for (unsupported feature).'

    case exports.ERR_BIN_NOT_FOUND:
      return 'Bin-level replace-only supported on server but not on client.'

    case exports.ERR_DEVICE_OVERLOAD:
      return 'The server node\'s storage device(s) can\'t keep up with the write load.'

    case exports.ERR_RECORD_KEY_MISMATCH:
      return 'Record key sent with transaction did not match key stored on server.'

    case exports.ERR_NAMESPACE_NOT_FOUND:
      return 'Namespace in request not found on server.'

    case exports.ERR_BIN_NAME:
      return 'Sent too-long bin name or exceeded namespace\'s bin name quota.'

    case exports.ERR_FAIL_FORBIDDEN:
      return 'Operation not allowed at this time.'

    case exports.ERR_FAIL_ELEMENT_NOT_FOUND:
      return 'Map element not found in UPDATE_ONLY write mode.'

    case exports.ERR_FAIL_ELEMENT_EXISTS:
      return 'Map element exists in CREATE_ONLY write mode.'

    case exports.ERR_FAIL_ENTERPRISE_ONLY:
      return 'Feature is only supported in the Aerospike Enterprise edition.'

    case exports.QUERY_END:
      return 'There are no more records left for query.'

    case exports.SECURITY_NOT_SUPPORTED:
      return 'Security functionality not supported by connected server.'

    case exports.SECURITY_NOT_ENABLED:
      return 'Security functionality not enabled by connected server.'

    case exports.SECURITY_SCHEME_NOT_SUPPORTED:
      return 'Security type not supported by connected server.'

    case exports.INVALID_COMMAND:
      return 'Administration command is invalid.'

    case exports.INVALID_FIELD:
      return 'Administration field is invalid.'

    case exports.ILLEGAL_STATE:
      return 'Security protocol not followed.'

    case exports.INVALID_USER:
      return 'User name is invalid.'

    case exports.USER_ALREADY_EXISTS:
      return 'User was previously created.'

    case exports.INVALID_PASSWORD:
      return 'Password is invalid.'

    case exports.EXPIRED_PASSWORD:
      return 'Password has expired.'

    case exports.FORBIDDEN_PASSWORD:
      return 'Forbidden password (e.g. recently used).'

    case exports.INVALID_CREDENTIAL:
      return 'Security credential is invalid.'

    case exports.INVALID_ROLE:
      return 'Role name is invalid.'

    case exports.ROLE_ALREADY_EXISTS:
      return 'Role name already exists.'

    case exports.INVALID_PRIVILEGE:
      return 'Privilege is invalid.'

    case exports.NOT_AUTHENTICATED:
      return 'User must be authenticated before performing database operations.'

    case exports.ROLE_VIOLATION:
      return 'User does not possess the required role to perform the database operation.'

    case exports.ERR_UDF:
      return 'Generic UDF error.'

    case exports.ERR_BATCH_DISABLED:
      return 'Batch functionality has been disabled.'

    case exports.ERR_BATCH_MAX_REQUESTS_EXCEEDED:
      return 'Batch max. requests have been exceeded.'

    case exports.ERR_BATCH_QUEUES_FULL:
      return 'All batch queues are full.'

    case exports.ERR_GEO_INVALID_GEOJSON:
      return 'Invalid/unsupported GeoJSON.'

    case exports.ERR_INDEX_FOUND:
      return 'Index found.'

    case exports.ERR_INDEX_NOT_FOUND:
      return 'Index not found.'

    case exports.ERR_INDEX_OOM:
      return 'Index is out of memory.'

    case exports.ERR_INDEX_NOT_READABLE:
      return 'Unable to read the index.'

    case exports.ERR_INDEX:
      return 'Generic secondary index error.'

    case exports.ERR_INDEX_NAME_MAXLEN:
      return 'Index name is too long.'

    case exports.ERR_INDEX_MAXCOUNT:
      return 'System alrady has maximum allowed indeces.'

    case exports.ERR_QUERY_ABORTED:
      return 'Query was aborted.'

    case exports.ERR_QUERY_QUEUE_FULL:
      return 'Query processing queue is full.'

    case exports.ERR_QUERY_TIMEOUT:
      return 'Secondary index query timed out on server.'

    case exports.ERR_QUERY:
      return 'Generic query error.'

    case exports.ERR_UDF_NOT_FOUND:
      return 'UDF does not exist.'

    case exports.ERR_LUA_FILE_NOT_FOUND:
      return 'LUA file does not exist.'

    default: return `Unknown status message ${code}`
  }
}
