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

import { AerospikeBins, RecordMetadata, Key, AerospikeExp, AerospikeRecord, operations, exp as expModule} from '../lib/aerospike.js';

import { expect } from 'chai'; 
import * as helper from './test_helper.ts';
import * as Aerospike from '../lib/aerospike.js';

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
        const bins: AerospikeBins = result.bins
        // console.log(result)
        expect(bins.ExpVar).to.eql(4)
      })
    })

    describe('bit b64 encode', function () {
      helper.skipUnlessVersion('>= 8.1.3', this)

      let b64EncodeSupported = false

      before(async function () {
        const blob = Buffer.from([1, 1, 1, 1, 1])
        const key: Key = await createRecord({ blob })
        try {
          await client.operate(key, [
            exp.operations.read(tempBin,
              exp.bit.b64Encode(exp.binBlob('blob')),
              0)
          ])
          b64EncodeSupported = true
        } catch (error: any) {
          if (error.code !== Aerospike.status.ERR_OP_NOT_APPLICABLE &&
              error.code !== Aerospike.status.ERR_REQUEST_INVALID) {
            throw error
          }
        }
      })

      helper.skipUnless(this, () => b64EncodeSupported, 'exp bit b64Encode requires 8.1.3.0-105+')

      it('encodes the whole blob', async function () {
        const blob = Buffer.from([1, 1, 1, 1, 1])
        const key: Key = await createRecord({ blob })
        const ops: operations.Operation[] = [
          exp.operations.read(tempBin,
            exp.bit.b64Encode(exp.binBlob('blob')),
            0)
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(blob.toString('base64'))
      })

      it('encodes from an offset', async function () {
        const blob = Buffer.from([1, 1, 1, 1, 1])
        const key: Key = await createRecord({ blob })
        const ops: operations.Operation[] = [
          exp.operations.read(tempBin,
            exp.bit.b64EncodeFrom(exp.binBlob('blob'), exp.int(1)),
            0)
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(Buffer.from([1, 1, 1, 1]).toString('base64'))
      })

      it('b64Encode with offset matches b64EncodeFrom', async function () {
        const blob = Buffer.from([1, 1, 1, 1, 1])
        const key: Key = await createRecord({ blob })
        const ops: operations.Operation[] = [
          exp.operations.read(tempBin,
            exp.bit.b64Encode(exp.binBlob('blob'), exp.int(1)),
            0)
        ]
        const result: AerospikeRecord = await client.operate(key, ops, {})
        expect(result.bins.ExpVar).to.eql(Buffer.from([1, 1, 1, 1]).toString('base64'))
      })
    })
  })
})
