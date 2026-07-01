// *****************************************************************************
// Copyright 2013-2026 Aerospike, Inc.
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

import * as Aerospike from '../lib/aerospike.js'
import type { AerospikeBins, KeyOptions } from '../lib/aerospike.js'
import { AerospikeError } from '../lib/aerospike.js'
import { expect } from 'chai'
import * as helper from './test_helper.ts'

const status = Aerospike.status
const subcode = Aerospike.subcode
const lists = Aerospike.lists
const bitwise = Aerospike.bitwise

function assertSubcode (error: AerospikeError, code: number, expectedSubcode: number) {
  expect(error).to.be.instanceof(AerospikeError)
  expect(error.code).to.equal(code)
  expect(error.subcode).to.equal(expectedSubcode)
}

async function expectError (fn: () => Promise<unknown>): Promise<AerospikeError> {
  try {
    await fn()
    expect.fail('expected error')
  } catch (error: any) {
    return error
  }
}

describe('error detail verbosity', function () {
  const client = helper.client
  const keygen = helper.keygen

  helper.skipUnlessVersion('>= 8.1.3', this)

  const binName = 'edv-bin'
  let seedKey: KeyOptions
  let listKey: KeyOptions
  let bitsKey: KeyOptions

  before(async function () {
    seedKey = keygen.string(helper.namespace, helper.set, { prefix: 'test/error_detail' })()
    listKey = keygen.string(helper.namespace, helper.set, { prefix: 'test/error_detail_list' })()
    bitsKey = keygen.string(helper.namespace, helper.set, { prefix: 'test/error_detail_bits' })()

    await client.put(seedKey, { [binName]: 1 })
    await client.put(listKey, { [binName]: [10, 20, 30] })
    await client.put(bitsKey, { [binName]: Buffer.from([1, 2, 3, 4, 5]) })
  })

  it('exposes subcode constants from Aerospike.subcode', function () {
    expect(subcode.ERROR_DETAIL_NONE).to.equal(0)
    expect(subcode.ERROR_DETAIL_SUBCODE).to.equal(1)
    expect(subcode.ERROR_DETAIL_MESSAGE).to.equal(2)
    expect(subcode.OPNOT_CDT_BOUNDED_LIST_OVERFLOW).to.equal(3)
    expect(subcode.PARAM_BITS_SIZE_OUT_OF_RANGE).to.equal(3)
  })

  it('write generation mismatch at verbosity 0 returns no subcode', async function () {
    const policy = new Aerospike.WritePolicy({
      errorDetailVerbosity: subcode.ERROR_DETAIL_NONE,
      gen: Aerospike.policy.gen.EQ,
      generation: 99
    })

    const error = await expectError(() =>
      client.put(seedKey, { [binName]: 200 }, {}, policy)
    )
    expect(error.code).to.equal(status.ERR_RECORD_GENERATION)
    expect(error.subcode).to.equal(0)
    expect(error.message).to.not.include('subcode=')
  })

  it('write generation mismatch at verbosity 1 returns no dispatchable subcode', async function () {
    const policy = new Aerospike.WritePolicy({
      errorDetailVerbosity: subcode.ERROR_DETAIL_SUBCODE,
      gen: Aerospike.policy.gen.EQ,
      generation: 99
    })

    const error = await expectError(() =>
      client.put(seedKey, { [binName]: 200 }, {}, policy)
    )
    expect(error.code).to.equal(status.ERR_RECORD_GENERATION)
    expect(error.subcode).to.equal(0)
  })

  it('write generation mismatch at verbosity 2 still has no dispatchable subcode', async function () {
    const policy = new Aerospike.WritePolicy({
      errorDetailVerbosity: subcode.ERROR_DETAIL_MESSAGE,
      gen: Aerospike.policy.gen.EQ,
      generation: 99
    })

    const error = await expectError(() =>
      client.put(seedKey, { [binName]: 200 }, {}, policy)
    )
    expect(error.code).to.equal(status.ERR_RECORD_GENERATION)
    expect(error.subcode).to.equal(0)
    expect(error.message.length).to.be.greaterThan(0)
  })

  it('get on missing key at verbosity 2 returns record not found', async function () {
    const missingKey = keygen.string(helper.namespace, helper.set, { prefix: 'test/error_detail_missing' })()
    const policy = new Aerospike.ReadPolicy({
      errorDetailVerbosity: subcode.ERROR_DETAIL_MESSAGE
    })

    const error = await expectError(() => client.get(missingKey, policy))
    expect(error.code).to.equal(status.ERR_RECORD_NOT_FOUND)
    if (error.subcode > 0) {
      expect(error.message).to.include('subcode=')
    }
  })

  it('list index out of bounds returns op-not-applicable subcode', async function () {
    const policy = new Aerospike.OperatePolicy({
      errorDetailVerbosity: subcode.ERROR_DETAIL_MESSAGE
    })

    const error = await expectError(() =>
      client.operate(listKey, [lists.get(binName, 99)], {}, policy)
    )
    assertSubcode(error, status.ERR_OP_NOT_APPLICABLE, subcode.OPNOT_CDT_INDEX_OUT_OF_BOUNDS)
  })

  it('bounded list insert overflow returns op-not-applicable subcode', async function () {
    const policy = new Aerospike.OperatePolicy({
      errorDetailVerbosity: subcode.ERROR_DETAIL_MESSAGE
    })
    const listPolicy = new Aerospike.ListPolicy({
      order: lists.order.ORDERED,
      writeFlags: lists.writeFlags.INSERT_BOUNDED
    })

    const error = await expectError(() =>
      client.operate(listKey, [
        lists.insert(binName, 10, 5, listPolicy)
      ], {}, policy)
    )
    assertSubcode(error, status.ERR_OP_NOT_APPLICABLE, subcode.OPNOT_CDT_BOUNDED_LIST_OVERFLOW)
  })

  it('bit size out of range returns parameter error subcode', async function () {
    const policy = new Aerospike.OperatePolicy({
      errorDetailVerbosity: subcode.ERROR_DETAIL_MESSAGE
    })

    const error = await expectError(() =>
      client.operate(bitsKey, [
        bitwise.set(binName, 0, 0, Buffer.from([0xff]))
      ], {}, policy)
    )
    assertSubcode(error, status.ERR_REQUEST_INVALID, subcode.PARAM_BITS_SIZE_OUT_OF_RANGE)
    expect(error.message).to.include('subcode=')
  })
})
