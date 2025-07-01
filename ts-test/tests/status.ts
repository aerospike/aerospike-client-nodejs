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

/* global expect, describe, it */

import Aerospike, { status as stat } from 'aerospike'

import { expect } from 'chai' 

const status: typeof stat = Aerospike.status

describe('Aerospike.status #noserver', function () {
  it('AEROSPIKE_TXN_ALREADY_ABORTED', function () {
    expect(status.AEROSPIKE_TXN_ALREADY_ABORTED).to.equal(-19)
    expect(status.TXN_ALREADY_ABORTED).to.equal(-19)
    expect(status.getMessage(status.TXN_ALREADY_ABORTED)).to.equal('Transaction commit called, but the transaction was already aborted.')
  })
  
  it('AEROSPIKE_TXN_ALREADY_ABORTED', function () {
    expect(status.AEROSPIKE_TXN_ALREADY_ABORTED).to.equal(-19)
    expect(status.TXN_ALREADY_ABORTED).to.equal(-19)
    expect(status.getMessage(status.TXN_ALREADY_ABORTED)).to.equal('Transaction commit called, but the transaction was already aborted.')
  })

  it('AEROSPIKE_TXN_ALREADY_COMMITTED', function () {
    expect(status.AEROSPIKE_TXN_ALREADY_COMMITTED).to.equal(-18)
    expect(status.TXN_ALREADY_COMMITTED).to.equal(-18)
    expect(status.getMessage(status.TXN_ALREADY_COMMITTED)).to.equal('Transaction abort called, but the transaction was already committed.')
  })

  it('AEROSPIKE_TXN_FAILED', function () {
    expect(status.AEROSPIKE_TXN_FAILED).to.equal(-17)
    expect(status.TXN_FAILED).to.equal(-17)
    expect(status.getMessage(status.TXN_FAILED)).to.equal('Transaction failed.')
  })

  it('AEROSPIKE_BATCH_FAILED', function () {
    expect(status.AEROSPIKE_BATCH_FAILED).to.equal(-16)
    expect(status.BATCH_FAILED).to.equal(-16)
    expect(status.getMessage(status.BATCH_FAILED)).to.equal('One or more keys failed in a batch.')
  })

  it('AEROSPIKE_NO_RESPONSE', function () {
    expect(status.AEROSPIKE_NO_RESPONSE).to.equal(-15)
    expect(status.NO_RESPONSE).to.equal(-15)
    expect(status.getMessage(status.NO_RESPONSE)).to.equal('No response received from server.')
  })

  it('AEROSPIKE_MAX_ERROR_RATE', function () {
    expect(status.AEROSPIKE_MAX_ERROR_RATE).to.equal(-14)
    expect(status.MAX_ERROR_RATE).to.equal(-14)
    expect(status.getMessage(status.MAX_ERROR_RATE)).to.equal('Max errors limit reached.')
  })

  it('AEROSPIKE_USE_NORMAL_RETRY', function () {
    expect(status.AEROSPIKE_USE_NORMAL_RETRY).to.equal(-13)
    expect(status.USE_NORMAL_RETRY).to.equal(-13)
    expect(status.getMessage(status.USE_NORMAL_RETRY)).to.equal('Abort split batch retry and use normal node retry instead. Used internally and should not be returned to user.')
  })

  it('AEROSPIKE_ERR_MAX_RETRIES_EXCEEDED', function () {
    expect(status.AEROSPIKE_ERR_MAX_RETRIES_EXCEEDED).to.equal(-12)
    expect(status.ERR_MAX_RETRIES_EXCEEDED).to.equal(-12)
    expect(status.getMessage(status.ERR_MAX_RETRIES_EXCEEDED)).to.equal('Max retries limit reached.')
  })  

  it('AEROSPIKE_ERR_ASYNC_QUEUE_FULL', function () {
    expect(status.AEROSPIKE_ERR_ASYNC_QUEUE_FULL).to.equal(-11)
    expect(status.ERR_ASYNC_QUEUE_FULL).to.equal(-11)
    expect(status.getMessage(status.ERR_ASYNC_QUEUE_FULL)).to.equal('Async command delay queue is full.')
  })

  it('AEROSPIKE_ERR_CONNECTION', function () {
    expect(status.AEROSPIKE_ERR_CONNECTION).to.equal(-10)
    expect(status.ERR_CONNECTION).to.equal(-10)
    expect(status.getMessage(status.ERR_CONNECTION)).to.equal('Synchronous connection error.')
  })

  it('AEROSPIKE_ERR_TLS_ERROR', function () {
    expect(status.AEROSPIKE_ERR_TLS_ERROR).to.equal(-9)
    expect(status.ERR_TLS_ERROR).to.equal(-9)
    expect(status.getMessage(status.ERR_TLS_ERROR)).to.equal('TLS related error')
  })

  it('AEROSPIKE_ERR_INVALID_NODE', function () {
    expect(status.AEROSPIKE_ERR_INVALID_NODE).to.equal(-8)
    expect(status.ERR_INVALID_NODE).to.equal(-8)
    expect(status.getMessage(status.ERR_INVALID_NODE)).to.equal('Node invalid or could not be found.')
  })

  it('AEROSPIKE_ERR_NO_MORE_CONNECTIONS', function () {
    expect(status.AEROSPIKE_ERR_NO_MORE_CONNECTIONS).to.equal(-7)
    expect(status.ERR_NO_MORE_CONNECTIONS).to.equal(-7)
    expect(status.getMessage(status.ERR_NO_MORE_CONNECTIONS)).to.equal('Max connections would be exceeded.')
  })

  it('AEROSPIKE_ERR_ASYNC_CONNECTION', function () {
    expect(status.AEROSPIKE_ERR_ASYNC_CONNECTION).to.equal(-6)
    expect(status.ERR_ASYNC_CONNECTION).to.equal(-6)
    expect(status.getMessage(status.ERR_ASYNC_CONNECTION)).to.equal('Asynchronous connection error.')
  })

  it('AEROSPIKE_ERR_CLIENT_ABORT', function () {
    expect(status.AEROSPIKE_ERR_CLIENT_ABORT).to.equal(-5)
    expect(status.ERR_CLIENT_ABORT).to.equal(-5)
    expect(status.getMessage(status.ERR_CLIENT_ABORT)).to.equal('Query or scan was aborted in user\'s callback.')
  })

  it('AEROSPIKE_ERR_INVALID_HOST', function () {
    expect(status.AEROSPIKE_ERR_INVALID_HOST).to.equal(-4)
    expect(status.ERR_INVALID_HOST).to.equal(-4)
    expect(status.getMessage(status.ERR_INVALID_HOST)).to.equal('Host name could not be found in DNS lookup.')
  })

  it('AEROSPIKE_NO_MORE_RECORDS', function () {
    expect(status.AEROSPIKE_NO_MORE_RECORDS).to.equal(-3)
    expect(status.NO_MORE_RECORDS).to.equal(-3)
    expect(status.getMessage(status.NO_MORE_RECORDS)).to.equal('No more records available when parsing batch, scan or query records.')
  })

  it('AEROSPIKE_ERR_PARAM', function () {
    expect(status.AEROSPIKE_ERR_PARAM).to.equal(-2)
    expect(status.ERR_PARAM).to.equal(-2)
    expect(status.getMessage(status.ERR_PARAM)).to.equal('Invalid client API parameter.')
  })

  it('AEROSPIKE_ERR_CLIENT', function () {
    expect(status.AEROSPIKE_ERR_CLIENT).to.equal(-1)
    expect(status.ERR_CLIENT).to.equal(-1)
    expect(status.getMessage(status.AEROSPIKE_ERR_CLIENT)).to.equal('Generic client API usage error.')
  })

 it('AEROSPIKE_OK', function () {
    expect(status.AEROSPIKE_OK).to.equal(0)
    expect(status.OK).to.equal(0)
    expect(status.getMessage(status.OK)).to.equal('Generic success.')
  })

  it('AEROSPIKE_ERR_SERVER', function () {
    expect(status.AEROSPIKE_ERR_SERVER).to.equal(1)
    expect(status.ERR_SERVER).to.equal(1)
    expect(status.getMessage(status.ERR_SERVER)).to.equal('Generic error returned by server.')
  })

  it('AEROSPIKE_ERR_RECORD_NOT_FOUND', function () {
    expect(status.AEROSPIKE_ERR_RECORD_NOT_FOUND).to.equal(2)
    expect(status.ERR_RECORD_NOT_FOUND).to.equal(2)
    expect(status.getMessage(status.ERR_RECORD_NOT_FOUND)).to.equal('Record does not exist in database. May be returned by read, or write with policy Aerospike.policy.exists.UPDATE.')
  })

  it('AEROSPIKE_ERR_RECORD_GENERATION', function () {
    expect(status.AEROSPIKE_ERR_RECORD_GENERATION).to.equal(3)
    expect(status.ERR_RECORD_GENERATION).to.equal(3)
    expect(status.getMessage(status.ERR_RECORD_GENERATION)).to.equal('Generation of record in database does not satisfy write policy.')
  })

  it('AEROSPIKE_ERR_REQUEST_INVALID', function () {
    expect(status.AEROSPIKE_ERR_REQUEST_INVALID).to.equal(4)
    expect(status.ERR_REQUEST_INVALID).to.equal(4)
    expect(status.getMessage(status.ERR_REQUEST_INVALID)).to.equal('Request protocol invalid, or invalid protocol field.')
  })

  it('AEROSPIKE_ERR_RECORD_EXISTS', function () {
    expect(status.AEROSPIKE_ERR_RECORD_EXISTS).to.equal(5)
    expect(status.ERR_RECORD_EXISTS).to.equal(5)
    expect(status.getMessage(status.ERR_RECORD_EXISTS)).to.equal('Record already exists. May be returned by write with policy Aerospike.policy.exists.CREATE.')
  })

  it('AEROSPIKE_ERR_BIN_EXISTS', function () {
    expect(status.AEROSPIKE_ERR_BIN_EXISTS).to.equal(6)
    expect(status.ERR_BIN_EXISTS).to.equal(6)
    expect(status.getMessage(status.ERR_BIN_EXISTS)).to.equal('Bin already exists on a create-only operation.')
  })

  it('AEROSPIKE_ERR_CLUSTER_CHANGE', function () {
    expect(status.AEROSPIKE_ERR_CLUSTER_CHANGE).to.equal(7)
    expect(status.ERR_CLUSTER_CHANGE).to.equal(7)
    expect(status.getMessage(status.ERR_CLUSTER_CHANGE)).to.equal('A cluster state change occurred during the request. This may also be returned by scan operations with the fail_on_cluster_change flag set.')
  })

  it('AEROSPIKE_ERR_SERVER_FULL', function () {
    expect(status.AEROSPIKE_ERR_SERVER_FULL).to.equal(8)
    expect(status.ERR_SERVER_FULL).to.equal(8)
    expect(status.getMessage(status.ERR_SERVER_FULL)).to.equal('The server node is running out of memory and/or storage device space reserved for the specified namespace.')
  })

  it('AEROSPIKE_ERR_TIMEOUT', function () {
    expect(status.AEROSPIKE_ERR_TIMEOUT).to.equal(9)
    expect(status.ERR_TIMEOUT).to.equal(9)
    expect(status.getMessage(status.ERR_TIMEOUT)).to.equal('Request timed out. Can be triggered by client or server.')
  })

  it('AEROSPIKE_ERR_ALWAYS_FORBIDDEN', function () {
    expect(status.AEROSPIKE_ERR_ALWAYS_FORBIDDEN).to.equal(10)
    expect(status.ERR_ALWAYS_FORBIDDEN).to.equal(10)
    expect(status.getMessage(status.ERR_ALWAYS_FORBIDDEN)).to.equal('Operation not allowed in current configuration.')
  })

  it('AEROSPIKE_ERR_CLUSTER', function () {
    expect(status.AEROSPIKE_ERR_CLUSTER).to.equal(11)
    expect(status.ERR_CLUSTER).to.equal(11)
    expect(status.getMessage(status.ERR_CLUSTER)).to.equal('Partition is unavailable.')
  })

  it('AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE', function () {
    expect(status.AEROSPIKE_ERR_BIN_INCOMPATIBLE_TYPE).to.equal(12)
    expect(status.ERR_BIN_INCOMPATIBLE_TYPE).to.equal(12)
    expect(status.getMessage(status.ERR_BIN_INCOMPATIBLE_TYPE)).to.equal('Bin modification operation can\'t be done on an existing bin due to its value type.')
  })

  it('AEROSPIKE_ERR_RECORD_TOO_BIG', function () {
    expect(status.AEROSPIKE_ERR_RECORD_TOO_BIG).to.equal(13)
    expect(status.ERR_RECORD_TOO_BIG).to.equal(13)
    expect(status.getMessage(status.ERR_RECORD_TOO_BIG)).to.equal('Record being (re-)written can\'t fit in a storage write block.')
  })

  it('AEROSPIKE_ERR_RECORD_BUSY', function () {
    expect(status.AEROSPIKE_ERR_RECORD_BUSY).to.equal(14)
    expect(status.ERR_RECORD_BUSY).to.equal(14)
    expect(status.getMessage(status.ERR_RECORD_BUSY)).to.equal('Too many concurrent requests for one record - a "hot-key" situation.')
  })

  it('AEROSPIKE_ERR_SCAN_ABORTED', function () {
    expect(status.AEROSPIKE_ERR_SCAN_ABORTED).to.equal(15)
    expect(status.ERR_SCAN_ABORTED).to.equal(15)
    expect(status.getMessage(status.ERR_SCAN_ABORTED)).to.equal('Scan aborted by user.')
  })

  it('AEROSPIKE_ERR_UNSUPPORTED_FEATURE', function () {
    expect(status.AEROSPIKE_ERR_UNSUPPORTED_FEATURE).to.equal(16)
    expect(status.ERR_UNSUPPORTED_FEATURE).to.equal(16)
    expect(status.getMessage(status.ERR_UNSUPPORTED_FEATURE)).to.equal('Sometimes our doc, or our customers wishes, get ahead of us. We may have processed something that the server is not ready for (unsupported feature).')
  })

  it('AEROSPIKE_ERR_BIN_NOT_FOUND', function () {
    expect(status.AEROSPIKE_ERR_BIN_NOT_FOUND).to.equal(17)
    expect(status.ERR_BIN_NOT_FOUND).to.equal(17)
    expect(status.getMessage(status.ERR_BIN_NOT_FOUND)).to.equal('Bin not found on update-only operation.')
  })

  it('AEROSPIKE_ERR_DEVICE_OVERLOAD', function () {
    expect(status.AEROSPIKE_ERR_DEVICE_OVERLOAD).to.equal(18)
    expect(status.ERR_DEVICE_OVERLOAD).to.equal(18)
    expect(status.getMessage(status.ERR_DEVICE_OVERLOAD)).to.equal('The server node\'s storage device(s) can\'t keep up with the write load.')
  })

  it('AEROSPIKE_ERR_RECORD_KEY_MISMATCH', function () {
    expect(status.AEROSPIKE_ERR_RECORD_KEY_MISMATCH).to.equal(19)
    expect(status.ERR_RECORD_KEY_MISMATCH).to.equal(19)
    expect(status.getMessage(status.ERR_RECORD_KEY_MISMATCH)).to.equal('Record key sent with command did not match key stored on server.')
  })

  it('AEROSPIKE_ERR_NAMESPACE_NOT_FOUND', function () {
    expect(status.AEROSPIKE_ERR_NAMESPACE_NOT_FOUND).to.equal(20)
    expect(status.ERR_NAMESPACE_NOT_FOUND).to.equal(20)
    expect(status.getMessage(status.ERR_NAMESPACE_NOT_FOUND)).to.equal('Namespace in request not found on server.')
  })

  it('AEROSPIKE_ERR_BIN_NAME', function () {
    expect(status.AEROSPIKE_ERR_BIN_NAME).to.equal(21)
    expect(status.ERR_BIN_NAME).to.equal(21)
    expect(status.getMessage(status.ERR_BIN_NAME)).to.equal('Sent too-long bin name (should be impossible in this client) or exceeded namespace\'s bin name quota.')
  })

  it('AEROSPIKE_ERR_FAIL_FORBIDDEN', function () {
    expect(status.AEROSPIKE_ERR_FAIL_FORBIDDEN).to.equal(22)
    expect(status.ERR_FAIL_FORBIDDEN).to.equal(22)
    expect(status.getMessage(status.ERR_FAIL_FORBIDDEN)).to.equal('Operation not allowed at this time.')
  })

  it('AEROSPIKE_ERR_FAIL_ELEMENT_NOT_FOUND', function () {
    expect(status.AEROSPIKE_ERR_FAIL_ELEMENT_NOT_FOUND).to.equal(23)
    expect(status.ERR_FAIL_ELEMENT_NOT_FOUND).to.equal(23)
    expect(status.getMessage(status.ERR_FAIL_ELEMENT_NOT_FOUND)).to.equal('Map element not found in UPDATE_ONLY write mode.')
  })

  it('AEROSPIKE_ERR_FAIL_ELEMENT_EXISTS', function () {
    expect(status.AEROSPIKE_ERR_FAIL_ELEMENT_EXISTS).to.equal(24)
    expect(status.ERR_FAIL_ELEMENT_EXISTS).to.equal(24)
    expect(status.getMessage(status.ERR_FAIL_ELEMENT_EXISTS)).to.equal('Map element exists in CREATE_ONLY write mode.')
  })

  it('AEROSPIKE_ERR_ENTERPRISE_ONLY', function () {
    expect(status.AEROSPIKE_ERR_ENTERPRISE_ONLY).to.equal(25)
    expect(status.ERR_ENTERPRISE_ONLY).to.equal(25)
    expect(status.getMessage(status.ERR_ENTERPRISE_ONLY)).to.equal('Attempt to use an Enterprise feature on a Community server or a server without the applicable feature key.')
  })

  it('AEROSPIKE_ERR_OP_NOT_APPLICABLE', function () {
    expect(status.AEROSPIKE_ERR_OP_NOT_APPLICABLE).to.equal(26)
    expect(status.ERR_OP_NOT_APPLICABLE).to.equal(26)
    expect(status.getMessage(status.ERR_OP_NOT_APPLICABLE)).to.equal('The operation cannot be applied to the current bin value on the server.')
  })

  it('AEROSPIKE_FILTERED_OUT', function () {
    expect(status.AEROSPIKE_FILTERED_OUT).to.equal(27)
    expect(status.FILTERED_OUT).to.equal(27)
    expect(status.getMessage(status.FILTERED_OUT)).to.equal('The command was not performed because the filter expression was false.')
  })

  it('AEROSPIKE_LOST_CONFLICT', function () {
    expect(status.AEROSPIKE_LOST_CONFLICT).to.equal(28)
    expect(status.LOST_CONFLICT).to.equal(28)
    expect(status.getMessage(status.LOST_CONFLICT)).to.equal('Write command loses conflict to XDR.')
  })

  it('AEROSPIKE_XDR_KEY_BUSY', function () {
    expect(status.AEROSPIKE_XDR_KEY_BUSY).to.equal(32)
    expect(status.XDR_KEY_BUSY).to.equal(32)
    expect(status.getMessage(status.XDR_KEY_BUSY)).to.equal('Write can\'t complete until XDR finishes shipping.')
  })

  it('AEROSPIKE_QUERY_END', function () {
    expect(status.AEROSPIKE_QUERY_END).to.equal(50)
    expect(status.QUERY_END).to.equal(50)
    expect(status.getMessage(status.QUERY_END)).to.equal('There are no more records left for query.')
  })

  it('AEROSPIKE_SECURITY_NOT_SUPPORTED', function () {
    expect(status.AEROSPIKE_SECURITY_NOT_SUPPORTED).to.equal(51)
    expect(status.SECURITY_NOT_SUPPORTED).to.equal(51)
    expect(status.getMessage(status.SECURITY_NOT_SUPPORTED)).to.equal('Security functionality not supported by connected server.')
  })

  it('AEROSPIKE_SECURITY_NOT_ENABLED', function () {
    expect(status.AEROSPIKE_SECURITY_NOT_ENABLED).to.equal(52)
    expect(status.SECURITY_NOT_ENABLED).to.equal(52)
    expect(status.getMessage(status.SECURITY_NOT_ENABLED)).to.equal('Security functionality not enabled by connected server.')
  })

  it('AEROSPIKE_SECURITY_SCHEME_NOT_SUPPORTED', function () {
    expect(status.AEROSPIKE_SECURITY_SCHEME_NOT_SUPPORTED).to.equal(53)
    expect(status.SECURITY_SCHEME_NOT_SUPPORTED).to.equal(53)
    expect(status.getMessage(status.SECURITY_SCHEME_NOT_SUPPORTED)).to.equal('Security scheme not supported.')
  })

  it('AEROSPIKE_INVALID_COMMAND', function () {
    expect(status.AEROSPIKE_INVALID_COMMAND).to.equal(54)
    expect(status.INVALID_COMMAND).to.equal(54)
    expect(status.getMessage(status.INVALID_COMMAND)).to.equal('Administration command is invalid.')
  })

  it('AEROSPIKE_INVALID_FIELD', function () {
    expect(status.AEROSPIKE_INVALID_FIELD).to.equal(55)
    expect(status.INVALID_FIELD).to.equal(55)
    expect(status.getMessage(status.INVALID_FIELD)).to.equal('Administration field is invalid.')
  })

  it('AEROSPIKE_ILLEGAL_STATE', function () {
    expect(status.AEROSPIKE_ILLEGAL_STATE).to.equal(56)
    expect(status.ILLEGAL_STATE).to.equal(56)
    expect(status.getMessage(status.ILLEGAL_STATE)).to.equal('Security protocol not followed.')
  })

  it('AEROSPIKE_INVALID_USER', function () {
    expect(status.AEROSPIKE_INVALID_USER).to.equal(60)
    expect(status.INVALID_USER).to.equal(60)
    expect(status.getMessage(status.INVALID_USER)).to.equal('User name is invalid.')
  })

  it('AEROSPIKE_USER_ALREADY_EXISTS', function () {
    expect(status.AEROSPIKE_USER_ALREADY_EXISTS).to.equal(61)
    expect(status.USER_ALREADY_EXISTS).to.equal(61)
    expect(status.getMessage(status.USER_ALREADY_EXISTS)).to.equal('User was previously created.')
  })

  it('AEROSPIKE_INVALID_PASSWORD', function () {
    expect(status.AEROSPIKE_INVALID_PASSWORD).to.equal(62)
    expect(status.INVALID_PASSWORD).to.equal(62)
    expect(status.getMessage(status.INVALID_PASSWORD)).to.equal('Password is invalid.')
  })

  it('AEROSPIKE_EXPIRED_PASSWORD', function () {
    expect(status.AEROSPIKE_EXPIRED_PASSWORD).to.equal(63)
    expect(status.EXPIRED_PASSWORD).to.equal(63)
    expect(status.getMessage(status.EXPIRED_PASSWORD)).to.equal('Password has expired.')
  })

  it('AEROSPIKE_FORBIDDEN_PASSWORD', function () {
    expect(status.AEROSPIKE_FORBIDDEN_PASSWORD).to.equal(64)
    expect(status.FORBIDDEN_PASSWORD).to.equal(64)
    expect(status.getMessage(status.FORBIDDEN_PASSWORD)).to.equal('Forbidden password (e.g. recently used).')
  })

  it('AEROSPIKE_INVALID_CREDENTIAL', function () {
    expect(status.AEROSPIKE_INVALID_CREDENTIAL).to.equal(65)
    expect(status.INVALID_CREDENTIAL).to.equal(65)
    expect(status.getMessage(status.INVALID_CREDENTIAL)).to.equal('Security credential is invalid.')
  })

  it('AEROSPIKE_EXPIRED_SESSION', function () {
    expect(status.AEROSPIKE_EXPIRED_SESSION).to.equal(66)
    expect(status.EXPIRED_SESSION).to.equal(66)
    expect(status.getMessage(status.EXPIRED_SESSION)).to.equal('Login session expired.')
  })

  it('AEROSPIKE_INVALID_ROLE', function () {
    expect(status.AEROSPIKE_INVALID_ROLE).to.equal(70)
    expect(status.INVALID_ROLE).to.equal(70)
    expect(status.getMessage(status.INVALID_ROLE)).to.equal('Role name is invalid.')
  })

  it('AEROSPIKE_ROLE_ALREADY_EXISTS', function () {
    expect(status.AEROSPIKE_ROLE_ALREADY_EXISTS).to.equal(71)
    expect(status.ROLE_ALREADY_EXISTS).to.equal(71)
    expect(status.getMessage(status.ROLE_ALREADY_EXISTS)).to.equal('Role already exists.')
  })

  it('AEROSPIKE_INVALID_PRIVILEGE', function () {
    expect(status.AEROSPIKE_INVALID_PRIVILEGE).to.equal(72)
    expect(status.INVALID_PRIVILEGE).to.equal(72)
    expect(status.getMessage(status.INVALID_PRIVILEGE)).to.equal('Privilege is invalid.')
  })

  it('AEROSPIKE_INVALID_WHITELIST', function () {
    expect(status.AEROSPIKE_INVALID_WHITELIST).to.equal(73)
    expect(status.INVALID_WHITELIST).to.equal(73)
    expect(status.getMessage(status.INVALID_WHITELIST)).to.equal('Invalid IP whitelist.')
  })

  it('AEROSPIKE_QUOTAS_NOT_ENABLED', function () {
    expect(status.AEROSPIKE_QUOTAS_NOT_ENABLED).to.equal(74)
    expect(status.QUOTAS_NOT_ENABLED).to.equal(74)
    expect(status.getMessage(status.QUOTAS_NOT_ENABLED)).to.equal('Quotas not enabled on server.')
  })

  it('AEROSPIKE_INVALID_QUOTA', function () {
    expect(status.AEROSPIKE_INVALID_QUOTA).to.equal(75)
    expect(status.INVALID_QUOTA).to.equal(75)
    expect(status.getMessage(status.INVALID_QUOTA)).to.equal('Invalid quota.')
  })

  it('AEROSPIKE_NOT_AUTHENTICATED', function () {
    expect(status.AEROSPIKE_NOT_AUTHENTICATED).to.equal(80)
    expect(status.NOT_AUTHENTICATED).to.equal(80)
    expect(status.getMessage(status.NOT_AUTHENTICATED)).to.equal('User must be authenticated before performing database operations.')
  })

  it('AEROSPIKE_ROLE_VIOLATION', function () {
    expect(status.AEROSPIKE_ROLE_VIOLATION).to.equal(81)
    expect(status.ROLE_VIOLATION).to.equal(81)
    expect(status.getMessage(status.ROLE_VIOLATION)).to.equal('User does not possess the required role to perform the database operation.')
  })

  it('AEROSPIKE_NOT_WHITELISTED', function () {
    expect(status.AEROSPIKE_NOT_WHITELISTED).to.equal(82)
    expect(status.NOT_WHITELISTED).to.equal(82)
    expect(status.getMessage(status.NOT_WHITELISTED)).to.equal('Command not allowed because sender IP not whitelisted.')

  })

  it('AEROSPIKE_QUOTA_EXCEEDED', function () {
    expect(status.AEROSPIKE_QUOTA_EXCEEDED).to.equal(83)
    expect(status.QUOTA_EXCEEDED).to.equal(83)
    expect(status.getMessage(status.QUOTA_EXCEEDED)).to.equal('Quota exceeded.')
  })

  it('AEROSPIKE_ERR_UDF', function () {
    expect(status.AEROSPIKE_ERR_UDF).to.equal(100)
    expect(status.ERR_UDF).to.equal(100)
    expect(status.getMessage(status.ERR_UDF)).to.equal('Generic UDF error.')
  })

  it('AEROSPIKE_MRT_BLOCKED', function () {
    expect(status.AEROSPIKE_MRT_BLOCKED).to.equal(120)
    expect(status.MRT_BLOCKED).to.equal(120)
    expect(status.getMessage(status.MRT_BLOCKED)).to.equal('Transaction record blocked by a different transaction.')
  })

  it('AEROSPIKE_MRT_VERSION_MISMATCH', function () {
    expect(status.AEROSPIKE_MRT_VERSION_MISMATCH).to.equal(121)
    expect(status.MRT_VERSION_MISMATCH).to.equal(121)
    expect(status.getMessage(status.MRT_VERSION_MISMATCH)).to.equal('Transaction read version mismatch identified during commit. Some other command changed the record outside of the transaction.')
  })

  it('AEROSPIKE_MRT_EXPIRED', function () {
    expect(status.AEROSPIKE_MRT_EXPIRED).to.equal(122)
    expect(status.MRT_EXPIRED).to.equal(122)
    expect(status.getMessage(status.MRT_EXPIRED)).to.equal('Transaction deadline reached without a successful commit or abort.')
  })

  it('AEROSPIKE_MRT_TOO_MANY_WRITES', function () {
    expect(status.AEROSPIKE_MRT_TOO_MANY_WRITES).to.equal(123)
    expect(status.MRT_TOO_MANY_WRITES).to.equal(123)
    expect(status.getMessage(status.MRT_TOO_MANY_WRITES)).to.equal('Transaction write command limit (4096) exceeded.')
  })

  it('AEROSPIKE_MRT_COMMITTED', function () {
    expect(status.AEROSPIKE_MRT_COMMITTED).to.equal(124)
    expect(status.MRT_COMMITTED).to.equal(124)
    expect(status.getMessage(status.MRT_COMMITTED)).to.equal('Transaction was already committed.')
  })

  it('AEROSPIKE_MRT_ABORTED', function () {
    expect(status.AEROSPIKE_MRT_ABORTED).to.equal(125)
    expect(status.MRT_ABORTED).to.equal(125)
    expect(status.getMessage(status.MRT_ABORTED)).to.equal('Transaction was already aborted.')
  })

  it('AEROSPIKE_MRT_ALREADY_LOCKED', function () {
    expect(status.AEROSPIKE_MRT_ALREADY_LOCKED).to.equal(126)
    expect(status.MRT_ALREADY_LOCKED).to.equal(126)
    expect(status.getMessage(status.MRT_ALREADY_LOCKED)).to.equal('This record has been locked by a previous update in this transaction.')
  })

  it('AEROSPIKE_MRT_MONITOR_EXISTS', function () {
    expect(status.AEROSPIKE_MRT_MONITOR_EXISTS).to.equal(127)
    expect(status.MRT_MONITOR_EXISTS).to.equal(127)
    expect(status.getMessage(status.MRT_MONITOR_EXISTS)).to.equal('This transaction has already started. Writing to the same transaction with independent threads is unsafe.')
  })

  it('AEROSPIKE_ERR_BATCH_DISABLED', function () {
    expect(status.AEROSPIKE_ERR_BATCH_DISABLED).to.equal(150)
    expect(status.ERR_BATCH_DISABLED).to.equal(150)
    expect(status.getMessage(status.ERR_BATCH_DISABLED)).to.equal('Batch functionality has been disabled.')
  })

  it('AEROSPIKE_ERR_BATCH_MAX_REQUESTS_EXCEEDED', function () {
    expect(status.AEROSPIKE_ERR_BATCH_MAX_REQUESTS_EXCEEDED).to.equal(151)
    expect(status.ERR_BATCH_MAX_REQUESTS_EXCEEDED).to.equal(151)
    expect(status.getMessage(status.ERR_BATCH_MAX_REQUESTS_EXCEEDED)).to.equal('Batch max requests have been exceeded.')
  })

  it('AEROSPIKE_ERR_BATCH_QUEUES_FULL', function () {
    expect(status.AEROSPIKE_ERR_BATCH_QUEUES_FULL).to.equal(152)
    expect(status.ERR_BATCH_QUEUES_FULL).to.equal(152)
    expect(status.getMessage(status.ERR_BATCH_QUEUES_FULL)).to.equal('All batch queues are full.')
  })

  it('AEROSPIKE_ERR_GEO_INVALID_GEOJSON', function () {
    expect(status.AEROSPIKE_ERR_GEO_INVALID_GEOJSON).to.equal(160)
    expect(status.ERR_GEO_INVALID_GEOJSON).to.equal(160)
    expect(status.getMessage(status.ERR_GEO_INVALID_GEOJSON)).to.equal('Invalid/Unsupported GeoJSON.')
  })

  it('AEROSPIKE_ERR_INDEX_FOUND', function () {
    expect(status.AEROSPIKE_ERR_INDEX_FOUND).to.equal(200)
    expect(status.ERR_INDEX_FOUND).to.equal(200)
    expect(status.getMessage(status.ERR_INDEX_FOUND)).to.equal('Index found.')
  })

  it('AEROSPIKE_ERR_INDEX_NOT_FOUND', function () {
    expect(status.AEROSPIKE_ERR_INDEX_NOT_FOUND).to.equal(201)
    expect(status.ERR_INDEX_NOT_FOUND).to.equal(201)
    expect(status.getMessage(status.ERR_INDEX_NOT_FOUND)).to.equal('Index not found.')
  })

  it('AEROSPIKE_ERR_INDEX_OOM', function () {
    expect(status.AEROSPIKE_ERR_INDEX_OOM).to.equal(202)
    expect(status.ERR_INDEX_OOM).to.equal(202)
    expect(status.getMessage(status.ERR_INDEX_OOM)).to.equal('Index is out of memory.')
  })

  it('AEROSPIKE_ERR_INDEX_NOT_READABLE', function () {
    expect(status.AEROSPIKE_ERR_INDEX_NOT_READABLE).to.equal(203)
    expect(status.ERR_INDEX_NOT_READABLE).to.equal(203)
    expect(status.getMessage(status.ERR_INDEX_NOT_READABLE)).to.equal('Unable to read the index.')
  })

  it('AEROSPIKE_ERR_INDEX', function () {
    expect(status.AEROSPIKE_ERR_INDEX).to.equal(204)
    expect(status.ERR_INDEX).to.equal(204)
    expect(status.getMessage(status.ERR_INDEX)).to.equal('Generic secondary index error.')
  })

  it('AEROSPIKE_ERR_INDEX_NAME_MAXLEN', function () {
    expect(status.AEROSPIKE_ERR_INDEX_NAME_MAXLEN).to.equal(205)
    expect(status.ERR_INDEX_NAME_MAXLEN).to.equal(205)
    expect(status.getMessage(status.ERR_INDEX_NAME_MAXLEN)).to.equal('Index name is too long.')
  })

  it('AEROSPIKE_ERR_INDEX_MAXCOUNT', function () {
    expect(status.AEROSPIKE_ERR_INDEX_MAXCOUNT).to.equal(206)
    expect(status.ERR_INDEX_MAXCOUNT).to.equal(206)
    expect(status.getMessage(status.ERR_INDEX_MAXCOUNT)).to.equal('System already has maximum allowed indices.')
  })

  it('AEROSPIKE_ERR_QUERY_ABORTED', function () {
    expect(status.AEROSPIKE_ERR_QUERY_ABORTED).to.equal(210)
    expect(status.ERR_QUERY_ABORTED).to.equal(210)
    expect(status.getMessage(status.ERR_QUERY_ABORTED)).to.equal('Query was aborted.')
  })

  it('AEROSPIKE_ERR_QUERY_QUEUE_FULL', function () {
    expect(status.AEROSPIKE_ERR_QUERY_QUEUE_FULL).to.equal(211)
    expect(status.ERR_QUERY_QUEUE_FULL).to.equal(211)
    expect(status.getMessage(status.ERR_QUERY_QUEUE_FULL)).to.equal('Query processing queue is full.')
  })

  it('AEROSPIKE_ERR_QUERY_TIMEOUT', function () {
    expect(status.AEROSPIKE_ERR_QUERY_TIMEOUT).to.equal(212)
    expect(status.ERR_QUERY_TIMEOUT).to.equal(212)
    expect(status.getMessage(status.ERR_QUERY_TIMEOUT)).to.equal('Secondary index query timed out on server.')
  })

  it('AEROSPIKE_ERR_QUERY', function () {
    expect(status.AEROSPIKE_ERR_QUERY).to.equal(213)
    expect(status.ERR_QUERY).to.equal(213)
    expect(status.getMessage(status.ERR_QUERY)).to.equal('Generic query error.')
  })

  it('AEROSPIKE_ERR_UDF_NOT_FOUND', function () {
    expect(status.AEROSPIKE_ERR_UDF_NOT_FOUND).to.equal(1301)
    expect(status.ERR_UDF_NOT_FOUND).to.equal(1301)
    expect(status.getMessage(status.ERR_UDF_NOT_FOUND)).to.equal('UDF does not exist.')
  })

  it('AEROSPIKE_ERR_LUA_FILE_NOT_FOUND', function () {
    expect(status.AEROSPIKE_ERR_LUA_FILE_NOT_FOUND).to.equal(1302)
    expect(status.ERR_LUA_FILE_NOT_FOUND).to.equal(1302)
    expect(status.getMessage(status.ERR_LUA_FILE_NOT_FOUND)).to.equal('LUA file does not exist.')
  })

})