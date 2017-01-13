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

/* global expect, describe, context, it */

const Aerospike = require('../lib/aerospike')
const Key = Aerospike.Key
const status = Aerospike.status
const helper = require('./test_helper')

describe('Key', function () {
  describe('constructor', function () {
    context('namespace', function () {
      it('rejects empty namespace', function () {
        expect(function () { return new Key('', 'set', 'key') }).to.throwException('Namespace must be a valid string')
      })

      it('rejects namespace that is too long', function () {
        expect(function () { return new Key('abcdefghijklmnopqrstuvwxyz0123456789', 'set', 'key') }).to.throwException('Namespace must be a valid string')
      })

      it('rejects null namespace', function () {
        expect(function () { return new Key(null, 'set', 'key') }).to.throwException('Namespace must be a valid string')
      })

      it('rejects undefined namespace', function () {
        expect(function () { return new Key(undefined, 'set', 'key') }).to.throwException('Namespace must be a valid string')
      })

      it('rejects namespace that is not a string', function () {
        expect(function () { return new Key(1234, 'set', 'key') }).to.throwException('Namespace must be a valid string')
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
        expect(function () { return new Key('ns', '', 'key') }).to.throwException('Set name must be a valid string')
      })

      it('rejects set name that is too long', function () {
        expect(function () { return new Key('ns', 'abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789', 'key') }).to.throwException('Set name must be a valid string')
      })

      it('rejects set name that is not a string', function () {
        expect(function () { return new Key('ns', 1234, 'key') }).to.throwException('Set name must be a valid string')
      })
    })

    context('user key', function () {
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

      it('allows byte array user key', function () {
        var buf = new Buffer([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])
        expect(new Key('ns', 'set', buf)).to.be.ok()
      })

      it('allows undefined user key', function () {
        expect(new Key('ns', 'set', undefined)).to.be.ok()
      })

      it('allows null user key', function () {
        expect(new Key('ns', 'set', null)).to.be.ok()
      })

      it('rejects empty string user key', function () {
        expect(function () { return new Key('ns', 'set', '') }).to.throwException('Key must be a string, integer, or Buffer')
      })

      it('rejects empty byte array  user key', function () {
        expect(function () { return new Key('ns', 'set', new Buffer([])) }).to.throwException('Key must be a string, integer, or Buffer')
      })

      it('rejects float user key', function () {
        expect(function () { return new Key('ns', 'set', 3.1415) }).to.throwException('Key must be a string, integer, or Buffer')
      })
    })

    context('plain object keys (for backward compatibility)', function () {
      var client = helper.client

      it('accepts plain objects as user keys', function (done) {
        var key = {ns: helper.namespace, set: helper.set, key: 1234}
        client.put(key, {foo: 'bar'}, function (err) {
          expect(err).to.not.be.ok()
          done()
        })
      })

      it('returns an error for an unsupported float user key', function (done) {
        var key = {ns: helper.namespace, set: helper.set, key: 3.1415}
        client.put(key, {foo: 'bar'}, function (err) {
          expect(err.code).to.be(status.AEROSPIKE_ERR_PARAM)
          done()
        })
      })

      it('returns an error for an invalid user key', function (done) {
        var key = {ns: helper.namespace, set: helper.set, key: {a: 1, b: 2, c: 3}}
        client.put(key, {foo: 'bar'}, function (err) {
          expect(err.code).to.be(status.AEROSPIKE_ERR_PARAM)
          done()
        })
      })
    })
  })
})
