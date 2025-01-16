// *****************************************************************************
// Copyright 2022-2023 Aerospike, Inc.
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
/* eslint-disable no-unused-expressions */

import Aerospike, { AerospikeError, Client, Key as K, BatchResult} from 'aerospike';
import * as helper from './test_helper';
import { expect } from 'chai';
// const util = require('util')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

const Key = Aerospike.Key

describe('client.batchRemove()', function () {
  const client: Client = helper.client

  before(function () {
    const nrecords: number = 10
    const generators: any = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_remove/', random: false }),
      recgen: recgen.record({
        i: valgen.integer(),
        s: valgen.string(),
        str2: valgen.string('hello'),
        l: () => [1, 2, 3],
        m: () => { return { a: 1, b: 2, c: 3 } }
      }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    return putgen.put(nrecords, generators)
  })

  context('with batch remove', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)
    it('removes batch of records', function (done) {
      const batchRecords: K[] = [
        new Key(helper.namespace, helper.set, 'test/batch_remove/1'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/2'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/3'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/4'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/5')
      ]

      client.batchRemove(batchRecords, function (err?: AerospikeError, results?: BatchResult[]) {
        expect(err).not.to.be.ok
        results = results || []
        expect(results.length).to.equal(5)
        results.forEach(function (result) {
          expect(result.status).to.equal(Aerospike.status.OK)
          // expect(results.record.bins).to.be.empty()
          // console.log(util.inspect(result, true, 10, true))
        })
        done()
      })
    })

    it('Will return records even if generation values is not correct', async function () {
      const batchRecords: K[] = [
        new Key(helper.namespace, helper.set, 'test/batch_remove/6'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/7'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/8'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/9'),
        new Key(helper.namespace, helper.set, 'test/batch_remove/0')
      ]
      try {
        await client.batchRemove(batchRecords, null, new Aerospike.BatchRemovePolicy({ gen: Aerospike.policy.gen.EQ, generation: 10 }))
        // Will fail if code makes it here
        assert.fail('An error should have been caught')
      } catch (error: any) {
        expect(error.code).to.eql(-16)
        const results: BatchResult[] = await client.batchRemove(batchRecords)
        expect(results.length).to.equal(5)
        results.forEach(function (result) {
          expect(result.status).to.equal(Aerospike.status.OK)
          // expect(results.record.bins).to.be.empty()
          // console.log(util.inspect(result, true, 10, true))
        })
      }
    })
  })
})
