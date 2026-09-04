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

const strings = Aerospike.strings
const op = Aerospike.operations
const status = Aerospike.status

describe('strings operate()', function () {
  const client = helper.client
  const keygen = helper.keygen

  helper.skipUnlessVersion('>= 8.1.3', this)

  async function putKey (bins: AerospikeBins): Promise<KeyOptions> {
    const key = keygen.string(helper.namespace, helper.set, { prefix: 'test/strings_operate' })()
    await client.put(key, bins)
    return key
  }

  async function expectOperateError (key: KeyOptions, ops: any[], code: number) {
    try {
      await client.operate(key, ops)
      expect.fail('expected operate() to fail')
    } catch (error: any) {
      expect(error).to.be.instanceof(AerospikeError)
      expect(error.code).to.equal(code)
      return error as AerospikeError
    }
  }

  it('append and prepend apply in order', async function () {
    await helper.skipUnlessStringAppendPrepend.call(this)
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

  it('snipStart removes from start through the end of the string', async function () {
    const key = await putKey({ s: 'hello world' })
    const result: AerospikeRecord = await client.operate(key, [
      strings.snipStart('s', 5),
      op.read('s')
    ])
    expect(result.bins.s).to.eql('hello')
  })

  it('snip(bin, start) is the 1-arg form', async function () {
    const key = await putKey({ s: 'hello world' })
    const result: AerospikeRecord = await client.operate(key, [
      strings.snip('s', -6),
      op.read('s')
    ])
    expect(result.bins.s).to.eql('hello')
  })

  it('substrRange read does not change stored bin (substring is read-only)', async function () {
    const key = await putKey({ s: 'abcdef' })
    await client.operate(key, [strings.substrRange('s', 1, 5)])
    const after: AerospikeRecord = await client.get(key)
    expect(after.bins.s).to.eql('abcdef')
  })

  it('chains multiple string mutates on the same bin', async function () {
    await helper.skipUnlessStringAppendPrepend.call(this)
    const key = await putKey({ s: 'x' })
    const result: AerospikeRecord = await client.operate(key, [
      strings.append('s', 'A'),
      strings.append('s', 'B'),
      op.read('s')
    ])
    expect(result.bins.s).to.eql('xAB')
  })

  describe('CREATE_ONLY / UPDATE_ONLY', function () {
    it('exposes CREATE_ONLY as 1', function () {
      expect(strings.writeFlags.CREATE_ONLY).to.equal(1)
      expect(strings.writeFlags.UPDATE_ONLY).to.equal(2)
    })

    it('CREATE_ONLY on a missing bin creates it', async function () {
      await helper.skipUnlessStringAppendPrepend.call(this)
      const key = await putKey({ marker: 1 })
      const result: AerospikeRecord = await client.operate(key, [
        strings.append('s', 'hi').withPolicy({ writeFlags: strings.writeFlags.CREATE_ONLY }),
        op.read('s')
      ])
      expect(result.bins.s).to.eql('hi')
    })

    it('CREATE_ONLY on a live bin returns BIN_EXISTS', async function () {
      await helper.skipUnlessStringAppendPrepend.call(this)
      const key = await putKey({ s: 'x' })
      await expectOperateError(key, [
        strings.append('s', 'y').withPolicy({ writeFlags: strings.writeFlags.CREATE_ONLY })
      ], status.ERR_BIN_EXISTS)
    })

    it('CREATE_ONLY | NO_FAIL on a live bin is a silent no-op', async function () {
      await helper.skipUnlessStringAppendPrepend.call(this)
      const key = await putKey({ s: 'x' })
      await client.operate(key, [
        strings.append('s', 'y').withPolicy({
          writeFlags: strings.writeFlags.CREATE_ONLY | strings.writeFlags.NO_FAIL
        })
      ])
      const after: AerospikeRecord = await client.get(key)
      expect(after.bins.s).to.eql('x')
    })

    it('UPDATE_ONLY on a missing bin does not create the bin', async function () {
      await helper.skipUnlessStringAppendPrepend.call(this)
      const key = await putKey({ marker: 1 })
      await client.operate(key, [
        strings.append('s', 'hi').withPolicy({ writeFlags: strings.writeFlags.UPDATE_ONLY })
      ])
      const after: AerospikeRecord = await client.get(key)
      expect(after.bins.s).to.equal(undefined)
    })

    it('CREATE_ONLY | UPDATE_ONLY is PARAM', async function () {
      await helper.skipUnlessStringAppendPrepend.call(this)
      const key = await putKey({ marker: 1 })
      await expectOperateError(key, [
        strings.append('s', 'hi').withPolicy({
          writeFlags: strings.writeFlags.CREATE_ONLY | strings.writeFlags.UPDATE_ONLY
        })
      ], status.ERR_REQUEST_INVALID)
    })

    it('CREATE_ONLY with context is PARAM', async function () {
      await helper.skipUnlessStringAppendPrepend.call(this)
      const key = await putKey({ items: ['hello'] })
      await expectOperateError(key, [
        strings.append('items', '!').withPolicy({ writeFlags: strings.writeFlags.CREATE_ONLY })
          .withContext((ctx) => ctx.addListIndex(0))
      ], status.ERR_REQUEST_INVALID)
    })
  })

  describe('nested CTX', function () {
    let nestedStringCtxSupported = false

    before(async function () {
      const key = await putKey({ items: ['hello'] })
      try {
        await client.operate(key, [
          strings.upper('items').withContext((ctx) => ctx.addListIndex(0))
        ])
        nestedStringCtxSupported = true
      } catch (error: any) {
        if (error.code !== status.ERR_REQUEST_INVALID) {
          throw error
        }
      }
    })

    helper.skipUnless(this, () => nestedStringCtxSupported, 'nested string CTX requires 8.1.3.0-105+')

    it('uppers a string nested at a list index', async function () {
      const key = await putKey({ items: ['hello', 'world'] })
      await client.operate(key, [
        strings.upper('items').withContext((ctx) => ctx.addListIndex(0))
      ])
      const after: AerospikeRecord = await client.get(key)
      expect(after.bins.items).to.eql(['HELLO', 'world'])
    })

    it('uppers a string nested at a map key', async function () {
      const key = await putKey({ m: { a: 'hi', b: 'there' } })
      await client.operate(key, [
        strings.upper('m').withContext((ctx) => ctx.addMapKey('a'))
      ])
      const after: AerospikeRecord = await client.get(key)
      expect(after.bins.m).to.eql({ a: 'HI', b: 'there' })
    })

    it('follows a 2-entry path and leaves siblings unchanged', async function () {
      const key = await putKey({ items: [{ s: 'hi' }, { s: 'yo' }] })
      await client.operate(key, [
        strings.upper('items').withContext((ctx) => ctx.addListIndex(0).addMapKey('s'))
      ])
      const after: AerospikeRecord = await client.get(key)
      expect(after.bins.items).to.eql([{ s: 'HI' }, { s: 'yo' }])
    })
  })

  describe('isNumericType FLOAT', function () {
    const cases: Array<[string, number, boolean]> = [
      ['3.14', strings.numericType.FLOAT, true],
      ['5', strings.numericType.FLOAT, false],
      ['5', strings.numericType.ANY, true],
      ['5.', strings.numericType.FLOAT, false],
      ['1e5', strings.numericType.FLOAT, false],
      ['1e5', strings.numericType.ANY, false]
    ]

    for (const [value, numericType, expected] of cases) {
      it(`"${value}" numericType ${numericType} is ${expected}`, async function () {
        const key = await putKey({ s: value })
        const result: AerospikeRecord = await client.operate(key, [
          strings.isNumericType('s', numericType)
        ])
        expect(result.bins.s).to.equal(expected)
      })
    }
  })

  describe('canonical matching', function () {
    const nfc = '\u00e9'
    const nfd = 'e\u0301'

    it('replace matches NFC haystack against NFD needle', async function () {
      const key = await putKey({ s: nfc + 'clair' })
      await client.operate(key, [strings.replace('s', nfd, 'X')])
      const after: AerospikeRecord = await client.get(key)
      expect(after.bins.s).to.eql('Xclair')
    })

    it('replace matches NFD haystack against NFC needle', async function () {
      const key = await putKey({ s: nfd + 'clair' })
      await client.operate(key, [strings.replace('s', nfc, 'X')])
      const after: AerospikeRecord = await client.get(key)
      expect(after.bins.s).to.eql('Xclair')
    })

    it('startsWith and endsWith are canonical', async function () {
      const key = await putKey({ s: nfc + 'clair' + nfc })
      const starts: AerospikeRecord = await client.operate(key, [
        strings.startsWith('s', nfd)
      ])
      expect(starts.bins.s).to.eql(true)
      const ends: AerospikeRecord = await client.operate(key, [
        strings.endsWith('s', nfd)
      ])
      expect(ends.bins.s).to.eql(true)
    })
  })

  describe('regexReplace NO_FAIL', function () {
    let regexReplaceSupported = false

    before(async function () {
      const key = await putKey({ s: 'abc' })
      try {
        await client.operate(key, [
          strings.regexReplace('s', '[unclosed', 'x', strings.regexFlags.NONE)
            .withPolicy({ writeFlags: strings.writeFlags.NO_FAIL })
        ])
        regexReplaceSupported = true
      } catch (error: any) {
        if (error.code !== status.ERR_REQUEST_INVALID) {
          throw error
        }
      }
    })

    helper.skipUnless(this, () => regexReplaceSupported, 'regexReplace requires 8.1.3.0-105+')

    it('invalid pattern with NO_FAIL leaves the bin unchanged', async function () {
      const key = await putKey({ s: 'abc' })
      await client.operate(key, [
        strings.regexReplace('s', '[unclosed', 'x', strings.regexFlags.NONE)
          .withPolicy({ writeFlags: strings.writeFlags.NO_FAIL })
      ])
      const after: AerospikeRecord = await client.get(key)
      expect(after.bins.s).to.eql('abc')
    })
  })

  it('toInteger on a non-numeric string is OP_NOT_APPLICABLE', async function () {
    const key = await putKey({ s: 'not-a-number' })
    await expectOperateError(key, [strings.toInteger('s')], status.ERR_OP_NOT_APPLICABLE)
  })
})
