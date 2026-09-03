// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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
import type { AerospikeBins, AerospikeRecord, KeyOptions } from '../lib/aerospike.js'
import { AerospikeError } from '../lib/aerospike.js'
import { expect } from 'chai'
import * as helper from './test_helper.ts'

const lists = Aerospike.lists
const strings = Aerospike.strings
const status = Aerospike.status

describe('lists.join()', function () {
  const client = helper.client
  const keygen = helper.keygen

  helper.skipUnlessVersion('>= 8.1.3', this)

  async function putKey (bins: AerospikeBins): Promise<KeyOptions> {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/lists_join' })()
    await client.put(key, bins)
    return key
  }

  it('joins an empty list to an empty string', async function () {
    const key = await putKey({ items: [] })
    const result: AerospikeRecord = await client.operate(key, [lists.join('items')])
    expect(result.bins.items).to.eql('')
  })

  it('joins a single item with no separator applied', async function () {
    const key = await putKey({ items: ['a'] })
    const result: AerospikeRecord = await client.operate(key, [lists.join('items')])
    expect(result.bins.items).to.eql('a')
  })

  it('concatenates without a separator', async function () {
    const key = await putKey({ items: ['a', 'b', 'c'] })
    const result: AerospikeRecord = await client.operate(key, [lists.join('items')])
    expect(result.bins.items).to.eql('abc')
  })

  it('places the separator between items', async function () {
    const key = await putKey({ items: ['a', 'b', 'c'] })
    const result: AerospikeRecord = await client.operate(key, [
      lists.joinSeparator('items', ',')
    ])
    expect(result.bins.items).to.eql('a,b,c')
  })

  it('join(bin, separator) matches joinSeparator', async function () {
    const key = await putKey({ items: ['a', 'b', 'c'] })
    const result: AerospikeRecord = await client.operate(key, [
      lists.join('items', ',')
    ])
    expect(result.bins.items).to.eql('a,b,c')
  })

  it('errors when an item is not a string', async function () {
    const key = await putKey({ items: ['a', 1, 'c'] })
    try {
      await client.operate(key, [lists.join('items')])
      expect.fail('expected operate() to fail')
    } catch (error: any) {
      expect(error).to.be.instanceof(AerospikeError)
      expect([status.ERR_REQUEST_INVALID, status.ERR_PARAM]).to.include(error.code)
    }
  })

  it('round-trips splitSeparator then joinSeparator', async function () {
    const key = await putKey({ s: 'a,b,c' })
    const splitResult: AerospikeRecord = await client.operate(key, [
      strings.splitSeparator('s', ',')
    ])
    expect(splitResult.bins.s).to.eql(['a', 'b', 'c'])

    const listKey = await putKey({ items: splitResult.bins.s as string[] })
    const joined: AerospikeRecord = await client.operate(listKey, [
      lists.joinSeparator('items', ',')
    ])
    expect(joined.bins.items).to.eql('a,b,c')
  })

  it('joins a nested list via context', async function () {
    const key = await putKey({ outer: [['a', 'b'], ['c']] })
    const result: AerospikeRecord = await client.operate(key, [
      lists.joinSeparator('outer', ',').withContext((ctx) => ctx.addListIndex(0))
    ])
    expect(result.bins.outer).to.eql('a,b')
  })
})
