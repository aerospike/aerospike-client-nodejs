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
  var hasKey = isSet(key)
  if (hasKey && !isValidKey(key)) {
    throw new TypeError('Key must be a string, integer, or Buffer')
  }
  this.key = key

  /**
   * @member {Buffer} [Key#digest]
   *
   * @summary The 160-bit digest used by the Aerospike server to uniquely
   * identify a record within a namespace.
   */
  var hasDigest = isSet(digest)
  if (hasDigest && !isValidDigest(digest)) {
    throw new TypeError('Digest must be a 20-byte Buffer')
  }
  this.digest = digest || null

  if (!(hasKey || hasDigest)) {
    throw new TypeError('Either key or digest must be set')
  }
}

function isSet (value) {
  return typeof value !== 'undefined' && value !== null
}

function isValidNamespace (ns) {
  return (typeof ns === 'string') &&
    (ns.length > 0) &&
    (ns.length <= 32)
}

function isValidSetName (set) {
  return (typeof set === 'string') &&
    (set.length > 0) &&
    (set.length <= 64)
}

function isValidKey (key) {
  return (typeof key === 'string' && key.length > 0) ||
    (Number.isInteger(key)) ||
    (Buffer.isBuffer(key) && Buffer.byteLength(key) > 0)
}

function isValidDigest (digest) {
  return (Buffer.isBuffer(digest) && digest.length === 20)
}

module.exports = Key
