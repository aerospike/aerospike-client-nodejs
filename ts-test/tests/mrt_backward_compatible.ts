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

describe('MRT backward compatible tests', function () {
  helper.skipUnlessVersionAndCommunity('< 8.0.0', this)

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
    expect(result).to.eql(Aerospike.commitStatus.ROLL_FORWARD_ABANDONED)

  })
  
  it('Should execute a simple multi-record transaction abort', async function () {
  
    let mrt: any = new Aerospike.Transaction()

    let policy: any = {
        txn: mrt
    };

    await client.put(key2, record2, meta, policy)
    await client.put(key3, record2, meta, policy)
    await client.put(key4, record2, meta, policy)

    let get_result: AerospikeRecord = await client.get(key2, policy)
    expect(get_result.bins).to.eql(record2)

    let result: number = await client.abort(mrt)
    expect(result).to.eql(Aerospike.abortStatus.ROLL_BACK_ABANDONED)
  })

})