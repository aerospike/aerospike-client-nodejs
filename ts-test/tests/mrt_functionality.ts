// *****************************************************************************
// Copyright 2013-2023 Aerospike, Inc.
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

import Aerospike, { Key as K, RecordMetadata, status as statusModule, AerospikeRecord, Client as Cli, WritePolicyOptions, ReadPolicyOptions, AerospikeError } from 'aerospike';

import { expect, assert } from 'chai'; 
import * as helper from './test_helper';

const keygen: any = helper.keygen
const metagen: any = helper.metagen
const recgen: any = helper.recgen

const status: typeof statusModule = Aerospike.status

describe('MRT functionality tests', function () {
  helper.skipUnlessVersionAndEnterprise('>= 8.0.0', this)


  const client: Cli = helper.client

  const key1: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/mrt/1' })()
  const key2: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/mrt/2' })()
  const key3: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/mrt/3' })()
  const key4: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/mrt/4' })()
  const key5: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/mrt/5' })()
  const key6: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/mrt/6' })()
  const key7: K = keygen.string(helper.namespace, helper.set, { prefix: 'test/mrt/7' })()

  const meta: RecordMetadata = metagen.constant({ ttl: 1000 })()

  const record1: AerospikeRecord = recgen.constant({ i: 123, s: 'abc' })()
  const record2: AerospikeRecord = recgen.constant({ i: 456, s: 'def' })()
  const record3: AerospikeRecord = recgen.constant({ i: 789, s: 'ghi' })()



  before(async function () {
    await client.put(key1, record1, meta)

    await client.put(key2, record1, meta)
    await client.put(key3, record1, meta)

    await client.put(key4, record1, meta)
    await client.put(key5, record1, meta)

    await client.put(key6, record1, meta)

    await client.put(key7, record1, meta)

  })

  it('Should execute a simple multi-record transaction', async function () {
  
    let mrt: any = new Aerospike.Transaction()

    let policy: any = {
        txn: mrt
    };

    await client.put(key1, record2, meta, policy)

	  let get_result: AerospikeRecord = await client.get(key1, policy)
    expect(get_result.bins).to.eql(record2)

    let result: number = await client.commit(mrt)
    expect(result).to.eql(Aerospike.commitStatus.OK)
  })

  it('should fail due to timeout: code MRT_EXPIRED', async function () {
    this.timeout(6000)
    let mrt: any = new Aerospike.Transaction()

    mrt.setTimeout(1)

    const policy: WritePolicyOptions = {
        txn: mrt
    }

    await client.put(key2, record2, meta, policy)
    await new Promise(r => setTimeout(r, 3000));
    try{
      await client.put(key3, record2, meta, policy)
    }
    catch (error: any) {
      expect(error.code).to.eql(Aerospike.status.MRT_EXPIRED)

      let result: number = await client.abort(mrt)
      expect(result).to.eql(Aerospike.abortStatus.OK)

      return
    }

    assert.fail('An MRT_EXPIRED error should have been thrown')
  })

  it('should abort the MRT and revert changes', async function () {
    let mrt: any = new Aerospike.Transaction()

    const policy: WritePolicyOptions = {
        txn: mrt
    }

    await client.put(key4, record2, meta, policy)

    const policyRead: ReadPolicyOptions = {
        txn: mrt
    }

    let get_result: AerospikeRecord = await client.get(key4, policy)
    expect(get_result.bins).to.eql(record2)

    await client.put(key5, record2, meta, policy)

    let result: number = await client.abort(mrt)
    expect(result).to.eql(Aerospike.commitStatus.OK)

    get_result = await client.get(key4)
    expect(get_result.bins).to.eql(record1)

    get_result = await client.get(key5)
    expect(get_result.bins).to.eql(record1)

  })

  it('should fail to commit after aborting', async function () {
    let mrt: any = new Aerospike.Transaction()

    const policy: WritePolicyOptions = {
        txn: mrt
    }

    await client.put(key6, record1, meta, policy)

    let result: number = await client.abort(mrt)

    result = await client.commit(mrt)

    expect(result).to.eql(Aerospike.commitStatus.ALREADY_ABORTED)
  })

  it('should fail to abort after committing', async function () {
    let mrt: any = new Aerospike.Transaction()

    const policy: WritePolicyOptions = {
        txn: mrt
    }

    await client.put(key7, record1, meta, policy)

    let result: number = await client.commit(mrt)

    result = await client.abort(mrt)
    expect(result).to.eql(Aerospike.abortStatus.ALREADY_COMMITTED)

  })

})