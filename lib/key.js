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
  this.ns = ns

  /** @member {string} [Key#set] */
  this.set = set

  /** @member {(string|number|Buffer)} [Key#key] */
  this.key = key

  /**
   * @member {Buffer} [Key#digest]
   *
   * @summary The 160-bit digest used by the Aerospike server to uniquely
   * identify a record within a namespace.
   */
  this.digest = digest || null
}

module.exports = Key
