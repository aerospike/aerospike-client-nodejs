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

import Aerospike, { Key, AerospikeExp, Client as Cli, RecordMetadata, operations, exp as expModule, hll as hllModule, AerospikeRecord, AerospikeBins} from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const exp: typeof expModule = Aerospike.exp
const op: typeof operations = Aerospike.operations
const hll: typeof hllModule = Aerospike.hll

const keygen: any = helper.keygen
const tempBin: string = 'ExpVar'

describe('Aerospike.exp_operations', function () {
  helper.skipUnlessVersion('>= 5.0.0', this)

  const client: Cli = helper.client

  async function createRecord (bins: AerospikeBins, meta: RecordMetadata | null = null) {
    const key: Key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })()
    await client.put(key, bins, meta)
    return key
  }

  it('builds up a filter expression value', function () {
    const filter: AerospikeExp = exp.eq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  describe('hll expressions', function () {
    describe('hll bin getCount expression', function () {
      it('evaluates exp_read op to true if temp bin equals to unique items in hll', async function () {
        const key: Key = await createRecord({
          hllCats: Buffer.from([0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0,
            0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
          list: ['tiger']
        })
        const ops: operations.Operation[] = [
          hll.add('hllCats2', ['jaguar', 'tiger', 'tiger', 'leopard', 'lion', 'jaguar'], 8),
          exp.operations.read(tempBin,
            exp.hll.getCount(exp.binHll('hllCats2')),
            0),
          op.read('hllCats2')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        // console.log(result)
        expect(result.bins.ExpVar).to.eql(4)
      })
    })
  })
})
