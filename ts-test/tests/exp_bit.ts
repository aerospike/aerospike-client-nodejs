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

import Aerospike, { AerospikeBins, RecordMetadata, Key, AerospikeExp, AerospikeRecord, operations, exp as expModule} from 'aerospike';

import { expect } from 'chai'; 
import * as helper from './test_helper';

const exp: typeof expModule = Aerospike.exp
const op: typeof operations = Aerospike.operations

const keygen = helper.keygen
const tempBin = 'ExpVar'

describe('Aerospike.exp_operations', function () {
  helper.skipUnlessVersion('>= 5.0.0', this)

  const client = helper.client

  async function createRecord (bins: AerospikeBins, meta: RecordMetadata | null = null) {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/exp' })()
    await client.put(key, bins, meta)
    return key
  }

  it('builds up a filter expression value', function () {
    const filter: AerospikeExp = exp.eq(exp.binInt('intVal'), exp.int(42))
    expect(filter).to.be.an('array')
  })

  describe('bit expressions', function () {
    describe('bit bin get expression', function () {
      it('evaluates exp_read op to true if temp bin equals to bin bits', async function () {
        // const key = await createRecord({ blob: Buffer.from([0b00000001, 0b01000010, 0b01010111, 0b00000100, 0b00000101]) })
        const key: Key = await createRecord({ blob: Buffer.from([0, 1, 2, 3]) })
        const ops: operations.Operation[] = [
          exp.operations.read(tempBin,
            exp.bit.count(exp.binBlob('blob'), exp.uint(32), exp.int(0)), // b0,b1,b10,b11 (4bits set)
            // exp.bit.insert(exp.binBlob('blob'), exp.bytes(Buffer.from([1]), 1), exp.int(1)),
            0),
          op.read('blob')
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        // console.log(result)
        expect(result.bins.ExpVar).to.eql(4)
      })
    })
  })
})
