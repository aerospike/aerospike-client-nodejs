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

/* eslint-env mocha */
/* global expect */

import Aerospike, { status as statusModule, Client as Cli, Key as K, RecordMetadata, AerospikeRecord, AerospikeError, ReadPolicy, AerospikeBins} from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const keygen: any = helper.keygen
const metagen: any = helper.metagen
const recgen: any = helper.recgen

const status: typeof statusModule = Aerospike.status

describe('client.get()', function () {
  const client: Cli = helper.client

  it('should read the record', function (done) {
    const key: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })()
    const meta: RecordMetadata = metagen.constant({ ttl: 1000 })()
    const record: AerospikeRecord = recgen.constant({ i: 123, s: 'abc' })()

    client.put(key, record, meta, function (err?: AerospikeError) {
      if (err) throw err
      client.get(key, function (err?: AerospikeError, record?: AerospikeRecord) {
        if (err) throw err
        client.remove(key, function (err?: AerospikeError, key?: K) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should not find the record', function (done) {
    const key: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/not_found/' })()

    client.get(key, function (err?: AerospikeError, record?: AerospikeRecord) {
      expect(err?.code).to.equal(status.ERR_RECORD_NOT_FOUND)
      done()
    })
  })

  context('with ReadPolicy', function () {
    context('with deserialize: false', function () {
      it('should return lists and maps as raw bytes', function () {
        const key: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })()
        const bins: AerospikeBins = {
          i: 123,
          s: 'abc',
          l: [1, 2, 3],
          m: { a: 1, b: 2, c: 3 }
        }
        const policy: ReadPolicy = new Aerospike.ReadPolicy({
          deserialize: false
        })

        return client.put(key, bins)
          .then(() => client.get(key, policy))
          .then((record: AerospikeRecord) => {
            const bins: AerospikeBins = record.bins
            expect(bins.i).to.eql(123)
            expect(bins.s).to.eql('abc')
            expect(bins.l).to.eql(Buffer.from([0x93, 0x01, 0x02, 0x03]))
            expect(bins.m).to.eql(Buffer.from([0x84, 0xc7, 0x00, 0x01, 0xc0, 0xa2, 0x03, 0x61, 0x01, 0xa2, 0x03, 0x62, 0x02, 0xa2, 0x03, 0x63, 0x03]))
          })
      })
    })

    context('readTouchTtlPercent policy', function () {
      helper.skipUnlessVersion('>= 7.1.0', this)

      this.timeout(4000)

      it('80% touches record', async function () {
        const key: K = keygen.integer(helper.namespace, helper.set)()
        const policy: ReadPolicy = new Aerospike.ReadPolicy({
          readTouchTtlPercent: 80
        })

        await client.put(key, { i: 2 }, { ttl: 10 })
        await new Promise((resolve: any) => setTimeout(resolve, 3000))
        let record: AerospikeRecord = await client.get(key, policy)

        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(5, 8)

        record = await client.get(key, policy)

        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(9, 11)

        await client.remove(key)
      })

      it('60% never touches record', async function () {
        const key: K = keygen.integer(helper.namespace, helper.set)()
        const policy: ReadPolicy = new Aerospike.ReadPolicy({
          readTouchTtlPercent: 60
        })
        await client.put(key, { i: 2 }, { ttl: 10 })
        await new Promise((resolve: any) => setTimeout(resolve, 3000))

        let record: AerospikeRecord = await client.get(key, policy)

        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(5, 8)

        record = await client.get(key, policy)

        expect(record.bins).to.eql({ i: 2 })
        expect(record.ttl).to.be.within(5, 8)
        await client.remove(key)
      })
    })
  })

  it('should return the TTL for a never expiring record as Aerospike.ttl.NEVER_EXPIRE', function (done) {
    const key: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })()
    const meta: RecordMetadata = metagen.constant({ ttl: Aerospike.ttl.NEVER_EXPIRE })()
    const record: AerospikeRecord = recgen.constant({ i: 123, s: 'abc' })()

    client.put(key, record, meta, function (err?: AerospikeError) {
      if (err) throw err
      client.get(key, function (err?: AerospikeError, record?: AerospikeRecord) {
        if (err) throw err
        expect(record?.ttl).to.equal(Aerospike.ttl.NEVER_EXPIRE)
        client.remove(key, function (err?: AerospikeError) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should return a Promise that resolves to a Record', function () {
    const key: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/get/' })()

    return client.put(key, { i: 42 })
      .then(() => client.get(key))
      .then((record: AerospikeRecord) => expect(record.bins).to.eql({ i: 42 }))
      .then(() => client.remove(key))
  })

  it('fetches a record given the digest', function () {
    const key: K = new Aerospike.Key(helper.namespace, helper.set, 'digestOnly')
    client.put(key, { foo: 'bar' })
      .then(() => {
        const digest: Buffer = key.digest!;
        const key2: K = new Aerospike.Key(helper.namespace, undefined, null, digest)
        return client.get(key2)
          .then((record: AerospikeRecord) => expect(record.bins.foo).to.equal('bar'))
      })
  })
})
