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

import Aerospike, { status as statusModule, Client as Cli, Key, RecordMetadata, AerospikeBins, AerospikeError, AerospikeRecord, ReadPolicy} from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const keygen: any = helper.keygen
const recgen: any = helper.recgen
const valgen: any = helper.valgen

const status: typeof statusModule = Aerospike.status

describe('client.select()', function () {
  const client: Cli = helper.client

  it('should read the record', function (done) {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/' })()
    const meta: RecordMetadata = { ttl: 1000 }
    const bins: AerospikeBins = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })()
    const selected: string[] = ['i', 's']

    client.put(key, bins, meta, function (err?: AerospikeError) {
      if (err) throw err

      client.select(key, selected, function (err?: AerospikeError, record?: AerospikeRecord) {
        if (err) throw err
        expect(record?.bins).to.have.all.keys(selected)

        for (const bin in selected) {
          expect(record?.bins[bin]).to.equal(bins[bin])
        }

        client.remove(key, function (err?: AerospikeError) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should fail - when a select is called without key', function (done) {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/' })()
    const meta: RecordMetadata = { ttl: 1000 }
    const bins: AerospikeBins = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })()
    const selected: string[] = ['i', 's']

    client.put(key, bins, meta, function (err: any) {
      if (err) throw err

      client.select({ ns: helper.namespace, set: helper.set }, selected, function (err: any) {
        expect(err.code).to.equal(status.ERR_PARAM)

        client.remove(key, function (err: any) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should not find the record', function (done) {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/not_found/' })()

    client.select(key, ['i'], function (err: any, record: any) {
      expect(err.code).to.equal(status.ERR_RECORD_NOT_FOUND)
      done()
    })
  })

  it('should read the record w/ a key send policy', function (done) {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/' })()
    const meta: RecordMetadata = { ttl: 1000 }
    const bins: AerospikeBins = recgen.record({ i: valgen.integer(), s: valgen.string(), b: valgen.bytes() })()
    const selected: string[] = ['i', 's']
    const policy: ReadPolicy = new Aerospike.ReadPolicy({
      key: Aerospike.policy.key.SEND
    })

    client.put(key, bins, meta, function (err: any) {
      if (err) throw err

      client.select(key, selected, policy, function (err: any, record: any) {
        if (err) throw err
        expect(record.bins).to.have.all.keys(selected)

        for (const bin in selected) {
          expect(record.bins[bin]).to.equal(bins[bin])
        }

        client.remove(key, function (err: any) {
          if (err) throw err
          done()
        })
      })
    })
  })

  it('should return a Promise that resolves to a Record', function () {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/select/' })()

    return client.put(key, { i: 42, s: 'abc', f: 3.1416 })
      .then(() => client.select(key, ['i', 'f']))
      .then((record: any) => expect(record.bins).to.eql({ i: 42, f: 3.1416 }))
      .then(() => client.remove(key))
  })
})
