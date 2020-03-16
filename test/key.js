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

/* global expect, describe, context, it */

const Aerospike = require('../lib/aerospike')
const Key = Aerospike.Key
const status = Aerospike.status
const helper = require('./test_helper')

const bigint = require('../lib/bigint')
const BigInt = bigint.BigInt

describe('Key #noserver', function () {
  describe('constructor', function () {
    context('namespace', function () {
      it('rejects empty namespace', function () {
        expect(function () { return new Key('', 'set', 'key') }).to.throw('Namespace must be a valid string')
      })

      it('rejects namespace that is too long', function () {
        expect(function () { return new Key('abcdefghijklmnopqrstuvwxyz0123456789', 'set', 'key') }).to.throw('Namespace must be a valid string')
      })

      it('rejects null namespace', function () {
        expect(function () { return new Key(null, 'set', 'key') }).to.throw('Namespace must be a valid string')
      })

      it('rejects undefined namespace', function () {
        expect(function () { return new Key(undefined, 'set', 'key') }).to.throw('Namespace must be a valid string')
      })

      it('rejects namespace that is not a string', function () {
        expect(function () { return new Key(1234, 'set', 'key') }).to.throw('Namespace must be a valid string')
      })
    })

    context('set name', function () {
      it('allows null set name', function () {
        expect(new Key('ns', null, 'key')).to.be.ok()
      })

      it('allows undefined set name', function () {
        expect(new Key('ns', undefined, 'key')).to.be.ok()
      })

      it('rejects empty set name', function () {
        expect(function () { return new Key('ns', '', 'key') }).to.throw('Set must be a valid string')
      })

      it('rejects set name that is too long', function () {
        expect(function () { return new Key('ns', 'abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789', 'key') }).to.throw('Set must be a valid string')
      })

      it('rejects set name that is not a string', function () {
        expect(function () { return new Key('ns', 1234, 'key') }).to.throw('Set must be a valid string')
      })
    })

    context('user key', function () {
      var dummyDigest = Buffer.from([0x15, 0xc7, 0x49, 0xfd, 0x01, 0x54, 0x43, 0x8b, 0xa9, 0xd9, 0x5d, 0x0c, 0x6e, 0x27, 0x0f, 0x1a, 0x76, 0xfc, 0x31, 0x15])

      it('allows string user key', function () {
        expect(new Key('ns', 'set', 'abc')).to.be.ok()
      })

      it('allows string user key of arbitrary length', function () {
        expect(new Key('ns', 'set', 'abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789')).to.be.ok()
      })

      it('allows integer user key', function () {
        expect(new Key('ns', 'set', 1234)).to.be.ok()
        expect(new Key('ns', 'set', -1234)).to.be.ok()
      })

      context('BigInt keys', function () {
        helper.skipUnless(this, bigint.bigIntSupported, 'BigInt not supported in this Node.js version')

        it('allows BigInt user key', function () {
          expect(new Key('ns', 'set', BigInt(42))).to.be.ok()
          expect(new Key('ns', 'set', BigInt(2) ** BigInt(63) - BigInt(1))).to.be.ok()
          expect(new Key('ns', 'set', BigInt(-2) ** BigInt(63))).to.be.ok()
        })

        it('rejects BigInt user keys outside valid range', function () {
          expect(() => new Key('ns', 'set', BigInt(2) ** BigInt(63))).to.throw(TypeError, /Invalid user key/)
          expect(() => new Key('ns', 'set', BigInt(-2) ** BigInt(63) - BigInt(1))).to.throw(TypeError, /Invalid user key/)
        })
      })

      it('allows byte array user key', function () {
        var buf = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])
        expect(new Key('ns', 'set', buf)).to.be.ok()
      })

      it('allows undefined user key', function () {
        expect(new Key('ns', 'set', undefined, dummyDigest)).to.be.ok()
      })

      it('allows null user key', function () {
        expect(new Key('ns', 'set', null, dummyDigest)).to.be.ok()
      })

      it('rejects empty string user key', function () {
        expect(() => new Key('ns', 'set', '')).to.throw(TypeError, /Invalid user key/)
      })

      it('rejects empty byte array user key', function () {
        expect(() => new Key('ns', 'set', Buffer.from([]))).to.throw(TypeError, /Invalid user key/)
      })

      it('rejects float user key', function () {
        expect(() => new Key('ns', 'set', 3.1415)).to.throw(TypeError, /Invalid user key/)
      })

      it('rejects Object user key', function () {
        expect(() => new Key('ns', 'set', { key: 'myKey' })).to.throw(TypeError, /Invalid user key/)
      })

      it('requires either key or digest', function () {
        expect(() => new Key('ns', 'set')).to.throw('Either key or digest must be set')
      })
    })

    context('digest', function () {
      it('allows creating a new key with just the namespace and digest', function () {
        var digest = Buffer.from([0x15, 0xc7, 0x49, 0xfd, 0x01, 0x54, 0x43, 0x8b, 0xa9, 0xd9, 0x5d, 0x0c, 0x6e, 0x27, 0x0f, 0x1a, 0x76, 0xfc, 0x31, 0x15])
        expect(new Key('ns', null, null, digest)).to.be.ok()
      })

      it('rejects a digest that is not a buffer', function () {
        expect(function () { return new Key('ns', null, null, 'some string') }).to.throw('Digest must be a 20-byte Buffer')
      })

      it('rejects a digest that is not the right size', function () {
        expect(function () { return new Key('ns', null, null, Buffer.from([0x01])) }).to.throw('Digest must be a 20-byte Buffer')
      })
    })
  })

  describe('equals', function () {
    it('matches two keys with identical ns, set and user key', function () {
      const key1 = new Key('ns1', 'set1', 'key1')
      const key2 = new Key('ns1', 'set1', 'key1')
      expect(key1.equals(key2)).to.be.true()
      expect(key2.equals(key1)).to.be.true()
    })

    it('matches two keys with identical ns, set, user key and digest', function () {
      const key1 = new Key('ns1', 'set1', 'key1', Buffer.from('a1b2c3d4e5f6g7h8i9j0'))
      const key2 = new Key('ns1', 'set1', 'key1', Buffer.from('a1b2c3d4e5f6g7h8i9j0'))
      expect(key1.equals(key2)).to.be.true()
      expect(key2.equals(key1)).to.be.true()
    })

    it('matches two keys with identical ns, set and digest', function () {
      const key1 = new Key('ns1', 'set1', null, Buffer.from('a1b2c3d4e5f6g7h8i9j0'))
      const key2 = new Key('ns1', 'set1', null, Buffer.from('a1b2c3d4e5f6g7h8i9j0'))
      expect(key1.equals(key2)).to.be.true()
      expect(key2.equals(key1)).to.be.true()
    })

    it('a key with digest to another key with identical ns, set and user key but without digest', function () {
      const key1 = new Key('ns1', 'set1', 'key1', Buffer.from('a1b2c3d4e5f6g7h8i9j0'))
      const key2 = new Key('ns1', 'set1', 'key1')
      expect(key1.equals(key2)).to.be.true()
      expect(key2.equals(key1)).to.be.true()
    })

    it('matches two keys with identical ns, empty set and user key', function () {
      const key1 = new Key('ns1', null, 'key1')
      const key2 = new Key('ns1', null, 'key1')
      expect(key1.equals(key2)).to.be.true()
      expect(key2.equals(key1)).to.be.true()
    })

    it('does not match two keys with different ns', function () {
      const key1 = new Key('ns1', 'set1', 'key1')
      const key2 = new Key('ns2', 'set1', 'key1')
      expect(key1.equals(key2)).to.be.false()
      expect(key2.equals(key1)).to.be.false()
    })

    it('does not match two keys with different set', function () {
      const key1 = new Key('ns1', 'set1', 'key1')
      const key2 = new Key('ns1', 'set2', 'key1')
      expect(key1.equals(key2)).to.be.false()
      expect(key2.equals(key1)).to.be.false()
    })

    it('does not match a key with set and a key without set', function () {
      const key1 = new Key('ns1', 'set1', 'key1')
      const key2 = new Key('ns1', null, 'key1')
      expect(key1.equals(key2)).to.be.false()
      expect(key2.equals(key1)).to.be.false()
    })

    it('does not match two keys with different user keys', function () {
      const key1 = new Key('ns1', 'set1', 'key1')
      const key2 = new Key('ns1', 'set1', 'key2')
      expect(key1.equals(key2)).to.be.false()
      expect(key2.equals(key1)).to.be.false()
    })

    it('does not match a key with user key and a key without user key', function () {
      const key1 = new Key('ns1', 'set1', 'key1', Buffer.from('a1b2c3d4e5f6g7h8i9j0'))
      const key2 = new Key('ns1', 'set1', null, Buffer.from('a1b2c3d4e5f6g7h8i9j0'))
      expect(key1.equals(key2)).to.be.false()
      expect(key2.equals(key1)).to.be.false()
    })

    it('does not match two keys with different digests', function () {
      const key1 = new Key('ns1', 'set1', 'key1', Buffer.from('a1b2c3d4e5f6g7h8i9j0'))
      const key2 = new Key('ns1', 'set1', 'key1', Buffer.from('0j9i8h7g6f5e4d3c2b1a'))
      expect(key1.equals(key2)).to.be.false()
      expect(key2.equals(key1)).to.be.false()
    })
  })
})

context('Plain Object Keys (for backward compatibility)', function () {
  var client = helper.client

  it('accepts plain objects as user keys', function (done) {
    var key = { ns: helper.namespace, set: helper.set, key: 1234 }
    client.put(key, { foo: 'bar' }, function (err) {
      expect(err).to.not.be.ok()
      done()
    })
  })

  it('returns an error for an unsupported float user key', function (done) {
    var key = { ns: helper.namespace, set: helper.set, key: 3.1415 }
    client.put(key, { foo: 'bar' }, function (err) {
      expect(err.code).to.equal(status.ERR_PARAM)
      done()
    })
  })

  it('returns an error for an invalid user key', function (done) {
    var key = { ns: helper.namespace, set: helper.set, key: { a: 1, b: 2, c: 3 } }
    client.put(key, { foo: 'bar' }, function (err) {
      expect(err.code).to.equal(status.ERR_PARAM)
      done()
    })
  })
})
