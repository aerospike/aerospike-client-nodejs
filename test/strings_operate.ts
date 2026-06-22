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
import { expect } from 'chai'
import * as helper from './test_helper.ts'

const strings = Aerospike.strings
const op = Aerospike.operations

describe('strings operate()', function () {
  const client = helper.client
  const keygen = helper.keygen

  helper.skipUnlessVersion('>= 8.1.3', this)

  before(async function () {
    await helper.skipUnlessStringAppendPrepend.call(this)
  })

  async function putKey (bins: AerospikeBins): Promise<KeyOptions> {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/strings_operate' })()
    await client.put(key, bins)
    return key
  }

  it('append and prepend apply in order', async function () {
    const key = await putKey({ s: 'mid' })
    const result: AerospikeRecord = await client.operate(key, [
      strings.append('s', '!'),
      strings.prepend('s', '?'),
      op.read('s')
    ])
    expect(result.bins.s).to.eql('?mid!')
  })

  it('snip removes half-open codepoint range [start, end)', async function () {
    const key = await putKey({ s: 'abcde' })
    const result: AerospikeRecord = await client.operate(key, [
      strings.snip('s', 1, 4),
      op.read('s')
    ])
    expect(result.bins.s).to.eql('ae')
  })

  it('substrRange read does not change stored bin (substring is read-only)', async function () {
    const key = await putKey({ s: 'abcdef' })
    await client.operate(key, [strings.substrRange('s', 1, 5)])
    const after: AerospikeRecord = await client.get(key)
    expect(after.bins.s).to.eql('abcdef')
  })

  it('chains multiple string mutates on the same bin', async function () {
    const key = await putKey({ s: 'x' })
    const result: AerospikeRecord = await client.operate(key, [
      strings.append('s', 'A'),
      strings.append('s', 'B'),
      op.read('s')
    ])
    expect(result.bins.s).to.eql('xAB')
  })
})
