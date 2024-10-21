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

/* global context, expect, describe, it */
/* eslint-disable no-unused-expressions */
import Aerospike, { Key, AerospikeError, AerospikeRecord} from 'aerospike';

import * as helper from './test_helper';

import { expect } from 'chai'; 

const keygen = helper.keygen

describe('client.exists()', function () {
  const client = helper.client

  context('Promises', function () {
    it('returns true if the record exists', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/1' })()

      return client.put(key, { str: 'abcde' })
        .then(() => client.exists(key))
        .then(result => expect(result).to.be.true)
        .then(() => client.remove(key))
    })

    it('returns false if the record does not exist', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/2' })()

      return client.exists(key)
        .then(result => expect(result).to.be.false)
    })
  })

  context('Callbacks', function () {
    it('returns true if the record exists', function (done) {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/3' })()

      client.put(key, { str: 'abcde' }, (error?: AerospikeError) => {
        if (error) throw error
        client.exists(key, (error?: AerospikeError, result?: boolean) => {
          if (error) throw error
          expect(result).to.be.true
          client.remove(key, (error?: AerospikeError) => {
            if (error) throw error
            done()
          })
        })
      })
    })

    it('returns false if the record does not exist', function (done) {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/4' })()

      client.exists(key, (error: any, result: any) => {
        if (error) throw error
        expect(result).to.be.false
        done()
      })
    })
  })
})


describe('client.existsWithMetadata()', function () {
  const client = helper.client

  context('Promises', function () {
    it('returns an Aerospike Record with Metatdata if the record exists', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/5' })()

      return client.put(key, { str: 'abcde' }, {ttl: 50, gen: 7})
        .then(() => client.put(key, { str: 'abcd' }, {ttl: 50, gen: 7}))
        .then(() => client.put(key, { str: 'abc' }, {ttl: 50, gen: 7}))
        .then(() => client.put(key, { str: 'ab' }, {ttl: 50, gen: 7}))
        .then(() => client.put(key, { str: 'a' }, {ttl: 50, gen: 7}))
        .then(() => client.put(key, { str: 'abcde' }, {ttl: 50, gen: 7}))
        .then(() => client.existsWithMetadata(key))
        .then(result => {
          expect(result.key).to.eql(key)
          expect(result.bins).to.be.null
          expect(result.ttl).to.be.within(48, 50)
          expect(result.gen).to.eql(6)
        })
        .then(() => client.remove(key))
    })

    it('returns an Aerospike Record with Metatdata if the record exists and no meta or ttl is set', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/6' })()

      return client.put(key, { str: 'abcde' }, {ttl: -1})
        .then(() => client.existsWithMetadata(key))
        .then(result => {
          expect(result.key).to.eql(key)
          expect(result.bins).to.be.null
          expect(result.ttl).to.eql(-1)
          expect(result.gen).to.eql(1)
        })
        .then(() => client.remove(key))
    })

    it('returns false if the record does not exist', function () {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/7' })()

      return client.existsWithMetadata(key)
        .then((result: AerospikeRecord) => {
          expect(result.key).to.equal(key)
          expect(result.bins).to.be.null
          expect(result.ttl).to.be.null
          expect(result.gen).to.be.null
        })
    })
  })

  context('Callbacks', function () {
    it('returns an Aerospike Record with Metatdata if the record exists', function (done) {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/8' })()

      client.put(key, { str: 'abcde' }, {ttl: 100, gen: 14}, (error?: AerospikeError) => {
        if (error) throw error
        client.existsWithMetadata(key, (error?: AerospikeError, result?: AerospikeRecord) => {
          if (error) throw error
          expect(result?.key).to.equal(key)
          expect(result?.bins).to.be.null
          expect(result?.ttl).to.be.within(98, 100)
          expect(result?.gen).to.eql(1)
          client.remove(key, (error?: AerospikeError) => {
            if (error) throw error
            done()
          })
        })
      })
    })

    it('returns an Aerospike Record without Metatdata if the record does not exist', function (done) {
      const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exists/9' })()

      client.existsWithMetadata(key, (error?: AerospikeError, result?: AerospikeRecord) => {
        if (error) throw error
        expect(result?.key).to.equal(key)
        expect(result?.bins).to.be.null
        expect(result?.ttl).to.be.null
        expect(result?.gen).to.be.null
        done()
      })
    })
  })
})