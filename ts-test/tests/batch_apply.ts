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

import Aerospike, { Client, AerospikeRecord, BatchResult, Key as K, UDF, BatchPolicyOptions, BatchApplyPolicyOptions, WritePolicyOptions, ConfigOptions, AerospikeError, status} from 'aerospike';
import * as helper from './test_helper';
import { expect, assert} from 'chai'; 

// const util = require('util')

const keygen = helper.keygen
const metagen = helper.metagen
const recgen = helper.recgen
const putgen = helper.putgen
const valgen = helper.valgen

const Key: typeof K = Aerospike.Key

describe('client.batchApply()', function () {
  const client = helper.client

  before(function () {
    const nrecords: number = 10
    const generators: any = {
      keygen: keygen.string(helper.namespace, helper.set, { prefix: 'test/batch_apply/', random: false }),
      recgen: recgen.record({
        i: valgen.integer(),
        s: valgen.string(),
        str2: valgen.string('hello'),
        l: () => [1, 2, 3],
        m: () => { return { a: 1, b: 2, c: 3 } }
      }),
      metagen: metagen.constant({ ttl: 1000 })
    }
    helper.udf.register('udf.lua')
    return putgen.put(nrecords, generators, {})
  })



  context('with failure', function () {
    helper.skipUnlessVersion('>= 6.0.0', this)

    it('apply udf on batch of records', function (done) {
      const batchRecords: K[] = [
        new Key(helper.namespace, helper.set, 'test/batch_apply/1'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/2'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/3'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/4'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/5')
      ]
      const policy: BatchPolicyOptions = new Aerospike.BatchPolicy({
        totalTimeout: 1500
      })
      const udf: UDF = {
        module: 'udf',
        funcname: 'withArguments',
        args: [[1, 2, 3]]
      }

      client.batchApply(batchRecords, udf, policy, function (err?: Error, results?: BatchResult[]) {
        expect(err).not.to.be.ok
        expect(results?.length).to.equal(5)
        results?.forEach(function (result: any) {
          // console.log(util.inspect(result, true, 10, true))
          expect(result.status).to.equal(Aerospike.status.OK)
          expect(result.record.bins.SUCCESS).to.eql([1, 2, 3])
        })
        done()
      })
    })
  })

  context('with BatchApplyPolicy', function () {
    helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this)
    it('onLockingOnly should fail when writing to a locked record', async function () {
      const batchRecords: K[] = [
        new Key(helper.namespace, helper.set, 'test/batch_apply/6'),
        new Key(helper.namespace, helper.set, 'test/batch_apply/7'),
      ]

      let mrt: any = new Aerospike.Transaction()

      // await client.remove(batchRecords[0])
      // await client.remove(batchRecords[1])

      await client.put(batchRecords[0], { foo: 'bar' }, { ttl: 1000 })
      await client.put(batchRecords[1], { foo: 'bar' }, { ttl: 1000 })

      const policyBatch: BatchPolicyOptions = new Aerospike.BatchPolicy({
        txn: mrt,
      })

      const policyBatchApply: BatchApplyPolicyOptions = new Aerospike.BatchApplyPolicy({
        onLockingOnly: true,
      })

      const udf: UDF = {
        module: 'udf',
        funcname: 'updateRecord',
        args: ['foo', 50]
      }

      await client.batchApply(batchRecords, udf, policyBatch, policyBatchApply)

      try {
        await client.batchApply(batchRecords, udf, policyBatch, policyBatchApply)
        assert.fail('An error should have been caught')
      }
      catch(error: any){
        expect(error).to.be.instanceof(AerospikeError).with.property('code', status.BATCH_FAILED)
        let exists = await client.get(batchRecords[0])
        expect(exists.bins.foo).to.eql('bar')
      }
      finally{
        await client.abort(mrt)
      }
    })
  })

})
