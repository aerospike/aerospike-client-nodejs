// *****************************************************************************
// Copyright 2013-2020 Aerospike, Inc.
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

const MAX_NAMESPACE_NAME_LENGTH = 32
const MAX_SET_NAME_LENGTH = 64
const DIGEST_LENGTH = 20

/**
 * @class Key
 *
 * @summary A key uniquely identifies a record in the Aerospike database within a given namespace.
 *
 * @description
 *
 * ###### Key Digests
 * In your application, you must specify the namespace, set and the key itself
 * to read and write records. When a key is sent to the database, the key value
 * and its set are hashed into a 160-bit digest. When a database operation
 * returns a key (e.g. Query or Scan operations) it might contain either the
 * set and key value, or just the digest.
 *
 * @param {string} ns - The Namespace to which the key belongs.
 * @param {string} set - The Set to which the key belongs.
 * @param {(string|number|Buffer)} key - The unique key value. Keys can be
 * strings, integers or an instance of the Buffer class.
 * @param {string} [digest] - The digest value of the key.
 *
 * @example <caption>Creating a new {@link Key} instance</caption>
 *
 * const Aerospike = require('aerospike')
 * const Key = Aerospike.Key
 *
 * var key1 = new Key('test', 'demo', 12345)
 * var key2 = new Key('test', 'demo', 'abcde')
 * var key3 = new Key('test', 'demo', Buffer.from([0x62,0x75,0x66,0x66,0x65,0x72]))
 */
function Key (ns, set, key, digest) {
  /** @member {string} Key#ns */
  if (!isValidNamespace(ns)) {
    throw new TypeError('Namespace must be a valid string (max. length 32)')
  }
  this.ns = ns

  /** @member {string} [Key#set] */
  if (isSet(set) && !isValidSetName(set)) {
    throw new TypeError('Set must be a valid string (max. length 64)')
  }
  this.set = set

  /** @member {(string|integer|Buffer)} [Key#key] */
  const hasKey = isSet(key)
  if (hasKey) validateKey(key)
  this.key = key

  /**
   * @member {Buffer} [Key#digest]
   *
   * @summary The 160-bit digest used by the Aerospike server to uniquely
   * identify a record within a namespace.
   */
  const hasDigest = isSet(digest)
  if (hasDigest && !isValidDigest(digest)) {
    throw new TypeError('Digest must be a 20-byte Buffer')
  }
  this.digest = digest || null

  if (!(hasKey || hasDigest)) {
    throw new TypeError('Either key or digest must be set')
  }
}

/**
 * @private
 */
Key.fromASKey = function (keyObj) {
  if (!keyObj) return null
  return new Key(keyObj.ns, keyObj.set, keyObj.key, keyObj.digest)
}

Key.prototype.equals = function (other) {
  return this.ns === other.ns &&
    ((!isSet(this.set) && !isSet(other.set)) || this.set === other.set) &&
    ((!isSet(this.key) && !isSet(other.key)) || this.key === other.key) &&
    (!isSet(this.digest) || !isSet(other.digest) || this.digest.equals(other.digest))
}

function isSet (value) {
  return typeof value !== 'undefined' && value !== null
}

function isValidNamespace (ns) {
  return (typeof ns === 'string') &&
    (ns.length > 0) &&
    (ns.length <= MAX_NAMESPACE_NAME_LENGTH)
}

function isValidSetName (set) {
  return (typeof set === 'string') &&
    (set.length > 0) &&
    (set.length <= MAX_SET_NAME_LENGTH)
}

function validateStringKey (key) {
  if (key.length === 0) {
    throw new TypeError('Invalid user key: Empty string not allowed')
  }
}

function validateNumberKey (key) {
  if (!Number.isInteger(key)) {
    throw new TypeError('Invalid user key: Only integer numbers are allowed')
  }
}

const isInt64 = global.BigInt ? require('./bigint').isInt64 : () => {}
function validateBigIntKey (key) {
  if (!isInt64(key)) {
    throw new TypeError('Invalid user key: BigInt key is outside valid range -2^63 ... 2^63-1')
  }
}

function validateBufferKey (key) {
  if (Buffer.byteLength(key) === 0) {
    throw new TypeError('Invalid user key: Empty Buffer not allowed')
  }
}

function validateKey (key) {
  switch (typeof key) {
    case 'string': return validateStringKey(key)
    case 'number': return validateNumberKey(key)
    case 'bigint': return validateBigIntKey(key)
    case 'object':
      if (Buffer.isBuffer(key)) {
        return validateBufferKey(key)
      }
      // eslint-disable-next-line: no-fallthrough
    default:
      throw new TypeError('Invalid user key: Must be string, integer, BigInt, or Buffer')
  }
}

function isValidDigest (digest) {
  return (Buffer.isBuffer(digest) && digest.length === DIGEST_LENGTH)
}

module.exports = Key
